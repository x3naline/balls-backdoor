import fieldModel from "../models/fieldModel.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Get all fields
  async getAllFields(req, res, next) {
    try {
      const { available, type, page = 1, limit = 10 } = req.query

      // Parse query parameters
      const filters = {
        available: available === "true" ? true : available === "false" ? false : undefined,
        type,
      }

      // Get fields with pagination
      const { fields, total } = await fieldModel.getAll(filters, Number.parseInt(page), Number.parseInt(limit))

      // Format response with pagination
      const response = responseFormatter.pagination(fields, total, Number.parseInt(page), Number.parseInt(limit))

      return res.status(200).json(responseFormatter.success("Fields retrieved successfully", response))
    } catch (error) {
      next(error)
    }
  },

  // Get field by ID
  async getFieldById(req, res, next) {
    try {
      const fieldId = req.params.field_id

      // Get field
      const field = await fieldModel.getById(fieldId)

      if (!field) {
        return res.status(404).json(responseFormatter.error("Field not found", "NOT_FOUND"))
      }

      return res.status(200).json(responseFormatter.success("Field retrieved successfully", field))
    } catch (error) {
      next(error)
    }
  },

  // Create field (admin only)
  async createField(req, res, next) {
    try {
      const { field_name, description, capacity, hourly_rate, field_type } = req.body

      // Create field
      const field = await fieldModel.create({
        field_name,
        description,
        capacity,
        hourly_rate,
        field_type,
      })

      // Handle image uploads if any
      if (req.files && req.files.length > 0) {
        const imageUrls = req.files.map((file) => `/uploads/fields/${file.filename}`)
        await fieldModel.addImages(field.id, imageUrls, true)
      }

      return res.status(201).json(
        responseFormatter.success("Field added successfully", {
          field_id: field.id,
        }),
      )
    } catch (error) {
      next(error)
    }
  },

  // Update field (admin only)
  async updateField(req, res, next) {
    try {
      const fieldId = req.params.field_id
      const { field_name, description, capacity, hourly_rate, field_type, is_available } = req.body

      // Check if field exists
      const existingField = await fieldModel.getById(fieldId)

      if (!existingField) {
        return res.status(404).json(responseFormatter.error("Field not found", "NOT_FOUND"))
      }

      // Update field
      await fieldModel.update(fieldId, {
        field_name,
        description,
        capacity,
        hourly_rate,
        field_type,
        is_available,
      })

      // Handle image uploads if any
      if (req.files && req.files.length > 0) {
        const imageUrls = req.files.map((file) => `/uploads/fields/${file.filename}`)
        await fieldModel.addImages(fieldId, imageUrls, true)
      }

      return res.status(200).json(responseFormatter.success("Field updated successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Delete field (admin only)
  async deleteField(req, res, next) {
    try {
      const fieldId = req.params.field_id

      // Check if field exists
      const existingField = await fieldModel.getById(fieldId)

      if (!existingField) {
        return res.status(404).json(responseFormatter.error("Field not found", "NOT_FOUND"))
      }

      // Delete field
      await fieldModel.delete(fieldId)

      return res.status(200).json(responseFormatter.success("Field deleted successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Check field availability
  async checkAvailability(req, res, next) {
    try {
      const fieldId = req.params.field_id
      const { date } = req.query

      if (!date) {
        return res.status(400).json(responseFormatter.error("Date is required", "VALIDATION_ERROR"))
      }

      // Check if field exists
      const existingField = await fieldModel.getById(fieldId)

      if (!existingField) {
        return res.status(404).json(responseFormatter.error("Field not found", "NOT_FOUND"))
      }

      // Check availability
      const availability = await fieldModel.checkAvailability(fieldId, date)

      return res.status(200).json(responseFormatter.success("Availability retrieved successfully", availability))
    } catch (error) {
      next(error)
    }
  },
}
