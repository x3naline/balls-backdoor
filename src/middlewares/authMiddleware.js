import jwtGenerator from "../utils/jwtGenerator.js"
import responseFormatter from "../utils/responseFormatter.js"
import userModel from "../models/userModel.js"

// Middleware to authenticate user using JWT
export const authenticate = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json(responseFormatter.error("Authentication required", "AUTH_ERROR"))
    }

    // Extract the token
    const token = authHeader.split(" ")[1]

    // Verify the token
    const decoded = jwtGenerator.verifyToken(token)

    if (!decoded) {
      return res.status(401).json(responseFormatter.error("Invalid or expired token", "AUTH_ERROR"))
    }

    // Check if user exists and is active
    const user = await userModel.findById(decoded.id)

    if (!user || !user.is_active) {
      return res.status(401).json(responseFormatter.error("User not found or inactive", "AUTH_ERROR"))
    }

    // Attach user to request object
    req.user = user

    next()
  } catch (error) {
    console.error("Authentication error:", error)
    return res.status(500).json(responseFormatter.error("Internal server error", "SERVER_ERROR"))
  }
}

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
  if (!req.user || (req.user.user_type !== "admin" && req.user.user_type !== "super_admin")) {
    return res.status(403).json(responseFormatter.error("Admin access required", "FORBIDDEN"))
  }

  next()
}

// Middleware to check if user is super admin
export const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.user_type !== "super_admin") {
    return res.status(403).json(responseFormatter.error("Super admin access required", "FORBIDDEN"))
  }

  next()
}

// Middleware to check if user is accessing their own resource
export const isResourceOwner = (paramName = "user_id") => {
  return (req, res, next) => {
    const resourceUserId = req.params[paramName]

    if (
      !req.user ||
      (req.user.id !== resourceUserId && req.user.user_type !== "admin" && req.user.user_type !== "super_admin")
    ) {
      return res
        .status(403)
        .json(responseFormatter.error("You are not authorized to access this resource", "FORBIDDEN"))
    }

    next()
  }
}
