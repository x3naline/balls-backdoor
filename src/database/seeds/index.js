import db from "../index.js"
import idGenerator from "../../utils/idGenerator.js"
import passwordHandler from "../../utils/passwordHandler.js"
import { config } from "dotenv"

config()

// Seed data function
async function seedData() {
  const client = await db.getClient()

  try {
    await client.query("BEGIN")

    console.log("Starting database seeding...")

    // Create super admin user
    const superAdminId = idGenerator.generateUserId()
    const hashedPassword = await passwordHandler.hashPassword("admin123")

    await client.query(
      `INSERT INTO users (id, username, email, password, full_name, phone_number, user_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [superAdminId, "superadmin", "admin@balls.com", hashedPassword, "Super Admin", "123456789", "super_admin"],
    )

    console.log("Super admin created")

    // Create sample fields
    const fieldTypes = ["indoor", "outdoor", "hybrid"]
    const fieldNames = ["Main Stadium", "Training Ground A", "Training Ground B", "Mini Pitch", "Premium Field"]

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldId = idGenerator.generateFieldId()
      const fieldType = fieldTypes[i % fieldTypes.length]
      const hourlyRate = 50000 + i * 10000 // Vary the price

      await client.query(
        `INSERT INTO fields (id, field_name, description, capacity, hourly_rate, field_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (field_name) DO NOTHING`,
        [
          fieldId,
          fieldNames[i],
          `A ${fieldType} field with professional quality turf and lighting.`,
          10 + i * 2, // Vary the capacity
          hourlyRate,
          fieldType,
        ],
      )

      // Add sample image for each field
      const imageId = idGenerator.generateImageId()
      await client.query(
        `INSERT INTO field_images (id, field_id, image_url, is_primary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [imageId, fieldId, `/uploads/fields/default-${i + 1}.jpg`, true],
      )
    }

    console.log("Sample fields created")

    // Create sample loyalty programs
    const programNames = ["Bronze Reward", "Silver Reward", "Gold Reward", "Platinum Reward", "Diamond Reward"]
    const rewardTypes = ["discount", "free_booking", "merchandise"]
    const rewardValues = ["10%", "1", "T-Shirt"]

    for (let i = 0; i < programNames.length; i++) {
      const programId = idGenerator.generateProgramId()
      const rewardType = rewardTypes[i % rewardTypes.length]
      const rewardValue = rewardValues[i % rewardValues.length]
      const pointsRequired = 100 * (i + 1)

      // Set start date to today and end date to 1 year from now
      const startDate = new Date().toISOString().split("T")[0]
      const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]

      await client.query(
        `INSERT INTO loyalty_programs (id, program_name, description, points_required, reward_type, reward_value, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          programId,
          programNames[i],
          `Redeem ${pointsRequired} points for a ${rewardValue} ${rewardType}.`,
          pointsRequired,
          rewardType,
          rewardValue,
          startDate,
          endDate,
        ],
      )
    }

    console.log("Sample loyalty programs created")

    await client.query("COMMIT")
    console.log("Database seeding completed successfully")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error seeding database:", error)
  } finally {
    client.release()
  }
}

// Run the seed function if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedData()
    .then(() => {
      console.log("Seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seeding failed:", error)
      process.exit(1)
    })
}

export default seedData
