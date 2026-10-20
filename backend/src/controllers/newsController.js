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

export const listNews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = formatPagination(req.query);
  const { search, category, status, author, featured, publishedOnly } = req.query;
  // Anonymous visitors only ever see published articles; staff keep full visibility.
  const isStaff = Boolean(req.authId);
  let statusFilter;
  if (!isStaff) {
    statusFilter = "PUBLISHED";
  } else if (status && status !== "all") {
    statusFilter = status;
  } else if (publishedOnly === "true") {
    statusFilter = "PUBLISHED";
  }
  const where = {
    ...buildSearchWhere(search, ["title", "summary", "slug"]),
    ...(category && category !== "all" ? { category } : {}),
    ...(author && author !== "all" ? { author } : {}),
    ...(featured === "true" ? { featured: true } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({ where, skip, take: limit, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }] }),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getNews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const article = await prisma.newsArticle.findUnique({ where: { id: Number(id) } });
  if (!article) throw new AppError(404, "News article not found");
  if (!req.authId && article.status !== "PUBLISHED") throw new AppError(404, "News article not found");
  res.json({ success: true, article });
});

export const getNewsBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const article = await prisma.newsArticle.findUnique({ where: { slug } });
  if (!article) throw new AppError(404, "News article not found");
  if (!req.authId && article.status !== "PUBLISHED") throw new AppError(404, "News article not found");
  res.json({ success: true, article });
});

export const createNews = asyncHandler(async (req, res) => {
  const d = req.body;
  const slug = d.slug && d.slug !== "" ? d.slug : slugify(d.title);
  const existing = await prisma.newsArticle.findUnique({ where: { slug } });
  if (existing) throw new AppError(409, `A news article with slug "${slug}" already exists`);
  const article = await prisma.newsArticle.create({
    data: { title: d.title, slug, summary: d.summary || null, content: d.content || null, category: d.category || null, author: d.author || null, coverImage: d.coverImage || null, publishedAt: d.publishedAt ? new Date(d.publishedAt) : d.status === "PUBLISHED" ? new Date() : null, status: d.status || "DRAFT", featured: Boolean(d.featured) },
  });
  await logActivity(`Created news "${article.title}", status ${article.status}`, { entity: "News", entityId: article.id, userId: req.user.id });
  res.status(201).json({ success: true, article });
});

export const updateNews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.newsArticle.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "News article not found");
  const d = req.body;
  const slug = d.slug && d.slug !== "" ? d.slug : existing.slug;
  const dup = await prisma.newsArticle.findFirst({ where: { slug, id: { not: Number(id) } } });
  if (dup) throw new AppError(409, `A news article with slug "${slug}" already exists`);
  const article = await prisma.newsArticle.update({
    where: { id: Number(id) },
    data: {
      title: d.title ?? existing.title, slug,
      summary: d.summary !== undefined ? d.summary : existing.summary,
      content: d.content !== undefined ? d.content : existing.content,
      category: d.category !== undefined ? d.category : existing.category,
      author: d.author !== undefined ? d.author : existing.author,
      coverImage: d.coverImage !== undefined ? d.coverImage : existing.coverImage,
      publishedAt: d.publishedAt !== undefined ? (d.publishedAt ? new Date(d.publishedAt) : null) : (d.status === "PUBLISHED" ? (existing.publishedAt || new Date()) : existing.publishedAt),
      status: d.status ?? existing.status, featured: d.featured !== undefined ? Boolean(d.featured) : existing.featured,
    },
  });
  await logActivity(`Updated news "${article.title}"`, { entity: "News", entityId: article.id, userId: req.user.id });
  res.json({ success: true, article });
});

export const publishNews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.newsArticle.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "News article not found");
  const article = await prisma.newsArticle.update({ where: { id: Number(id) }, data: { status: "PUBLISHED", publishedAt: existing.publishedAt || new Date() } });
  await logActivity(`Published news "${article.title}"`, { entity: "News", entityId: article.id, userId: req.user.id });
  res.json({ success: true, article });
});

export const unpublishNews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.newsArticle.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "News article not found");
  const article = await prisma.newsArticle.update({ where: { id: Number(id) }, data: { status: "ARCHIVED" } });
  await logActivity(`Unpublished news "${article.title}"`, { entity: "News", entityId: article.id, userId: req.user.id });
  res.json({ success: true, article });
});

export const deleteNews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.newsArticle.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, "News article not found");
  await prisma.newsArticle.delete({ where: { id: Number(id) } });
  await logActivity(`Deleted news "${existing.title}"`, { entity: "News", entityId: Number(id), userId: req.user.id });
  res.json({ success: true, message: "News article deleted" });
});

export const deleteNewsBulk = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, "ids array is required");
  const idsNum = ids.map(Number);
  const articles = await prisma.newsArticle.findMany({ where: { id: { in: idsNum } } });
  const deleted = [];
  for (const a of articles) {
    await prisma.newsArticle.delete({ where: { id: a.id } });
    deleted.push(a.id);
    await logActivity(`Bulk-deleted news #${a.id}`, { entity: "News", entityId: a.id, userId: req.user.id });
  }
  res.json({ success: true, deleted: deleted.length, message: "News articles deleted" });
});

export const exportNews = asyncHandler(async (req, res) => {
  const items = await prisma.newsArticle.findMany({ orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }] });
  const fields = getTemplate("news").columns;
  const records = items.map((n) => ({
    title: n.title, summary: n.summary || "", content: n.content || "", category: n.category || "",
    author: n.author || "", coverImage: n.coverImage || "", publishedAt: n.publishedAt?.toISOString().split("T")[0] || "",
    status: n.status, featured: n.featured, slug: n.slug,
  }));
  const buffer = await exportToExcel("news", records, fields);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="news.xlsx"');
  res.send(buffer);
});

export const exportNewsTemplate = asyncHandler(async (req, res) => {
  const buffer = await generateTemplate("news");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="news-template.xlsx"');
  res.send(buffer);
});

export const importNews = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const tempPath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, req.file.buffer);
  try {
    const { headers, rows } = await parseExcel(tempPath);
    const result = await validateAndImport("news", rows, headers, req.user.id, prisma, logActivity);
    res.json({ success: true, ...result });
  } finally { fs.unlinkSync(tempPath); }
});
