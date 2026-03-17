const authService = require("../services/authService");

// Register
exports.register = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Login
exports.login = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await authService.login(req.body, req.ip);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token required" });
    }
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Get Profile
exports.getProfile = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Change Password
exports.changePassword = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: "Please provide new password" });
    }
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

// Unlock user (Admin only)
exports.unlockUser = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await authService.unlockUser(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Logout
exports.logout = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await authService.logout(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const users = await authService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Update user role (Admin only)
exports.updateRole = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updatedUser = await authService.updateRole(id, role);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Update user status (Admin only)
exports.updateStatus = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const { status } = req.body;
    const updatedUser = await authService.updateStatus(req.params.id, status);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Update Profile (Own User)
exports.updateProfile = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await authService.deleteUser(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};