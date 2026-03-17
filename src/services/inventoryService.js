// services/inventoryService.js
const Inventory = require("../models/inventoryModel");

/**
 * Get all inventory items (with optional filtering)
 */
const getAllInventory = async (filter = {}) => {
  return await Inventory.find(filter)
    .populate("item.itemId", "name code category")
    .sort({ createdAt: -1 }); // အသစ်ထည့်တဲ့ဟာ အရင်ပေါ်
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
    .sort((a, b) => a.availableQty - b.availableQty); // အနည်းဆုံးအရင်ပေါ်
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
  today.setHours(0, 0, 0, 0); // ဒီနေ့ နေ့လယ် ၁၂ နာရီ
  
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
        
        // သက်တမ်းကုန်သွားပြီ
        if (expiryDate < today) {
          expiredItems.push({
            ...batchInfo,
            status: 'EXPIRED',
            daysOverdue: Math.ceil((today - expiryDate) / (1000 * 60 * 60 * 24))
          });
        }
        // သက်တမ်းကုန်ခါနီး (days အတွင်း)
        else if (expiryDate <= futureDate) {
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
    totalPotentialLoss: 0, // သက်တမ်းကုန်တော့မယ့်ဟာတွေရဲ့တန်ဖိုး
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
    
    // Category အလိုက်စုစည်း
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
    
    // သက်တမ်းကုန်ခါနီးတန်ဖိုး (ရက် ၃၀ အတွင်း)
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

/**
 * Get inventory by category
 */
const getInventoryByCategory = async (category) => {
  const inventories = await Inventory.find({
    "item.category": category
  }).populate("item.itemId", "name code");
  
  return {
    category,
    totalItems: inventories.length,
    totalValue: inventories.reduce((sum, inv) => sum + inv.totalValue, 0),
    items: inventories.map(inv => ({
      id: inv._id,
      name: inv.item.name,
      code: inv.item.code,
      availableQty: inv.availableQty,
      unit: inv.item.unit,
      avgPrice: inv.avgUnitPrice,
      totalValue: inv.totalValue
    }))
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
    
    // Low stock check
    if (inv.availableQty < 10) {
      if (inv.availableQty === 0) {
        stats.outOfStockCount++;
      } else {
        stats.lowStockCount++;
      }
    }
    
    // Expiry check
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
    
    // Category stats
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
  getAllInventory,
  getInventoryById,
  getLowStockItems,
  getExpiringBatches,
  getInventoryValuation,
  getInventoryByCategory,
  getInventoryDashboard,
  deleteInventory,
};