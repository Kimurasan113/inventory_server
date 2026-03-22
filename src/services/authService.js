const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { isStrongPassword } = require('../middleWare/validationMiddleWare');
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

class AuthService {
  // -------------------- Register --------------------
  async register(data) {
    const { username, password, email, phone, department, gender } = data;

    // Check if user already exists
    const existing = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { phone },
      ],
    });

    if (existing) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      department,
      password: hashedPassword,
      gender: gender,
      status: "Pending",
      role: "User"
    });

    return { 
      message: "Registered successfully. Wait for approval.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    };
  }

  // -------------------- Change Password --------------------
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error("Current password is incorrect");

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return { message: "Password changed successfully" };
  }

  // -------------------- Reset Password --------------------
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) throw new Error("Invalid or expired token");

    // Validate password strength
    try {
      isStrongPassword(newPassword);
    } catch (error) {
      throw new Error(`Password too weak: ${error.message}`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: "Password reset successfully" };
  }

  // -------------------- Login --------------------
  async login({ username, password }, ip, userAgent) {
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    }).select("+password +failedLoginAttempts +lockUntil");

    if (!user) throw new Error("Invalid credentials");
    if (user.status !== "Approved") throw new Error("Account not approved yet");

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingSeconds = Math.ceil((user.lockUntil - Date.now()) / 1000);
      throw new Error(
        `Account temporarily locked. Try again in ${remainingSeconds} seconds.`
      );
    }

    // Reset lock if expired
    if (user.lockUntil && user.lockUntil <= Date.now()) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 2 * 60 * 1000); // 2 min lock
      }
      await user.save();
      throw new Error("Invalid credentials");
    }

    // Reset login attempts on success
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.isOnline = true;
    user.lastLoginIP = ip;
    user.lastLoginAt = new Date();
    user.lastLoginUserAgent = userAgent;

    // Generate tokens
    const refreshToken = generateRefreshToken(user);
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    user.refreshToken = hashedRefreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Track session
    if (!user.sessions) user.sessions = [];
    user.sessions.push({
      token: hashedRefreshToken,
      ip,
      userAgent,
      createdAt: new Date()
    });
    
    // Keep only last 5 sessions
    if (user.sessions.length > 5) {
      user.sessions = user.sessions.slice(-5);
    }
    
    await user.save();

    const accessToken = generateAccessToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  // -------------------- Refresh Token --------------------
  async refreshToken(tokenFromClient, ip, userAgent) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(tokenFromClient)
      .digest("hex");

    const user = await User.findOne({ refreshToken: hashedToken }).select(
      "+refreshToken"
    );
    
    if (!user) throw new Error("Invalid refresh token");
    if (user.refreshTokenExpires < Date.now())
      throw new Error("Refresh token expired");

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newHashedToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    // Rotate refresh token
    user.refreshToken = newHashedToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Update session
    if (user.sessions) {
      const sessionIndex = user.sessions.findIndex(s => s.token === hashedToken);
      if (sessionIndex !== -1) {
        user.sessions[sessionIndex].token = newHashedToken;
        user.sessions[sessionIndex].updatedAt = new Date();
      }
    }
    
    await user.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // -------------------- Logout --------------------
  async logout(userId, token) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    
    // Remove specific session or all sessions
    if (token) {
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      if (user.sessions) {
        user.sessions = user.sessions.filter(s => s.token !== hashedToken);
      }
      if (user.refreshToken === hashedToken) {
        user.refreshToken = null;
        user.refreshTokenExpires = null;
      }
    } else {
      // Logout from all devices
      user.refreshToken = null;
      user.refreshTokenExpires = null;
      user.sessions = [];
    }
    
    user.isOnline = false;
    await user.save();
    
    return { message: "Logged out successfully" };
  }

  // -------------------- Get Profile --------------------
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password -refreshToken -sessions");
    if (!user) throw new Error("User not found");
    return user;
  }

  // -------------------- Forgot Password --------------------
  async forgotPassword(email, ip) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("User not found");

    // Check rate limiting
    const recentRequests = user.passwordResetRequests || [];
    const recentCount = recentRequests.filter(
      r => r.createdAt > new Date(Date.now() - 15 * 60 * 1000)
    ).length;
    
    if (recentCount >= 3) {
      throw new Error("Too many requests. Please try again later.");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    // Track reset requests
    if (!user.passwordResetRequests) user.passwordResetRequests = [];
    user.passwordResetRequests.push({
      token: hashedToken,
      ip,
      createdAt: new Date()
    });
    
    // Keep only last 10 requests
    if (user.passwordResetRequests.length > 10) {
      user.passwordResetRequests = user.passwordResetRequests.slice(-10);
    }
    
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // TODO: Send email
    console.log("Reset URL:", resetURL);

    return { message: "Password reset email sent" };
  }

  // -------------------- Get All Users (Admin) --------------------
  async getAllUsers() {
    return await User.find().select("-password -refreshToken -sessions -passwordResetRequests");
  }

  // -------------------- Update Status (Admin) --------------------
  async updateStatus(userId, status) {
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      throw new Error("Invalid status");
    }
    
    return await User.findByIdAndUpdate(
      userId,
      { status },
      { returnDocument: "after" }
    ).select("-password -refreshToken -sessions");
  }

  // -------------------- Update User Role (Admin Only) --------------------
  async updateRole(userId, newRole) {
    if (!["Supplier", "User", "Storekeeper", "Admin"].includes(newRole)) {
      throw new Error("Invalid role");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { returnDocument: "after" }
    ).select("-password -refreshToken -sessions");

    if (!user) throw new Error("User not found");
    return user;
  }

  // -------------------- Update Profile (Own User) --------------------
  async updateProfile(userId, updateData) {
    const allowedFields = ["username", "email", "phone", "department"];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === "username" || field === "email") {
          filteredData[field] = updateData[field].toLowerCase();
        } else {
          filteredData[field] = updateData[field];
        }
      }
    }

    if (Object.keys(filteredData).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Check for duplicates
    if (filteredData.email || filteredData.phone || filteredData.username) {
      const existing = await User.findOne({
        _id: { $ne: userId },
        $or: [
          filteredData.username ? { username: filteredData.username } : null,
          filteredData.email ? { email: filteredData.email } : null,
          filteredData.phone ? { phone: filteredData.phone } : null,
        ].filter(Boolean),
      });
      
      if (existing) {
        throw new Error("Username, email or phone already taken by another user");
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      filteredData,
      { returnDocument: "after", runValidators: true }
    ).select("-password -refreshToken -sessions");

    if (!user) throw new Error("User not found");
    return user;
  }

  // -------------------- Delete User (Admin) --------------------
  async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    
    // Soft delete or hard delete?
    await User.findByIdAndDelete(userId);
    return { message: "User deleted successfully" };
  }

  // -------------------- Unlock User (Admin Only) --------------------
  async unlockUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.lockUntil = undefined;
    user.failedLoginAttempts = 0;
    await user.save();

    return { message: "User unlocked successfully" };
  }
}

module.exports = new AuthService();