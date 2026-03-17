const StockIn = require("../models/stockInModel");
const Inventory = require("../models/inventoryModel");
const Item = require("../models/itemModel");
const User = require("../models/userModel");

// 🔹 Create StockIn (multi-item)
// services/stockInService.js

// 🔹 Create StockIn
const createStockIn = async (data) => {
  if (!data.items || !data.items.length) throw new Error("No items provided");

  const itemsWithTotal = await Promise.all(
    data.items.map(async (i) => {
      const item = await Item.findById(i.item);
      if (!item) throw new Error("Item not found: " + i.item);
      
      return {
        item: i.item,
        unit: i.unit,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        expiryDate: i.expiryDate || null,  // ← expiryDate ထည့်
        totalPrice: i.quantity * i.unitPrice,
      };
    }),
  );

  const grandTotal = itemsWithTotal.reduce((sum, i) => sum + i.totalPrice, 0);

  const stock = new StockIn({
    ...data,
    items: itemsWithTotal,
    grandTotal,
    status: "PENDING",
  });

  return await stock.save();
};

// 🔹 Approve StockIn
const approveStockIn = async (id, approverId) => {
  try {
    const stock = await StockIn.findById(id);
    if (!stock) throw new Error("StockIn not found");
    if (stock.status !== "PENDING") throw new Error("Already processed");

    const requester = await User.findById(stock.requester);
    const supplierName = requester ? requester.username : "Unknown";

    for (const i of stock.items) {
      const item = await Item.findById(i.item);
      if (!item) throw new Error("Item not found: " + i.item);

      let inventory = await Inventory.findOne({
        "item.itemId": item._id,
      });

      if (!inventory) {
        inventory = new Inventory({
          item: {
            itemId: item._id,
            name: item.name,
            code: item.code,
            brand: item.brand,
            category: item.category,
            unit: item.unit,
          },
          batches: [],
        });
      }

      const batchNumber = `B${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // ✅ StockIn ထဲက expiryDate ကို ယူပြီး batch ထဲထည့်
      inventory.batches.push({
        batchNumber,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        remainingQty: i.quantity,
        receivedDate: new Date(),
        supplier: supplierName,
        expiryDate: i.expiryDate || null,  // ← ဒီမှာထည့်
      });

      await inventory.save();
    }

    stock.status = "APPROVED";
    stock.approvedBy = approverId;
    stock.approvedAt = new Date();

    await stock.save();

    const populatedStock = await StockIn.findById(stock._id)
      .populate("items.item")
      .populate("requester", "username role")
      .populate("approvedBy", "username role");

    return populatedStock;
  } catch (error) {
    throw error;
  }
};

// 🔹 Reject StockIn
const rejectStockIn = async (id, approverId) => {
  const stock = await StockIn.findById(id);
  if (!stock) throw new Error("StockIn not found");
  if (stock.status !== "PENDING") throw new Error("Already processed");

  stock.status = "REJECTED";
  stock.approvedBy = approverId;
  stock.approvedAt = new Date();

  await stock.save();

  const populatedStock = await StockIn.findById(stock._id)
    .populate("items.item")
    .populate("requester", "username role")
    .populate("approvedBy", "username role");

  return populatedStock;
};

// 🔹 Get All StockIns
const getAllStockIns = async () => {
  return await StockIn.find()
    .populate("items.item")
    .populate("requester", "username role")
    .populate("approvedBy", "username role")
    .sort({ createdAt: -1 });
};

// 🔹 Get StockIn by ID
const getStockInById = async (id) => {
  return await StockIn.findById(id)
    .populate("items.item")
    .populate("requester", "username role")
    .populate("approvedBy", "username role");
};

module.exports = {
  createStockIn,
  approveStockIn,
  rejectStockIn,
  getAllStockIns,
  getStockInById,
};