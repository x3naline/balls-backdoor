import userModel from "../models/userModel.js"
import passwordHandler from "../utils/passwordHandler.js"
import jwtGenerator from "../utils/jwtGenerator.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Register a new user
  async register(req, res, next) {
    try {
      const { username, email, password, full_name, phone_number, user_type } = req.body

      // Check if email already exists
      const existingEmail = await userModel.findByEmail(email)
      if (existingEmail) {
        return res.status(409).json(responseFormatter.error("Email already in use", "CONFLICT"))
      }

      // Check if username already exists
      const existingUsername = await userModel.findByUsername(username)
      if (existingUsername) {
        return res.status(409).json(responseFormatter.error("Username already in use", "CONFLICT"))
      }

      // Create user
      const user = await userModel.create({
        username,
        email,
        password,
        full_name,
        phone_number,
        user_type 
      })

      return res.status(201).json(
        responseFormatter.success("User registered successfully", {
          user_id: user.id,
          username: user.username,
        }),
      )
    } catch (error) {
      next(error)
    }
  },

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body

      // Find user by email
      const user = await userModel.findByEmail(email)

      if (!user) {
        return res.status(401).json(responseFormatter.error("Invalid email or password", "AUTH_ERROR"))
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json(responseFormatter.error("Account is inactive", "AUTH_ERROR"))
      }

      // Verify password
      const isPasswordValid = await passwordHandler.comparePassword(password, user.password)

      if (!isPasswordValid) {
        return res.status(401).json(responseFormatter.error("Invalid email or password", "AUTH_ERROR"))
      }

      // Generate JWT token
      const token = jwtGenerator.generateToken({
        id: user.id,
        username: user.username,
        user_type: user.user_type,
      })

      return res.status(200).json(
        responseFormatter.success("Login successful", {
          user_id: user.id,
          username: user.username,
          full_name: user.full_name,
          user_type: user.user_type,
          token,
        }),
      )
    } catch (error) {
      next(error)
    }
  },
}
