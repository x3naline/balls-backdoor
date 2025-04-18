import responseFormatter from "../utils/responseFormatter.js"

// Handle 404 errors for routes that don't exist
export default (req, res) => {
  return res.status(404).json(responseFormatter.error("Resource not found", "NOT_FOUND"))
}
