// services/inventoryService.js
const Inventory = require("../models/inventoryModel");

/**
 * Get all inventory items (with optional filtering)
 */
const getAllInventory = async (filter = {}) => {
  return await Inventory.find(filter)
    .populate("item.itemId", "name code category")
    .sort({ createdAt: -1 });
};

/**
 * Get single inventory item by ID
 */
const getInventoryById = async (id) => {
  const inventory = await Inventory.findById(id)
    .populate("item.itemId", "name code category");
  if (!inventory) throw new Error("Inventory not found");
  return inventory;
};

/**
 * Get low stock items (below threshold)
 */
const getLowStockItems = async (threshold = 10) => {
  const inventories = await Inventory.find();
  
  return inventories
    .filter(inv => inv.availableQty < threshold)
    .map(inv => ({
      id: inv._id,
      itemName: inv.item.name,
      itemCode: inv.item.code,
      category: inv.item.category,
      availableQty: inv.availableQty,
      threshold,
      unit: inv.item.unit,
      status: inv.availableQty === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
    }))
    .sort((a, b) => a.availableQty - b.availableQty);
};

/**
 * Get expiring batches (within next X days)
 */
const getExpiringBatches = async (days = 30) => {
  const inventories = await Inventory.find();
  const expiringItems = [];
  const expiredItems = [];
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  inventories.forEach(inv => {
    inv.batches.forEach(batch => {
      if (batch.expiryDate && batch.remainingQty > 0) {
        const expiryDate = new Date(batch.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        
        const batchInfo = {
          inventoryId: inv._id,
          itemName: inv.item.name,
          itemCode: inv.item.code,
          category: inv.item.category,
          batchNumber: batch.batchNumber,
          remainingQty: batch.remainingQty,
          unitPrice: batch.unitPrice,
          expiryDate: batch.expiryDate,
        };
        
        if (expiryDate < today) {
          expiredItems.push({
            ...batchInfo,
            status: 'EXPIRED',
            daysOverdue: Math.ceil((today - expiryDate) / (1000 * 60 * 60 * 24))
          });
        } else if (expiryDate <= futureDate) {
          expiringItems.push({
            ...batchInfo,
            daysRemaining: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
          });
        }
      }
    });
  });
  
  return {
    expiring: expiringItems.sort((a, b) => a.daysRemaining - b.daysRemaining),
    expired: expiredItems.sort((a, b) => b.daysOverdue - a.daysOverdue)
  };
};

/**
 * Get inventory valuation report
 */
const getInventoryValuation = async () => {
  const inventories = await Inventory.find();
  
  const summary = {
    totalItems: inventories.length,
    totalValue: 0,
    totalCost: 0,
    totalLossValue: 0,
    totalPotentialLoss: 0,
    byCategory: {},
    overall: {
      totalBatches: 0,
      totalQuantity: 0,
      avgPrice: 0
    }
  };
  
  let totalQuantity = 0;
  let totalValue = 0;
  
  inventories.forEach(inv => {
    const value = inv.totalValue;
    const lossValue = inv.totalLossValue;
    const category = inv.item.category || 'Uncategorized';
    
    if (!summary.byCategory[category]) {
      summary.byCategory[category] = {
        count: 0,
        items: 0,
        value: 0,
        lossValue: 0,
        potentialLoss: 0
      };
    }
    
    summary.byCategory[category].count += 1;
    summary.byCategory[category].items += inv.batches.length;
    summary.byCategory[category].value += value;
    summary.byCategory[category].lossValue += lossValue;
    
    inv.batches.forEach(batch => {
      if (batch.expiryDate && batch.remainingQty > 0) {
        const daysToExpiry = Math.ceil(
          (new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysToExpiry <= 30 && daysToExpiry > 0) {
          const potentialLoss = batch.remainingQty * batch.unitPrice;
          summary.totalPotentialLoss += potentialLoss;
          summary.byCategory[category].potentialLoss += potentialLoss;
        }
      }
    });
    
    summary.totalValue += value;
    summary.totalLossValue += lossValue;
    totalQuantity += inv.availableQty;
    totalValue += value;
  });
  
  summary.overall = {
    totalBatches: inventories.reduce((sum, inv) => sum + inv.batches.length, 0),
    totalQuantity,
    avgPrice: totalQuantity > 0 ? totalValue / totalQuantity : 0
  };
  
  return summary;
};

// ==================== CATEGORY FUNCTIONS ====================

/**
 * Get all distinct categories with item counts
 */
const getAllCategories = async () => {
  const inventories = await Inventory.find();
  
  const categoryMap = new Map();
  
  inventories.forEach(inv => {
    const category = inv.item.category || 'Uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        name: category,
        count: 0,
        totalValue: 0,
        totalQuantity: 0,
        totalLossValue: 0
      });
    }
    
    const cat = categoryMap.get(category);
    cat.count++;
    cat.totalValue += inv.totalValue;
    cat.totalQuantity += inv.availableQty;
    cat.totalLossValue += inv.totalLossValue;
  });
  
  return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get category summary with statistics
 */
