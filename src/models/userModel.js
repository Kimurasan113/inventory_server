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
      select: false, // အမြဲတမ်း password မပါအောင် သတ်မှတ်
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
    }, // unique မထားတော့ဘူး
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending", // စစချင်း Pending
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    // 🔐 Security fields (အသစ်ထည့်ထားသည်)
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
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
