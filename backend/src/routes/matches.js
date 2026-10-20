import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  deleteMatches,
  getMatchStandings,
  exportMatches,
  exportMatchesTemplate,
  importMatches,
} from "../controllers/matchController.js";
import { importMulter } from "../services/excel/importMulter.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * @openapi
 * /matches:
 *   get:
 *     tags: [Matches]
 *     summary: List matches with pagination and filters
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
 *         schema: { type: string, enum: [SCHEDULED, LIVE, FINISHED, POSTPONED, CANCELLED] }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: team
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of matches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 items: { type: array, items: { type: object } }
 *                 pagination: { type: object }
 */

const router = Router();

router.get("/", listMatches);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMatches);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMatchesTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importMatches);
router.get("/:id", getMatch);
router.get("/:id/standings", getMatchStandings);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("competitionId").optional({ nullable: true, checkFalsy: true }).isNumeric().withMessage("Competition must be a valid ID"),
  body("homeTeamId").isNumeric().withMessage("Home team is required"),
  body("awayTeamId").isNumeric().withMessage("Away team is required"),
  body("date").isISO8601().withMessage("A valid date is required"),
  body("status").optional().isIn(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]).withMessage("Invalid match status"),
  body("homeScore").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Home score must be a non-negative integer"),
  body("awayScore").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Away score must be a non-negative integer"),
  body("minute").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 130 }).withMessage("Minute must be between 0 and 130"),
  body("homePenalties").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Home penalties must be a non-negative integer"),
  body("awayPenalties").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Away penalties must be a non-negative integer"),
  body("addedTime").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 30 }).withMessage("Added time must be a non-negative integer"),
  body("addedTimeSecond").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 30 }).withMessage("Second-half added time must be a non-negative integer"),
  body("phase").optional({ nullable: true, checkFalsy: true }).isIn(["REGULATION", "ET", "PENS"]).withMessage("Invalid phase"),
  body("notes").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 300 }).withMessage("Notes must be 300 characters or less"),
  body("round").optional({ nullable: true, checkFalsy: true }).isString().withMessage("Round must be a string"),
  body("roundNumber").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage("Round number must be a positive integer"),
  body("bracketPosition").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Bracket position must be a non-negative integer"),
  validate,
  createMatch
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("homeTeamId").optional().isNumeric().withMessage("Home team is required"),
  body("awayTeamId").optional().isNumeric().withMessage("Away team is required"),
  body("date").optional().isISO8601().withMessage("A valid date is required"),
  body("status").optional().isIn(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]).withMessage("Invalid match status"),
  body("homeScore").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Home score must be a non-negative integer"),
  body("awayScore").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Away score must be a non-negative integer"),
  body("minute").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 130 }).withMessage("Minute must be between 0 and 130"),
  body("homePenalties").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Home penalties must be a non-negative integer"),
  body("awayPenalties").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage("Away penalties must be a non-negative integer"),
  body("addedTime").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 30 }).withMessage("Added time must be a non-negative integer"),
  body("addedTimeSecond").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 30 }).withMessage("Second-half added time must be a non-negative integer"),
  body("phase").optional({ nullable: true, checkFalsy: true }).isIn(["REGULATION", "ET", "PENS"]).withMessage("Invalid phase"),
  validate,
  updateMatch
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  deleteMatch
);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteMatches
);


export default router;
