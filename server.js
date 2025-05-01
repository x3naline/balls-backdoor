import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import morgan from "morgan"
import { fileURLToPath } from "url"
import path from "path"
import dotenv from "dotenv"

// Routes
import authRoutes from "./src/routes/authRoutes.js"
import userRoutes from "./src/routes/userRoutes.js"
import fieldRoutes from "./src/routes/fieldRoutes.js"
import bookingRoutes from "./src/routes/bookingRoutes.js"
import paymentRoutes from "./src/routes/paymentRoutes.js"
import loyaltyRoutes from "./src/routes/loyaltyRoutes.js"
import adminRoutes from "./src/routes/adminRoutes.js"
import superAdminRoutes from "./src/routes/super-admin.routes.js"
import notificationRoutes from "./src/routes/notificationRoutes.js"
import indexRoutes from "./src/routes/index.js" 

// Middleware
import errorHandler from "./src/middlewares/errorHandler.js"
import notFoundHandler from "./src/middlewares/notFoundHandler.js"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Set up rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => (req.user ? 100 : 30), // 100 requests per minute for authenticated users, 30 for unauthenticated
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
})

// Middleware
app.use(helmet()) // Security headers
app.use(compression()) // Compress responses
app.use(cors()) // Enable CORS
app.use(express.json()) // Parse JSON bodies
app.use(express.urlencoded({ extended: true })) // Parse URL-encoded bodies
app.use(morgan("combined")) // Logging

// API routes
app.use("/api/auth", authRoutes)
app.use("/auth", authRoutes)
app.use("/users", userRoutes)
app.use("/fields", fieldRoutes)
app.use("/bookings", bookingRoutes)
app.use("/payments", paymentRoutes)
app.use("/payment-methods", paymentRoutes)
app.use("/loyalty", loyaltyRoutes)
app.use("/api", indexRoutes)
app.use("/admin", adminRoutes)
app.use("/superAdminRoutes", superAdminRoutes)
app.use("/notifications", notificationRoutes)

// Apply rate limiting to all routes
app.use(apiLimiter)

// Serve static files from the 'public' directory
app.use("/public", express.static(path.join(__dirname, "public")))

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})



export default app
