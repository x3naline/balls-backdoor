import express from "express"
import reportController from "../controllers/reportController.js"
import { authenticate, isAdmin, isSuperAdmin } from "../middlewares/authMiddleware.js"

const router = express.Router()

// Admin routes
router.get("/revenue", authenticate, isAdmin, reportController.generateRevenueReport)

// Super admin routes
router.get("/system", authenticate, isSuperAdmin, reportController.generateSystemStatistics)

export default router
