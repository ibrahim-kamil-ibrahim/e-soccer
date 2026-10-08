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
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

import multer from "multer";

const importMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new AppError(400, "Only .xlsx and .xls files are allowed"));
  },
});

router.get("/", listNews);
router.get("/slug/:slug", getNewsBySlug);
router.get("/:id", getNews);
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

router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), exportNews);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), exportNewsTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), importMulter.single("file"), importNews);
