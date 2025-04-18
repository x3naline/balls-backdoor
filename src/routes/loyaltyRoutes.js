import express from "express"
import loyaltyController from "../controllers/loyaltyController.js"
import { authenticate, isAdmin } from "../middlewares/authMiddleware.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Get user points
router.get("/points", authenticate, loyaltyController.getUserPoints)

// Get loyalty programs
router.get("/programs", authenticate, loyaltyController.getLoyaltyPrograms)

// Redeem points
router.post("/redeem", authenticate, validationMiddleware(schemas.redeemPoints), loyaltyController.redeemPoints)

// Get redemption history
router.get("/redemptions", authenticate, loyaltyController.getRedemptionHistory)

// Admin routes
router.post(
  "/programs",
  authenticate,
  isAdmin,
  validationMiddleware(schemas.createLoyaltyProgram),
  loyaltyController.createLoyaltyProgram,
)

router.put(
  "/programs/:program_id",
  authenticate,
  isAdmin,
  validationMiddleware(schemas.updateLoyaltyProgram),
  loyaltyController.updateLoyaltyProgram,
)

router.delete("/programs/:program_id", authenticate, isAdmin, loyaltyController.deleteLoyaltyProgram)

router.get("/reports", authenticate, isAdmin, loyaltyController.generateLoyaltyReport)

export default router
