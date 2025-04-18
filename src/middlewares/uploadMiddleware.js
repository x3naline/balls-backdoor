import multer from "multer"
import path from "path"
import fs from "fs"
import { config } from "dotenv"

config()

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "uploads"
    const fieldDir = path.join(uploadDir, "fields")

    // Create directories if they don't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }

    if (!fs.existsSync(fieldDir)) {
      fs.mkdirSync(fieldDir)
    }

    cb(null, fieldDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + ext)
  },
})

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only JPEG, JPG and PNG files are allowed."), false)
  }
}

// Set up multer with storage, file filter, and file size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
})

export default {
  // Middleware for uploading field images
  uploadFieldImages: upload.array("images", 5),
}
