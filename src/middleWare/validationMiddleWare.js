const { body, validationResult } = require("express-validator");

// Password strength validation function
const isStrongPassword = (value) => {
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  
  if (!hasUpperCase) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    throw new Error('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    throw new Error('Password must contain at least one special character');
  }
  return true;
};

// Register validation
exports.validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("username").isLength({ min: 3 }).trim().escape().withMessage("Username min 3 chars"),
  body("phone").isMobilePhone().withMessage("Valid phone required"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .custom(isStrongPassword)
    .withMessage("Password must contain uppercase, lowercase, number and special character"),
  body("confirmPassword").custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Change password validation
exports.validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
    .custom(isStrongPassword)
    .withMessage("New password must contain uppercase, lowercase, number and special character"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// Login validation (အရင်အတိုင်း)
exports.validateLogin = [
  body("username").notEmpty().withMessage("Username required"),
  body("password").notEmpty().withMessage("Password required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];