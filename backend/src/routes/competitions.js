/**
 * @openapi
 * /competitions:
 *   get:
 *     tags: [Competitions]
 *     summary: List competitions with pagination and filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of competitions }
 */

/**
 * @openapi
 * /competitions/{id}:
 *   get:
 *     tags: [Competitions]
 *     summary: Get competition with teams, matches, and standings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Competition data }
 *       404: { description: Competition not found }
 */
import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listCompetitions,
  getCompetition,
  getCompetitionStandings,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  deleteCompetitions,
  exportCompetitions,
  exportCompetitionsTemplate,
  importCompetitions,
} from "../controllers/competitionController.js";
import { generateCompetitionBracket, getCompetitionBracket } from "../controllers/bracketController.js";
import { importMulter } from "../services/excel/importMulter.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

/**
 * @openapi
 * /competitions:
 *   post:
 *     tags: [Competitions]
 *     summary: Create a new competition
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, region]
 *             properties:
 *               name: { type: string }
 *               shortName: { type: string }
 *               region: { type: string }
 *               level: { type: string }
 *               type: { type: string }
 *               season: { type: string }
 *               description: { type: string }
 *               logo: { type: string }
 *               status: { type: string, enum: [PUBLISHED, DRAFT, ARCHIVED] }
 *               sortOrder: { type: integer }
 *     responses:
 *       201: { description: Competition created }
 *       400: { description: Validation error }
 */

/**
 * @openapi
 * /competitions/{id}/standings:
 *   get:
 *     tags: [Competitions]
 *     summary: Get standings for a competition
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: League table sorted by points }
 *       404: { description: Competition not found }
 */

router.get("/", listCompetitions);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCompetitions);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCompetitionsTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importCompetitions);
router.get("/:id", getCompetition);
router.get("/:id/standings", getCompetitionStandings);
router.get("/:id/bracket", getCompetitionBracket);
router.post(
  "/:id/bracket",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("teamIds").isArray({ min: 1 }).withMessage("teamIds array with at least one id is required"),
  validate,
  generateCompetitionBracket
);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  validate,
  createCompetition
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  validate,
  updateCompetition
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  deleteCompetition
);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteCompetitions
);


export default router;
