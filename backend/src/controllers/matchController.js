import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { logActivity, buildSearchWhere, formatPagination, normalizeMatchStatus, matchStatusFlags } from "../services/helpers.js";
import { computeStandings } from "../services/standings.js";
import { syncBracket } from "../services/bracket.js";
import { exportToExcel, generateTemplate } from "../services/excel/excelExport.js";
import { validateAndImport, parseExcel } from "../services/excel/excelImport.js";
import { getTemplate } from "../services/excel/excelTemplates.js";
import { importMulter } from "../services/excel/importMulter.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const MATCH_SORTS = {
  date: [{ date: "asc" }],
  "-date": [{ date: "desc" }],
  competition: [{ competitionId: "asc" }, { date: "desc" }],
  venue: [{ venue: "asc" }, { date: "desc" }],
};

/**
 * Day boundaries for match queries, in server-local time.
 * - a bare "2026-10-12" is a calendar-day label (parsed by components, because
 *   `new Date("2026-10-12")` is UTC midnight and can shift a day);
 * - a full instant is bucketed by its *own* local date, so 22:00Z on a day the
 *   server reads as the next day still groups with the rest of that kickoff day.
 */
export function dayRange(value) {
  if (!value) return null;
  const str = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  let start;
  if (m && !/T/.test(str)) {
    start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  } else {
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return null;
    start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }
  if (isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function toIntOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Keep the match clock coherent with the status: a live match always has a
 * minute to show, a finished match keeps whatever the clock actually recorded,
 * and anything no longer being played must not keep a stale running clock.
 */
function normalizeClock(matchData) {
  if (matchData.status === "LIVE") {
    return { ...matchData, minute: matchData.minute ?? 1, phase: matchData.phase ?? "REGULATION" };
  }
  if (matchData.status === "FINISHED") return matchData;
  return { ...matchData, minute: null, phase: null, addedTime: null, addedTimeSecond: null };
}

// Kickoff lives in two places: the `time` input and the `date` instant. Rows
// saved without the time input ended up with `timeField: null`, which made the
// report show "Kickoff: TBD" even though `date` carried the actual time.
export function deriveKickoff(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function withKickoff(matchData) {
  if (matchData.timeField) return matchData;
  const hhmm = deriveKickoff(matchData.date);
  if (hhmm) matchData.timeField = hhmm;
  return matchData;
}

// Season describes the competition, not the fixture. Fill it from the
// competition whenever the client leaves it blank so a match never loses it
// (the old form relied on a hardcoded "2025-26" default instead).
async function inheritSeason(matchData) {
  if (matchData.season || !matchData.competitionId) return matchData;
  const comp = await prisma.competition.findUnique({ where: { id: matchData.competitionId }, select: { season: true } });
  if (comp?.season) matchData.season = comp.season;
  return matchData;
}

export const listMatches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, competition, status, date, team, sort } = req.query;
  const AND = [];
  // Composed with AND so search (an OR clause) and the team filter (also an OR
  // clause) can coexist instead of overwriting each other in one object literal.
  if (search) AND.push(buildSearchWhere(search, ["venue", "referee"]));
  if (competition && competition !== "all") AND.push({ competitionId: Number(competition) });
  if (status && status !== "all") AND.push({ status });
  if (team && team !== "all") {
    const teamId = Number(team);
    AND.push({ OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] });
  }
  const range = dayRange(date);
  if (range) AND.push({ date: { gte: range.start, lt: range.end } });
  const where = AND.length ? { AND } : {};
  const orderBy = MATCH_SORTS[sort] || MATCH_SORTS["-date"];
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
  await assertValidMatch(data, null);
  const matchData = withKickoff(buildMatchData(data));
  await inheritSeason(matchData);
  const match = await prisma.match.create({ data: { ...normalizeClock(matchData), events: data.events?.length ? { create: data.events.map(buildEventData) } : undefined, lineups: buildLineupData(data), statistics: buildStatData(data) ? { create: buildStatData(data) } : undefined }, include: { competition: true, homeTeam: true, awayTeam: true, events: true, lineups: true, statistics: true } });
  await logActivity(`Created match ${match.homeTeam.shortName || match.homeTeam.name} vs ${match.awayTeam.shortName || match.awayTeam.name}`, { entity: "Match", entityId: match.id, userId: req.user.id });
  await syncBracket(match.competitionId);
  res.status(201).json({ success: true, match });
});

