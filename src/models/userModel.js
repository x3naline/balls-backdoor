import db from "../database/index.js"
import idGenerator from "../utils/idGenerator.js"
import passwordHandler from "../utils/passwordHandler.js"

export default {
  // Create a new user
  async create(userData) {
    const { username, email, password, full_name, phone_number, user_type = "customer" } = userData

    // Generate user ID
    const id = idGenerator.generateUserId()

    // Hash password
    const hashedPassword = await passwordHandler.hashPassword(password)

    // Insert user into database
    const query = `
      INSERT INTO users (id, username, email, password, full_name, phone_number, user_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username
    `

    const values = [id, username, email, hashedPassword, full_name, phone_number, user_type]
    const result = await db.query(query, values)

    return result.rows[0]
  },

  // Find user by ID
  async findById(id) {
    const query = `
      SELECT id, username, email, full_name, phone_number, user_type, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `

    const result = await db.query(query, [id])

    return result.rows[0] || null
  },

  // Find user by email
  async findByEmail(email) {
    const query = `
      SELECT id, username, email, password, full_name, phone_number, user_type, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
    `

    const result = await db.query(query, [email])

    return result.rows[0] || null
  },

  // Find user by username
  async findByUsername(username) {
    const query = `
      SELECT id, username, email, password, full_name, phone_number, user_type, is_active, created_at, updated_at
      FROM users
      WHERE username = $1
    `

    const result = await db.query(query, [username])

    return result.rows[0] || null
  },

  // Update user profile
  async updateProfile(id, userData) {
    const { full_name, phone_number, password } = userData

    let query = `
      UPDATE users
      SET updated_at = NOW()
    `

    const values = [id]
    let paramIndex = 2

    if (full_name) {
      query += `, full_name = $${paramIndex}`
      values.push(full_name)
      paramIndex++
    }

    if (phone_number) {
      query += `, phone_number = $${paramIndex}`
      values.push(phone_number)
      paramIndex++
    }

    if (password) {
      const hashedPassword = await passwordHandler.hashPassword(password)
      query += `, password = $${paramIndex}`
      values.push(hashedPassword)
      paramIndex++
    }

    query += ` WHERE id = $1 RETURNING id`

    const result = await db.query(query, values)

    return result.rows[0] || null
  },

  // Get all admins (for super admin)
  async getAllAdmins() {
    const query = `
      SELECT id, username, email, full_name, phone_number, is_active, created_at
      FROM users
      WHERE user_type = 'admin'
      ORDER BY created_at DESC
    `

    const result = await db.query(query)

    return result.rows
  },

  // Update admin account (for super admin)
  async updateAdmin(id, userData) {
    const { full_name, phone_number, is_active, password } = userData

    let query = `
      UPDATE users
      SET updated_at = NOW()
    `

    const values = [id]
    let paramIndex = 2

    if (full_name) {
      query += `, full_name = $${paramIndex}`
      values.push(full_name)
      paramIndex++
    }

    if (phone_number) {
      query += `, phone_number = $${paramIndex}`
      values.push(phone_number)
      paramIndex++
    }

    if (is_active !== undefined) {
      query += `, is_active = $${paramIndex}`
      values.push(is_active)
      paramIndex++
    }

    if (password) {
      const hashedPassword = await passwordHandler.hashPassword(password)
      query += `, password = $${paramIndex}`
      values.push(hashedPassword)
      paramIndex++
    }

    query += ` WHERE id = $1 AND user_type = 'admin' RETURNING id`

    const result = await db.query(query, values)

    return result.rows[0] || null
  },

  // Delete admin account (for super admin)
  async deleteAdmin(id) {
    const query = `
      DELETE FROM users
      WHERE id = $1 AND user_type = 'admin'
      RETURNING id
    `

    const result = await db.query(query, [id])

    return result.rows[0] || null
  },
}
