import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { formatPagination } from "../services/helpers.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = formatPagination(req.query);
    const [total, items] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

export default router;