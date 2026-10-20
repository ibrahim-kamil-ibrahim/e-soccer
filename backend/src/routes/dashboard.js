/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get admin dashboard statistics
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Dashboard stats (totalMatches, liveMatches, totalTeams, totalPlayers, totalCompetitions, totalNews) }
 */

/**
 * @openapi
 * /dashboard/matches/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent matches for dashboard
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 *     responses:
 *       200: { description: Recent matches }
 */
import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { computeStandings, computeTopScorers } from "../services/standings.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [
      totalMatches,
      liveMatches,
      totalTeams,
      totalPlayers,
      totalCompetitions,
      totalNews,
      totalMedia,
      totalUsers,
      pendingNews,
    ] = await Promise.all([
      prisma.match.count(),
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.team.count(),
      prisma.player.count(),
      prisma.competition.count(),
      prisma.newsArticle.count({ where: { status: "PUBLISHED" } }),
      prisma.media.count(),
      prisma.adminUser.count(),
      prisma.newsArticle.count({ where: { status: "DRAFT" } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalMatches,
        liveMatches,
        totalTeams,
        totalPlayers,
        totalCompetitions,
        totalNews,
        totalMedia,
        totalUsers,
        pendingNews,
      },
    });
  })
);

router.get(
  "/recent-matches",
  asyncHandler(async (_req, res) => {
    const matches = await prisma.match.findMany({
      orderBy: { date: "desc" },
      take: 6,
      include: { competition: true, homeTeam: true, awayTeam: true },
    });
    res.json({ success: true, matches });
  })
);

router.get(
  "/live-matches",
  asyncHandler(async (_req, res) => {
    const matches = await prisma.match.findMany({
      where: { status: "LIVE" },
      orderBy: { date: "asc" },
      include: { competition: true, homeTeam: true, awayTeam: true },
    });
    res.json({ success: true, matches });
  })
);

router.get(
  "/standings/:competitionId",
  asyncHandler(async (req, res) => {
    const standings = await computeStandings(req.params.competitionId);
    res.json({ success: true, standings });
  })
);

router.get(
  "/top-scorers",
  asyncHandler(async (_req, res) => {
    const scorers = await computeTopScorers(10);
    res.json({ success: true, scorers });
  })
);

export default router;