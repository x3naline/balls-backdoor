import bcrypt from "bcrypt"

const SALT_ROUNDS = 10

export default {
  hashPassword: async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS)
  },
  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword)
  },
}
