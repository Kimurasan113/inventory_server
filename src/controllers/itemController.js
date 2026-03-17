const itemService = require("../services/itemService");

// Create Item
const createItem = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const item = await itemService.createItem(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

// Get all items
const getAllItems = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const items = await itemService.getAllItems();
    res.json(items);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

// Get single item
const getItem = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

// Update item
const updateItem = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const updated = await itemService.updateItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json(updated);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

// Delete item
const deleteItem = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const deleted = await itemService.deleteItem(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
};