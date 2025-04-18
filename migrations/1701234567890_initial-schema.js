/* eslint-disable camelcase */

export const shorthands = undefined

export async function up(pgm) {
  // Create enum types
  pgm.createType("user_type", ["customer", "admin", "super_admin"])
  pgm.createType("booking_status", ["pending", "confirmed", "completed", "cancelled"])
  pgm.createType("payment_status", ["pending", "completed", "failed", "refunded"])
  pgm.createType("field_type", ["indoor", "outdoor", "hybrid"])
  pgm.createType("reward_type", ["discount", "free_booking", "merchandise"])
  pgm.createType("notification_type", ["system", "booking", "payment", "promotion"])

  // Create users table
  pgm.createTable("users", {
    id: { type: "varchar(50)", primaryKey: true },
    username: { type: "varchar(50)", notNull: true, unique: true },
    email: { type: "varchar(100)", notNull: true, unique: true },
    password: { type: "varchar(100)", notNull: true },
    full_name: { type: "varchar(100)", notNull: true },
    phone_number: { type: "varchar(20)", notNull: true },
    user_type: { type: "user_type", notNull: true, default: "customer" },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create fields table
  pgm.createTable("fields", {
    id: { type: "varchar(50)", primaryKey: true },
    field_name: { type: "varchar(100)", notNull: true },
    description: { type: "text" },
    capacity: { type: "integer", notNull: true },
    hourly_rate: { type: "numeric(10,2)", notNull: true },
    field_type: { type: "field_type", notNull: true },
    is_available: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create field_images table
  pgm.createTable("field_images", {
    id: { type: "varchar(50)", primaryKey: true },
    field_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"fields"',
      onDelete: "CASCADE",
    },
    image_url: { type: "varchar(255)", notNull: true },
    is_primary: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create bookings table
  pgm.createTable("bookings", {
    id: { type: "varchar(50)", primaryKey: true },
    user_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    field_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"fields"',
      onDelete: "CASCADE",
    },
    booking_date: { type: "date", notNull: true },
    start_time: { type: "time", notNull: true },
    end_time: { type: "time", notNull: true },
    duration_hours: { type: "numeric(4,2)", notNull: true },
    total_amount: { type: "numeric(10,2)", notNull: true },
    booking_status: { type: "booking_status", notNull: true, default: "pending" },
    notes: { type: "text" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create payment_methods table
  pgm.createTable("payment_methods", {
    id: { type: "serial", primaryKey: true },
    method_name: { type: "varchar(50)", notNull: true, unique: true },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create payments table
  pgm.createTable("payments", {
    id: { type: "varchar(50)", primaryKey: true },
    booking_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"bookings"',
      onDelete: "CASCADE",
      unique: true,
    },
    method_id: {
      type: "integer",
      notNull: true,
      references: '"payment_methods"',
      onDelete: "RESTRICT",
    },
    amount: { type: "numeric(10,2)", notNull: true },
    status: { type: "payment_status", notNull: true, default: "pending" },
    transaction_id: { type: "varchar(100)" },
    payment_date: { type: "timestamp" },
    notes: { type: "text" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create loyalty_points table
  pgm.createTable("loyalty_points", {
    id: { type: "varchar(50)", primaryKey: true },
    user_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    points_earned: { type: "integer", notNull: true },
    source: { type: "varchar(50)", notNull: true },
    reference: { type: "varchar(50)", notNull: true },
    is_used: { type: "boolean", notNull: true, default: false },
    earned_date: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    expiry_date: { type: "timestamp", notNull: true },
  })

  // Create loyalty_programs table
  pgm.createTable("loyalty_programs", {
    id: { type: "varchar(50)", primaryKey: true },
    program_name: { type: "varchar(100)", notNull: true },
    description: { type: "text", notNull: true },
    points_required: { type: "integer", notNull: true },
    reward_type: { type: "reward_type", notNull: true },
    reward_value: { type: "varchar(50)", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
    start_date: { type: "date", notNull: true },
    end_date: { type: "date" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create redemptions table
  pgm.createTable("redemptions", {
    id: { type: "varchar(50)", primaryKey: true },
    user_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    program_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"loyalty_programs"',
      onDelete: "RESTRICT",
    },
    points_used: { type: "integer", notNull: true },
    redemption_code: { type: "varchar(50)", notNull: true, unique: true },
    status: { type: "varchar(20)", notNull: true, default: "pending" },
    notes: { type: "text" },
    redemption_date: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    expiry_date: { type: "timestamp" },
  })

  // Create notifications table
  pgm.createTable("notifications", {
    id: { type: "varchar(50)", primaryKey: true },
    user_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    title: { type: "varchar(100)", notNull: true },
    message: { type: "text", notNull: true },
    type: { type: "notification_type", notNull: true },
    reference_id: { type: "varchar(50)" },
    is_read: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create push_subscriptions table
  pgm.createTable("push_subscriptions", {
    id: { type: "varchar(50)", primaryKey: true },
    user_id: {
      type: "varchar(50)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    endpoint: { type: "varchar(500)", notNull: true, unique: true },
    p256dh: { type: "varchar(200)", notNull: true },
    auth: { type: "varchar(100)", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  })

  // Create indexes for performance
  pgm.createIndex("users", "email")
  pgm.createIndex("users", "username")
  pgm.createIndex("bookings", "user_id")
  pgm.createIndex("bookings", "field_id")
  pgm.createIndex("bookings", "booking_date")
  pgm.createIndex("bookings", "booking_status")
  pgm.createIndex("payments", "booking_id")
  pgm.createIndex("payments", "status")
  pgm.createIndex("loyalty_points", "user_id")
  pgm.createIndex("loyalty_points", "expiry_date")
  pgm.createIndex("notifications", "user_id")
  pgm.createIndex("notifications", "is_read")
}

export async function down(pgm) {
  // Drop tables in reverse order to avoid foreign key constraints
  pgm.dropTable("push_subscriptions")
  pgm.dropTable("notifications")
  pgm.dropTable("redemptions")
  pgm.dropTable("loyalty_programs")
  pgm.dropTable("loyalty_points")
  pgm.dropTable("payments")
  pgm.dropTable("payment_methods")
  pgm.dropTable("bookings")
  pgm.dropTable("field_images")
  pgm.dropTable("fields")
  pgm.dropTable("users")

  // Drop enum types
  pgm.dropType("notification_type")
  pgm.dropType("reward_type")
  pgm.dropType("field_type")
  pgm.dropType("payment_status")
  pgm.dropType("booking_status")
  pgm.dropType("user_type")
}
