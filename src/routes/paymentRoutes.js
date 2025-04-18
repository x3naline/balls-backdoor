import express from "express"
import paymentController from "../controllers/paymentController.js"
import { authenticate, isAdmin } from "../middlewares/authMiddleware.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Create payment
router.post("/", authenticate, validationMiddleware(schemas.createPayment), paymentController.createPayment)

// Get payment by ID
router.get("/:payment_id", authenticate, paymentController.getPaymentById)

// Get payment methods
router.get("/methods", authenticate, paymentController.getPaymentMethods)

// Admin routes
router.put(
  "/:payment_id/verify",
  authenticate,
  isAdmin,
  validationMiddleware(schemas.verifyPayment),
  paymentController.verifyPayment,
)

router.get("/reports", authenticate, isAdmin, paymentController.generatePaymentReport)

export default router
