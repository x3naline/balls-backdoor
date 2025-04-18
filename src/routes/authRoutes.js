import express from "express"
import authController from "../controllers/authController.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Register a new user
router.post("/register", validationMiddleware(schemas.register), authController.register)

// Login user
router.post("/login", validationMiddleware(schemas.login), authController.login)

export default router
