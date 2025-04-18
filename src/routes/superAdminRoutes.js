import express from "express";
import superAdminController from "../controllers/superAdminController.js";
import { authenticate, isSuperAdmin } from "../middlewares/authMiddleware.js";
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js";

const router = express.Router();

// Mendapatkan daftar super admin
router.get("/super-admins", authenticate, isSuperAdmin, superAdminController.getAllSuperAdmins);

// Membuat super admin baru
router.post("/super-admins", authenticate, isSuperAdmin, validationMiddleware(schemas.register), superAdminController.createSuperAdmin);

// Memperbarui super admin
router.put("/super-admins/:id", authenticate, isSuperAdmin, superAdminController.updateSuperAdmin);

// Menghapus super admin
router.delete("/super-admins/:id", authenticate, isSuperAdmin, superAdminController.deleteSuperAdmin);

export default router;