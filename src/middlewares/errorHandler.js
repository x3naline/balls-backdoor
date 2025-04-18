import responseFormatter from "../utils/responseFormatter.js"

// Global error handler middleware
export default (err, req, res, next) => {
  console.error("Error:", err)

  // Default error status and message
  let statusCode = 500
  let errorMessage = "Internal server error"
  let errorCode = "SERVER_ERROR"
  let errors = null

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400
    errorMessage = "Validation error"
    errorCode = "VALIDATION_ERROR"
    errors = err.details
      ? err.details.map((detail) => ({
          field: detail.path[0],
          message: detail.message,
        }))
      : null
  } else if (err.name === "NotFoundError") {
    statusCode = 404
    errorMessage = err.message || "Resource not found"
    errorCode = "NOT_FOUND"
  } else if (err.name === "AuthenticationError") {
    statusCode = 401
    errorMessage = err.message || "Authentication failed"
    errorCode = "AUTH_ERROR"
  } else if (err.name === "AuthorizationError") {
    statusCode = 403
    errorMessage = err.message || "You are not authorized to access this resource"
    errorCode = "FORBIDDEN"
  } else if (err.name === "ConflictError") {
    statusCode = 409
    errorMessage = err.message || "Resource conflict"
    errorCode = "CONFLICT"
  }

  // Send error response
  return res.status(statusCode).json(responseFormatter.error(errorMessage, errorCode, errors))
}
