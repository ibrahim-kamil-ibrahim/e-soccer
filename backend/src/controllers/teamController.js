import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { logActivity, buildSearchWhere, formatPagination, slugify } from "../services/helpers.js";
import { exportToExcel, generateTemplate } from "../services/excel/excelExport.js";
import { validateAndImport, parseExcel } from "../services/excel/excelImport.js";
import { getTemplate } from "../services/excel/excelTemplates.js";
import { importMulter } from "../services/excel/importMulter.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const listTeams = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, competition, region, status, featured } = req.query;

  const where = {
    ...buildSearchWhere(search, ["name", "shortName", "city", "stadium"]),
    ...(competition && competition !== "all" ? { competitionId: Number(competition) } : {}),
    ...(region && region !== "all" ? { region } : {}),
    ...(status && status !== "all" ? { status } : {}),
    ...(featured === "true" ? { isFeatured: true } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { competition: true },
    }),
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const team = await prisma.team.findUnique({
    where: { id: Number(id) },
    include: { competition: true, _count: { select: { players: true, homeMatches: true, awayMatches: true } } },
  });
  if (!team) throw new AppError(404, "Team not found");
  res.json({ success: true, team });
});

export const createTeam = asyncHandler(async (req, res) => {
  const t = await prisma.team.create({ data: normalizeTeam(req.body), include: { competition: true } });
  await logActivity(`Created team "${t.name}"`, { entity: "Team", entityId: t.id, userId: req.user.id });
  res.status(201).json({ success: true, team: t });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.team.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Team not found");
  const team = await prisma.team.update({
    where: { id: Number(id) },
    data: normalizeTeam(req.body),
    include: { competition: true },
  });
  await logActivity(`Updated team "${existing.name}"`, { entity: "Team", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, team });
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.team.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Team not found");
  const playerCount = await prisma.player.count({ where: { teamId: Number(id) } });
  const matchCount = await prisma.match.count({
    where: { OR: [{ homeTeamId: Number(id) }, { awayTeamId: Number(id) }] },
  });
  if (playerCount > 0 || matchCount > 0) {
    throw new AppError(422, `Cannot delete team with ${playerCount} player(s) and ${matchCount} match(es)`);
  }
  await prisma.team.delete({ where: { id: Number(id) } });
  await logActivity(`Deleted team "${existing.name}"`, { entity: "Team", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "Team deleted" });
});

export const deleteTeams = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  // Batch count queries to avoid N+1; count matches in both directions
  const [playerCounts, homeCounts, awayCounts] = await Promise.all([
    prisma.player.groupBy({ by: ["teamId"], _count: { _all: true }, where: { teamId: { in: idsNum } } }),
    prisma.match.groupBy({ by: ["homeTeamId"], _count: { _all: true }, where: { homeTeamId: { in: idsNum } } }),
    prisma.match.groupBy({ by: ["awayTeamId"], _count: { _all: true }, where: { awayTeamId: { in: idsNum } } }),
  ]);
  const playerCountMap = new Map(playerCounts.map((p) => [p.teamId, p._count._all]));
  const matchCountMap = new Map();
  for (const m of homeCounts) matchCountMap.set(m.homeTeamId, (matchCountMap.get(m.homeTeamId) || 0) + m._count._all);
  for (const m of awayCounts) matchCountMap.set(m.awayTeamId, (matchCountMap.get(m.awayTeamId) || 0) + m._count._all);
  const teams = await prisma.team.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  const skipped = [];
  for (const t of teams) {
    if ((playerCountMap.get(t.id) || 0) > 0 || (matchCountMap.get(t.id) || 0) > 0) { skipped.push(t.id); continue; }
    await prisma.team.delete({ where: { id: t.id } });
    deleted.push(t.id);
    await logActivity(`Bulk-deleted team #${t.id}`, { entity: "Team", entityId: t.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, skipped: skipped.length, message: "Teams deleted" });
});

function normalizeTeam(d) {
  const name = d.name || "";
  const slug = d.slug || slugify(name);
  return {
    name,
    shortName: d.shortName || null,
    slug,
    city: d.city || "Dire Dawa",
    region: d.region || null,
    competitionId: d.competitionId ? Number(d.competitionId) : null,
    division: d.division || null,
    type: d.type || null,
    position: d.position != null ? Number(d.position) : null,
    form: d.form || null,
    logo: d.logo || null,
    color: d.color || null,
    founded: d.founded === "" ? null : d.founded != null ? Number(d.founded) : null,
    stadium: d.stadium || null,
    capacity: d.capacity != null ? Number(d.capacity) : null,
    league: d.league || null,
    description: d.description || null,
    homeJersey: d.homeJersey || null,
    awayJersey: d.awayJersey || null,
    website: d.website || null,
    facebook: d.facebook || null,
    telegram: d.telegram || null,
    instagram: d.instagram || null,
    phone: d.phone || null,
    email: d.email || null,
    isFeatured: Boolean(d.isFeatured),
    published: d.published === undefined ? true : Boolean(d.published),
    status: d.status || "PUBLISHED",
    sortOrder: Number(d.sortOrder) || 0,
  };
}

export const exportTeams = asyncHandler(async (req, res) => {
  const items = await prisma.team.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { competition: true },
  });
  const fields = getTemplate("teams").columns;
  const records = items.map((t) => ({
    name: t.name,
    shortName: t.shortName || "",
    logo: t.logo || "",
    city: t.city,
    description: t.description || "",
    region: t.region || "",
    competitionName: t.competition?.name || "",
    division: t.division || "",
    type: t.type || "",
    position: t.position ?? "",
    form: t.form || "",
    stadium: t.stadium || "",
    capacity: t.capacity ?? "",
    league: t.league || "",
    founded: t.founded ?? "",
    homeJersey: t.homeJersey || "",
    awayJersey: t.awayJersey || "",
    website: t.website || "",
    facebook: t.facebook || "",
    telegram: t.telegram || "",
    instagram: t.instagram || "",
    phone: t.phone || "",
    email: t.email || "",
    isFeatured: t.isFeatured,
    published: t.published,
    status: t.status,
    sortOrder: t.sortOrder,
  }));
  const buffer = await exportToExcel("teams", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="teams.xlsx"');
  res.send(buffer);
});

export const exportTeamsTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("teams");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="teams-template.xlsx"');
  res.send(buffer);
});

export const importTeams = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("teams", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally {
    fs.unlinkSync(tempPath);
  }
});
