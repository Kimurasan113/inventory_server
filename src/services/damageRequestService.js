const DamageRequest = require("../models/damageModel");
const Inventory = require("../models/inventoryModel");

// 🔹 Create Damage/Lost/Expire Request
const createDamageRequest = async (data) => {
  const { itemId, quantity, type, reason, requestedBy, expireDate } = data;

  // Validation
  if (!requestedBy) throw new Error("requestedBy is required");
  if (!itemId) throw new Error("itemId is required");
  if (quantity <= 0) throw new Error("Quantity must be greater than 0");

  try {
    const inventory = await Inventory.findById(itemId);
    if (!inventory) throw new Error("Inventory item not found");

    // Check available quantity
    if (inventory.availableQty < quantity) {
      throw new Error(`Insufficient quantity. Available: ${inventory.availableQty}`);
    }

    // Expire date validation
    if (type === "Expire") {
      if (!expireDate) {
        throw new Error("Expire date is required for expire requests");
      }
      const expiryDate = new Date(expireDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDate > today) {
        throw new Error("Expire date must be in the past");
      }
    }

    const damageRequest = new DamageRequest({
      itemId,
      quantity,
      type,
      reason,
      requestedBy,
      expireDate: type === "Expire" ? expireDate : undefined,
      unitPrice: 0,
      totalAmount: 0,
      batchDetails: [],
      status: "PENDING",
    });

    const savedRequest = await damageRequest.save();
    return savedRequest;
  } catch (error) {
    throw error;
  }
};

// 🔹 Approve Damage/Lost/Expire Request
const approveDamageRequest = async (id, approverId) => {
  try {
    const request = await DamageRequest.findById(id)
      .populate("itemId")
      .populate("requestedBy", "username role");

    if (!request) throw new Error("Damage request not found");
    if (request.status !== "PENDING") throw new Error("Already processed");
    if (!request.itemId) throw new Error("ItemId not populated");

    const inventory = await Inventory.findById(request.itemId._id);
    if (!inventory) throw new Error("Inventory item not found");

    // Double-check available quantity
    if (inventory.availableQty < request.quantity) {
      throw new Error(`Insufficient quantity. Available: ${inventory.availableQty}`);
    }

    // FIFO method to remove quantity
    const removedDetails = inventory.removeQuantityFIFO(
      request.quantity,
      request.type.toLowerCase()
    );
    
    // Calculate total amount and average unit price
    const totalAmount = removedDetails.reduce((sum, d) => sum + (d.quantity * d.unitPrice), 0);
    const avgUnitPrice = request.quantity > 0 ? totalAmount / request.quantity : 0;

    await inventory.save();

    // Update request
    request.status = "APPROVED";
    request.approvedBy = approverId;
    request.unitPrice = avgUnitPrice;
    request.totalAmount = totalAmount;
    request.batchDetails = removedDetails;
    request.approvedAt = new Date();
    
    await request.save();

    // Return populated request
    const populatedRequest = await DamageRequest.findById(request._id)
      .populate("itemId")
      .populate("requestedBy", "username role")
      .populate("approvedBy", "username role");

    return populatedRequest;
  } catch (error) {
    throw error;
  }
};

// 🔹 Reject Damage/Lost/Expire Request
const rejectDamageRequest = async (id, approverId) => {
  try {
    const request = await DamageRequest.findById(id);
    if (!request) throw new Error("Damage request not found");
    if (request.status !== "PENDING") throw new Error("Already processed");

    request.status = "REJECTED";
    request.approvedBy = approverId;
    request.approvedAt = new Date();
    await request.save();

    const populatedRequest = await DamageRequest.findById(request._id)
      .populate("itemId")
      .populate("requestedBy", "username role")
      .populate("approvedBy", "username role");

    return populatedRequest;
  } catch (error) {
    throw error;
  }
};

// 🔹 Get All Damage/Lost/Expire Requests
const getAllDamageRequests = async (filters = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const requests = await DamageRequest.find(query)
    .populate("itemId")
    .populate("requestedBy", "username role")
    .populate("approvedBy", "username role")
    .sort({ createdAt: -1 });

  // Add summary statistics
  const summary = {
    total: requests.length,
    pending: requests.filter(r => r.status === "PENDING").length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    rejected: requests.filter(r => r.status === "REJECTED").length,
    damage: requests.filter(r => r.type === "Damage").length,
    lost: requests.filter(r => r.type === "Lost").length,
    expire: requests.filter(r => r.type === "Expire").length,
    totalAmount: requests
      .filter(r => r.status === "APPROVED")
      .reduce((sum, r) => sum + r.totalAmount, 0)
  };

  return {
    summary,
    requests
  };
};

