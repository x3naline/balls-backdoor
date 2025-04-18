import userModel from "../models/userModel.js";
import responseFormatter from "../utils/responseFormatter.js";

export default {
  // Mengambil semua akun super admin
  async getAllSuperAdmins(req, res, next) {
    try {
      const superAdmins = await userModel.getAllSuperAdmins();
      return res.status(200).json(responseFormatter.success("Super admins retrieved successfully", superAdmins));
    } catch (error) {
      next(error);
    }
  },

  // Membuat akun super admin baru
  async createSuperAdmin(req, res, next) {
    try {
      const newAdmin = await userModel.createSuperAdmin(req.body);
      return res.status(201).json(responseFormatter.success("Super admin created successfully", newAdmin));
    } catch (error) {
      next(error);
    }
  },

  // Memperbarui akun super admin
  async updateSuperAdmin(req, res, next) {
    try {
      const updatedAdmin = await userModel.updateSuperAdmin(req.params.id, req.body);
      return res.status(200).json(responseFormatter.success("Super admin updated successfully", updatedAdmin));
    } catch (error) {
      next(error);
    }
  },

  // Menghapus akun super admin
  async deleteSuperAdmin(req, res, next) {
    try {
      await userModel.deleteSuperAdmin(req.params.id);
      return res.status(200).json(responseFormatter.success("Super admin deleted successfully"));
    } catch (error) {
      next(error);
    }
  },
};