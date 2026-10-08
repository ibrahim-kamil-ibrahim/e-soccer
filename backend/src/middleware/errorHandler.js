export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.success = false;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFound(_req, _res, next) {
  next(new AppError(404, "Route not found"));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error("[e-soccer] error:", err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : err.message,
  });
}