const mongoose = require("mongoose");

const stockInSchema = new mongoose.Schema(
  {
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        unit: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, default: 0 },
        expiryDate: { type: Date },
      },
    ],

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

    approvedAt: Date,
    remark: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockIn", stockInSchema);
