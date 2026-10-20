import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  deleteTeams,
  exportTeams,
  exportTeamsTemplate,
  importTeams,
} from "../controllers/teamController.js";
import { importMulter } from "../services/excel/importMulter.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * @openapi
 * /teams:
 *   get:
 *     tags: [Teams]
 *     summary: List teams with pagination and filters
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
 *         name: competition
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PUBLISHED, DRAFT, ARCHIVED] }
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of teams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 items: { type: array, items: { type: object } }
 *                 pagination: { type: object }
 */

/**
 * @openapi
 * /teams/{id}:
 *   get:
 *     tags: [Teams]
 *     summary: Get a single team with competition and counts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Team data }
 *       404: { description: Team not found }
 */

const router = Router();

router.get("/", listTeams);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportTeams);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportTeamsTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importTeams);
router.get("/:id", getTeam);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  validate,
  createTeam
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  validate,
  updateTeam
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  deleteTeam
);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteTeams
);

export default router;
