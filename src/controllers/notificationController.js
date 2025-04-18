import notificationModel from "../models/notificationModel.js"
import responseFormatter from "../utils/responseFormatter.js"

export default {
  // Subscribe to push notifications
  async subscribe(req, res, next) {
    try {
      const userId = req.user.id
      const subscription = req.body

      // Subscribe
      await notificationModel.subscribe(userId, subscription)

      return res.status(200).json(responseFormatter.success("Subscribed to push notifications successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Unsubscribe from push notifications
  async unsubscribe(req, res, next) {
    try {
      const { endpoint } = req.body

      // Unsubscribe
      await notificationModel.unsubscribe(endpoint)

      return res.status(200).json(responseFormatter.success("Unsubscribed from push notifications successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Get user notifications
  async getUserNotifications(req, res, next) {
    try {
      const userId = req.user.id
      const { read, page = 1, limit = 10 } = req.query

      // Parse query parameters
      const filters = {
        read: read === "true" ? true : read === "false" ? false : undefined,
      }

      // Get notifications with pagination
      const { notifications, total } = await notificationModel.getUserNotifications(
        userId,
        filters,
        Number.parseInt(page),
        Number.parseInt(limit),
      )

      // Format response with pagination
      const response = responseFormatter.pagination(notifications, total, Number.parseInt(page), Number.parseInt(limit))

      return res.status(200).json(responseFormatter.success("Notifications retrieved successfully", response))
    } catch (error) {
      next(error)
    }
  },

  // Mark notification as read
  async markAsRead(req, res, next) {
    try {
      const notificationId = req.params.notification_id

      // Mark as read
      const result = await notificationModel.markAsRead(notificationId)

      if (!result) {
        return res.status(404).json(responseFormatter.error("Notification not found", "NOT_FOUND"))
      }

      return res.status(200).json(responseFormatter.success("Notification marked as read successfully"))
    } catch (error) {
      next(error)
    }
  },

  // Send notification (admin only)
  async sendNotification(req, res, next) {
    try {
      const { user_id, title, message, type, reference_id } = req.body

      // Send notification
      const result = await notificationModel.sendNotification({
        user_id,
        title,
        message,
        type,
        reference_id,
      })

      return res.status(200).json(
        responseFormatter.success("Notification sent successfully", {
          recipients_count: result.recipients_count,
        }),
      )
    } catch (error) {
      next(error)
    }
  },
}
