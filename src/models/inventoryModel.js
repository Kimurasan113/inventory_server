// models/Inventory.js
const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },

  // Received
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },

  // Current usable stock
  remainingQty: { type: Number, required: true, min: 0 },

  receivedDate: { type: Date, default: Date.now },
  supplier: { type: String, default: "Unknown" },

  // Expiry Date (optional)
  expiryDate: { type: Date }, 

  // Loss tracking per batch
  damageQty: { type: Number, default: 0 },
  lostQty: { type: Number, default: 0 },
  expireQty: { type: Number, default: 0 },
});

const inventorySchema = new mongoose.Schema(
  {
    item: {
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
      },
      name: { type: String, required: true },
      code: { type: String, required: true },
      brand: { type: String, default: "NoBrand" },
      category: { type: String, required: true },
      unit: { type: String, required: true },
    },

    batches: [batchSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// 🔹 Virtual Fields
//

// Total received
inventorySchema.virtual("baseQty").get(function () {
  return this.batches.reduce((sum, b) => sum + b.quantity, 0);
});

// Current usable stock (after stock-out & loss)
inventorySchema.virtual("remainingQty").get(function () {
  return this.batches.reduce((sum, b) => sum + b.remainingQty, 0);
});

// Available Qty (same as remainingQty)
inventorySchema.virtual("availableQty").get(function() {
  return this.batches.reduce((sum, b) => sum + b.remainingQty, 0);
});

// Total Losses by Type
inventorySchema.virtual("totalDamageQty").get(function() {
  return this.batches.reduce((sum, b) => sum + (b.damageQty || 0), 0);
});

inventorySchema.virtual("totalLostQty").get(function() {
  return this.batches.reduce((sum, b) => sum + (b.lostQty || 0), 0);
});

inventorySchema.virtual("totalExpireQty").get(function() {
  return this.batches.reduce((sum, b) => sum + (b.expireQty || 0), 0);
});

// Average cost (weighted)
inventorySchema.virtual("avgUnitPrice").get(function () {
  const totalValue = this.batches.reduce(
    (sum, b) => sum + b.remainingQty * b.unitPrice,
    0
  );
  return this.remainingQty > 0 ? totalValue / this.remainingQty : 0;
});

// Inventory value
inventorySchema.virtual("totalValue").get(function () {
  return this.batches.reduce(
    (sum, b) => sum + b.remainingQty * b.unitPrice,
    0
  );
});

// Total losses
inventorySchema.virtual("totalLossQty").get(function () {
  return this.totalDamageQty + this.totalLostQty + this.totalExpireQty;
});

inventorySchema.virtual("totalLossValue").get(function () {
  return this.totalLossQty * this.avgUnitPrice;
});

// Expiring batches (within 30 days)
inventorySchema.virtual("expiringBatches").get(function() {
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  
  return this.batches.filter(b => 
    b.expiryDate && 
    b.remainingQty > 0 &&
    new Date(b.expiryDate) <= thirtyDaysLater &&
    new Date(b.expiryDate) >= today
  );
});

// Expired batches
inventorySchema.virtual("expiredBatches").get(function() {
  const today = new Date();
  return this.batches.filter(b => 
    b.expiryDate && 
    b.remainingQty > 0 &&
    new Date(b.expiryDate) < today
  );
});

//
// 🔹 Methods
//

// FIFO batches (by received date)
inventorySchema.methods.getFIFOBatches = function () {
  return this.batches
    .filter((b) => b.remainingQty > 0)
    .sort((a, b) => a.receivedDate - b.receivedDate);
};

// FEFO batches (by expiry date - First Expired First Out)
inventorySchema.methods.getFEFOBatches = function() {
  return this.batches
    .filter((b) => b.remainingQty > 0)
    .sort((a, b) => {
      // Expiry date ရှိတဲ့ဟာကို အရင်ထုတ်
      if (a.expiryDate && !b.expiryDate) return -1;
      if (!a.expiryDate && b.expiryDate) return 1;
      if (a.expiryDate && b.expiryDate) {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      }
      // Expiry date မရှိရင် FIFO
      return a.receivedDate - b.receivedDate;
    });
};

// Add batch
inventorySchema.methods.addBatch = function (batchData) {
  if (!batchData.batchNumber) {
    const d = new Date();
    const code = `${d.getFullYear().toString().slice(-2)}${String(
      d.getMonth() + 1
    ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    batchData.batchNumber = `B${code}-${String(
      this.batches.length + 1
    ).padStart(3, "0")}`;
  }

  this.batches.push(batchData);
};

// Remove quantity FIFO (Stock OUT / Damage / Lost / Expire)
inventorySchema.methods.removeQuantityFIFO = function (
  quantity,
  lossType = null // "damage" | "lost" | "expire"
) {
  const batches = this.getFIFOBatches();
  let remainingToRemove = quantity;
  const removedDetails = [];

  for (let batch of batches) {
    if (remainingToRemove <= 0) break;

    const removeQty = Math.min(batch.remainingQty, remainingToRemove);

    // Reduce usable stock
    batch.remainingQty -= removeQty;
    remainingToRemove -= removeQty;

    // Track loss per batch
    if (lossType === "damage") batch.damageQty = (batch.damageQty || 0) + removeQty;
    if (lossType === "lost") batch.lostQty = (batch.lostQty || 0) + removeQty;
    if (lossType === "expire") batch.expireQty = (batch.expireQty || 0) + removeQty;

    removedDetails.push({
      batchNumber: batch.batchNumber,
      quantity: removeQty,
      unitPrice: batch.unitPrice,
    });
  }

  if (remainingToRemove > 0) {
    throw new Error(
      `Not enough stock. Only ${quantity - remainingToRemove} available`
    );
  }

  return removedDetails;
};

// Remove quantity FEFO (by expiry date)
inventorySchema.methods.removeQuantityFEFO = function (
  quantity,
  lossType = null
) {
  const batches = this.getFEFOBatches();
  let remainingToRemove = quantity;
  const removedDetails = [];

  for (let batch of batches) {
    if (remainingToRemove <= 0) break;

    const removeQty = Math.min(batch.remainingQty, remainingToRemove);

    batch.remainingQty -= removeQty;
    remainingToRemove -= removeQty;

    if (lossType === "damage") batch.damageQty = (batch.damageQty || 0) + removeQty;
    if (lossType === "lost") batch.lostQty = (batch.lostQty || 0) + removeQty;
    if (lossType === "expire") batch.expireQty = (batch.expireQty || 0) + removeQty;

    removedDetails.push({
      batchNumber: batch.batchNumber,
      quantity: removeQty,
      unitPrice: batch.unitPrice,
      expiryDate: batch.expiryDate,
    });
  }

  if (remainingToRemove > 0) {
    throw new Error(
      `Not enough stock. Only ${quantity - remainingToRemove} available`
    );
  }

  return removedDetails;
};

//
// 🔹 Safety Checks & Validation
//
inventorySchema.pre("save", async function() {
  try {
    for (let b of this.batches) {
      if (b.remainingQty > b.quantity) b.remainingQty = b.quantity;
      if (b.remainingQty < 0) b.remainingQty = 0;
      
      if (b.damageQty < 0) b.damageQty = 0;
      if (b.lostQty < 0) b.lostQty = 0;
      if (b.expireQty < 0) b.expireQty = 0;
    }
    
    const totalBatchQty = this.batches.reduce((sum, b) => sum + b.quantity, 0);
    const totalDamage = this.batches.reduce((sum, b) => sum + (b.damageQty || 0), 0);
    const totalLost = this.batches.reduce((sum, b) => sum + (b.lostQty || 0), 0);
    const totalExpire = this.batches.reduce((sum, b) => sum + (b.expireQty || 0), 0);
    const totalLoss = totalDamage + totalLost + totalExpire;
    const totalRemaining = this.batches.reduce((sum, b) => sum + b.remainingQty, 0);
    
    if (totalRemaining + totalLoss > totalBatchQty) {
      throw new Error(`Inventory data inconsistent: ${totalRemaining} + ${totalLoss} > ${totalBatchQty}`);
    }
    
  } catch (error) {
    console.log('Error in pre-save hook:', error);
    throw error;
  }
});

// Indexes for performance
inventorySchema.index({ "item.itemId": 1 });
inventorySchema.index({ "batches.expiryDate": 1 });
inventorySchema.index({ "batches.batchNumber": 1 });

module.exports = mongoose.model("Inventory", inventorySchema);