import db from "../database/index.js"
import paymentModel from "./paymentModel.js"

export default {
  // Generate revenue report
  async generateRevenueReport(filters = {}) {
    const { from_date, to_date, group_by = "day" } = filters

    // Validate required filters
    if (!from_date || !to_date) {
      throw new Error("From date and to date are required")
    }

    // Get payment data
    const paymentData = await paymentModel.getAllPayments({ from_date, to_date })

    // Group revenue by period (day, week, month)
    const revenueByPeriod = []
    const periodMap = new Map()

    paymentData.payment.forEach((payment) => {
      if (!payment.payment_date) return

      let periodKey
      const paymentDate = new Date(payment.payment_date)

      if (group_by === "day") {
        periodKey = paymentDate.toISOString().split("T")[0] // YYYY-MM-DD
      } else if (group_by === "week") {
        // Get the Monday of the week
        const day = paymentDate.getDay()
        const diff = paymentDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
        const monday = new Date(paymentDate)
        monday.setDate(diff)
        periodKey = monday.toISOString().split("T")[0]
      } else if (group_by === "month") {
        periodKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          revenue: 0,
        })
      }

      const periodStats = periodMap.get(periodKey)
      periodStats.revenue += Number.parseFloat(payment.amount)
    })

    periodMap.forEach((value) => {
      revenueByPeriod.push({
        ...value,
        revenue: Number.parseFloat(value.revenue.toFixed(2)),
      })
    })

    // Sort by period
    revenueByPeriod.sort((a, b) => a.period.localeCompare(b.period))

    return {
      ...paymentData,
      revenue_by_period: revenueByPeriod,
    }
  },

  // Generate system statistics (for super admin)
  async generateSystemStatistics(period = "monthly") {
    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()

    if (period === "daily") {
      startDate.setDate(startDate.getDate() - 1)
    } else if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1)
    } else if (period === "yearly") {
      startDate.setFullYear(startDate.getFullYear() - 1)
    }

    const from_date = startDate.toISOString().split("T")[0]
    const to_date = endDate.toISOString().split("T")[0]

    // Get user statistics
    const usersQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN created_at >= $1 THEN 1 ELSE 0 END) as new_this_period
      FROM users
      WHERE user_type = 'customer'
    `

    const usersResult = await db.query(usersQuery, [from_date])
    const users = usersResult.rows[0]

    // Get booking statistics
    const bookingsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN created_at >= $1 THEN 1 ELSE 0 END) as this_period
      FROM bookings
    `

    const bookingsResult = await db.query(bookingsQuery, [from_date])
    const bookings = bookingsResult.rows[0]

    // Get revenue statistics
    const revenueQuery = `
      SELECT 
        SUM(amount) as total,
        SUM(CASE WHEN payment_date >= $1 THEN amount ELSE 0 END) as this_period
      FROM payments
      WHERE status = 'completed'
    `

    const revenueResult = await db.query(revenueQuery, [from_date])
    const revenue = revenueResult.rows[0]

    // Calculate growth percentage
    let growthPercentage = 0

    if (period !== "daily") {
      // Calculate previous period
      const previousEndDate = new Date(startDate)
      previousEndDate.setDate(previousEndDate.getDate() - 1)

      const previousStartDate = new Date(previousEndDate)

      if (period === "weekly") {
        previousStartDate.setDate(previousStartDate.getDate() - 7)
      } else if (period === "monthly") {
        previousStartDate.setMonth(previousStartDate.getMonth() - 1)
      } else if (period === "yearly") {
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
      }

      const prev_from_date = previousStartDate.toISOString().split("T")[0]
      const prev_to_date = previousEndDate.toISOString().split("T")[0]

      const previousRevenueQuery = `
        SELECT SUM(amount) as total
        FROM payments
        WHERE status = 'completed'
        AND payment_date BETWEEN $1 AND $2
      `

      const previousRevenueResult = await db.query(previousRevenueQuery, [prev_from_date, prev_to_date])
      const previousRevenue = Number.parseFloat(previousRevenueResult.rows[0].total) || 0

      if (previousRevenue > 0) {
        growthPercentage = ((Number.parseFloat(revenue.this_period) - previousRevenue) / previousRevenue) * 100
      }
    }

    // Get field statistics
    const fieldsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_available = true THEN 1 ELSE 0 END) as active
      FROM fields
    `

    const fieldsResult = await db.query(fieldsQuery)
    const fields = fieldsResult.rows[0]

    // Get most booked field
    const mostBookedFieldQuery = `
      SELECT f.id, f.field_name, COUNT(b.id) as bookings_count
      FROM fields f
      JOIN bookings b ON f.id = b.field_id
      WHERE b.booking_status != 'cancelled'
      GROUP BY f.id, f.field_name
      ORDER BY bookings_count DESC
      LIMIT 1
    `

    const mostBookedFieldResult = await db.query(mostBookedFieldQuery)
    const mostBookedField = mostBookedFieldResult.rows[0] || null

    // Get loyalty statistics
    const loyaltyQuery = `
      SELECT 
        SUM(points_earned) as total_points_issued,
        (SELECT SUM(points_used) FROM redemptions) as total_points_redeemed
      FROM loyalty_points
    `

    const loyaltyResult = await db.query(loyaltyQuery)
    const loyalty = loyaltyResult.rows[0]

    // Get most popular loyalty program
    const mostPopularProgramQuery = `
      SELECT lp.id, lp.program_name, COUNT(r.id) as redemptions_count
      FROM loyalty_programs lp
      JOIN redemptions r ON lp.id = r.program_id
      GROUP BY lp.id, lp.program_name
      ORDER BY redemptions_count DESC
      LIMIT 1
    `

    const mostPopularProgramResult = await db.query(mostPopularProgramQuery)
    const mostPopularProgram = mostPopularProgramResult.rows[0] || null

    return {
      users: {
        total: Number.parseInt(users.total),
        active: Number.parseInt(users.active),
        new_this_period: Number.parseInt(users.new_this_period),
      },
      bookings: {
        total: Number.parseInt(bookings.total),
        completed: Number.parseInt(bookings.completed),
        cancelled: Number.parseInt(bookings.cancelled),
        this_period: Number.parseInt(bookings.this_period),
      },
      revenue: {
        total: Number.parseFloat(revenue.total || 0),
        this_period: Number.parseFloat(revenue.this_period || 0),
        growth_percentage: Number.parseFloat(growthPercentage.toFixed(1)),
      },
      fields: {
        total: Number.parseInt(fields.total),
        active: Number.parseInt(fields.active),
        most_booked: mostBookedField
          ? {
              field_id: mostBookedField.id,
              field_name: mostBookedField.field_name,
              bookings_count: Number.parseInt(mostBookedField.bookings_count),
            }
          : null,
      },
      loyalty: {
        total_points_issued: Number.parseInt(loyalty.total_points_issued || 0),
        total_points_redeemed: Number.parseInt(loyalty.total_points_redeemed || 0),
        most_popular_program: mostPopularProgram
          ? {
              program_id: mostPopularProgram.id,
              program_name: mostPopularProgram.program_name,
              redemptions_count: Number.parseInt(mostPopularProgram.redemptions_count),
            }
          : null,
      },
    }
  },
}
