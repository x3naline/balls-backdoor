import express from "express"
import { authenticate, isSuperAdmin } from "../middlewares/authMiddleware.js"
import userController from "../controllers/userController.js"
import reportController from "../controllers/reportController.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Apply authentication and super admin middleware to all routes
router.use(authenticate, isSuperAdmin)

// Admin management routes
router.post("/admins", validationMiddleware(schemas.register), userController.createAdmin)
router.get("/admins", userController.getAllAdmins)
router.put("/admins/:user_id", validationMiddleware(schemas.updateProfile), userController.updateAdmin)
router.delete("/admins/:user_id", userController.deleteAdmin)

// System statistics
router.get("/system-statistics", reportController.generateSystemStatistics)

export default router
