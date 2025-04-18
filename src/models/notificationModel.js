import db from "../database/index.js"
import idGenerator from "../utils/idGenerator.js"
import webpush from "web-push"
import { config } from "dotenv"

config()

// Configure web push
webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

export default {
  // Subscribe to push notifications
  async subscribe(userId, subscription) {
    const { endpoint, keys } = subscription

    // Generate subscription ID
    const id = idGenerator.generateSubscriptionId()

    // Insert subscription into database
    const query = `
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint) 
      DO UPDATE SET user_id = $2, p256dh = $4, auth = $5, created_at = NOW()
      RETURNING id
    `

    const values = [id, userId, endpoint, keys.p256dh, keys.auth]
    const result = await db.query(query, values)

    return result.rows[0]
  },

  // Unsubscribe from push notifications
  async unsubscribe(endpoint) {
    const query = `
      DELETE FROM push_subscriptions
      WHERE endpoint = $1
      RETURNING id
    `

    const result = await db.query(query, [endpoint])

    return result.rows[0] || null
  },

  // Get user notifications with pagination
  async getUserNotifications(userId, filters = {}, page = 1, limit = 10) {
    const { read } = filters

    let query = `
      SELECT id as notification_id, title, message, type, reference_id, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE user_id = $1
    `

    const values = [userId]
    let paramIndex = 2

    // Add filters
    let filterClause = ""

    if (read !== undefined) {
      filterClause += ` AND is_read = $${paramIndex}`
      values.push(read)
      paramIndex++
    }

    // Add pagination
    const offset = (page - 1) * limit
    query += filterClause + ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    // Execute queries
    const notificationsResult = await db.query(query, values)
    const countResult = await db.query(countQuery + filterClause, values.slice(0, paramIndex - 1))

    return {
      notifications: notificationsResult.rows,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  // Mark notification as read
  async markAsRead(id) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
      RETURNING id
    `

    const result = await db.query(query, [id])

    return result.rows[0] || null
  },

  // Send notification
  async sendNotification(notificationData) {
    const { user_id, title, message, type, reference_id } = notificationData
    const client = await db.getClient()

    try {
      await client.query("BEGIN")

      let recipientCount = 0

      // If user_id is null, send to all users
      if (!user_id) {
        // Get all active users
        const usersQuery = `
          SELECT id
          FROM users
          WHERE is_active = true
        `

        const usersResult = await client.query(usersQuery)
        const users = usersResult.rows

        // Create notification for each user
        for (const user of users) {
          const notificationId = idGenerator.generateNotificationId()

          const insertQuery = `
            INSERT INTO notifications (id, user_id, title, message, type, reference_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `

          await client.query(insertQuery, [notificationId, user.id, title, message, type, reference_id])

          recipientCount++

          // Send push notification if user has subscriptions
          await this.sendPushNotification(user.id, title, message, type, reference_id)
        }
      } else {
        // Create notification for specific user
        const notificationId = idGenerator.generateNotificationId()

        const insertQuery = `
          INSERT INTO notifications (id, user_id, title, message, type, reference_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `

        await client.query(insertQuery, [notificationId, user_id, title, message, type, reference_id])

        recipientCount = 1

        // Send push notification if user has subscriptions
        await this.sendPushNotification(user_id, title, message, type, reference_id)
      }

      await client.query("COMMIT")

      return { recipients_count: recipientCount }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  },

  // Send push notification
  async sendPushNotification(userId, title, message, type, referenceId) {
    // Get user's push subscriptions
    const subscriptionsQuery = `
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = $1
    `

    const subscriptionsResult = await db.query(subscriptionsQuery, [userId])
    const subscriptions = subscriptionsResult.rows

    if (subscriptions.length === 0) {
      return // No subscriptions for this user
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      options: {
        body: message,
        icon: "https://balls.com/images/logo.png",
        data: {
          type,
          reference_id: referenceId,
        },
      },
    })

    // Send push notification to each subscription
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        }

        await webpush.sendNotification(pushSubscription, payload)
      } catch (error) {
        console.error("Error sending push notification:", error)

        // If subscription is no longer valid, remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          const deleteQuery = `
            DELETE FROM push_subscriptions
            WHERE endpoint = $1
          `

          await db.query(deleteQuery, [subscription.endpoint])
        }
      }
    })

    await Promise.all(sendPromises)
  },
}
