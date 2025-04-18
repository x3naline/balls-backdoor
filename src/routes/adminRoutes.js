import express from "express";
import adminController from "../controllers/adminController.js"; // Controller yang baru
import { authenticate, isSuperAdmin } from "../middlewares/authMiddleware.js"; // Middleware autentikasi
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"; // Middleware validasi

const router = express.Router();

// Admin routes (super admin only)
router.get("/admins", authenticate, isSuperAdmin, adminController.getAllAdmins);
router.post("/admins", authenticate, isSuperAdmin, validationMiddleware(schemas.register), adminController.createAdmin);
router.put("/admins/:user_id", authenticate, isSuperAdmin, validationMiddleware(schemas.updateProfile), adminController.updateAdmin);
router.delete("/admins/:user_id", authenticate, isSuperAdmin, adminController.deleteAdmin);

export default router;