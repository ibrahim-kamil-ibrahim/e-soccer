/**
 * @openapi
 * /players:
 *   get:
 *     tags: [Players]
 *     summary: List players with pagination and filters
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
 *         name: team
 *         schema: { type: string }
 *       - in: query
 *         name: position
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of players }
 */

/**
 * @openapi
 * /players/{id}:
 *   get:
 *     tags: [Players]
 *     summary: Get a single player with team and competition
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Player data }
 *       404: { description: Player not found }
 */
import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  deletePlayers,
  exportPlayers,
  exportPlayersTemplate,
  importPlayers,
} from "../controllers/playerController.js";
import { importMulter } from "../services/excel/importMulter.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();


router.get("/", listPlayers);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportPlayers);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportPlayersTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importPlayers);
router.get("/:id", getPlayer);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("teamId").isNumeric().withMessage("A team must be selected"),
  validate,
  createPlayer
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("teamId").isNumeric().withMessage("A team must be selected"),
  validate,
  updatePlayer
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  deletePlayer
);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deletePlayers
);


export default router;
