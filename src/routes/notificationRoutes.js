import express from "express"
import notificationController from "../controllers/notificationController.js"
import { authenticate, isAdmin } from "../middlewares/authMiddleware.js"
import validationMiddleware, { schemas } from "../middlewares/validationMiddleware.js"

const router = express.Router()

// Subscribe to push notifications
router.post("/subscribe", authenticate, validationMiddleware(schemas.subscribe), notificationController.subscribe)

// Unsubscribe from push notifications
router.post("/unsubscribe", authenticate, notificationController.unsubscribe)

// Get user notifications
router.get("/", authenticate, notificationController.getUserNotifications)

// Mark notification as read
router.put("/:notification_id/read", authenticate, notificationController.markAsRead)

// Admin routes
router.post(
  "/send",
  authenticate,
  isAdmin,
  validationMiddleware(schemas.sendNotification),
  notificationController.sendNotification,
)

export default router
