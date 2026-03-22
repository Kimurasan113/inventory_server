const { body, validationResult } = require("express-validator");
const { errorResponse } = require("../utils/responseFormatter");

// Password strength validation (throws error if weak)
const isStrongPassword = (value) => {
  if (value.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(value)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(value)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(value)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    throw new Error('Password must contain at least one special character');
  }
  return true;
};

// Reusable error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errorResponse(
      "Validation failed", 
      errors.array().map(err => ({
        field: err.param,
        message: err.msg
      })),
      400
    ));
  }
  next();
};

// Register validation
exports.validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("username").isLength({ min: 3 }).trim().escape().withMessage("Username must be at least 3 characters"),
  body("phone").isMobilePhone().withMessage("Valid phone number required"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .custom(isStrongPassword),
  body("confirmPassword").custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  handleValidationErrors,
];

// Change password validation
exports.validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
    .custom(isStrongPassword),
  handleValidationErrors,
];

// Login validation
exports.validateLogin = [
  body("username").notEmpty().withMessage("Username required"),
  body("password").notEmpty().withMessage("Password required"),
  handleValidationErrors,
];

// Forgot password validation
exports.validateForgotPassword = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  handleValidationErrors,
];

// Reset password validation
exports.validateResetPassword = [
  body("token").notEmpty().withMessage("Token required"),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .custom(isStrongPassword),
  handleValidationErrors,
];

// Export for service layer
exports.isStrongPassword = isStrongPassword;