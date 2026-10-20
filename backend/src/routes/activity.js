/**
 * @openapi
 * /activity:
 *   get:
 *     tags: [Activity]
 *     summary: List activity log (SUPER_ADMIN or ADMIN only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated activity log }
 *       403: { description: Insufficient permissions }
 */
import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { formatPagination } from "../services/helpers.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = formatPagination(req.query);
    const [total, items] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, username: true, email: true, role: true } },
        },
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