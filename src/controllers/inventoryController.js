// controllers/inventoryController.js
const service = require("../services/inventoryService");

/**
 * GET /api/inventory
 * Optional query: ?category=Food&search=code&includeStats=true
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter["item.category"] = req.query.category;
    }
    if (req.query.search) {
      filter.$or = [
        { "item.name": { $regex: req.query.search, $options: "i" } },
        { "item.code": { $regex: req.query.search, $options: "i" } },
      ];
    }
    
    const inventory = await service.getAllInventory(filter);
    
    if (req.query.includeStats === 'true') {
      const inventoryWithStats = inventory.map(item => ({
        ...item.toObject(),
        stats: {
          availableQty: item.availableQty,
          totalLossQty: item.totalLossQty,
          totalLossValue: item.totalLossValue,
          lossPercentage: item.baseQty > 0 
            ? ((item.totalLossQty / item.baseQty) * 100).toFixed(2)
            : 0
        }
      }));
      return res.json({
        success: true,
        count: inventoryWithStats.length,
        data: inventoryWithStats
      });
    }
    
    res.json({
      success: true,
      count: inventory.length,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/:id
 */
exports.getOne = async (req, res, next) => {
  try {
    const inventory = await service.getInventoryById(req.params.id);
    
    const inventoryWithStats = {
      ...inventory.toObject(),
      stats: {
        availableQty: inventory.availableQty,
        totalLossQty: inventory.totalLossQty,
        totalLossValue: inventory.totalLossValue,
        lossPercentage: inventory.baseQty > 0 
          ? ((inventory.totalLossQty / inventory.baseQty) * 100).toFixed(2)
          : 0
      }
    };
    
    res.json({
      success: true,
      data: inventoryWithStats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/:id/loss-stats
 * Get detailed loss statistics for an inventory item
 */
exports.getLossStats = async (req, res, next) => {
  try {
    const inventory = await service.getInventoryById(req.params.id);
    
    const lossStats = {
      inventoryId: inventory._id,
      itemName: inventory.item.name,
      itemCode: inventory.item.code,
      baseQty: inventory.baseQty,
      remainingQty: inventory.remainingQty,
      availableQty: inventory.availableQty,
      losses: {
        damage: {
          quantity: inventory.totalDamageQty,
          value: inventory.totalDamageQty * inventory.avgUnitPrice
        },
        lost: {
          quantity: inventory.totalLostQty,
          value: inventory.totalLostQty * inventory.avgUnitPrice
        },
        expire: {
          quantity: inventory.totalExpireQty,
          value: inventory.totalExpireQty * inventory.avgUnitPrice
        }
      },
      totalLossQty: inventory.totalLossQty,
      totalLossValue: inventory.totalLossValue,
      lossPercentage: inventory.baseQty > 0 
        ? ((inventory.totalLossQty / inventory.baseQty) * 100).toFixed(2)
        : 0,
      batches: inventory.batches.map(b => ({
        batchNumber: b.batchNumber,
        remainingQty: b.remainingQty,
        damageQty: b.damageQty,
        lostQty: b.lostQty,
        expireQty: b.expireQty,
        expiryDate: b.expiryDate
      }))
    };
    
    res.json({
      success: true,
      data: lossStats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/low-stock
 * Get items with low stock (availableQty below threshold)
 */
exports.getLowStock = async (req, res, next) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : 10;
    
    const lowStockItems = await service.getLowStockItems(threshold);
    
    res.json({
      success: true,
      threshold,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/expiring
 * Get items with expiring batches
 */
exports.getExpiring = async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    
    const expiringItems = await service.getExpiringBatches(days);
    
    res.json({
      success: true,
      days,
      expiring: expiringItems.expiring.length,
      expired: expiringItems.expired.length,
      data: expiringItems
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/valuation
 * Get inventory valuation report
 */
exports.getValuation = async (req, res, next) => {
  try {
    const valuation = await service.getInventoryValuation();
    
    res.json({
      success: true,
      data: valuation
    });
  } catch (err) {
    next(err);
  }
};

// ==================== CATEGORY CONTROLLERS ====================

/**
 * GET /api/inventory/categories
 * Get all distinct categories with item counts
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await service.getAllCategories();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/categories/summary
 * Get category summary with statistics
 */
exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await service.getCategorySummary();
    
    res.json({
      success: true,
      count: summary.length,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/categories/performance
 * Get category performance report
 */
exports.getCategoryPerformance = async (req, res, next) => {
  try {
    const performance = await service.getCategoryPerformance();
    
    res.json({
      success: true,
      count: performance.length,
      data: performance
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/inventory/categories/filter
 * Get inventory filtered by multiple categories
 */
exports.getByMultipleCategories = async (req, res, next) => {
  try {
    const { categories, sortBy, search, includeStats, includeBatches } = req.body;
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of categories"
      });
    }
    
    const options = {
      sortBy: sortBy || 'name',
      search: search || null,
      includeStats: includeStats === true,
      includeBatches: includeBatches === true
    };
    
    const result = await service.getInventoryByMultipleCategories(categories, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/category/:category
 * Get inventory by category (enhanced)
 * Query params:
 *   ?sortBy=name|value|quantity|date
 *   ?search=keyword
 *   ?includeStats=true
 *   ?includeBatches=true
 */
exports.getByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { 
      sortBy, 
      search, 
      includeStats = 'false', 
      includeBatches = 'false' 
    } = req.query;
    
    const options = {
      sortBy: sortBy || 'name',
      search: search || null,
      includeStats: includeStats === 'true',
      includeBatches: includeBatches === 'true'
    };
    
    const result = await service.getInventoryByCategory(category, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/dashboard
 * Get inventory dashboard statistics
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await service.getInventoryDashboard();
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inventory/loss-summary
 * Get summary of all losses (damage + lost + expire)
 */
exports.getLossSummary = async (req, res, next) => {
  try {
    const inventory = await service.getAllInventory();
    
    const summary = {
      totalItems: inventory.length,
      totalBaseQty: 0,
      totalDamageQty: 0,
      totalLostQty: 0,
      totalExpireQty: 0,
      totalLossValue: 0,
      byCategory: {},
      items: []
    };
    
    inventory.forEach(item => {
      summary.totalBaseQty += item.baseQty;
      summary.totalDamageQty += item.totalDamageQty;
      summary.totalLostQty += item.totalLostQty;
      summary.totalExpireQty += item.totalExpireQty;
      summary.totalLossValue += item.totalLossValue;
      
      const cat = item.item.category;
      if (!summary.byCategory[cat]) {
        summary.byCategory[cat] = {
          damageQty: 0,
          lostQty: 0,
          expireQty: 0,
          lossValue: 0
        };
      }
      summary.byCategory[cat].damageQty += item.totalDamageQty;
      summary.byCategory[cat].lostQty += item.totalLostQty;
      summary.byCategory[cat].expireQty += item.totalExpireQty;
      summary.byCategory[cat].lossValue += item.totalLossValue;
      
      if (item.totalLossQty > 0) {
        summary.items.push({
          id: item._id,
          name: item.item.name,
          code: item.item.code,
          category: item.item.category,
          damageQty: item.totalDamageQty,
          lostQty: item.totalLostQty,
          expireQty: item.totalExpireQty,
          lossValue: item.totalLossValue
        });
      }
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/inventory/:id
 * ⚠️ Manual adjustment – use with admin check
 */
exports.update = async (req, res, next) => {
  try {
    const inventory = await service.updateInventory(req.params.id, req.body);
    
    res.json({
      success: true,
      message: "Inventory updated successfully",
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/inventory/:id/adjust
 * Adjust inventory quantities (increment/decrement)
 */
exports.adjust = async (req, res, next) => {
  try {
    const { baseQty, damageQty, lostQty, expireQty, unitPrice } = req.body;
    
    const adjustments = {};
    if (baseQty !== undefined) adjustments.baseQty = baseQty;
    if (damageQty !== undefined) adjustments.damageQty = damageQty;
    if (lostQty !== undefined) adjustments.lostQty = lostQty;
    if (expireQty !== undefined) adjustments.expireQty = expireQty;
    if (unitPrice !== undefined) adjustments.unitPrice = unitPrice;
    
    const inventory = await service.adjustInventory(req.params.id, adjustments);
    
    res.json({
      success: true,
      message: "Inventory adjusted successfully",
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/inventory/:id
 * ⚠️ Usually not needed
 */
exports.delete = async (req, res, next) => {
  try {
    await service.deleteInventory(req.params.id);
    
    res.json({
      success: true,
      message: "Inventory deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};