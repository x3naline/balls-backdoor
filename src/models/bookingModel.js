import db from "../database/index.js"
import idGenerator from "../utils/idGenerator.js"

export default {
  // Create a new booking
  async create(bookingData) {
    const { user_id, field_id, booking_date, start_time, end_time, notes } = bookingData

    // Calculate duration in hours
    const startHour = Number.parseInt(start_time.split(":")[0])
    const startMinute = Number.parseInt(start_time.split(":")[1])
    const endHour = Number.parseInt(end_time.split(":")[0])
    const endMinute = Number.parseInt(end_time.split(":")[1])

    let durationHours = endHour - startHour
    if (endMinute < startMinute) {
      durationHours -= 1
      durationHours += (60 - startMinute + endMinute) / 60
    } else {
      durationHours += (endMinute - startMinute) / 60
    }

    // Get field hourly rate
    const fieldQuery = `
      SELECT hourly_rate
      FROM fields
      WHERE id = $1
    `

    const fieldResult = await db.query(fieldQuery, [field_id])

    if (fieldResult.rows.length === 0) {
      throw new Error("Field not found")
    }

    const hourlyRate = fieldResult.rows[0].hourly_rate
    const totalAmount = hourlyRate * durationHours

    // Generate booking ID
    const id = idGenerator.generateBookingId()

    // Insert booking into database
    const query = `
      INSERT INTO bookings (id, user_id, field_id, booking_date, start_time, end_time, 
                           duration_hours, total_amount, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, total_amount, duration_hours
    `

    const values = [
      id,
      user_id,
      field_id,
      booking_date,
      start_time,
      end_time,
      durationHours.toFixed(2),
      totalAmount.toFixed(2),
      notes,
    ]

    const result = await db.query(query, values)

    // Get payment methods
    const paymentMethodsQuery = `
      SELECT id as method_id, method_name
      FROM payment_methods
      WHERE is_active = true
    `

    const paymentMethodsResult = await db.query(paymentMethodsQuery)

    const bookingResult = result.rows[0]
    bookingResult.payment_methods = paymentMethodsResult.rows

    return bookingResult
  },

  // Get user bookings with pagination and filtering
  async getUserBookings(userId, filters = {}, page = 1, limit = 10) {
    const { status, from_date, to_date } = filters

    let query = `
      SELECT b.id as booking_id, b.field_id, f.field_name, b.booking_date, 
             b.start_time, b.end_time, b.duration_hours, b.total_amount, 
             b.booking_status, p.status as payment_status, b.created_at
      FROM bookings b
      JOIN fields f ON b.field_id = f.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.user_id = $1
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.user_id = $1
    `

    const values = [userId]
    let paramIndex = 2

    // Add filters
    let filterClause = ""

    if (status) {
      filterClause += ` AND b.booking_status = $${paramIndex}`
      values.push(status)
      paramIndex++
    }

    if (from_date) {
      filterClause += ` AND b.booking_date >= $${paramIndex}`
      values.push(from_date)
      paramIndex++
    }

    if (to_date) {
      filterClause += ` AND b.booking_date <= $${paramIndex}`
      values.push(to_date)
      paramIndex++
    }

    // Add pagination
    const offset = (page - 1) * limit
    query +=
      filterClause + ` ORDER BY b.booking_date DESC, b.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    // Execute queries
    const bookingsResult = await db.query(query, values)
    const countResult = await db.query(countQuery + filterClause, values.slice(0, paramIndex - 1))

    return {
      bookings: bookingsResult.rows,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  // Get booking by ID
  async getById(id) {
    const query = `
      SELECT b.id as booking_id, b.user_id, u.full_name, u.phone_number,
             b.field_id, f.field_name, fi.image_url,
             b.booking_date, b.start_time, b.end_time, b.duration_hours, 
             b.total_amount, b.booking_status, b.notes, b.created_at, b.updated_at,
             p.id as payment_id, p.method_id, pm.method_name as payment_method, 
             p.status as payment_status, p.payment_date, p.transaction_id,
             lp.points_earned
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN fields f ON b.field_id = f.id
      LEFT JOIN field_images fi ON f.id = fi.field_id AND fi.is_primary = true
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN payment_methods pm ON p.method_id = pm.id
      LEFT JOIN loyalty_points lp ON b.id = lp.reference AND lp.source = 'booking'
      WHERE b.id = $1
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    const booking = result.rows[0]

    // Format the response
    const formattedBooking = {
      booking_id: booking.booking_id,
      user: {
        user_id: booking.user_id,
        full_name: booking.full_name,
        phone_number: booking.phone_number,
      },
      field: {
        field_id: booking.field_id,
        field_name: booking.field_name,
        image_url: booking.image_url,
      },
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: booking.duration_hours,
      total_amount: booking.total_amount,
      booking_status: booking.booking_status,
      notes: booking.notes,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      points_earned: booking.points_earned,
    }

    // Add payment info if exists
    if (booking.payment_id) {
      formattedBooking.payment = {
        payment_id: booking.payment_id,
        method: booking.payment_method,
        status: booking.payment_status,
        payment_date: booking.payment_date,
        transaction_id: booking.transaction_id,
      }
    }

    return formattedBooking
  },

  // Cancel booking
  async cancel(id) {
    const client = await db.getClient()

    try {
      await client.query("BEGIN")

      // Get booking details
      const bookingQuery = `
        SELECT total_amount, booking_status
        FROM bookings
        WHERE id = $1
      `

      const bookingResult = await client.query(bookingQuery, [id])

      if (bookingResult.rows.length === 0) {
        throw new Error("Booking not found")
      }

      const booking = bookingResult.rows[0]

      if (booking.booking_status === "cancelled") {
        throw new Error("Booking is already cancelled")
      }

      // Update booking status
      const updateQuery = `
        UPDATE bookings
        SET booking_status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `

      await client.query(updateQuery, [id])

      // Check if payment exists and update status
      const paymentQuery = `
        SELECT id, status
        FROM payments
        WHERE booking_id = $1
      `

      const paymentResult = await client.query(paymentQuery, [id])

      let refundStatus = null
      let refundAmount = null

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0]

        if (payment.status === "completed") {
          // Calculate refund amount (e.g., 90% of total)
          refundAmount = booking.total_amount * 0.9
          refundStatus = "processing"

          // Update payment status
          const updatePaymentQuery = `
            UPDATE payments
            SET status = 'refunded', notes = 'Refunded due to cancellation', updated_at = NOW()
            WHERE id = $1
          `

          await client.query(updatePaymentQuery, [payment.id])
        }
      }

      await client.query("COMMIT")

      return {
        booking_id: id,
        refund_status: refundStatus,
        refund_amount: refundAmount ? Number(refundAmount.toFixed(2)) : null,
      }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  },

  // Get all bookings (admin only)
  async getAllBookings(filters = {}, page = 1, limit = 10) {
    const { status, field_id, user_id, from_date, to_date } = filters

    let query = `
      SELECT b.id as booking_id, b.user_id, u.full_name,
             b.field_id, f.field_name, b.booking_date, 
             b.start_time, b.end_time, b.total_amount, 
             b.booking_status, p.status as payment_status, b.created_at
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN fields f ON b.field_id = f.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE 1=1
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN fields f ON b.field_id = f.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE 1=1
    `

    const values = []
    let paramIndex = 1

    // Add filters
    let filterClause = ""

    if (status) {
      filterClause += ` AND b.booking_status = $${paramIndex}`
      values.push(status)
      paramIndex++
    }

    if (field_id) {
      filterClause += ` AND b.field_id = $${paramIndex}`
      values.push(field_id)
      paramIndex++
    }

    if (user_id) {
      filterClause += ` AND b.user_id = $${paramIndex}`
      values.push(user_id)
      paramIndex++
    }

    if (from_date) {
      filterClause += ` AND b.booking_date >= $${paramIndex}`
      values.push(from_date)
      paramIndex++
    }

    if (to_date) {
      filterClause += ` AND b.booking_date <= $${paramIndex}`
      values.push(to_date)
      paramIndex++
    }

    // Add pagination
    const offset = (page - 1) * limit
    query +=
      filterClause + ` ORDER BY b.booking_date DESC, b.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    // Execute queries
    const bookingsResult = await db.query(query, values)
    const countResult = await db.query(countQuery + filterClause, values.slice(0, paramIndex - 1))

    return {
      bookings: bookingsResult.rows,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  // Get all bookings for admin with formatted response
  async getAllAdminBookings(filters = {}, page = 1, limit = 10) {
    const { status, field_id, user_id, from_date, to_date } = filters

    let query = `
      SELECT b.id as booking_id, b.user_id, u.full_name,
             b.field_id, f.field_name, b.booking_date, 
             b.start_time, b.end_time, b.total_amount, 
             b.booking_status, p.status as payment_status, b.created_at
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN fields f ON b.field_id = f.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE 1=1
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN fields f ON b.field_id = f.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE 1=1
    `

    const values = []
    let paramIndex = 1

    // Add filters
    let filterClause = ""

    if (status) {
      filterClause += ` AND b.booking_status = $${paramIndex}`
      values.push(status)
      paramIndex++
    }

    if (field_id) {
      filterClause += ` AND b.field_id = $${paramIndex}`
      values.push(field_id)
      paramIndex++
    }

    if (user_id) {
      filterClause += ` AND b.user_id = $${paramIndex}`
      values.push(user_id)
      paramIndex++
    }

    if (from_date) {
      filterClause += ` AND b.booking_date >= $${paramIndex}`
      values.push(from_date)
      paramIndex++
    }

    if (to_date) {
      filterClause += ` AND b.booking_date <= $${paramIndex}`
      values.push(to_date)
      paramIndex++
    }

    // Add pagination
    const offset = (page - 1) * limit
    query +=
      filterClause + ` ORDER BY b.booking_date DESC, b.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    // Execute queries
    const bookingsResult = await db.query(query, values)
    const countResult = await db.query(countQuery + filterClause, values.slice(0, paramIndex - 1))

    // Format the bookings to match the required response structure
    const formattedBookings = bookingsResult.rows.map((booking) => ({
      booking_id: booking.booking_id,
      user: {
        user_id: booking.user_id,
        full_name: booking.full_name,
      },
      field: {
        field_id: booking.field_id,
        field_name: booking.field_name,
      },
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      total_amount: Number(booking.total_amount),
      booking_status: booking.booking_status,
      payment_status: booking.payment_status || null,
      created_at: booking.created_at,
    }))

    return {
      bookings: formattedBookings,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  // Update booking status (admin only)
  async updateStatus(id, status, notes) {
    const query = `
      UPDATE bookings
      SET booking_status = $1, notes = COALESCE($2, notes), updated_at = NOW()
      WHERE id = $3
      RETURNING id
    `

    const result = await db.query(query, [status, notes, id])

    return result.rows[0] || null
  },

  // Generate booking reports
  async generateReport(filters = {}) {
    const { from_date, to_date, field_id } = filters

    // Validate required filters
    if (!from_date || !to_date) {
      throw new Error("From date and to date are required")
    }

    // Base query for all bookings in the period
    let baseQuery = `
      SELECT b.id, b.field_id, f.field_name, b.booking_date, 
             b.start_time, b.end_time, b.duration_hours, 
             b.total_amount, b.booking_status
      FROM bookings b
      JOIN fields f ON b.field_id = f.id
      WHERE b.booking_date BETWEEN $1 AND $2
    `

    const values = [from_date, to_date]
    let paramIndex = 3

    if (field_id) {
      baseQuery += ` AND b.field_id = $${paramIndex}`
      values.push(field_id)
      paramIndex++
    }

    // Execute base query
    const bookingsResult = await db.query(baseQuery, values)
    const bookings = bookingsResult.rows

    // Calculate summary statistics
    const totalBookings = bookings.length
    const completedBookings = bookings.filter((b) => b.booking_status === "completed").length
    const cancelledBookings = bookings.filter((b) => b.booking_status === "cancelled").length
    const totalRevenue = bookings
      .filter((b) => b.booking_status !== "cancelled")
      .reduce((sum, b) => sum + Number.parseFloat(b.total_amount), 0)

    // Calculate field usage
    const fieldsUsage = []
    const fieldMap = new Map()

    bookings.forEach((booking) => {
      if (booking.booking_status === "cancelled") return

      if (!fieldMap.has(booking.field_id)) {
        fieldMap.set(booking.field_id, {
          field_id: booking.field_id,
          field_name: booking.field_name,
          bookings_count: 0,
          total_hours: 0,
          revenue: 0,
        })
      }

      const fieldStats = fieldMap.get(booking.field_id)
      fieldStats.bookings_count++
      fieldStats.total_hours += Number.parseFloat(booking.duration_hours)
      fieldStats.revenue += Number.parseFloat(booking.total_amount)
    })

    fieldMap.forEach((value) => {
      fieldsUsage.push({
        ...value,
        total_hours: Number.parseFloat(value.total_hours.toFixed(2)),
        revenue: Number.parseFloat(value.revenue.toFixed(2)),
      })
    })

    // Calculate daily bookings
    const dailyBookings = []
    const dateMap = new Map()

    bookings.forEach((booking) => {
      if (booking.booking_status === "cancelled") return

      const dateStr = booking.booking_date.toISOString().split("T")[0]

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          bookings_count: 0,
          revenue: 0,
        })
      }

      const dateStats = dateMap.get(dateStr)
      dateStats.bookings_count++
      dateStats.revenue += Number.parseFloat(booking.total_amount)
    })

    dateMap.forEach((value) => {
      dailyBookings.push({
        ...value,
        revenue: Number.parseFloat(value.revenue.toFixed(2)),
      })
    })

    // Sort daily bookings by date
    dailyBookings.sort((a, b) => new Date(a.date) - new Date(b.date))

    return {
      period: {
        from_date,
        to_date,
      },
      total_bookings: totalBookings,
      completed_bookings: completedBookings,
      cancelled_bookings: cancelledBookings,
      total_revenue: Number.parseFloat(totalRevenue.toFixed(2)),
      fields_usage: fieldsUsage,
      daily_bookings: dailyBookings,
    }
  },
}
