const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken"); 
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
// Helper function - class အပြင်မှာထုတ်
const isPasswordStrong = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid:
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar &&
      password.length >= 8,
    errors: {
      length:
        password.length < 8 ? "Password must be at least 8 characters" : null,
      uppercase: !hasUpperCase
        ? "Password must contain at least one uppercase letter"
        : null,
      lowercase: !hasLowerCase
        ? "Password must contain at least one lowercase letter"
        : null,
      number: !hasNumbers ? "Password must contain at least one number" : null,
      specialChar: !hasSpecialChar
        ? "Password must contain at least one special character"
        : null,
    },
  };
};
class AuthService {
  // -------------------- Register --------------------
  async register(data) {
    const { username, password, confirmPassword, email, phone, department,gender } =
      data;

    if (!username || !password || !email || !phone || !department) {
      throw new Error("All fields are required");
    }
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    // ✅ FIXED: တိုက်ရိုက်ခေါ်သုံးတယ် (this မပါ)
    const passwordCheck = isPasswordStrong(password);
    if (!passwordCheck.isValid) {
      const errors = Object.values(passwordCheck.errors).filter(
        (e) => e !== null,
      );
      throw new Error("Password too weak: " + errors.join(", "));
    }

    const existing = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { phone },
      ],
    });

    if (existing) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      department,
      password: hashedPassword,
      gender: gender
    });

    return { message: "Registered successfully. Wait for approval." };
  }

  // -------------------- Change Password --------------------
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error("Current password is incorrect");

    // ✅ FIXED: တိုက်ရိုက်ခေါ်သုံးတယ် (this မပါ)
    const passwordCheck = isPasswordStrong(newPassword);
    if (!passwordCheck.isValid) {
      const errors = Object.values(passwordCheck.errors).filter(
        (e) => e !== null,
      );
      throw new Error("Password too weak: " + errors.join(", "));
    }

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

    // ✅ FIXED: တိုက်ရိုက်ခေါ်သုံးတယ် (this မပါ)
    const passwordCheck = isPasswordStrong(newPassword);
    if (!passwordCheck.isValid) {
      const errors = Object.values(passwordCheck.errors).filter(
        (e) => e !== null,
      );
      throw new Error("Password too weak: " + errors.join(", "));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: "Password reset successfully" };
  }

  // -------------------- Login --------------------
  async login({ username, password }, ip) {
    const user = await User.findOne({
      username: username.toLowerCase(),
    }).select("+password +failedLoginAttempts +lockUntil");

    if (!user) throw new Error("Invalid credentials");
    if (user.status !== "Approved") throw new Error("Account not approved yet");

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingSeconds = Math.ceil((user.lockUntil - Date.now()) / 1000);
      throw new Error(
        `Account temporarily locked. Try again in ${remainingSeconds} seconds.`,
      );
    } else if (user.lockUntil && user.lockUntil <= Date.now()) {
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

    // ✅ Reset login attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.isOnline = true;

    // -------------------- Refresh Token --------------------
    const refreshToken = generateRefreshToken(user);
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    user.refreshToken = hashedRefreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
    await user.save();

    const accessToken = generateAccessToken(user);

  
 
    return {
      accessToken,
      refreshToken, // send plain token to client
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  }

  // -------------------- Refresh Token --------------------
  async refreshToken(tokenFromClient) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(tokenFromClient)
      .digest("hex");

    const user = await User.findOne({ refreshToken: hashedToken }).select(
      "+refreshToken",
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

    user.refreshToken = newHashedToken;
   
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // -------------------- Logout --------------------
  async logout(userId) {
    await User.findByIdAndUpdate(
      userId,
      {
        isOnline: false,
        refreshToken: null,
        refreshTokenExpires: null,
      },
      { returnDocument: "after" },
    );
    return { message: "Logged out successfully" };
  }

  // -------------------- Get Profile --------------------
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) throw new Error("User not found");
    return user;
  }

  // -------------------- Forgot Password --------------------
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("User not found");

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    console.log("Reset URL:", resetURL);

    return { message: "Password reset email sent" };
  }

  //

  // -------------------- Get All Users (Admin) --------------------
  async getAllUsers() {
    return await User.find().select("-password -refreshToken");
  }

  // -------------------- Update Status (Admin) --------------------
  async updateStatus(userId, status) {
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      throw new Error("Invalid status");
    }
    // ✅ Fixed: Changed from { new: true } to { returnDocument: 'after' }
    return await User.findByIdAndUpdate(
      userId,
      { status },
      { returnDocument: "after" }, // 👈 ဒါကို ပြင်ထား
    ).select("-password");
  }
  // -------------------- Update User Role (Admin Only) --------------------
  async updateRole(userId, newRole) {
    if (!["Supplier", "User", "Storekeeper", "Admin"].includes(newRole)) {
      throw new Error("Invalid role");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { returnDocument: "after" },
    ).select("-password -refreshToken");

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
        throw new Error(
          "Username, email or phone already taken by another user",
        );
      }
    }

    // ✅ Fixed: Changed from { new: true } to { returnDocument: 'after' }
    const user = await User.findByIdAndUpdate(
      userId,
      filteredData,
      { returnDocument: "after", runValidators: true }, // 👈 ဒါကို ပြင်ထား
    ).select("-password -refreshToken");

    if (!user) throw new Error("User not found");
    return user;
  }

  // -------------------- Delete User (Admin) --------------------
  async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
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
