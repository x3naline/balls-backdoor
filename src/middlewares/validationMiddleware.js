import Joi from "joi"
import responseFormatter from "../utils/responseFormatter.js"

// Middleware factory for request validation
export default (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false })

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }))

      return res.status(400).json(responseFormatter.error("Validation error", "VALIDATION_ERROR", errors))
    }

    next()
  }
}

// Common validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    full_name: Joi.string().required(),
    phone_number: Joi.string().required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // User schemas
  updateProfile: Joi.object({
    full_name: Joi.string(),
    phone_number: Joi.string(),
    password: Joi.string().min(8),
    is_active: Joi.boolean(),
  }).min(1),

  // Field schemas
  createField: Joi.object({
    field_name: Joi.string().required(),
    description: Joi.string().allow("", null),
    capacity: Joi.number().integer().required(),
    hourly_rate: Joi.number().precision(2).required(),
    field_type: Joi.string().valid("indoor", "outdoor", "hybrid").required(),
  }),

  updateField: Joi.object({
    field_name: Joi.string(),
    description: Joi.string().allow("", null),
    capacity: Joi.number().integer(),
    hourly_rate: Joi.number().precision(2),
    field_type: Joi.string().valid("indoor", "outdoor", "hybrid"),
    is_available: Joi.boolean(),
  }).min(1),

  // Booking schemas
  createBooking: Joi.object({
    field_id: Joi.string().required(),
    booking_date: Joi.date().iso().required(),
    start_time: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .required(),
    end_time: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .required(),
    notes: Joi.string().allow("", null),
  }),

  // Payment schemas
  createPayment: Joi.object({
    booking_id: Joi.string().required(),
    method_id: Joi.number().integer().required(),
    amount: Joi.number().precision(2).required(),
    transaction_id: Joi.string().allow("", null),
  }),

  verifyPayment: Joi.object({
    status_id: Joi.number().valid(2, 3).required(),
    notes: Joi.string().allow("", null),
  }),

  // Loyalty program schemas
  createLoyaltyProgram: Joi.object({
    program_name: Joi.string().required(),
    description: Joi.string().required(),
    points_required: Joi.number().integer().required(),
    reward_type: Joi.string().valid("discount", "free_booking", "merchandise").required(),
    reward_value: Joi.string().required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().allow(null),
  }),

  updateLoyaltyProgram: Joi.object({
    program_name: Joi.string(),
    description: Joi.string(),
    points_required: Joi.number().integer(),
    reward_type: Joi.string().valid("discount", "free_booking", "merchandise"),
    reward_value: Joi.string(),
    is_active: Joi.boolean(),
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso().allow(null),
  }).min(1),

  // Redemption schemas
  redeemPoints: Joi.object({
    program_id: Joi.string().required(),
    points_used: Joi.number().integer().required(),
  }),

  // Notification schemas
  sendNotification: Joi.object({
    user_id: Joi.string().allow(null),
    title: Joi.string().required(),
    message: Joi.string().required(),
    type: Joi.string().valid("system", "promotion", "booking").required(),
    reference_id: Joi.string().allow(null),
  }),

  // Push subscription schemas
  subscribe: Joi.object({
    endpoint: Joi.string().required(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required(),
    }).required(),
  }),
}
