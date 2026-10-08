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

router.get("/", listMatches);
router.get("/:id", getMatch);
router.get("/:id/standings", getMatchStandings);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("homeTeamId").isNumeric().withMessage("Home team is required"),
  body("awayTeamId").isNumeric().withMessage("Away team is required"),
  body("date").isString().notEmpty().withMessage("Date is required"),
  validate,
  createMatch
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("homeTeamId").isNumeric().withMessage("Home team is required"),
  body("awayTeamId").isNumeric().withMessage("Away team is required"),
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

router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMatches);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportMatchesTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importMatches);
