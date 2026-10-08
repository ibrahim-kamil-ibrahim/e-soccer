import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function logActivity(action, { entity, entityId, userId } = {}) {
  try {
    await prisma.activityLog.create({
      data: { action, entity, entityId, userId },
    });
  } catch {
    // logging must never break a request
  }
}

export function formatPagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildSearchWhere(search, fields) {
  if (!search) return {};
  const escaped = search.replace(/[%_\\]/g, "\\$&");
  return {
    OR: fields.map((f) => ({
      [f]: { contains: escaped, mode: "insensitive" },
    })),
  };
}

export async function findEntity(model, id, options = {}) {
  const record = await prisma[model].findUnique({ where: { id: Number(id) }, ...options });
  if (!record) throw new AppError(404, `${model} not found`);
  return record;
}

export function toMatchStatus({ status, homeScore, awayScore, minute }) {
  if (status === "FT" || status === "POSTPONED" || status === "CANCELLED") {
    return { status, isLive: false, isFinished: status === "FT" };
  }
  if (status === "LIVE") {
    return {
      status,
      isLive: true,
      isFinished: false,
      minute: minute ?? 0,
    };
  }
  if (status === "UPCOMING") {
    return {
      status,
      isLive: false,
      isFinished: false,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      minute: null,
    };
  }
  return { status, isLive: false, isFinished: false, homeScore, awayScore, minute };
}

export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `item-${Date.now()}`;
}