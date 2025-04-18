import db from "../database/index.js"
import idGenerator from "../utils/idGenerator.js"

export default {
  // Get user points
  async getUserPoints(userId) {
    // Get current date for expiry check
    const currentDate = new Date().toISOString()

    // Get all user points
    const pointsQuery = `
      SELECT id as point_id, points_earned, source, reference, 
             earned_date, expiry_date, is_used
      FROM loyalty_points
      WHERE user_id = $1
      ORDER BY earned_date DESC
    `

    const pointsResult = await db.query(pointsQuery, [userId])
    const points = pointsResult.rows

    // Calculate summary
    let totalPoints = 0
    let activePoints = 0
    let usedPoints = 0
    let expiredPoints = 0

    points.forEach((point) => {
      const pointsEarned = Number.parseInt(point.points_earned)
      totalPoints += pointsEarned

      if (point.is_used) {
        usedPoints += pointsEarned
      } else if (new Date(point.expiry_date) < new Date(currentDate)) {
        expiredPoints += pointsEarned
      } else {
        activePoints += pointsEarned
      }
    })

    return {
      total_points: totalPoints,
      active_points: activePoints,
      used_points: usedPoints,
      expired_points: expiredPoints,
      points_history: points,
    }
  },

  // Get available loyalty programs
  async getLoyaltyPrograms(activeOnly = true) {
    // Get current date for active check
    const currentDate = new Date().toISOString().split("T")[0]

    let query = `
      SELECT id as program_id, program_name, description, points_required,
             reward_type, reward_value, is_active, start_date, end_date
      FROM loyalty_programs
      WHERE 1=1
    `

    const values = []
    let paramIndex = 1

    if (activeOnly) {
      query += ` AND is_active = true
                 AND start_date <= $${paramIndex}
                 AND (end_date IS NULL OR end_date >= $${paramIndex})`
      values.push(currentDate)
      paramIndex++
    }

    query += ` ORDER BY points_required ASC`

    const result = await db.query(query, values)

    return result.rows
  },

  // Redeem points
  async redeemPoints(userId, programId, pointsUsed) {
    const client = await db.getClient()

    try {
      await client.query("BEGIN")

      // Check if program exists and is active
      const programQuery = `
        SELECT program_name, points_required, reward_type
        FROM loyalty_programs
        WHERE id = $1 AND is_active = true
        AND start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `

      const programResult = await client.query(programQuery, [programId])

      if (programResult.rows.length === 0) {
        throw new Error("Loyalty program not found or inactive")
      }

      const program = programResult.rows[0]

      // Check if user has enough active points
      const pointsQuery = `
        SELECT SUM(points_earned) as available_points
        FROM loyalty_points
        WHERE user_id = $1 AND is_used = false
        AND expiry_date > CURRENT_TIMESTAMP
      `

      const pointsResult = await client.query(pointsQuery, [userId])
      const availablePoints = Number.parseInt(pointsResult.rows[0].available_points) || 0

      if (availablePoints < pointsUsed) {
        throw new Error("Not enough points available")
      }

      if (pointsUsed < program.points_required) {
        throw new Error(`This program requires at least ${program.points_required} points`)
      }

      // Generate redemption code
      const prefix = program.reward_type.substring(0, 4).toUpperCase()
      const redemptionCode = idGenerator.generateRedemptionCode(prefix)

      // Create redemption record
      const redemptionId = idGenerator.generateRedemptionId()

      const createRedemptionQuery = `
        INSERT INTO redemptions (id, user_id, program_id, points_used, redemption_code, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `

      await client.query(createRedemptionQuery, [
        redemptionId,
        userId,
        programId,
        pointsUsed,
        redemptionCode,
        "completed",
      ])

      // Mark points as used (oldest first)
      const getPointsToUseQuery = `
        SELECT id, points_earned
        FROM loyalty_points
        WHERE user_id = $1 AND is_used = false
        AND expiry_date > CURRENT_TIMESTAMP
        ORDER BY earned_date ASC
      `

      const pointsToUseResult = await client.query(getPointsToUseQuery, [userId])
      const pointsToUse = pointsToUseResult.rows

      let remainingPointsToUse = pointsUsed

      for (const point of pointsToUse) {
        if (remainingPointsToUse <= 0) break

        const pointsEarned = Number.parseInt(point.points_earned)

        if (pointsEarned <= remainingPointsToUse) {
          // Use all points from this record
          await client.query("UPDATE loyalty_points SET is_used = true WHERE id = $1", [point.id])

          remainingPointsToUse -= pointsEarned
        } else {
          // Split the record - mark original as used and create new with remaining
          await client.query("UPDATE loyalty_points SET is_used = true WHERE id = $1", [point.id])

          const newPointId = idGenerator.generatePointId()
          const remainingPoints = pointsEarned - remainingPointsToUse

          await client.query(
            `INSERT INTO loyalty_points (id, user_id, points_earned, source, reference, earned_date, expiry_date)
             SELECT $1, user_id, $2, source, reference, earned_date, expiry_date
             FROM loyalty_points WHERE id = $3`,
            [newPointId, remainingPoints, point.id],
          )

          remainingPointsToUse = 0
        }
      }

      await client.query("COMMIT")

      return {
        redemption_id: redemptionId,
        program_name: program.program_name,
        points_used: pointsUsed,
        status: "completed",
        redemption_code: redemptionCode,
      }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  },

  // Get redemption history
  async getRedemptionHistory(userId) {
    const query = `
      SELECT r.id as redemption_id, lp.program_name, r.points_used,
             r.redemption_date, r.status, r.redemption_code, r.notes
      FROM redemptions r
      JOIN loyalty_programs lp ON r.program_id = lp.id
      WHERE r.user_id = $1
      ORDER BY r.redemption_date DESC
    `

    const result = await db.query(query, [userId])

    return result.rows
  },

  // Create loyalty program (admin only)
  async createProgram(programData) {
    const { program_name, description, points_required, reward_type, reward_value, start_date, end_date } = programData

    // Generate program ID
    const id = idGenerator.generateProgramId()

    // Insert program into database
    const query = `
      INSERT INTO loyalty_programs (id, program_name, description, points_required,
                                   reward_type, reward_value, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `

    const values = [id, program_name, description, points_required, reward_type, reward_value, start_date, end_date]

    const result = await db.query(query, values)

    return result.rows[0]
  },

  // Update loyalty program (admin only)
  async updateProgram(id, programData) {
    const { program_name, description, points_required, reward_type, reward_value, is_active, start_date, end_date } =
      programData

    let query = `
      UPDATE loyalty_programs
      SET updated_at = NOW()
    `

    const values = [id]
    let paramIndex = 2

    if (program_name) {
      query += `, program_name = $${paramIndex}`
      values.push(program_name)
      paramIndex++
    }

    if (description) {
      query += `, description = $${paramIndex}`
      values.push(description)
      paramIndex++
    }

    if (points_required) {
      query += `, points_required = $${paramIndex}`
      values.push(points_required)
      paramIndex++
    }

    if (reward_type) {
      query += `, reward_type = $${paramIndex}`
      values.push(reward_type)
      paramIndex++
    }

    if (reward_value) {
      query += `, reward_value = $${paramIndex}`
      values.push(reward_value)
      paramIndex++
    }

    if (is_active !== undefined) {
      query += `, is_active = $${paramIndex}`
      values.push(is_active)
      paramIndex++
    }

    if (start_date) {
      query += `, start_date = $${paramIndex}`
      values.push(start_date)
      paramIndex++
    }

    if (end_date !== undefined) {
      query += `, end_date = $${paramIndex}`
      values.push(end_date)
      paramIndex++
    }

    query += ` WHERE id = $1 RETURNING id`

    const result = await db.query(query, values)

    return result.rows[0] || null
  },

  // Delete loyalty program (admin only)
  async deleteProgram(id) {
    const query = `
      DELETE FROM loyalty_programs
      WHERE id = $1
      RETURNING id
    `

    const result = await db.query(query, [id])

    return result.rows[0] || null
  },

  // Generate loyalty program report
  async generateReport(filters = {}) {
    const { from_date, to_date } = filters

    // Validate required filters
    if (!from_date || !to_date) {
      throw new Error("From date and to date are required")
    }

    // Get points issued in the period
    const pointsIssuedQuery = `
      SELECT SUM(points_earned) as total_points
      FROM loyalty_points
      WHERE earned_date BETWEEN $1 AND $2
    `

    const pointsIssuedResult = await db.query(pointsIssuedQuery, [from_date, to_date])
    const totalPointsIssued = Number.parseInt(pointsIssuedResult.rows[0].total_points) || 0

    // Get points redeemed in the period
    const pointsRedeemedQuery = `
      SELECT SUM(points_used) as total_points
      FROM redemptions
      WHERE redemption_date BETWEEN $1 AND $2
    `

    const pointsRedeemedResult = await db.query(pointsRedeemedQuery, [from_date, to_date])
    const totalPointsRedeemed = Number.parseInt(pointsRedeemedResult.rows[0].total_points) || 0

    // Get active users (users who earned or redeemed points in the period)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM (
        SELECT user_id FROM loyalty_points WHERE earned_date BETWEEN $1 AND $2
        UNION
        SELECT user_id FROM redemptions WHERE redemption_date BETWEEN $1 AND $2
      ) as active_users
    `

    const activeUsersResult = await db.query(activeUsersQuery, [from_date, to_date])
    const activeUsers = Number.parseInt(activeUsersResult.rows[0].active_users) || 0

    // Get program usage
    const programsUsageQuery = `
      SELECT lp.id as program_id, lp.program_name,
             COUNT(r.id) as redemptions_count,
             SUM(r.points_used) as points_used
      FROM redemptions r
      JOIN loyalty_programs lp ON r.program_id = lp.id
      WHERE r.redemption_date BETWEEN $1 AND $2
      GROUP BY lp.id, lp.program_name
      ORDER BY redemptions_count DESC
    `

    const programsUsageResult = await db.query(programsUsageQuery, [from_date, to_date])
    const programsUsage = programsUsageResult.rows.map((row) => ({
      ...row,
      redemptions_count: Number.parseInt(row.redemptions_count),
      points_used: Number.parseInt(row.points_used),
    }))

    // Get top users
    const topUsersQuery = `
      SELECT u.id as user_id, u.full_name,
             COALESCE(p.points_earned, 0) as points_earned,
             COALESCE(r.points_redeemed, 0) as points_redeemed
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(points_earned) as points_earned
        FROM loyalty_points
        WHERE earned_date BETWEEN $1 AND $2
        GROUP BY user_id
      ) p ON u.id = p.user_id
      LEFT JOIN (
        SELECT user_id, SUM(points_used) as points_redeemed
        FROM redemptions
        WHERE redemption_date BETWEEN $1 AND $2
        GROUP BY user_id
      ) r ON u.id = r.user_id
      WHERE p.points_earned > 0 OR r.points_redeemed > 0
      ORDER BY p.points_earned DESC
      LIMIT 10
    `

    const topUsersResult = await db.query(topUsersQuery, [from_date, to_date])
    const topUsers = topUsersResult.rows.map((row) => ({
      ...row,
      points_earned: Number.parseInt(row.points_earned) || 0,
      points_redeemed: Number.parseInt(row.points_redeemed) || 0,
    }))

    return {
      period: {
        from_date,
        to_date,
      },
      total_points_issued: totalPointsIssued,
      total_points_redeemed: totalPointsRedeemed,
      active_users: activeUsers,
      programs_usage: programsUsage,
      top_users: topUsers,
    }
  },
}
