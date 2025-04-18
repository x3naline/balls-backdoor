// Custom error types for better error handling

export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message)
    this.name = "ValidationError"
    this.details = details
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = "NotFoundError"
  }
}

export class AuthenticationError extends Error {
  constructor(message) {
    super(message)
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends Error {
  constructor(message) {
    super(message)
    this.name = "AuthorizationError"
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = "ConflictError"
  }
}
