import loyaltyModel from "../models/loyaltyModel.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Get user points
  async getUserPoints(req, res, next) {
    try {
      const userId = req.user.id

      // Get user points
      const points = await loyaltyModel.getUserPoints(userId)

      return res.status(200).json(responseFormatter.success("User points retrieved successfully", points))
    } catch (error) {
      next(error)
    }
  },

  // Get loyalty programs
  async getLoyaltyPrograms(req, res, next) {
    try {
      const { active_only = "true" } = req.query

      // Get loyalty programs
      const programs = await loyaltyModel.getLoyaltyPrograms(active_only === "true")

      return res.status(200).json(responseFormatter.success("Loyalty programs retrieved successfully", programs))
    } catch (error) {
      next(error)
    }
  },

  // Redeem points
  async redeemPoints(req, res, next) {
    try {
      const userId = req.user.id
      const { program_id, points_used } = req.body

      // Redeem points
      const redemption = await loyaltyModel.redeemPoints(userId, program_id, points_used)

      return res.status(200).json(responseFormatter.success("Points redeemed successfully", redemption))
    } catch (error) {
      next(error)
    }
  },

  // Get redemption history
  async getRedemptionHistory(req, res, next) {
    try {
      const userId = req.user.id

      // Get redemption history
      const history = await loyaltyModel.getRedemptionHistory(userId)

      return res.status(200).json(responseFormatter.success("Redemption history retrieved successfully", history))
    } catch (error) {
      next(error)
    }
  },

  // Create loyalty program (admin only)
  async createLoyaltyProgram(req, res, next) {
    try {
      const { program_name, description, points_required, reward_type, reward_value, start_date, end_date } = req.body

      // Create loyalty program
      const program = await loyaltyModel.createProgram({
        program_name,
        description,
        points_required,
        reward_type,
        reward_value,
        start_date,
        end_date,
      })

      return res.status(201).json(
        responseFormatter.success("Loyalty program created successfully", {
          program_id: program.id,
        }),
      )
    } catch (error) {
      next(error)
    }
  },

  // Update loyalty program (admin only)
  async updateLoyaltyProgram(req, res, next) {
    try {
      const programId = req.params.program_id
      const { program_name, description, points_required, reward_type, reward_value, is_active, start_date, end_date } =
        req.body

      // Update loyalty program
      const updatedProgram = await loyaltyModel.updateProgram(programId, {
        program_name,
        description,
        points_required,
        reward_type,
        reward_value,
        is_active,
        start_date,
        end_date,
      })

      if (!updatedProgram) {
        return res.status(404).json(responseFormatter.error("Loyalty program not found", "NOT_FOUND"))
      }

      return res.status(200).json(responseFormatter.success("Loyalty program updated successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Delete loyalty program (admin only)
  async deleteLoyaltyProgram(req, res, next) {
    try {
      const programId = req.params.program_id

      // Delete loyalty program
      const deletedProgram = await loyaltyModel.deleteProgram(programId)

      if (!deletedProgram) {
        return res.status(404).json(responseFormatter.error("Loyalty program not found", "NOT_FOUND"))
      }

      return res.status(200).json(responseFormatter.success("Loyalty program deleted successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Generate loyalty report (admin only)
  async generateLoyaltyReport(req, res, next) {
    try {
      const { from_date, to_date, format = "json" } = req.query

      if (!from_date || !to_date) {
        return res.status(400).json(responseFormatter.error("From date and to date are required", "VALIDATION_ERROR"))
      }

      // Generate report
      const report = await loyaltyModel.generateReport({
        from_date,
        to_date,
      })

      // Handle different formats
      if (format === "json") {
        return res.status(200).json(responseFormatter.success("Loyalty report generated successfully", report))
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
