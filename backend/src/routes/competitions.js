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

router.get("/", listCompetitions);
router.get("/standings", getCompetitionStandings);
router.get("/:id", getCompetition);
router.get("/:id/standings", getCompetitionStandings);
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

router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCompetitions);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCompetitionsTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importCompetitions);