const getCategorySummary = async () => {
  const inventories = await Inventory.find();
  
  const categories = {};
  
  inventories.forEach(inv => {
    const category = inv.item.category || 'Uncategorized';
    
    if (!categories[category]) {
      categories[category] = {
        name: category,
        totalItems: 0,
        totalBatches: 0,
        totalQuantity: 0,
        totalValue: 0,
        totalLossValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      };
    }
    
    const cat = categories[category];
    cat.totalItems++;
    cat.totalBatches += inv.batches.length;
    cat.totalQuantity += inv.availableQty;
    cat.totalValue += inv.totalValue;
    cat.totalLossValue += inv.totalLossValue;
    
    if (inv.availableQty < 10) {
      if (inv.availableQty === 0) {
        cat.outOfStockCount++;
      } else {
        cat.lowStockCount++;
      }
    }
  });
  
  return Object.values(categories).map(cat => ({
    ...cat,
    avgValuePerItem: cat.totalItems > 0 ? cat.totalValue / cat.totalItems : 0,
    lossPercentage: cat.totalValue > 0 
      ? ((cat.totalLossValue / cat.totalValue) * 100).toFixed(2)
      : 0,
    stockHealthPercentage: cat.totalItems > 0
      ? ((cat.totalItems - cat.lowStockCount - cat.outOfStockCount) / cat.totalItems * 100).toFixed(2)
      : 0
  })).sort((a, b) => b.totalValue - a.totalValue);
};

/**
 * Get category performance report
 */
const getCategoryPerformance = async () => {
  const inventories = await Inventory.find();
  
  const performance = {};
  
  inventories.forEach(inv => {
    const category = inv.item.category || 'Uncategorized';
    
    if (!performance[category]) {
      performance[category] = {
        name: category,
        totalItems: 0,
        totalValue: 0,
        totalLossValue: 0,
        bestSellingItem: null,
        worstPerformingItem: null
      };
    }
    
    const cat = performance[category];
    cat.totalItems++;
    cat.totalValue += inv.totalValue;
    cat.totalLossValue += inv.totalLossValue;
    
    if (!cat.bestSellingItem || inv.totalValue > cat.bestSellingItem.value) {
      cat.bestSellingItem = {
        name: inv.item.name,
        code: inv.item.code,
        value: inv.totalValue
      };
    }
    
    if (!cat.worstPerformingItem || inv.totalLossValue > cat.worstPerformingItem.lossValue) {
      cat.worstPerformingItem = {
        name: inv.item.name,
        code: inv.item.code,
        lossValue: inv.totalLossValue
      };
    }
  });
  
  return Object.values(performance).map(cat => ({
    ...cat,
    lossRate: cat.totalValue > 0 
      ? ((cat.totalLossValue / cat.totalValue) * 100).toFixed(2)
      : 0,
    avgValuePerItem: cat.totalItems > 0 ? cat.totalValue / cat.totalItems : 0
  })).sort((a, b) => b.totalValue - a.totalValue);
};

/**
 * Get inventory by multiple categories
 */
const getInventoryByMultipleCategories = async (categories, options = {}) => {
  const filter = {
    "item.category": { $in: categories }
  };
  
  if (options.search) {
    filter.$or = [
      { "item.name": { $regex: options.search, $options: "i" } },
      { "item.code": { $regex: options.search, $options: "i" } }
    ];
  }
  
  let query = Inventory.find(filter).populate("item.itemId", "name code category");
  
  if (options.sortBy === 'name') {
    query = query.sort({ "item.name": 1 });
  } else if (options.sortBy === 'value') {
    query = query.sort({ totalValue: -1 });
  } else if (options.sortBy === 'quantity') {
    query = query.sort({ availableQty: -1 });
  }
  
  const inventories = await query;
  
  return {
    categories,
    totalItems: inventories.length,
    totalValue: inventories.reduce((sum, inv) => sum + inv.totalValue, 0),
    totalQuantity: inventories.reduce((sum, inv) => sum + inv.availableQty, 0),
    items: inventories.map(inv => ({
      id: inv._id,
      name: inv.item.name,
      code: inv.item.code,
      category: inv.item.category,
      availableQty: inv.availableQty,
      unit: inv.item.unit,
      avgPrice: inv.avgUnitPrice,
      totalValue: inv.totalValue,
      ...(options.includeBatches && { batches: inv.batches }),
      ...(options.includeStats && {
        stats: {
          totalLossQty: inv.totalLossQty,
          totalLossValue: inv.totalLossValue,
          lossPercentage: inv.baseQty > 0 
            ? ((inv.totalLossQty / inv.baseQty) * 100).toFixed(2)
            : 0
        }
      })
    }))
  };
};

/**
 * Get inventory by category with enhanced features
 */
