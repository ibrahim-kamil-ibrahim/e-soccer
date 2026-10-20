import multer from "multer";
import path from "node:path";
import { AppError } from "../../middleware/errorHandler.js";

const EXCEL_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

export const importMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (EXCEL_MIME.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only .xlsx and .xls files are allowed"));
    }
  },
});
