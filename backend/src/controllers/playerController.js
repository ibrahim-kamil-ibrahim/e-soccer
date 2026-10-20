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

export const listPlayers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, team, position, status } = req.query;
  const where = {
    ...buildSearchWhere(search, ["name"]),
    ...(team && team !== "all" ? { teamId: Number(team) } : {}),
    ...(position && position !== "all" ? { position } : {}),
    ...(status && status !== "all" ? { status } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.player.count({ where }),
    prisma.player.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { team: true } }),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getPlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const player = await prisma.player.findUnique({ where: { id: Number(id) }, include: { team: { include: { competition: true } } } });
  if (!player) throw new AppError(404, "Player not found");
  res.json({ success: true, player });
});

export const createPlayer = asyncHandler(async (req, res) => {
  const player = await prisma.player.create({ data: normalizePlayer(req.body), include: { team: true } });
  await logActivity(`Created player "${player.name}"`, { entity: "Player", entityId: player.id, userId: req.user.id });
  res.status(201).json({ success: true, player });
});

export const updatePlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.player.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Player not found");
  const player = await prisma.player.update({ where: { id: Number(id) }, data: normalizePlayer(req.body), include: { team: true } });
  await logActivity(`Updated player "${player.name}"`, { entity: "Player", entityId: player.id, userId: req.user.id });
  res.json({ success: true, player });
});

export const deletePlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.player.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "Player not found");
  await prisma.player.delete({ where: { id: Number(id) } });
  await logActivity(`Deleted player "${existing.name}"`, { entity: "Player", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "Player deleted" });
});

export const deletePlayers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const players = await prisma.player.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  for (const p of players) {
    await prisma.player.delete({ where: { id: p.id } });
    deleted.push(p.id);
    await logActivity(`Bulk-deleted player #${p.id}`, { entity: "Player", entityId: p.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, message: "Players deleted" });
});

function normalizePlayer(d) {
  const name = d.name || "";
  const slug = d.slug || slugify(name);
  const dateOfBirth = d.dateOfBirth ? new Date(d.dateOfBirth) : null;
  let age = d.age != null ? Number(d.age) : null;
  if (dateOfBirth && !age) { const diff = Date.now() - dateOfBirth.getTime(); age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)); }
  return {
    name, slug, teamId: Number(d.teamId), position: d.position || null, dateOfBirth, age,
    nationality: d.nationality || null, city: d.city || null, height: d.height || null, weight: d.weight != null ? Number(d.weight) : null,
    preferredFoot: d.preferredFoot || null, jerseyNumber: d.jerseyNumber != null ? Number(d.jerseyNumber) : null,
    playerStatus: d.playerStatus || "Active", photo: d.photo || null, biography: d.biography || null, instagram: d.instagram || null,
    isFeatured: Boolean(d.isFeatured), status: d.status || "PUBLISHED", goals: Number(d.goals) || 0, assists: Number(d.assists) || 0,
    matches: Number(d.matches) || 0, yellowCards: Number(d.yellowCards) || 0, redCards: Number(d.redCards) || 0, minutesPlayed: Number(d.minutesPlayed) || 0,
  };
}

export const exportPlayers = asyncHandler(async (req, res) => {
  const items = await prisma.player.findMany({ orderBy: { name: "asc" }, include: { team: true } });
  const fields = getTemplate("players").columns;
  const records = items.map((p) => ({
    name: p.name, teamName: p.team?.name || "", position: p.position || "",
    dateOfBirth: p.dateOfBirth?.toISOString().split("T")[0] || "", age: p.age ?? "", nationality: p.nationality || "",
    city: p.city || "", height: p.height || "", weight: p.weight ?? "", preferredFoot: p.preferredFoot || "",
    jerseyNumber: p.jerseyNumber ?? "", playerStatus: p.playerStatus || "Active", photo: p.photo || "",
    biography: p.biography || "", instagram: p.instagram || "", isFeatured: p.isFeatured, status: p.status,
    goals: p.goals, assists: p.assists, matches: p.matches, yellowCards: p.yellowCards, redCards: p.redCards, minutesPlayed: p.minutesPlayed,
  }));
  const buffer = await exportToExcel("players", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="players.xlsx"');
  res.send(buffer);
});

export const exportPlayersTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("players");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="players-template.xlsx"');
  res.send(buffer);
});

export const importPlayers = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("players", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally { fs.unlinkSync(tempPath); }
});
