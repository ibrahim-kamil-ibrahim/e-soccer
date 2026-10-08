import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { logActivity, buildSearchWhere, formatPagination } from "../services/helpers.js";
import { exportToExcel, generateTemplate } from "../services/excel/excelExport.js";
import { validateAndImport, parseExcel } from "../services/excel/excelImport.js";
import { getTemplate } from "../services/excel/excelTemplates.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import multer from "multer";

const importMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "application/octet-stream"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new AppError(400, "Only .xlsx and .xls files are allowed"));
  },
});

export const listMatches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, competition, status, date, team, sort } = req.query;
  const where = {
    ...buildSearchWhere(search, ["venue", "referee"]),
    ...(competition && competition !== "all" ? { competitionId: Number(competition) } : {}),
    ...(status && status !== "all" ? { status } : {}),
    ...(date ? { date: new Date(date) } : {}),
    ...(team && team !== "all" ? { OR: [{ homeTeamId: Number(team) }, { awayTeamId: Number(team) }] } : {}),
  };
  const orderBy = sort === "-date" ? { date: "desc" } : sort === "date" ? { date: "asc" } : { date: "desc" };
  const [total, items] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({ where, skip, take: limit, orderBy, include: { competition: true, homeTeam: true, awayTeam: true } }),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = await prisma.match.findUnique({ where: { id: Number(id) }, include: { competition: true, homeTeam: true, awayTeam: true, events: true, lineups: true, statistics: true } });
  if (!match) throw new AppError(404, "Match not found");
  res.json({ success: true, match });
});

export const createMatch = asyncHandler(async (req, res) => {
  const data = req.body;
  assertTeamsDiffer(data);
  const match = await prisma.match.create({ data: { ...buildMatchData(data), events: data.events?.length ? { create: data.events.map(buildEventData) } : undefined, lineups: buildLineupData(data), statistics: buildStatData(data) ? { create: buildStatData(data) } : undefined }, include: { competition: true, homeTeam: true, awayTeam: true, events: true, lineups: true, statistics: true } });
  await logActivity(`Created match ${match.homeTeam.shortName || match.homeTeam.name} vs ${match.awayTeam.shortName || match.awayTeam.name}`, { entity: "Match", entityId: match.id, userId: req.user.id });
  res.status(201).json({ success: true, match });
});

export const updateMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.match.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Match not found");
  const data = req.body;
  assertTeamsDiffer(data);
  const match = await prisma.$transaction(async (tx) => {
    const updated = await tx.match.update({ where: { id: Number(id) }, data: buildMatchData(data) });
    if (Array.isArray(data.events)) { await tx.matchEvent.deleteMany({ where: { matchId: Number(id) } }); if (data.events.length) await tx.matchEvent.createMany({ data: data.events.map((e) => ({ matchId: Number(id), ...buildEventData(e) })) }); }
    if (Array.isArray(data.lineups) && data.lineups.length) { const lineupRows = buildLineupRows(Number(id), data.lineups); await tx.matchLineup.deleteMany({ where: { matchId: Number(id) } }); for (const row of lineupRows) await tx.matchLineup.create({ data: row }); }
    if (data.statistics) { const statRow = buildStatData(data); if (statRow) await tx.matchStatistic.upsert({ where: { matchId: Number(id) }, update: statRow, create: { matchId: Number(id), ...statRow } }); }
    return tx.match.findUnique({ where: { id: Number(id) }, include: { competition: true, homeTeam: true, awayTeam: true, events: true, lineups: true, statistics: true } });
  });
  await logActivity(`Updated match`, { entity: "Match", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, match });
});

export const deleteMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.match.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Match not found");
  await prisma.match.delete({ where: { id: Number(id) } });
  await logActivity(`Deleted match`, { entity: "Match", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "Match deleted" });
});

export const deleteMatches = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const matches = await prisma.match.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  for (const m of matches) { await prisma.match.delete({ where: { id: m.id } }); deleted.push(m.id); await logActivity(`Bulk-deleted match #${m.id}`, { entity: "Match", entityId: m.id, userId: req.user.id }); }
  res.json({ success: true, deleted: deleted.length, message: "Matches deleted" });
});

export const getMatchEvents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const events = await prisma.matchEvent.findMany({ where: { matchId: Number(id) }, orderBy: { minute: "asc" } });
  res.json({ success: true, events });
});

