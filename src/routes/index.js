import express from "express"
import authRoutes from "./authRoutes.js"
import userRoutes from "./userRoutes.js"
import fieldRoutes from "./fieldRoutes.js"
import bookingRoutes from "./bookingRoutes.js"
import paymentRoutes from "./paymentRoutes.js"
import paymentMethodRoutes from "./paymentMethodRoutes.js"
import loyaltyRoutes from "./loyaltyRoutes.js"
import notificationRoutes from "./notificationRoutes.js"
import reportRoutes from "./reportRoutes.js"
import adminRoutes from "./adminRoutes.js"

const router = express.Router()

// API routes
router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/fields", fieldRoutes)
router.use("/bookings", bookingRoutes)
router.use("/payments", paymentRoutes)
router.use("/payment-methods", paymentMethodRoutes)
router.use("/loyalty", loyaltyRoutes)
router.use("/notifications", notificationRoutes)
router.use("/reports", reportRoutes)
router.use("/admin", adminRoutes)

// API health check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
})

export default router
