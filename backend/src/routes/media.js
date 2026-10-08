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
  importMulter,
  exportMedia,
  exportMediaTemplate,
  importMedia,
} from "../controllers/mediaController.js";

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

export default router;
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMedia);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMediaTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importMedia);
