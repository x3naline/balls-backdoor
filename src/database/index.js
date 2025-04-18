import pg from "pg"
import { config } from "dotenv"

config()

const { Pool } = pg

// Create a new pool instance with the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
})

// Test the database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.message)
  } else {
    console.log("Database connected successfully at:", res.rows[0].now)
  }
})

export default {
  query: (text, params) => pool.query(text, params),
  getClient: async () => {
    const client = await pool.connect()
    const query = client.query
    const release = client.release

    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      console.error("A client has been checked out for more than 5 seconds!")
      console.error(`The last executed query on this client was: ${client.lastQuery}`)
    }, 5000)

    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = args
      return query.apply(client, args)
    }

    client.release = () => {
      // Clear the timeout
      clearTimeout(timeout)
      // Set the methods back to their old implementation
      client.query = query
      client.release = release
      return release.apply(client)
    }

    return client
  },
}
