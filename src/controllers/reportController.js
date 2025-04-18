import reportModel from "../models/reportModel.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Generate revenue report (admin only)
  async generateRevenueReport(req, res, next) {
    try {
      const { from_date, to_date, group_by = "day", format = "json" } = req.query

      if (!from_date || !to_date) {
        return res.status(400).json(responseFormatter.error("From date and to date are required", "VALIDATION_ERROR"))
      }

      // Validate group_by parameter
      const validGroupBy = ["day", "week", "month"]
      if (!validGroupBy.includes(group_by)) {
        return res.status(400).json(responseFormatter.error("Invalid group_by parameter", "VALIDATION_ERROR"))
      }

      // Generate report
      const report = await reportModel.generateRevenueReport({
        from_date,
        to_date,
        group_by,
      })

      // Handle different formats
      if (format === "json") {
        return res.status(200).json(responseFormatter.success("Revenue report generated successfully", report))
      } else {
        // For other formats like CSV or PDF, you would implement the conversion here
        // This is a placeholder for future implementation
        return res.status(501).json(responseFormatter.error("Format not implemented yet", "NOT_IMPLEMENTED"))
      }
    } catch (error) {
      next(error)
    }
  },

  // Generate system statistics (super admin only)
  async generateSystemStatistics(req, res, next) {
    try {
      const { period = "monthly" } = req.query

      // Validate period parameter
      const validPeriods = ["daily", "weekly", "monthly", "yearly"]
      if (!validPeriods.includes(period)) {
        return res.status(400).json(responseFormatter.error("Invalid period parameter", "VALIDATION_ERROR"))
      }

      // Generate statistics
      const statistics = await reportModel.generateSystemStatistics(period)

      return res.status(200).json(responseFormatter.success("System statistics generated successfully", statistics))
    } catch (error) {
      next(error)
    }
  },
}
