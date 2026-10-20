/**
 * @openapi
 * /media:
 *   get:
 *     tags: [Media]
 *     summary: List media files with pagination and filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [TEAM_LOGO, PLAYER_PHOTO, NEWS_COVER, COMPETITION_LOGO, HOMEPAGE, OTHER] }
 *     responses:
 *       200: { description: Paginated list of media files }
 */
import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  deleteMediaBulk,
  upload,
  exportMedia,
  exportMediaTemplate,
  importMedia,
} from "../controllers/mediaController.js";
import { importMulter } from "../services/excel/importMulter.js";

const router = Router();

router.get("/", listMedia);
router.post("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), upload.single("file"), uploadMedia);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), deleteMedia);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteMediaBulk
);

router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMedia);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMediaTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importMedia);

export default router;
