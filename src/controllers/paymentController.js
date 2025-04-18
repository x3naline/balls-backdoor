import paymentModel from "../models/paymentModel.js"
import bookingModel from "../models/bookingModel.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Create payment
  async createPayment(req, res, next) {
    try {
      const { booking_id, method_id, amount, transaction_id } = req.body

      // Check if booking exists
      const booking = await bookingModel.getById(booking_id)

      if (!booking) {
        return res.status(404).json(responseFormatter.error("Booking not found", "NOT_FOUND"))
      }

      // Check if user is authorized to pay for this booking
      if (
        req.user.id !== booking.user.user_id &&
        req.user.user_type !== "admin" &&
        req.user.user_type !== "super_admin"
      ) {
        return res
          .status(403)
          .json(responseFormatter.error("You are not authorized to pay for this booking", "FORBIDDEN"))
      }

      // Check if booking already has a payment
      if (booking.payment) {
        return res
          .status(400)
          .json(responseFormatter.error("Payment already exists for this booking", "VALIDATION_ERROR"))
      }

      // Create payment
      const payment = await paymentModel.create({
        booking_id,
        method_id,
        amount,
        transaction_id,
      })

      return res.status(201).json(responseFormatter.success("Payment created successfully", payment))
    } catch (error) {
      next(error)
    }
  },

  // Get payment by ID
  async getPaymentById(req, res, next) {
    try {
      const paymentId = req.params.payment_id

      // Get payment
      const payment = await paymentModel.getById(paymentId)

      if (!payment) {
        return res.status(404).json(responseFormatter.error("Payment not found", "NOT_FOUND"))
      }

      // Get booking to check authorization
      const booking = await bookingModel.getById(payment.booking_id)

      // Check if user is authorized to view this payment
      if (
        req.user.id !== booking.user.user_id &&
        req.user.user_type !== "admin" &&
        req.user.user_type !== "super_admin"
      ) {
        return res.status(403).json(responseFormatter.error("You are not authorized to view this payment", "FORBIDDEN"))
      }

      return res.status(200).json(responseFormatter.success("Payment retrieved successfully", payment))
    } catch (error) {
      next(error)
    }
  },

  // Verify payment (admin only)
  async verifyPayment(req, res, next) {
    try {
      const paymentId = req.params.payment_id
      const { status_id, notes } = req.body

      // Get payment
      const payment = await paymentModel.getById(paymentId)

      if (!payment) {
        return res.status(404).json(responseFormatter.error("Payment not found", "NOT_FOUND"))
      }

      // Verify payment
      await paymentModel.verify(paymentId, status_id, notes)

      return res.status(200).json(responseFormatter.success("Payment verified successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Get payment methods
  async getPaymentMethods(req, res, next) {
    try {
      const methods = await paymentModel.getPaymentMethods()

      return res.status(200).json(responseFormatter.success("Payment methods retrieved successfully", methods))
    } catch (error) {
      next(error)
    }
  },

  // Generate payment report (admin only)
  async generatePaymentReport(req, res, next) {
    try {
      const { from_date, to_date, format = "json" } = req.query

      if (!from_date || !to_date) {
        return res.status(400).json(responseFormatter.error("From date and to date are required", "VALIDATION_ERROR"))
      }

      // Generate report
      const report = await paymentModel.getAllPayments({
        from_date,
        to_date,
      })

      // Handle different formats
      if (format === "json") {
        return res.status(200).json(responseFormatter.success("Payment report generated successfully", report))
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
