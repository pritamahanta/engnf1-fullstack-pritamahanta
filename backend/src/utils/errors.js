export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const validationError = (message = "Invalid request") =>
  new AppError(400, "VALIDATION_ERROR", message);

export const unauthenticated = (message = "Authentication required") =>
  new AppError(401, "UNAUTHENTICATED", message);

export const forbidden = (message = "You do not have permission to do this") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "Not found") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message = "Conflict") =>
  new AppError(409, "CONFLICT", message);