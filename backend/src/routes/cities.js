/**
 * @openapi
 * /cities:
 *   get:
 *     tags: [Cities]
 *     summary: List cities with pagination and filters
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
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: cityType
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of cities }
 */

/**
 * @openapi
 * /cities/hierarchy:
 *   get:
 *     tags: [Cities]
 *     summary: Get all cities grouped by region with hierarchy
 *     responses:
 *       200: { description: City hierarchy tree }
 */
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
import { importMulter } from "../services/excel/importMulter.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();


router.get("/", listCities);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCities);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), exportCitiesTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), importMulter.single("file"), importCities);
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
