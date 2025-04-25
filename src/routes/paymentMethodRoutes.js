import express from "express"
import paymentController from "../controllers/paymentController.js"

const router = express.Router()

// Get all payment methods
router.get("/", paymentController.getPaymentMethods)

export default router
