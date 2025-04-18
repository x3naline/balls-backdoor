import express from "express"
import bookingController from "../controllers/bookingController.js"
import { authenticate, isAdmin } from "../middlewares/authMiddleware.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Create booking
router.post("/", authenticate, validationMiddleware(schemas.createBooking), bookingController.createBooking)

// Get user bookings
router.get("/my-bookings", authenticate, bookingController.getUserBookings)

// Get booking by ID
router.get("/:booking_id", authenticate, bookingController.getBookingById)

// Cancel booking
router.post("/:booking_id/cancel", authenticate, bookingController.cancelBooking)

// Admin routes
router.get("/", authenticate, isAdmin, bookingController.getAllBookings)

router.put(
  "/:booking_id/status",
  authenticate,
  isAdmin,
  validationMiddleware({
    booking_status: schemas.updateBookingStatus,
  }),
  bookingController.updateBookingStatus,
)

router.get("/reports", authenticate, isAdmin, bookingController.generateBookingReport)

export default router
