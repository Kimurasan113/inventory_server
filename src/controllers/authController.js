const authService = require("../services/authService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

// Register
exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(successResponse(result, "Registered successfully. Wait for approval.", 201));
  } catch (error) {
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(
      req.body,
      req.ip,
      req.headers['user-agent']
    );
    res.json(successResponse(result, "Login successful"));
  } catch (error) {
    next(error);
  }
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(errorResponse("Refresh token required", null, 400));
    }
    const result = await authService.refreshToken(
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    res.json(successResponse(result, "Token refreshed successfully"));
  } catch (error) {
    next(error);
  }
};

// Get Profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(successResponse(user, "Profile retrieved successfully"));
  } catch (error) {
    next(error);
  }
};

// Change Password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json(errorResponse("Please provide new password", null, 400));
    }
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res.json(successResponse(result, "Password changed successfully"));
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const result = await authService.logout(req.user.id, token);
    res.json(successResponse(result, "Logged out successfully"));
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email, req.ip);
    res.json(successResponse(result, "Password reset email sent"));
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json(successResponse(result, "Password reset successfully"));
  } catch (error) {
    next(error);
  }
};

// Get All Users (Admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    res.json(successResponse(users, "Users retrieved successfully"));
  } catch (error) {
    next(error);
  }
};

// Update User Role (Admin)
exports.updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updatedUser = await authService.updateRole(id, role);
    res.json(successResponse(updatedUser, "Role updated successfully"));
  } catch (error) {
    next(error);
  }
};

// Update User Status (Admin)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updatedUser = await authService.updateStatus(req.params.id, status);
    res.json(successResponse(updatedUser, "Status updated successfully"));
  } catch (error) {
    next(error);
  }
};

// Update Profile (Own User)
exports.updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.json(successResponse(updatedUser, "Profile updated successfully"));
  } catch (error) {
    next(error);
  }
};

// Delete User (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const result = await authService.deleteUser(req.params.id);
    res.json(successResponse(result, "User deleted successfully"));
  } catch (error) {
    next(error);
  }
};

// Unlock User (Admin)
exports.unlockUser = async (req, res, next) => {
  try {
    const result = await authService.unlockUser(req.params.id);
    res.json(successResponse(result, "User unlocked successfully"));
  } catch (error) {
    next(error);
  }
};