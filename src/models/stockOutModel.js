const mongoose = require("mongoose");

const stockOutSchema = new mongoose.Schema(
  {
    items: [
      {
        inventory: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory", // ⬅️ Inventory ကို ချိတ်
          required: true,
        },
        itemSnapshot: {
          // Request လုပ်ချိန်က Item အချက်အလက် (နောင်တွင် မပြောင်းရန်)
          itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
          name: String,
          code: String,
          unit: String,
        },
        unitPrice: { type: Number, default: 0, required: true },
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, default: 0 },
      },
    ],

    department: {
      type: String,
      enum: ["Kitchen", "Housekeeping", "F&B"],
      required: true,
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    grandTotal: { type: Number, default: 0 },
    purpose: String,
    approvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockOut", stockOutSchema);