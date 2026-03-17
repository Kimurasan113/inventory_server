const express = require("express");
const router = express.Router();
const stockOutController = require("../controllers/stockOutController");
const { protect, authorize } = require("../middleWare/authMiddleWare");

// All routes require authentication
router.use(protect);

// User routes
router.post("/", stockOutController.create);
router.get("/", stockOutController.getAll);
router.get("/:id", stockOutController.getOne);

// Storekeeper/Admin only
router.patch(
  "/:id/approve",
  authorize("Storekeeper", "Admin"),
  stockOutController.approve
);

router.patch(
  "/:id/reject",
  authorize("Storekeeper", "Admin"),
  stockOutController.reject
);

module.exports = router;