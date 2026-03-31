const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["Supplier", "User", "Storekeeper", "Admin"],
      default: "User",
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      default: "Male",
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    // 🔐 Security fields
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  { timestamps: true }
);




UserSchema.index({ status: 1 });


UserSchema.index({ refreshToken: 1 }, { sparse: true });


UserSchema.index({ resetPasswordToken: 1 }, { sparse: true });


UserSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("User", UserSchema);