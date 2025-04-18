import userModel from "../models/userModel.js";
import responseFormatter from "../utils/responseFormatter.js";

export default {
  // Get all admins (super admin only)
  async getAllAdmins(req, res, next) {
    try {
      const admins = await userModel.getAllAdmins();
      return res.status(200).json(responseFormatter.success("Admin accounts retrieved successfully", admins));
    } catch (error) {
      next(error);
    }
  },

  // Create admin account (super admin only)
  async createAdmin(req, res, next) {
    try {
      const { username, email, password, full_name, phone_number } = req.body;

      // Check if email already exists
      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json(responseFormatter.error("Email already in use", "CONFLICT"));
      }

      // Check if username already exists
      const existingUsername = await userModel.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json(responseFormatter.error("Username already in use", "CONFLICT"));
      }

      // Create admin user
      const user = await userModel.create({
        username,
        email,
        password,
        full_name,
        phone_number,
        user_type: "admin", // pastikan `user_type` adalah admin
      });

      return res.status(201).json(
        responseFormatter.success("Admin account created successfully", {
          user_id: user.id,
          username: user.username,
        })
      );
    } catch (error) {
      next(error);
    }
  },

  // Update admin account (super admin only)
  async updateAdmin(req, res, next) {
    try {
      const adminId = req.params.user_id;
      const { full_name, phone_number, is_active, password } = req.body;

      // Update admin account
      const updatedAdmin = await userModel.updateAdmin(adminId, {
        full_name,
        phone_number,
        is_active,
        password,
      });

      if (!updatedAdmin) {
        return res.status(404).json(responseFormatter.error("Admin not found", "NOT_FOUND"));
      }

      return res.status(200).json(responseFormatter.success("Admin account updated successfully"));
    } catch (error) {
      next(error);
    }
  },

  // Delete admin account (super admin only)
  async deleteAdmin(req, res, next) {
    try {
      const adminId = req.params.user_id;

      // Delete admin account
      const deletedAdmin = await userModel.deleteAdmin(adminId);

      if (!deletedAdmin) {
        return res.status(404).json(responseFormatter.error("Admin not found", "NOT_FOUND"));
      }

      return res.status(200).json(responseFormatter.success("Admin account deleted successfully"));
    } catch (error) {
      next(error);
    }
  },
};