import express from "express"
import userController from "../controllers/userController.js"
import { authenticate, isSuperAdmin } from "../middlewares/authMiddleware.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Get user profile
router.get("/profile", authenticate, userController.getProfile)

// Update user profile
router.put("/profile", authenticate, validationMiddleware(schemas.updateProfile), userController.updateProfile)

// Admin routes (super admin only)
router.post("/admins", authenticate, isSuperAdmin, validationMiddleware(schemas.register), userController.createAdmin)

router.get("/admins", authenticate, isSuperAdmin, userController.getAllAdmins)

router.put(
  "/admins/:user_id",
  authenticate,
  isSuperAdmin,
  validationMiddleware(schemas.updateProfile),
  userController.updateAdmin,
)

router.delete("/admins/:user_id", authenticate, isSuperAdmin, userController.deleteAdmin)

export default router
