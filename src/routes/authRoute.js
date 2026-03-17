const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const { protect, authorize } = require("../middleWare/authMiddleWare");
const { validateRegister, validateLogin, validateChangePassword } = require("../middleWare/validationMiddleWare");

// Public routes
router.post("/register", validateRegister, controller.register);
router.post("/login", validateLogin, controller.login);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password/:token", controller.resetPassword);

// Protected routes (လော့ဂ်င်၀င်မှရမည်)
router.post("/logout", protect, controller.logout);
router.get("/profile", protect, controller.getProfile);
router.put("/profile", protect, controller.updateProfile); // ကိုယ့် profile ကိုယ် update
router.put("/changepassword", protect, validateChangePassword, controller.changePassword);
// Admin only: User lock ဖြုတ်ရန်


// Admin only routes
router.get("/users", protect, authorize("Admin"), controller.getAllUsers);
router.patch("/status/:id", protect, authorize("Admin"), controller.updateStatus);
router.patch("/role/:id", protect, authorize("Admin"), controller.updateRole);
router.delete("/delete/:id", protect, authorize("Admin"), controller.deleteUser);
router.patch("/unlock/:id", protect,authorize("Admin"), controller.unlockUser);

module.exports = router;