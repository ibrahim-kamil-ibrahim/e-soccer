import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listCities,
  getAllCities,
  getCityHierarchy,
  getSubcities,
  getWoredas,
  getKebeles,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  deleteCities,
  exportCities,
  exportCitiesTemplate,
  importCities,
} from "../controllers/cityController.js";
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

router.get("/", listCities);
router.get("/all", getAllCities);
router.get("/hierarchy", getCityHierarchy);
router.get("/subcities", getSubcities);
router.get("/woredas", getWoredas);
router.get("/kebeles", getKebeles);
router.get("/:id", getCity);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("region").isString().notEmpty().withMessage("Region is required"),
  validate,
  createCity
);
router.put(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("region").isString().notEmpty().withMessage("Region is required"),
  validate,
  updateCity
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  deleteCity
);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteCities
);

export default router;

router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCities);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCitiesTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importCities);
