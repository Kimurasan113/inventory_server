const mongoose = require("mongoose");

const damageRequestSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    quantity: { type: Number, default: 0, required: true, min: 1 },
    type: { 
      type: String, 
      enum: ["Damage", "Lost", "Expire"],  
      required: true 
    },
    reason: { type: String },
    
    expireDate: {  
      type: Date,
      required: function() { return this.type === "Expire"; }
    },
    
    unitPrice: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    
    totalAmount: {
      type: Number,
      default: 0
    },

    // Batch Details from FIFO
    batchDetails: [{
      batchNumber: String,
      quantity: Number,
      unitPrice: Number
    }],

    requestedBy: {
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
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for formatted date
damageRequestSchema.virtual("formattedDate").get(function() {
  return this.createdAt ? new Date(this.createdAt).toLocaleDateString() : "";
});

// Indexes for performance
damageRequestSchema.index({ status: 1, createdAt: -1 });
damageRequestSchema.index({ itemId: 1, status: 1 });
damageRequestSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model("DamageRequest", damageRequestSchema);