/**
 * @openapi
 * /news:
 *   get:
 *     tags: [News]
 *     summary: List news articles with pagination and filters
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
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PUBLISHED, DRAFT, ARCHIVED] }
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated list of news articles }
 */

/**
 * @openapi
 * /news/{id}:
 *   get:
 *     tags: [News]
 *     summary: Get a single news article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: News article }
 *       404: { description: Article not found }
 */
import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listNews,
  getNews,
  getNewsBySlug,
  createNews,
  updateNews,
  publishNews,
  unpublishNews,
  deleteNews,
  deleteNewsBulk,
  exportNews,
  exportNewsTemplate,
  importNews,
} from "../controllers/newsController.js";
import { importMulter } from "../services/excel/importMulter.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();


router.get("/", optionalAuth, listNews);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), exportNews);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), exportNewsTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), importMulter.single("file"), importNews);
router.get("/slug/:slug", optionalAuth, getNewsBySlug);
router.get("/:id", optionalAuth, getNews);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("title").isString().notEmpty().withMessage("Title is required"),
  validate,
  createNews
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("title").isString().notEmpty().withMessage("Title is required"),
  validate,
  updateNews
);
router.post(
  "/:id/publish",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  publishNews
);
router.post(
  "/:id/unpublish",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  unpublishNews
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  deleteNews
);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteNewsBulk
);


export default router;
