// routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleWare/authMiddleWare");

// ==================== ALL ROUTES REQUIRE AUTHENTICATION ====================
router.use(protect);

// ==================== PUBLIC ROUTES (View Only) ====================
// Access: Storekeeper, Admin, User, Supplier

/**
 * @route   GET /api/inventory
 * @desc    Get all inventory items with optional filtering
 * @access  Storekeeper, Admin, User, Supplier
 */
router.get(
  "/",
  authorize("Storekeeper", "Admin", "User", "Supplier"),
  inventoryController.getAll
);

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get items with low stock (below threshold)
 * @access  Storekeeper, Admin, User
 */
router.get(
  "/low-stock",
  authorize("Storekeeper", "Admin", "User"),
  inventoryController.getLowStock
);

/**
 * @route   GET /api/inventory/expiring
 * @desc    Get items with expiring batches
 * @access  Storekeeper, Admin, User
 */
router.get(
  "/expiring",
  authorize("Storekeeper", "Admin", "User"),
  inventoryController.getExpiring
);

/**
 * @route   GET /api/inventory/valuation
 * @desc    Get inventory valuation report
 * @access  Storekeeper, Admin
 */
router.get(
  "/valuation",
  authorize("Storekeeper", "Admin"),
  inventoryController.getValuation
);

/**
 * @route   GET /api/inventory/dashboard
 * @desc    Get inventory dashboard statistics
 * @access  Storekeeper, Admin
 */
router.get(
  "/dashboard",
  authorize("Storekeeper", "Admin"),
  inventoryController.getDashboard
);

/**
 * @route   GET /api/inventory/loss-summary
 * @desc    Get summary of all losses (damage + lost + expire)
 * @access  Storekeeper, Admin
 */
router.get(
  "/loss-summary",
  authorize("Storekeeper", "Admin"),
  inventoryController.getLossSummary
);

/**
 * @route   GET /api/inventory/category/:category
 * @desc    Get inventory by category
 * @access  Storekeeper, Admin, User, Supplier
 */
router.get(
  "/category/:category",
  authorize("Storekeeper", "Admin", "User", "Supplier"),
  inventoryController.getByCategory
);

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory item with stats
 * @access  Storekeeper, Admin, User, Supplier
 */
router.get(
  "/:id",
  authorize("Storekeeper", "Admin", "User", "Supplier"),
  inventoryController.getOne
);

/**
 * @route   GET /api/inventory/:id/loss-stats
 * @desc    Get detailed loss statistics for specific inventory
 * @access  Storekeeper, Admin
 */
router.get(
  "/:id/loss-stats",
  authorize("Storekeeper", "Admin"),
  inventoryController.getLossStats
);

// ==================== STOREKEEPER/ADMIN ROUTES (Modify Operations) ====================

/**
 * @route   PATCH /api/inventory/:id/adjust
 * @desc    Adjust inventory quantities (increment/decrement)
 * @access  Storekeeper, Admin
 */
router.patch(
  "/:id/adjust",
  authorize("Storekeeper", "Admin"),
  inventoryController.adjust
);

// ==================== ADMIN ONLY ROUTES ====================

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update inventory (manual correction)
 * @access  Admin only
 */
router.put(
  "/:id",
  authorize("Admin"),
  inventoryController.update
);

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete inventory (use with caution)
 * @access  Admin only
 */
router.delete(
  "/:id",
  authorize("Admin"),
  inventoryController.delete
);

module.exports = router;