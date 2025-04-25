import bookingModel from "../models/bookingModel.js"
import fieldModel from "../models/fieldModel.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Create booking
  async createBooking(req, res, next) {
    try {
      const userId = req.user.id
      const { field_id, booking_date, start_time, end_time, notes } = req.body

      // Check if field exists
      const field = await fieldModel.getById(field_id)

      if (!field) {
        return res.status(404).json(responseFormatter.error("Field not found", "NOT_FOUND"))
      }

      if (!field.is_available) {
        return res.status(400).json(responseFormatter.error("Field is not available for booking", "VALIDATION_ERROR"))
      }

      // Check if the time slot is available
      const availability = await fieldModel.checkAvailability(field_id, booking_date)

      const startTimeStr = start_time.split(":").slice(0, 2).join(":")
      const endTimeStr = end_time.split(":").slice(0, 2).join(":")

      const isSlotAvailable = availability.available_slots.some((slot) => {
        const slotStartStr = slot.start_time.split(":").slice(0, 2).join(":")
        const slotEndStr = slot.end_time.split(":").slice(0, 2).join(":")

        return slotStartStr <= startTimeStr && slotEndStr >= endTimeStr
      })

      if (!isSlotAvailable) {
        return res.status(400).json(responseFormatter.error("Selected time slot is not available", "VALIDATION_ERROR"))
      }

      // Create booking
      const booking = await bookingModel.create({
        user_id: userId,
        field_id,
        booking_date,
        start_time,
        end_time,
        notes,
      })

      return res.status(201).json(responseFormatter.success("Booking created successfully", booking))
    } catch (error) {
      next(error)
    }
  },

  // Get user bookings
  async getUserBookings(req, res, next) {
    try {
      const userId = req.user.id
      const { status, from_date, to_date, page = 1, limit = 10 } = req.query

      // Parse query parameters
      const filters = { status, from_date, to_date }

      // Get bookings with pagination
      const { bookings, total } = await bookingModel.getUserBookings(
        userId,
        filters,
        Number.parseInt(page),
        Number.parseInt(limit),
      )

      // Format response with pagination
      const response = responseFormatter.pagination(bookings, total, Number.parseInt(page), Number.parseInt(limit))

      return res.status(200).json(responseFormatter.success("Bookings retrieved successfully", response))
    } catch (error) {
      next(error)
    }
  },

  // Get booking by ID
  async getBookingById(req, res, next) {
    try {
      const bookingId = req.params.booking_id

      // Get booking
      const booking = await bookingModel.getById(bookingId)

      if (!booking) {
        return res.status(404).json(responseFormatter.error("Booking not found", "NOT_FOUND"))
      }

      // Check if user is authorized to view this booking
      if (
        req.user.id !== booking.user.user_id &&
        req.user.user_type !== "admin" &&
        req.user.user_type !== "super_admin"
      ) {
        return res.status(403).json(responseFormatter.error("You are not authorized to view this booking", "FORBIDDEN"))
      }

      return res.status(200).json(responseFormatter.success("Booking retrieved successfully", booking))
    } catch (error) {
      next(error)
    }
  },

  // Cancel booking
  async cancelBooking(req, res, next) {
    try {
      const bookingId = req.params.booking_id

      // Get booking
      const booking = await bookingModel.getById(bookingId)

      if (!booking) {
        return res.status(404).json(responseFormatter.error("Booking not found", "NOT_FOUND"))
      }

      // Check if user is authorized to cancel this booking
      if (
        req.user.id !== booking.user.user_id &&
        req.user.user_type !== "admin" &&
        req.user.user_type !== "super_admin"
      ) {
        return res
          .status(403)
          .json(responseFormatter.error("You are not authorized to cancel this booking", "FORBIDDEN"))
      }

      // Check if booking can be cancelled
      if (booking.booking_status === "cancelled") {
        return res.status(400).json(responseFormatter.error("Booking is already cancelled", "VALIDATION_ERROR"))
      }

      if (booking.booking_status === "completed") {
        return res
          .status(400)
          .json(responseFormatter.error("Completed bookings cannot be cancelled", "VALIDATION_ERROR"))
      }

      // Cancel booking
      const result = await bookingModel.cancel(bookingId)

      return res.status(200).json(responseFormatter.success("Booking cancelled successfully", result))
    } catch (error) {
      next(error)
    }
  },

  // Get all bookings (admin only)
  async getAllBookings(req, res, next) {
    try {
      const { status, field_id, user_id, from_date, to_date, page = 1, limit = 10 } = req.query

      // Parse query parameters
      const filters = { status, field_id, user_id, from_date, to_date }

      // Get bookings with pagination
      const { bookings, total } = await bookingModel.getAllBookings(
        filters,
        Number.parseInt(page),
        Number.parseInt(limit),
      )

      // Format response with pagination
      const response = responseFormatter.pagination(bookings, total, Number.parseInt(page), Number.parseInt(limit))

      return res.status(200).json(responseFormatter.success("Bookings retrieved successfully", response))
    } catch (error) {
      next(error)
    }
  },

  // Get all bookings (admin only) - formatted for admin endpoint
  async getAllAdminBookings(req, res, next) {
    try {
      const { status, field_id, user_id, from_date, to_date, page = 1, limit = 10 } = req.query

      // Parse query parameters
      const filters = { status, field_id, user_id, from_date, to_date }

      // Get bookings with pagination
      const { bookings, total } = await bookingModel.getAllAdminBookings(
        filters,
        Number.parseInt(page),
        Number.parseInt(limit),
      )

      // Format response with pagination
      const response = responseFormatter.pagination(bookings, total, Number.parseInt(page), Number.parseInt(limit))

      return res.status(200).json(responseFormatter.success("Bookings retrieved successfully", response))
    } catch (error) {
      next(error)
    }
  },

  // Update booking status (admin only)
  async updateBookingStatus(req, res, next) {
    try {
      const bookingId = req.params.booking_id
      const { booking_status, notes } = req.body

      // Check if booking exists
      const booking = await bookingModel.getById(bookingId)

      if (!booking) {
        return res.status(404).json(responseFormatter.error("Booking not found", "NOT_FOUND"))
      }

      // Validate status
      const validStatuses = ["pending", "confirmed", "completed", "cancelled"]
      if (!validStatuses.includes(booking_status)) {
        return res.status(400).json(responseFormatter.error("Invalid booking status", "VALIDATION_ERROR"))
      }

      // Update booking status
      await bookingModel.updateStatus(bookingId, booking_status, notes)

      return res.status(200).json(responseFormatter.success("Booking status updated successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Generate booking report
  async generateBookingReport(req, res, next) {
    try {
      const { from_date, to_date, field_id, format = "json" } = req.query

      if (!from_date || !to_date) {
        return res.status(400).json(responseFormatter.error("From date and to date are required", "VALIDATION_ERROR"))
      }

      // Generate report
      const report = await bookingModel.generateReport({
        from_date,
        to_date,
        field_id,
      })

      // Handle different formats
      if (format === "json") {
        return res.status(200).json(responseFormatter.success("Booking report generated successfully", report))
      } else {
        // For other formats like CSV or PDF, you would implement the conversion here
        // This is a placeholder for future implementation
        return res.status(501).json(responseFormatter.error("Format not implemented yet", "NOT_IMPLEMENTED"))
      }
    } catch (error) {
      next(error)
    }
  },
}