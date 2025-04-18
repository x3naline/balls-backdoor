# Borneo Anfield Loyalty System API

A RESTful API for managing futsal field bookings with an integrated loyalty program.

## Features

- User authentication and authorization
- Field management
- Booking system
- Payment processing
- Loyalty program
- Push notifications
- Reporting and analytics

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- node-pg-migrate for database migrations
- JWT for authentication
- Web Push for notifications

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

## Environment Variables

Create a `.env` file in the root directory with the following variables:

\`\`\`
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/borneo_anfield
DATABASE_SSL=false

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Web Push Configuration
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@balls.com

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880 # 5MB

# Loyalty Program Configuration
POINTS_PER_BOOKING=10
POINTS_EXPIRY_DAYS=365
\`\`\`

## Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Run database migrations:
   \`\`\`
   npm run migrate:up
   \`\`\`
4. Seed the database with initial data:
   \`\`\`
   npm run seed
   \`\`\`
5. Start the server:
   \`\`\`
   npm start
   \`\`\`

For development with auto-reload:
\`\`\`
npm run dev
\`\`\`

## API Documentation

### Authentication

- `POST /v1/auth/register` - Register a new user
- `POST /v1/auth/login` - Login and get JWT token

### Users

- `GET /v1/users/profile` - Get user profile
- `PUT /v1/users/profile` - Update user profile

### Fields

- `GET /v1/fields` - Get all fields
- `GET /v1/fields/:field_id` - Get field by ID
- `GET /v1/fields/:field_id/availability` - Check field availability
- `POST /v1/fields` - Create a new field (admin only)
- `PUT /v1/fields/:field_id` - Update field (admin only)
- `DELETE /v1/fields/:field_id` - Delete field (admin only)

### Bookings

- `POST /v1/bookings` - Create a new booking
- `GET /v1/bookings/my-bookings` - Get user bookings
- `GET /v1/bookings/:booking_id` - Get booking by ID
- `POST /v1/bookings/:booking_id/cancel` - Cancel booking
- `GET /v1/bookings` - Get all bookings (admin only)
- `PUT /v1/bookings/:booking_id/status` - Update booking status (admin only)
- `GET /v1/bookings/reports` - Generate booking report (admin only)

### Payments

- `POST /v1/payments` - Create a new payment
- `GET /v1/payments/:payment_id` - Get payment by ID
- `GET /v1/payments/methods` - Get payment methods
- `PUT /v1/payments/:payment_id/verify` - Verify payment (admin only)
- `GET /v1/payments/reports` - Generate payment report (admin only)

### Loyalty

- `GET /v1/loyalty/points` - Get user points
- `GET /v1/loyalty/programs` - Get loyalty programs
- `POST /v1/loyalty/redeem` - Redeem points
- `GET /v1/loyalty/redemptions` - Get redemption history
- `POST /v1/loyalty/programs` - Create loyalty program (admin only)
- `PUT /v1/loyalty/programs/:program_id` - Update loyalty program (admin only)
- `DELETE /v1/loyalty/programs/:program_id` - Delete loyalty program (admin only)
- `GET /v1/loyalty/reports` - Generate loyalty report (admin only)

### Notifications

- `POST /v1/notifications/subscribe` - Subscribe to push notifications
- `POST /v1/notifications/unsubscribe` - Unsubscribe from push notifications
- `GET /v1/notifications` - Get user notifications
- `PUT /v1/notifications/:notification_id/read` - Mark notification as read
- `POST /v1/notifications/send` - Send notification (admin only)

### Reports

- `GET /v1/reports/revenue` - Generate revenue report (admin only)
- `GET /v1/reports/system` - Generate system statistics (super admin only)

## License

This project is licensed under the ISC License.

## Author

Borneo Anfield
