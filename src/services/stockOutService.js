const StockOut = require("../models/stockOutModel");
const Inventory = require("../models/inventoryModel");

// ---------- CREATE ----------
const createStockOut = async (data) => {
  let grandTotal = 0;

  const itemsWithDetails = await Promise.all(
    data.items.map(async (i) => {
      const inventory = await Inventory.findById(i.inventoryId);
      if (!inventory) throw new Error(`Inventory not found: ${i.inventoryId}`);

      if (inventory.availableQty < i.quantity) {
        throw new Error(
          `Insufficient quantity for ${inventory.item.name}. Available: ${inventory.availableQty}`
        );
      }

      const unitPrice = inventory.avgUnitPrice;
      const quantity = i.quantity;
      const totalPrice = unitPrice * quantity;

      grandTotal += totalPrice;

      return {
        inventory: inventory._id,
        itemSnapshot: {
          itemId: inventory.item.itemId,
          name: inventory.item.name,
          code: inventory.item.code,
          unit: inventory.item.unit,
        },
        unitPrice,
        quantity,
        totalPrice,
      };
    })
  );

  const stock = new StockOut({
    department: data.department,
    requester: data.requester,
    purpose: data.purpose,
    items: itemsWithDetails,
    grandTotal,
    status: "PENDING",
  });

  await stock.save();
  return stock;
};

// ---------- APPROVE (Transaction ဖြုတ်) ----------
const approveStockOut = async (id, approverId) => {
  try {
    const stock = await StockOut.findById(id);
    if (!stock) throw new Error("StockOut not found");
    if (stock.status !== "PENDING") throw new Error("Already processed");

    for (const i of stock.items) {
      const inventory = await Inventory.findById(i.inventory);
      if (!inventory) throw new Error(`Inventory not found`);

      if (inventory.availableQty < i.quantity) {
        throw new Error(
          `Insufficient quantity for ${inventory.item.name}. Available: ${inventory.availableQty}`
        );
      }

      // FIFO နည်းနဲ့ဖြေ
      const removedDetails = inventory.removeQuantityFIFO(i.quantity);
      console.log('Removed from batches:', removedDetails);

      await inventory.save();
    }

    stock.status = "APPROVED";
    stock.approvedBy = approverId;
    stock.approvedAt = new Date();
    await stock.save();

    return await StockOut.findById(stock._id)
      .populate("requester", "username role")
      .populate("approvedBy", "username role");
  } catch (error) {
    throw error;
  }
};

// ---------- REJECT ----------
const rejectStockOut = async (id, approverId) => {
  const stock = await StockOut.findById(id);
  if (!stock) throw new Error("StockOut not found");
  if (stock.status !== "PENDING") throw new Error("Already processed");

  stock.status = "REJECTED";
  stock.approvedBy = approverId;
  stock.approvedAt = new Date();
  await stock.save();

  return stock;
};

// ---------- GET ALL ----------
const getAllStockOuts = async () => {
  return await StockOut.find()
    .populate("requester", "username role")
    .populate("approvedBy", "username role")
    .sort({ createdAt: -1 });
};

// ---------- GET ONE ----------
const getStockOutById = async (id) => {
  return await StockOut.findById(id)
    .populate("requester", "username role")
    .populate("approvedBy", "username role");
};

module.exports = {
  createStockOut,
  approveStockOut,
  rejectStockOut,
  getAllStockOuts,
  getStockOutById,
};