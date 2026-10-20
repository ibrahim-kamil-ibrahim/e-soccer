import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { buildSearchWhere, formatPagination, logActivity } from "../services/helpers.js";
import { env } from "../config/env.js";
import { exportToExcel, generateTemplate } from "../services/excel/excelExport.js";
import { validateAndImport, parseExcel } from "../services/excel/excelImport.js";
import { getTemplate } from "../services/excel/excelTemplates.js";
import { importMulter } from "../services/excel/importMulter.js";
import os from "node:os";
import crypto from "node:crypto";

const uploadDirAbs = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadDirAbs)) fs.mkdirSync(uploadDirAbs, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirAbs),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      return cb(new AppError(400, "Only JPEG, PNG, WebP, GIF and SVG images are allowed"));
    }
    cb(null, true);
  },
});

function imageSizeOf(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(30);
    fs.readSync(fd, buf, 0, 30, 0);
    fs.closeSync(fd);
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset < buf.length) {
        if (buf[offset] !== 0xff) { offset++; continue; }
        const marker = buf[offset + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { width: buf.readUInt16BE(offset + 5), height: buf.readUInt16BE(offset + 7) };
        offset += 2 + buf.readUInt16BE(offset + 2);
      }
      return null;
    }
    if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf.toString("ascii", 0, 11) === "GIF87a" || buf.toString("ascii", 0, 11) === "GIF89a") return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      if (buf.toString("ascii", 12, 16) === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (buf.toString("ascii", 12, 16) === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      return null;
    }
    return null;
  } catch { return null; }
}

export const listMedia = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, category } = req.query;
  const where = { ...buildSearchWhere(search, ["filename"]), ...(category && category !== "all" ? { category } : {}) };
  const [total, items] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const category = req.body.category || "OTHER";
  const dims = imageSizeOf(req.file.path);
  const media = await prisma.media.create({
    data: { filename: req.file.originalname, url: `/uploads/${req.file.filename}`, mimeType: req.file.mimetype, size: req.file.size, width: dims?.width ?? null, height: dims?.height ?? null, category },
  });
  await logActivity(`Uploaded media "${media.filename}"`, { entity: "Media", entityId: media.id, userId: req.user.id });
  res.status(201).json({ success: true, media });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteMediaById(Number(id), req.user.id);
  res.json({ success: true, message: "Media deleted" });
});

export const deleteMediaBulk = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const items = await prisma.media.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  for (const m of items) {
    if (m.url.startsWith("/uploads/")) { const filePath = path.join(uploadDirAbs, path.basename(m.url)); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
    await prisma.media.delete({ where: { id: m.id } });
    deleted.push(m.id);
    await logActivity(`Bulk-deleted media #${m.id}`, { entity: "Media", entityId: m.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, message: "Media deleted" });
});

async function deleteMediaById(id, userId) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new AppError(404, "Media not found");
  if (media.url.startsWith("/uploads/")) { const filePath = path.join(uploadDirAbs, path.basename(media.url)); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
  await prisma.media.delete({ where: { id } });
  await logActivity(`Deleted media "${media.filename}"`, { entity: "Media", entityId: id, userId });
}

export const exportMedia = asyncHandler(async (req, res) => {
  const items = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  const fields = getTemplate("media").columns;
  const records = items.map((m) => ({ filename: m.filename, url: m.url, mimeType: m.mimeType, size: m.size, width: m.width ?? "", height: m.height ?? "", category: m.category }));
  const buffer = await exportToExcel("media", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="media.xlsx"');
  res.send(buffer);
});

export const exportMediaTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("media");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="media-template.xlsx"');
  res.send(buffer);
});

export const importMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("media", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally { fs.unlinkSync(tempPath); }
});
