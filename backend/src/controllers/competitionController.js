import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { logActivity, buildSearchWhere, formatPagination } from "../services/helpers.js";
import { computeStandings } from "../services/standings.js";
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
    const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new AppError(400, "Only .xlsx and .xls files are allowed"));
  },
});

export const listCompetitions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, region, season, type, status } = req.query;
  const where = {
    ...buildSearchWhere(search, ["name", "shortName"]),
    ...(region && region !== "all" ? { region } : {}),
    ...(season && season !== "all" ? { season } : {}),
    ...(type && type !== "all" ? { type } : {}),
    ...(status && status !== "all" ? { status } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.competition.count({ where }),
    prisma.competition.findMany({ where, skip, take: limit, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { teams: true, matches: true } } } }),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const competition = await prisma.competition.findUnique({
    where: { id: Number(id) },
    include: { teams: { include: { _count: { select: { players: true } } } }, matches: { include: { homeTeam: true, awayTeam: true }, orderBy: { date: "desc" } }, _count: { select: { teams: true, matches: true } } },
  });
  if (!competition) throw new AppError(404, "Competition not found");
  res.json({ success: true, competition });
});

export const getCompetitionStandings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });
  if (!competition) throw new AppError(404, "Competition not found");
  const standings = await computeStandings(competition.id);
  res.json({ success: true, standings });
});

export const createCompetition = asyncHandler(async (req, res) => {
  const data = req.body;
  const competition = await prisma.competition.create({ data: normalizeComp(data) });
  await logActivity(`Created competition "${competition.name}"`, { entity: "Competition", entityId: competition.id, userId: req.user.id });
  res.status(201).json({ success: true, competition });
});

export const updateCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.competition.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Competition not found");
  const competition = await prisma.competition.update({ where: { id: Number(id) }, data: normalizeComp(req.body) });
  await logActivity(`Updated competition "${competition.name}"`, { entity: "Competition", entityId: competition.id, userId: req.user.id });
  res.json({ success: true, competition });
});

export const deleteCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.competition.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Competition not found");
  const teamCount = await prisma.team.count({ where: { competitionId: Number(id) } });
  const matchCount = await prisma.match.count({ where: { competitionId: Number(id) } });
  if (teamCount > 0 || matchCount > 0) {
    await prisma.$transaction(async (tx) => {
      if (matchCount > 0) {
        const matches = await tx.match.findMany({ where: { competitionId: Number(id) }, select: { id: true } });
        const matchIds = matches.map((m) => m.id);
        if (matchIds.length > 0) {
          await tx.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
          await tx.matchLineup.deleteMany({ where: { matchId: { in: matchIds } } });
          await tx.matchStatistic.deleteMany({ where: { matchId: { in: matchIds } } });
          await tx.match.deleteMany({ where: { id: { in: matchIds } } });
        }
      }
      if (teamCount > 0) await tx.team.updateMany({ where: { competitionId: Number(id) }, data: { competitionId: null } });
      await tx.competition.delete({ where: { id: Number(id) } });
    });
  } else {
    await prisma.competition.delete({ where: { id: Number(id) } });
  }
  await logActivity(`Deleted competition "${existing.name}"`, { entity: "Competition", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "Competition deleted" });
});

export const deleteCompetitions = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const competitions = await prisma.competition.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  const skipped = [];
  for (const c of competitions) {
    const teamCount = await prisma.team.count({ where: { competitionId: c.id } });
    const matchCount = await prisma.match.count({ where: { competitionId: c.id } });
    if (teamCount > 0 || matchCount > 0) { skipped.push(c.id); continue; }
    await prisma.competition.delete({ where: { id: c.id } });
    deleted.push(c.id);
    await logActivity(`Bulk-deleted competition #${c.id}`, { entity: "Competition", entityId: c.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, skipped: skipped.length, message: "Competitions deleted" });
});

function normalizeComp(d) {
  return {
    name: d.name,
    shortName: d.shortName || null,
    country: d.country || null,
    region: d.region || "Dire Dawa",
    level: d.level || null,
    type: d.type || null,
    season: d.season || null,
    description: d.description || null,
    logo: d.logo || null,
    color: d.color || null,
    status: d.status || "PUBLISHED",
    sortOrder: Number(d.sortOrder) || 0,
  };
}

export const exportCompetitions = asyncHandler(async (req, res) => {
  const items = await prisma.competition.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const fields = getTemplate("competitions").columns;
  const records = items.map((c) => ({
    name: c.name, shortName: c.shortName || "", country: c.country || "", region: c.region || "",
    level: c.level || "", type: c.type || "", season: c.season || "", description: c.description || "",
    logo: c.logo || "", color: c.color || "", status: c.status, sortOrder: c.sortOrder,
  }));
  const buffer = await exportToExcel("competitions", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="competitions.xlsx"');
  res.send(buffer);
});

export const exportCompetitionsTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("competitions");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="competitions-template.xlsx"');
  res.send(buffer);
});

export const importCompetitions = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("competitions", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally { fs.unlinkSync(tempPath); }
});
