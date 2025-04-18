import db from "../database/index.js"
import idGenerator from "../utils/idGenerator.js"

export default {
  // Create a new field
  async create(fieldData) {
    const { field_name, description, capacity, hourly_rate, field_type } = fieldData

    // Generate field ID
    const id = idGenerator.generateFieldId()

    // Insert field into database
    const query = `
      INSERT INTO fields (id, field_name, description, capacity, hourly_rate, field_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `

    const values = [id, field_name, description, capacity, hourly_rate, field_type]
    const result = await db.query(query, values)

    return result.rows[0]
  },

  // Add field images
  async addImages(fieldId, imageUrls, isPrimary = false) {
    const client = await db.getClient()

    try {
      await client.query("BEGIN")

      // If setting a primary image, reset all existing primary flags
      if (isPrimary) {
        await client.query("UPDATE field_images SET is_primary = false WHERE field_id = $1", [fieldId])
      }

      // Insert each image
      const insertedImages = []
      for (let i = 0; i < imageUrls.length; i++) {
        const imageId = idGenerator.generateImageId()
        const isPrimaryFlag = isPrimary && i === 0 // Only first image is primary if isPrimary is true

        const result = await client.query(
          `INSERT INTO field_images (id, field_id, image_url, is_primary)
           VALUES ($1, $2, $3, $4)
           RETURNING id, image_url, is_primary`,
          [imageId, fieldId, imageUrls[i], isPrimaryFlag],
        )

        insertedImages.push(result.rows[0])
      }

      await client.query("COMMIT")
      return insertedImages
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  },

  // Get all fields with pagination and filtering
  async getAll(filters = {}, page = 1, limit = 10) {
    const { available, type } = filters

    let query = `
      SELECT f.id, f.field_name, f.description, f.capacity, f.hourly_rate, f.field_type, 
             f.is_available, f.created_at, f.updated_at
      FROM fields f
      WHERE 1=1
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM fields
      WHERE 1=1
    `

    const values = []
    let paramIndex = 1

    // Add filters
    let filterClause = ""

    if (available !== undefined) {
      filterClause += ` AND is_available = $${paramIndex}`
      values.push(available)
      paramIndex++
    }

    if (type) {
      filterClause += ` AND field_type = $${paramIndex}`
      values.push(type)
      paramIndex++
    }

    // Add pagination
    const offset = (page - 1) * limit
    query += filterClause + ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    // Execute queries
    const fieldsResult = await db.query(query, values)
    const countResult = await db.query(countQuery + filterClause, values.slice(0, paramIndex - 1))

    // Get images for each field
    const fields = fieldsResult.rows
    for (const field of fields) {
      const imagesQuery = `
        SELECT id as image_id, image_url, is_primary
        FROM field_images
        WHERE field_id = $1
        ORDER BY is_primary DESC, created_at ASC
      `

      const imagesResult = await db.query(imagesQuery, [field.id])
      field.images = imagesResult.rows
    }

    return {
      fields,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  // Get field by ID
  async getById(id) {
    const query = `
      SELECT id, field_name, description, capacity, hourly_rate, field_type, 
             is_available, created_at, updated_at
      FROM fields
      WHERE id = $1
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    const field = result.rows[0]

    // Get field images
    const imagesQuery = `
      SELECT id as image_id, image_url, is_primary
      FROM field_images
      WHERE field_id = $1
      ORDER BY is_primary DESC, created_at ASC
    `

    const imagesResult = await db.query(imagesQuery, [id])
    field.images = imagesResult.rows

    return field
  },

  // Update field
  async update(id, fieldData) {
    const { field_name, description, capacity, hourly_rate, field_type, is_available } = fieldData

    let query = `
      UPDATE fields
      SET updated_at = NOW()
    `

    const values = [id]
    let paramIndex = 2

    if (field_name) {
      query += `, field_name = $${paramIndex}`
      values.push(field_name)
      paramIndex++
    }

    if (description !== undefined) {
      query += `, description = $${paramIndex}`
      values.push(description)
      paramIndex++
    }

    if (capacity) {
      query += `, capacity = $${paramIndex}`
      values.push(capacity)
      paramIndex++
    }

    if (hourly_rate) {
      query += `, hourly_rate = $${paramIndex}`
      values.push(hourly_rate)
      paramIndex++
    }

    if (field_type) {
      query += `, field_type = $${paramIndex}`
      values.push(field_type)
      paramIndex++
    }

    if (is_available !== undefined) {
      query += `, is_available = $${paramIndex}`
      values.push(is_available)
      paramIndex++
    }

    query += ` WHERE id = $1 RETURNING id`

    const result = await db.query(query, values)

    return result.rows[0] || null
  },

  // Delete field
  async delete(id) {
    const query = `
      DELETE FROM fields
      WHERE id = $1
      RETURNING id
    `

    const result = await db.query(query, [id])

    return result.rows[0] || null
  },

  // Check field availability for a specific date
  async checkAvailability(fieldId, date) {
    // Get field details
    const fieldQuery = `
      SELECT id, field_name
      FROM fields
      WHERE id = $1
    `

    const fieldResult = await db.query(fieldQuery, [fieldId])

    if (fieldResult.rows.length === 0) {
      return null
    }

    const field = fieldResult.rows[0]

    // Get booked slots for the date
    const bookingsQuery = `
      SELECT start_time, end_time
      FROM bookings
      WHERE field_id = $1 AND booking_date = $2 AND booking_status != 'cancelled'
      ORDER BY start_time ASC
    `

    const bookingsResult = await db.query(bookingsQuery, [fieldId, date])
    const bookedSlots = bookingsResult.rows

    // Define business hours (e.g., 8:00 to 22:00)
    const businessHours = {
      start: "08:00:00",
      end: "22:00:00",
    }

    // Generate available time slots (1-hour increments)
    const availableSlots = []
    let currentTime = businessHours.start

    while (currentTime < businessHours.end) {
      const startTime = currentTime
      const endTime = this.addHour(startTime)

      // Check if slot overlaps with any booked slot
      const isBooked = bookedSlots.some((slot) => {
        return startTime < slot.end_time && endTime > slot.start_time
      })

      if (!isBooked) {
        availableSlots.push({
          start_time: startTime,
          end_time: endTime,
        })
      }

      currentTime = endTime
    }

    return {
      field_id: field.id,
      field_name: field.field_name,
      date,
      available_slots: availableSlots,
      booked_slots: bookedSlots,
    }
  },

  // Helper method to add one hour to a time string
  addHour(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(":").map(Number)
    let newHours = hours + 1

    if (newHours >= 24) {
      newHours = 0
    }

    return `${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  },
}
