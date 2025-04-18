import db from "../database/index.js"
import idGenerator from "../utils/idGenerator.js"

export default {
  // Create a new payment
  async create(paymentData) {
    const { booking_id, method_id, amount, transaction_id } = paymentData

    // Generate payment ID
    const id = idGenerator.generatePaymentId()

    // Insert payment into database
    const query = `
      INSERT INTO payments (id, booking_id, method_id, amount, transaction_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, status
    `

    const values = [id, booking_id, method_id, amount, transaction_id]
    const result = await db.query(query, values)

    // Check if verification is required based on payment method
    const methodQuery = `
      SELECT method_name
      FROM payment_methods
      WHERE id = $1
    `

    const methodResult = await db.query(methodQuery, [method_id])
    const methodName = methodResult.rows[0].method_name

    // Credit card and e-wallet don't require verification
    const verificationRequired = !["credit_card", "e_wallet"].includes(methodName)

    return {
      ...result.rows[0],
      verification_required: verificationRequired,
    }
  },

  // Get payment by ID
  async getById(id) {
    const query = `
      SELECT p.id as payment_id, p.booking_id, p.amount, pm.method_name as method,
             p.status, p.transaction_id, p.payment_date, p.notes
      FROM payments p
      JOIN payment_methods pm ON p.method_id = pm.id
      WHERE p.id = $1
    `

    const result = await db.query(query, [id])

    return result.rows[0] || null
  },

  // Verify payment (admin only)
  async verify(id, statusId, notes) {
    // Map status ID to status string
    const statusMap = {
      2: "completed",
      3: "failed",
    }

    const status = statusMap[statusId]

    if (!status) {
      throw new Error("Invalid status ID")
    }

    const client = await db.getClient()

    try {
      await client.query("BEGIN")

      // Update payment
      const updateQuery = `
        UPDATE payments
        SET status = $1, notes = $2, payment_date = NOW(), updated_at = NOW()
        WHERE id = $3
        RETURNING booking_id
      `

      const updateResult = await client.query(updateQuery, [status, notes, id])

      if (updateResult.rows.length === 0) {
        throw new Error("Payment not found")
      }

      const { booking_id } = updateResult.rows[0]

      // If payment is completed, update booking status to confirmed
      if (status === "completed") {
        const updateBookingQuery = `
          UPDATE bookings
          SET booking_status = 'confirmed', updated_at = NOW()
          WHERE id = $1
        `

        await client.query(updateBookingQuery, [booking_id])

        // Add loyalty points
        const bookingQuery = `
          SELECT b.user_id, b.total_amount
          FROM bookings b
          WHERE b.id = $1
        `

        const bookingResult = await client.query(bookingQuery, [booking_id])
        const { user_id, total_amount } = bookingResult.rows[0]

        // Calculate points (e.g., 1 point per 10 currency units)
        const pointsPerBooking = Number.parseInt(process.env.POINTS_PER_BOOKING) || 10
        const pointsEarned = Math.floor(total_amount / 10) + pointsPerBooking

        // Calculate expiry date (1 year from now)
        const pointsExpiryDays = Number.parseInt(process.env.POINTS_EXPIRY_DAYS) || 365
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + pointsExpiryDays)

        const pointId = idGenerator.generatePointId()

        const addPointsQuery = `
          INSERT INTO loyalty_points (id, user_id, points_earned, source, reference, expiry_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `

        await client.query(addPointsQuery, [pointId, user_id, pointsEarned, "booking", booking_id, expiryDate])
      } else if (status === "failed") {
        // If payment failed, keep booking as pending
        // Optionally, you could cancel the booking after a certain time
      }

      await client.query("COMMIT")

      return { id }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  },

  // Get all payments (admin only)
  async getAllPayments(filters = {}) {
    const { from_date, to_date } = filters

    // Validate required filters
    if (!from_date || !to_date) {
      throw new Error("From date and to date are required")
    }

    // Get all payments in the period
    const paymentsQuery = `
      SELECT p.id as payment_id, p.booking_id, p.amount, pm.method_name, 
             p.status, p.transaction_id, p.payment_date, p.notes
      FROM payments p
      JOIN payment_methods pm ON p.method_id = pm.id
      WHERE p.created_at BETWEEN $1 AND $2
      AND p.status = 'completed'
    `

    const paymentsResult = await db.query(paymentsQuery, [from_date, to_date])
    const payments = paymentsResult.rows

    // Calculate summary by payment method
    const methodMap = new Map()
    let totalRevenue = 0

    payments.forEach((payment) => {
      totalRevenue += Number.parseFloat(payment.amount)

      if (!methodMap.has(payment.method_name)) {
        methodMap.set(payment.method_name, {
          method_name: payment.method_name,
          count: 0,
          amount: 0,
        })
      }

      const methodStats = methodMap.get(payment.method_name)
      methodStats.count++
      methodStats.amount += Number.parseFloat(payment.amount)
    })

    const paymentMethods = []
    methodMap.forEach((value) => {
      paymentMethods.push({
        ...value,
        amount: Number.parseFloat(value.amount.toFixed(2)),
      })
    })

    return {
      period: {
        from_date,
        to_date,
      },
      total_revenue: Number.parseFloat(totalRevenue.toFixed(2)),
      payment: payments.map((p) => ({
        ...p,
        amount: Number.parseFloat(p.amount),
      })),
    }
  },

  // Get payment methods
  async getPaymentMethods() {
    const query = `
      SELECT id as method_id, method_name
      FROM payment_methods
      WHERE is_active = true
      ORDER BY id ASC
    `

    const result = await db.query(query)

    return result.rows
  },
}
