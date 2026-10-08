import { validationResult } from "express-validator";
import { AppError } from "./errorHandler.js";

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new AppError(
        422,
        errors
          .array()
          .map((e) => e.msg)
          .join("; ")
      )
    );
  }
  next();
}

export function validateEntityId(param = "id") {
  return (req, _res, next) => {
    const id = Number(req.params[param]);
    if (!Number.isInteger(id) || id <= 0) {
      return next(new AppError(400, `Invalid ${param}`));
    }
    req.entityId = id;
    next();
  };
}