// 🔹 Get Single Damage/Lost/Expire Request
const getDamageRequestById = async (id) => {
  const request = await DamageRequest.findById(id)
    .populate("itemId")
    .populate("requestedBy", "username role")
    .populate("approvedBy", "username role");
  
  if (!request) throw new Error("Damage request not found");
  return request;
};

// 🔹 Get Damage/Lost/Expire Summary by Inventory Item
const getDamageLostSummary = async (inventoryId) => {
  const inventory = await Inventory.findById(inventoryId).populate(
    "item.itemId",
    "name code category"
  );

  if (!inventory) throw new Error("Inventory not found");

  const requests = await DamageRequest.find({
    itemId: inventoryId,
    status: "APPROVED",
  })
    .populate("requestedBy", "username role")
    .populate("approvedBy", "username role")
    .sort({ createdAt: -1 });

  // Calculate totals by type
  const damageRequests = requests.filter(r => r.type === "Damage");
  const lostRequests = requests.filter(r => r.type === "Lost");
  const expireRequests = requests.filter(r => r.type === "Expire");

  return {
    inventory: {
      id: inventory._id,
      itemName: inventory.item.name,
      itemCode: inventory.item.code,
      category: inventory.item.category,
      baseQty: inventory.baseQty,
      remainingQty: inventory.remainingQty,
      availableQty: inventory.availableQty,
      damageQty: inventory.totalDamageQty,
      lostQty: inventory.totalLostQty,
      expireQty: inventory.totalExpireQty,
      avgUnitPrice: inventory.avgUnitPrice,
      totalValue: inventory.totalValue,
    },
    summary: {
      totalDamage: inventory.totalDamageQty,
      totalLost: inventory.totalLostQty,
      totalExpire: inventory.totalExpireQty,
      totalDamageAmount: damageRequests.reduce((sum, r) => sum + r.totalAmount, 0),
      totalLostAmount: lostRequests.reduce((sum, r) => sum + r.totalAmount, 0),
      totalExpireAmount: expireRequests.reduce((sum, r) => sum + r.totalAmount, 0),
      totalCompensation: requests.reduce((sum, r) => sum + r.totalAmount, 0),
      totalRequests: requests.length,
      damageRequests: damageRequests.length,
      lostRequests: lostRequests.length,
      expireRequests: expireRequests.length,
    },
    recentRequests: requests.slice(0, 5).map((req) => ({
      id: req._id,
      type: req.type,
      quantity: req.quantity,
      unitPrice: req.unitPrice,
      totalAmount: req.totalAmount,
      createdAt: req.createdAt,
      reason: req.reason,
      expireDate: req.expireDate,
      requestedBy: {
        id: req.requestedBy?._id,
        username: req.requestedBy?.username,
        role: req.requestedBy?.role
      },
      approvedBy: req.approvedBy ? {
        id: req.approvedBy._id,
        username: req.approvedBy.username,
        role: req.approvedBy.role
      } : null,
      status: req.status,
      batchDetails: req.batchDetails || [],
    })),
  };
};

// 🔹 Get Dashboard Statistics
const getDamageDashboard = async () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const [
    totalStats,
    monthlyStats,
    yearlyStats,
    pendingStats
  ] = await Promise.all([
    // Total stats
    DamageRequest.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: {
        _id: "$type",
        count: { $sum: 1 },
        quantity: { $sum: "$quantity" },
        amount: { $sum: "$totalAmount" }
      }}
    ]),
    // Monthly stats
    DamageRequest.aggregate([
      { $match: { 
        status: "APPROVED",
        createdAt: { $gte: startOfMonth }
      }},
      { $group: {
        _id: "$type",
        count: { $sum: 1 },
        amount: { $sum: "$totalAmount" }
      }}
    ]),
    // Yearly stats
    DamageRequest.aggregate([
      { $match: { 
        status: "APPROVED",
        createdAt: { $gte: startOfYear }
      }},
      { $group: {
        _id: "$type",
        count: { $sum: 1 },
        amount: { $sum: "$totalAmount" }
      }}
    ]),
    // Pending requests
    DamageRequest.countDocuments({ status: "PENDING" })
  ]);

  return {
    total: totalStats,
    monthly: monthlyStats,
    yearly: yearlyStats,
    pending: pendingStats
  };
};

module.exports = {
  createDamageRequest,
  approveDamageRequest,
  rejectDamageRequest,
  getAllDamageRequests,
  getDamageRequestById,
  getDamageLostSummary,
  getDamageDashboard,
};