export const updateMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.match.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Match not found");
  const data = req.body;
  assertTeamsDiffer(data);
  await assertValidMatch(data, existing);
  const matchData = buildMatchData(data);
  // buildMatchData nulls omitted optional fields; preserve them so partial
  // updates (score/status entry) don't wipe bracket membership or metadata.
  const optionalFields = [
    "homeTeamId", "awayTeamId", "competitionId", "season", "division", "homeScore", "awayScore", "minute",
    "timeField", "venue", "round", "roundNumber", "bracketPosition",
    "homePenalties", "awayPenalties", "addedTime", "addedTimeSecond", "phase", "notes", "referee", "attendance",
  ];
  for (const field of optionalFields) {
    if (data[field] === undefined) matchData[field] = existing[field];
  }
  if (data.date === undefined) matchData.date = existing.date;
  if (data.status === undefined) {
    matchData.status = existing.status;
    matchData.isLive = existing.isLive;
    matchData.isFinished = existing.isFinished;
  }
  // Runs last so a preserved (stale) clock can't survive a status change.
  withKickoff(matchData);
  await inheritSeason(matchData);
  Object.assign(matchData, normalizeClock(matchData));
  const match = await prisma.$transaction(async (tx) => {
    const updated = await tx.match.update({ where: { id: Number(id) }, data: matchData });
    if (Array.isArray(data.events)) { await tx.matchEvent.deleteMany({ where: { matchId: Number(id) } }); if (data.events.length) await tx.matchEvent.createMany({ data: data.events.map((e) => ({ matchId: Number(id), ...buildEventData(e) })) }); }
    if (Array.isArray(data.lineups) && data.lineups.length) { const lineupRows = buildLineupRows(Number(id), data.lineups); await tx.matchLineup.deleteMany({ where: { matchId: Number(id) } }); for (const row of lineupRows) await tx.matchLineup.create({ data: row }); }
    if (data.statistics) { const statRow = buildStatData(data); if (statRow) await tx.matchStatistic.upsert({ where: { matchId: Number(id) }, update: statRow, create: { matchId: Number(id), ...statRow } }); }
    return tx.match.findUnique({ where: { id: Number(id) }, include: { competition: true, homeTeam: true, awayTeam: true, events: true, lineups: true, statistics: true } });
  });
  await logActivity(`Updated match`, { entity: "Match", entityId: Number(id), userId: req.user.id });
  await syncBracket(match.competitionId);
  const fresh = await prisma.match.findUnique({ where: { id: Number(id) }, include: { competition: true, homeTeam: true, awayTeam: true, events: true, lineups: true, statistics: true } });
  res.json({ success: true, match: fresh });
});

export const deleteMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.match.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Match not found");
  await prisma.match.delete({ where: { id: Number(id) } });
  await syncBracket(existing.competitionId);
  await logActivity(`Deleted match`, { entity: "Match", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "Match deleted" });
});

export const deleteMatches = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const matches = await prisma.match.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  const affected = new Set();
  for (const m of matches) {
    await prisma.match.delete({ where: { id: m.id } });
    deleted.push(m.id);
    if (m.competitionId) affected.add(m.competitionId);
    await logActivity(`Bulk-deleted match #${m.id}`, { entity: "Match", entityId: m.id, userId: req.user.id });
  }
  for (const competitionId of affected) await syncBracket(competitionId);
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

export function assertTeamsDiffer(data) { if (data.homeTeamId && data.awayTeamId && Number(data.homeTeamId) === Number(data.awayTeamId)) throw new AppError(422, "Home team and away team must be different"); }

/**
 * Cross-record validation that guards real-world scheduling mistakes:
 * references must exist, a finished match needs a score, and a team cannot be
 * booked twice at the same kickoff on the same day.
 */