export const getMatchStandings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = await prisma.match.findUnique({ where: { id: Number(id) }, include: { competition: true } });
  if (!match?.competition) return res.json({ success: true, standings: [] });
  const { computeStandings } = await import("../services/standings.js");
  const standings = await computeStandings(match.competition.id);
  res.json({ success: true, standings });
});

export const getMatchStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stats = await prisma.matchStatistic.findUnique({ where: { matchId: Number(id) } });
  res.json({ success: true, statistics: stats });
});

export const getMatchLineups = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lineups = await prisma.matchLineup.findMany({ where: { matchId: Number(id) } });
  res.json({ success: true, lineups });
});

function assertTeamsDiffer(data) { if (data.homeTeamId && data.awayTeamId && Number(data.homeTeamId) === Number(data.awayTeamId)) throw new AppError(422, "Home team and away team must be different"); }

function buildMatchData(d) {
  const status = d.status || "UPCOMING";
  return {
    competitionId: d.competitionId ? Number(d.competitionId) : null,
    season: d.season || null,
    division: d.division || null,
    homeTeamId: Number(d.homeTeamId),
    awayTeamId: Number(d.awayTeamId),
    homeScore: d.homeScore !== "" && d.homeScore !== null && d.homeScore !== undefined ? Number(d.homeScore) : null,
    awayScore: d.awayScore !== "" && d.awayScore !== null && d.awayScore !== undefined ? Number(d.awayScore) : null,
    status,
    minute: d.minute ?? null,
    date: new Date(d.date),
    timeField: d.time || null,
    venue: d.venue || null,
    referee: d.referee || null,
    attendance: d.attendance !== "" && d.attendance !== null && d.attendance !== undefined ? Number(d.attendance) : null,
    isLive: status === "LIVE",
    isFinished: status === "FT",
  };
}

function buildEventData(e) { return { type: e.type || "GOAL", side: e.side || "HOME", minute: e.minute ?? null, playerId: e.playerId ? Number(e.playerId) : null, playerName: e.playerName || null, assist: e.assist || null, playerIn: e.playerIn || null, playerOut: e.playerOut || null }; }

function buildLineupData(d) { if (!Array.isArray(d.lineups) || !d.lineups.length) return undefined; const rows = buildLineupRows(undefined, d.lineups); return rows.length ? { create: rows } : undefined; }

function buildLineupRows(matchId, lineups) { return lineups.filter((l) => l && (l.formation || l.startingXI || l.substitutes)).map((l) => ({ ...(matchId ? { matchId } : {}), side: l.side || "HOME", formation: l.formation || null, startingXI: Array.isArray(l.startingXI) ? l.startingXI : null, substitutes: Array.isArray(l.substitutes) ? l.substitutes : null })); }

function buildStatData(d) { if (!d.statistics) return null; const s = d.statistics; const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v)); const row = { possession: num(s.possession), shots: num(s.shots), shotsOnTarget: num(s.shotsOnTarget), corners: num(s.corners), fouls: num(s.fouls), offside: num(s.offside), saves: num(s.saves), yellowCards: num(s.yellowCards), redCards: num(s.redCards), passes: num(s.passes) }; const hasValue = Object.values(row).some((v) => v !== null); return hasValue ? row : null; }

export const exportMatches = asyncHandler(async (req, res) => {
  const items = await prisma.match.findMany({ orderBy: { date: "desc" }, include: { competition: true, homeTeam: true, awayTeam: true } });
  const fields = getTemplate("matches").columns;
  const records = items.map((m) => ({
    competitionName: m.competition?.name || "",
    season: m.season || "",
    division: m.division || "",
    homeTeamName: m.homeTeam.name,
    awayTeamName: m.awayTeam.name,
    homeScore: m.homeScore ?? "",
    awayScore: m.awayScore ?? "",
    status: m.status,
    minute: m.minute ?? "",
    date: m.date.toISOString().split("T")[0],
    timeField: m.timeField || "",
    venue: m.venue || "",
    referee: m.referee || "",
    attendance: m.attendance ?? "",
  }));
  const buffer = await exportToExcel("matches", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="matches.xlsx"');
  res.send(buffer);
});

export const exportMatchesTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("matches");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="matches-template.xlsx"');
  res.send(buffer);
});

export const importMatches = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("matches", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally {
    fs.unlinkSync(tempPath);
  }
});