const getInventoryByCategory = async (category, options = {}) => {
  if (!category) {
    throw new Error("Category is required");
  }
  
  const filter = { "item.category": category };
  
  if (options.search) {
    filter.$or = [
      { "item.name": { $regex: options.search, $options: "i" } },
      { "item.code": { $regex: options.search, $options: "i" } }
    ];
  }
  
  let query = Inventory.find(filter).populate("item.itemId", "name code category");
  
  if (options.sortBy === 'name') {
    query = query.sort({ "item.name": 1 });
  } else if (options.sortBy === 'value') {
    query = query.sort({ totalValue: -1 });
  } else if (options.sortBy === 'quantity') {
    query = query.sort({ availableQty: -1 });
  } else if (options.sortBy === 'date') {
    query = query.sort({ createdAt: -1 });
  }
  
  const inventories = await query;
  
  const stats = {
    totalItems: inventories.length,
    totalValue: 0,
    totalQuantity: 0,
    totalLossValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  };
  
  const items = inventories.map(inv => {
    stats.totalValue += inv.totalValue;
    stats.totalQuantity += inv.availableQty;
    stats.totalLossValue += inv.totalLossValue;
    
    if (inv.availableQty < 10) {
      if (inv.availableQty === 0) {
        stats.outOfStockCount++;
      } else {
        stats.lowStockCount++;
      }
    }
    
    const item = {
      id: inv._id,
      name: inv.item.name,
      code: inv.item.code,
      availableQty: inv.availableQty,
      unit: inv.item.unit,
      avgPrice: inv.avgUnitPrice,
      totalValue: inv.totalValue,
    };
    
    if (options.includeStats) {
      item.stats = {
        totalLossQty: inv.totalLossQty,
        totalLossValue: inv.totalLossValue,
        damageQty: inv.totalDamageQty,
        lostQty: inv.totalLostQty,
        expireQty: inv.totalExpireQty,
        lossPercentage: inv.baseQty > 0 
          ? ((inv.totalLossQty / inv.baseQty) * 100).toFixed(2)
          : 0
      };
    }
    
    if (options.includeBatches) {
      item.batches = inv.batches.map(b => ({
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        remainingQty: b.remainingQty,
        unitPrice: b.unitPrice,
        expiryDate: b.expiryDate,
        supplier: b.supplier,
        receivedDate: b.receivedDate,
        damageQty: b.damageQty,
        lostQty: b.lostQty,
        expireQty: b.expireQty
      }));
    }
    
    return item;
  });
  
  const categoryStats = {
    name: category,
    totalItems: stats.totalItems,
    totalValue: stats.totalValue,
    totalQuantity: stats.totalQuantity,
    totalLossValue: stats.totalLossValue,
    lowStockCount: stats.lowStockCount,
    outOfStockCount: stats.outOfStockCount,
    healthyStockCount: stats.totalItems - stats.lowStockCount - stats.outOfStockCount,
    avgValuePerItem: stats.totalItems > 0 ? stats.totalValue / stats.totalItems : 0,
    lossPercentage: stats.totalValue > 0 
      ? ((stats.totalLossValue / stats.totalValue) * 100).toFixed(2)
      : 0,
    stockHealthPercentage: stats.totalItems > 0
      ? ((stats.totalItems - stats.lowStockCount - stats.outOfStockCount) / stats.totalItems * 100).toFixed(2)
      : 0
  };
  
  return {
    category,
    stats: categoryStats,
    items,
    ...(options.includeStats && { lossStats: stats.totalLossValue })
  };
};

/**
 * Get inventory statistics dashboard
 */
const getInventoryDashboard = async () => {
  const inventories = await Inventory.find();
  
  const stats = {
    totalItems: inventories.length,
    totalValue: 0,
    totalLossValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    categoryStats: {}
  };
  
  inventories.forEach(inv => {
    stats.totalValue += inv.totalValue;
    stats.totalLossValue += inv.totalLossValue;
    
    if (inv.availableQty < 10) {
      if (inv.availableQty === 0) {
        stats.outOfStockCount++;
      } else {
        stats.lowStockCount++;
      }
    }
    
    inv.batches.forEach(batch => {
      if (batch.expiryDate && batch.remainingQty > 0) {
        const daysToExpiry = Math.ceil(
          (new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysToExpiry < 0) {
          stats.expiredCount++;
        } else if (daysToExpiry <= 30) {
          stats.expiringCount++;
        }
      }
    });
    
    const cat = inv.item.category;
    if (!stats.categoryStats[cat]) {
      stats.categoryStats[cat] = {
        count: 0,
        value: 0
      };
    }
    stats.categoryStats[cat].count++;
    stats.categoryStats[cat].value += inv.totalValue;
  });
  
  return stats;
};

/**
 * Delete inventory (use with caution)
 */
const deleteInventory = async (id) => {
  const inventory = await Inventory.findByIdAndDelete(id);
  if (!inventory) throw new Error("Inventory not found");
  return inventory;
};

module.exports = {
  // Basic CRUD
  getAllInventory,
  getInventoryById,
  deleteInventory,
  
  // Reports
  getLowStockItems,
  getExpiringBatches,
  getInventoryValuation,
  getInventoryDashboard,
  
  // Category functions
  getAllCategories,
  getCategorySummary,
  getCategoryPerformance,
  getInventoryByMultipleCategories,
  getInventoryByCategory,
};