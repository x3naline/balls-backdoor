import express from "express"
import { authenticate, isAdmin } from "../middlewares/authMiddleware.js"
import bookingController from "../controllers/bookingController.js"
import fieldController from "../controllers/fieldController.js"
import paymentController from "../controllers/paymentController.js"
import loyaltyController from "../controllers/loyaltyController.js"
import reportController from "../controllers/reportController.js"
import notificationController from "../controllers/notificationController.js"

const router = express.Router()

// Apply authentication and admin middleware to all routes
router.use(authenticate, isAdmin)

// Admin booking routes
router.get("/bookings", bookingController.getAllAdminBookings)
router.put("/bookings/:booking_id/status", bookingController.updateBookingStatus)
router.get("/bookings/reports", bookingController.generateBookingReport)

// Admin payment routes
router.get("/payments", paymentController.getAllAdminPayments)
router.put("/payments/:payment_id/verify", paymentController.verifyPayment)
router.get("/payments/reports", paymentController.generatePaymentReport)

// Admin field routes
router.post("/fields", fieldController.createField)
router.put("/fields/:field_id", fieldController.updateField)
router.delete("/fields/:field_id", fieldController.deleteField)

// Admin loyalty routes
router.post("/loyalty/programs", loyaltyController.createLoyaltyProgram)
router.put("/loyalty/programs/:program_id", loyaltyController.updateLoyaltyProgram)
router.delete("/loyalty/programs/:program_id", loyaltyController.deleteLoyaltyProgram)
router.get("/loyalty/reports", loyaltyController.generateLoyaltyReport)

// Admin notification routes
router.post("/notifications/send", notificationController.sendNotification)

// Admin report routes
router.get("/reports/revenue", reportController.generateRevenueReport)
router.get("/reports/bookings", reportController.generateBookingReport)
router.get("/reports/loyalty", reportController.generateLoyaltyReport)

export default router
