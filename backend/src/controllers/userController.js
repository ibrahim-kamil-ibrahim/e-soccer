import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { logActivity, buildSearchWhere, formatPagination } from "../services/helpers.js";
import { publicUser } from "./authController.js";
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

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, role, status } = req.query;
  const where = {
    ...buildSearchWhere(search, ["name", "email"]),
    ...(role && role !== "all" ? { role } : {}),
    ...(status && status !== "all" ? { status } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.adminUser.count({ where }),
    prisma.adminUser.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
  ]);
  res.json({ success: true, items: items.map(publicUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.adminUser.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) throw new AppError(404, "User not found");
  res.json({ success: true, user: publicUser(user) });
});

export const createUser = asyncHandler(async (req, res) => {
  const d = req.body;
  if (req.user.role !== "SUPER_ADMIN") throw new AppError(403, "Only SUPER_ADMIN can create users");
  const existing = await prisma.adminUser.findUnique({ where: { email: (d.email || "").toLowerCase().trim() } });
  if (existing) throw new AppError(409, "A user with this email already exists");
  if (!d.password || d.password.length < 8) throw new AppError(422, "Password must be at least 8 characters");
  const user = await prisma.adminUser.create({
    data: { name: d.name, email: d.email.toLowerCase().trim(), username: d.username || null, passwordHash: await bcrypt.hash(d.password, 12), role: d.role || "EDITOR", status: d.status || "ACTIVE" },
  });
  await logActivity(`Created user "${user.email}"`, { entity: "User", entityId: user.id, userId: req.user.id });
  res.status(201).json({ success: true, user: publicUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await prisma.adminUser.findUnique({ where: { id: Number(id) } });
  if (!target) throw new AppError(404, "User not found");
  if (req.user.role !== "SUPER_ADMIN") {
    if (target.id !== req.user.id) throw new AppError(403, "Only SUPER_ADMIN can edit other users");
  }
  const d = req.body;
  const data = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.username !== undefined) data.username = d.username || null;
  if (d.role !== undefined) { if (req.user.role !== "SUPER_ADMIN") throw new AppError(403, "Only SUPER_ADMIN can change roles"); data.role = d.role; }
  if (d.status !== undefined) { if (req.user.role !== "SUPER_ADMIN") throw new AppError(403, "Only SUPER_ADMIN can change status"); data.status = d.status; }
  if (d.email !== undefined && d.email !== target.email) {
    const dup = await prisma.adminUser.findUnique({ where: { email: d.email.toLowerCase().trim() } });
    if (dup) throw new AppError(409, "A user with this email already exists");
    data.email = d.email.toLowerCase().trim();
  }
  if (d.password) { if (d.password.length < 8) throw new AppError(422, "Password must be at least 8 characters"); data.passwordHash = await bcrypt.hash(d.password, 12); }
  const user = await prisma.adminUser.update({ where: { id: Number(id) }, data });
  await logActivity(`Updated user "${user.email}"`, { entity: "User", entityId: user.id, userId: req.user.id });
  res.json({ success: true, user: publicUser(user) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== "SUPER_ADMIN") throw new AppError(403, "Only SUPER_ADMIN can delete users");
  if (Number(id) === req.user.id) throw new AppError(422, "You cannot delete your own account");
  const target = await prisma.adminUser.findUnique({ where: { id: Number(id) } });
  if (!target) throw new AppError(404, "User not found");
  await prisma.adminUser.delete({ where: { id: Number(id) } });
  await logActivity(`Deleted user "${target.email}"`, { entity: "User", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "User deleted" });
});

export const deleteUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") throw new AppError(403, "Only SUPER_ADMIN can delete users");
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  if (idsNum.includes(req.user.id)) throw new AppError(422, "You cannot delete your own account");
  const users = await prisma.adminUser.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  for (const u of users) {
    await prisma.adminUser.delete({ where: { id: u.id } });
    deleted.push(u.id);
    await logActivity(`Bulk-deleted user #${u.id}`, { entity: "User", entityId: u.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, message: "Users deleted" });
});

export const exportUsers = asyncHandler(async (req, res) => {
  const items = await prisma.adminUser.findMany({ orderBy: { createdAt: "desc" } });
  const fields = getTemplate("users").columns;
  const records = items.map((u) => ({
    name: u.name, email: u.email, username: u.username || "", role: u.role,
    status: u.status, lastLoginAt: u.lastLoginAt?.toISOString().split("T")[0] || "", createdAt: u.createdAt.toISOString().split("T")[0],
  }));
  const buffer = await exportToExcel("users", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="users.xlsx"');
  res.send(buffer);
});

export const exportUsersTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("users");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="users-template.xlsx"');
  res.send(buffer);
});

export const importUsers = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("users", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally { fs.unlinkSync(tempPath); }
});
