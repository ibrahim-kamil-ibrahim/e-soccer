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
    const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new AppError(400, "Only .xlsx and .xls files are allowed"));
  },
});

export const listCities = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, region, cityType, status } = req.query;
  const where = {
    ...buildSearchWhere(search, ["name", "region", "subcity", "woreda", "kebele"]),
    ...(region && region !== "all" ? { region } : {}),
    ...(cityType && cityType !== "all" ? { cityType } : {}),
    ...(status && status !== "all" ? { status } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.city.count({ where }),
    prisma.city.findMany({ where, skip, take: limit, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getAllCities = asyncHandler(async (req, res) => {
  const items = await prisma.city.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  res.json({ success: true, items });
});

export const getCityHierarchy = asyncHandler(async (req, res) => {
  const items = await prisma.city.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const hierarchy = {};
  for (const city of items) {
    if (!hierarchy[city.region]) hierarchy[city.region] = {};
    const cityKey = city.name;
    if (!hierarchy[city.region][cityKey]) hierarchy[city.region][cityKey] = { subcities: {}, woredas: [], kebeles: [] };
    if (city.subcity) {
      if (!hierarchy[city.region][cityKey].subcities[city.subcity]) hierarchy[city.region][cityKey].subcities[city.subcity] = { woredas: [] };
      if (city.woreda && !hierarchy[city.region][cityKey].subcities[city.subcity].woredas.includes(city.woreda))
        hierarchy[city.region][cityKey].subcities[city.subcity].woredas.push(city.woreda);
    }
    if (city.woreda && !city.subcity && !hierarchy[city.region][cityKey].woredas.includes(city.woreda))
      hierarchy[city.region][cityKey].woredas.push(city.woreda);
    if (city.kebele && !hierarchy[city.region][cityKey].kebeles.includes(city.kebele))
      hierarchy[city.region][cityKey].kebeles.push(city.kebele);
  }
  res.json({ success: true, hierarchy });
});

export const getSubcities = asyncHandler(async (req, res) => {
  const { region, city } = req.query;
  const where = { status: "PUBLISHED" };
  if (region) where.region = region;
  if (city) where.name = city;
  const items = await prisma.city.findMany({ where, select: { subcity: true }, distinct: ["subcity"] });
  res.json({ success: true, items: items.map((i) => i.subcity).filter(Boolean) });
});

export const getWoredas = asyncHandler(async (req, res) => {
  const { region, city, subcity } = req.query;
  const where = { status: "PUBLISHED" };
  if (region) where.region = region;
  if (city) where.name = city;
  if (subcity) where.subcity = subcity;
  const items = await prisma.city.findMany({ where, select: { woreda: true }, distinct: ["woreda"] });
  res.json({ success: true, items: items.map((i) => i.woreda).filter(Boolean) });
});

export const getKebeles = asyncHandler(async (req, res) => {
  const { region, city, subcity, woreda } = req.query;
  const where = { status: "PUBLISHED" };
  if (region) where.region = region;
  if (city) where.name = city;
  if (subcity) where.subcity = subcity;
  if (woreda) where.woreda = woreda;
  const items = await prisma.city.findMany({ where, select: { kebele: true }, distinct: ["kebele"] });
  res.json({ success: true, items: items.map((i) => i.kebele).filter(Boolean) });
});

export const getCity = asyncHandler(async (req, res) => {
  const city = await prisma.city.findUnique({ where: { id: Number(req.params.id) } });
  if (!city) throw new AppError(404, "City not found");
  res.json({ success: true, city });
});

export const createCity = asyncHandler(async (req, res) => {
  const city = await prisma.city.create({ data: normalizeCity(req.body) });
  await logActivity(`Created city "${city.name}"`, { entity: "City", entityId: city.id, userId: req.user.id });
  res.status(201).json({ success: true, city });
});

export const updateCity = asyncHandler(async (req, res) => {
  const existing = await prisma.city.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) throw new AppError(404, "City not found");
  const city = await prisma.city.update({ where: { id: Number(req.params.id) }, data: normalizeCity(req.body) });
  await logActivity(`Updated city "${city.name}"`, { entity: "City", entityId: city.id, userId: req.user.id });
  res.json({ success: true, city });
});

export const deleteCity = asyncHandler(async (req, res) => {
  const existing = await prisma.city.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) throw new AppError(404, "City not found");
  await prisma.city.delete({ where: { id: Number(req.params.id) } });
  await logActivity(`Deleted city "${existing.name}"`, { entity: "City", entityId: Number(req.params.id), userId: req.user.id });
  res.json({ success: true, message: "City deleted" });
});

export const deleteCities = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const cities = await prisma.city.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  for (const c of cities) {
    await prisma.city.delete({ where: { id: c.id } });
    deleted.push(c.id);
    await logActivity(`Bulk-deleted city #${c.id}`, { entity: "City", entityId: c.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, message: "Cities deleted" });
});

function normalizeCity(d) {
  const name = d.name || "";
  const slug = d.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    name, slug, region: d.region || "", cityType: d.cityType || null, subcity: d.subcity || null,
    woreda: d.woreda || null, kebele: d.kebele || null, logo: d.logo || null, description: d.description || null,
    latitude: d.latitude != null ? Number(d.latitude) : null, longitude: d.longitude != null ? Number(d.longitude) : null,
    isFeatured: Boolean(d.isFeatured), status: d.status || "PUBLISHED", sortOrder: Number(d.sortOrder) || 0,
  };
}

export const exportCities = asyncHandler(async (req, res) => {
  const items = await prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const fields = getTemplate("cities").columns;
  const records = items.map((c) => ({
    name: c.name, region: c.region, cityType: c.cityType || "", subcity: c.subcity || "",
    woreda: c.woreda || "", kebele: c.kebele || "", logo: c.logo || "", description: c.description || "",
    latitude: c.latitude ?? "", longitude: c.longitude ?? "", isFeatured: c.isFeatured, status: c.status, sortOrder: c.sortOrder,
  }));
  const buffer = await exportToExcel("cities", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="cities.xlsx"');
  res.send(buffer);
});

export const exportCitiesTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("cities");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="cities-template.xlsx"');
  res.send(buffer);
});

export const importCities = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("cities", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally { fs.unlinkSync(tempPath); }
});