export async function assertValidMatch(data, existing = null) {
  const homeTeamId = data.homeTeamId !== undefined ? toIntOrNull(data.homeTeamId) : existing?.homeTeamId ?? null;
  const awayTeamId = data.awayTeamId !== undefined ? toIntOrNull(data.awayTeamId) : existing?.awayTeamId ?? null;
  const competitionId =
    data.competitionId !== undefined
      ? data.competitionId === null || data.competitionId === ""
        ? null
        : toIntOrNull(data.competitionId)
      : existing?.competitionId ?? null;
  const status = data.status !== undefined ? normalizeMatchStatus(data.status) : existing?.status ?? "SCHEDULED";

  if (status === "FINISHED") {
    const hs = data.homeScore !== undefined ? toIntOrNull(data.homeScore) : existing?.homeScore ?? null;
    const as = data.awayScore !== undefined ? toIntOrNull(data.awayScore) : existing?.awayScore ?? null;
    if (hs === null || as === null) throw new AppError(422, "A finished match needs a score for both teams");
    if (hs < 0 || as < 0) throw new AppError(422, "Scores cannot be negative");
  }

  for (const [label, teamId] of [["Home team", homeTeamId], ["Away team", awayTeamId]]) {
    if (!teamId) continue;
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) throw new AppError(422, `${label} not found`);
  }
  if (competitionId) {
    const competition = await prisma.competition.findUnique({ where: { id: competitionId }, select: { id: true } });
    if (!competition) throw new AppError(422, "Competition not found");
  }

  // Only re-check the schedule when the fixture itself moved; routine score or
  // status updates must never be blocked by an existing clash.
  const fixtureChanged =
    !existing ||
    data.date !== undefined ||
    data.time !== undefined ||
    data.timeField !== undefined ||
    data.homeTeamId !== undefined ||
    data.awayTeamId !== undefined;
  if (!fixtureChanged) return;

  const dateValue = data.date !== undefined ? data.date : existing?.date;
  const timeField =
    data.time !== undefined ? data.time || null
    : data.timeField !== undefined ? data.timeField || null
    : existing?.timeField || deriveKickoff(dateValue);
  const range = dayRange(dateValue);
  if (!range || !timeField) return;

  for (const teamId of [homeTeamId, awayTeamId]) {
    if (!teamId) continue;
    const clash = await prisma.match.findFirst({
      where: {
        ...(existing ? { id: { not: existing.id } } : {}),
        timeField,
        status: { not: "CANCELLED" },
        date: { gte: range.start, lt: range.end },
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: { homeTeam: { select: { name: true, shortName: true } }, awayTeam: { select: { name: true, shortName: true } } },
    });
    if (clash) {
      throw new AppError(
        409,
        `Kickoff clash: a team already plays ${clash.homeTeam.shortName || clash.homeTeam.name} vs ${clash.awayTeam.shortName || clash.awayTeam.name} at ${timeField} that day`
      );
    }
  }
}

export function buildMatchData(d) {
  const { status, isLive, isFinished } = matchStatusFlags(d.status);
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
    round: d.round || null,
    homePenalties: d.homePenalties !== "" && d.homePenalties !== null && d.homePenalties !== undefined ? Number(d.homePenalties) : null,
    awayPenalties: d.awayPenalties !== "" && d.awayPenalties !== null && d.awayPenalties !== undefined ? Number(d.awayPenalties) : null,
    addedTime: d.addedTime !== "" && d.addedTime !== null && d.addedTime !== undefined ? Number(d.addedTime) : null,
    addedTimeSecond: d.addedTimeSecond !== "" && d.addedTimeSecond !== null && d.addedTimeSecond !== undefined ? Number(d.addedTimeSecond) : null,
    phase: d.phase || null,
    roundNumber: d.roundNumber !== "" && d.roundNumber !== null && d.roundNumber !== undefined ? Number(d.roundNumber) : null,
    bracketPosition: d.bracketPosition !== "" && d.bracketPosition !== null && d.bracketPosition !== undefined ? Number(d.bracketPosition) : null,
    notes: d.notes || null,
    referee: d.referee || null,
    attendance: d.attendance !== "" && d.attendance !== null && d.attendance !== undefined ? Number(d.attendance) : null,
    isLive,
    isFinished,
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
