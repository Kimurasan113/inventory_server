const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    brand: { type: String, required: true, },
    category: { type: String, required: true,},
    unit: { type: String, required: true }, // pcs, kg, liter, tray
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
