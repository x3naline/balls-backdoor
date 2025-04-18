import express from "express"
import fieldController from "../controllers/fieldController.js"
import { authenticate, isAdmin } from "../middlewares/authMiddleware.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"
import uploadMiddleware from "../middlewares/uploadMiddleware.js"

const router = express.Router()

// Public routes
router.get("/", fieldController.getAllFields)
router.get("/:field_id", fieldController.getFieldById)
router.get("/:field_id/availability", fieldController.checkAvailability)

// Admin routes
router.post(
  "/",
  authenticate,
  isAdmin,
  uploadMiddleware.uploadFieldImages,
  validationMiddleware(schemas.createField),
  fieldController.createField,
)

router.put(
  "/:field_id",
  authenticate,
  isAdmin,
  uploadMiddleware.uploadFieldImages,
  validationMiddleware(schemas.updateField),
  fieldController.updateField,
)

router.delete("/:field_id", authenticate, isAdmin, fieldController.deleteField)

export default router
