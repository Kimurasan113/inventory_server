// routes/damageRequestRoutes.js
const express = require("express");
const router = express.Router();
const damageRequestController = require("../controllers/damageRequestController");
const { protect, authorize } = require("../middleWare/authMiddleWare");

// All routes require authentication
router.use(protect);

// ==================== PUBLIC ROUTES (All Authenticated Users) ====================

/**
 * @route   POST /api/damage
 * @desc    Create new damage/lost/expire request
 * @access  All authenticated users
 */
router.post("/", damageRequestController.createRequest);

/**
 * @route   GET /api/damage
 * @desc    Get all requests with filters (status, type, date range)
 * @access  All authenticated users (filtered by role in service)
 */
router.get("/", damageRequestController.getAllRequests);

/**
 * @route   GET /api/damage/my-requests
 * @desc    Get current user's requests
 * @access  All authenticated users
 */
router.get("/my-requests", damageRequestController.getMyRequests);

/**
 * @route   GET /api/damage/:id
 * @desc    Get single request by ID
 * @access  All authenticated users (only if owner or storekeeper/admin)
 */
router.get("/:id", damageRequestController.getRequestById);

/**
 * @route   GET /api/damage/inventory/:inventoryId/summary
 * @desc    Get damage/lost/expire summary for an inventory item
 * @access  All authenticated users
 */
router.get(
  "/inventory/:inventoryId/summary",
  damageRequestController.getSummary
);

// ==================== STOREKEEPER/ADMIN ONLY ROUTES ====================

/**
 * @route   PATCH /api/damage/:id/approve
 * @desc    Approve damage/lost/expire request (FIFO)
 * @access  Storekeeper, Admin only
 */
router.patch(
  "/:id/approve",
  authorize("Storekeeper", "Admin"),
  damageRequestController.approveRequest
);

/**
 * @route   PATCH /api/damage/:id/reject
 * @desc    Reject damage/lost/expire request
 * @access  Storekeeper, Admin only
 */
router.patch(
  "/:id/reject",
  authorize("Storekeeper", "Admin"),
  damageRequestController.rejectRequest
);

/**
 * @route   GET /api/damage/dashboard/stats
 * @desc    Get damage/lost/expire dashboard statistics
 * @access  Storekeeper, Admin only
 */
router.get(
  "/dashboard/stats",
  authorize("Storekeeper", "Admin"),
  damageRequestController.getDashboard
);

module.exports = router;