
const validateObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

const validateStockIn = (data) => {
  const errors = [];
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    data.items.forEach((item, index) => {
      if (!item.item) errors.push(`Item ${index + 1}: item ID is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than 0`);
      if (!item.unitPrice || item.unitPrice <= 0) errors.push(`Item ${index + 1}: unit price must be greater than 0`);
      if (!item.unit) errors.push(`Item ${index + 1}: unit is required`);
    });
  }
  
  if (!data.requester) errors.push('Requester is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateStockOut = (data) => {
  const errors = [];
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    data.items.forEach((item, index) => {
      if (!item.inventoryId) errors.push(`Item ${index + 1}: inventory ID is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than 0`);
    });
  }
  
  if (!data.department) errors.push('Department is required');
  if (!data.requester) errors.push('Requester is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDamageRequest = (data) => {
  const errors = [];
  
  if (!data.itemId) errors.push('Item ID is required');
  if (!data.quantity || data.quantity <= 0) errors.push('Quantity must be greater than 0');
  if (!data.type) errors.push('Type is required');
  if (!['Damage', 'Lost', 'Expire'].includes(data.type)) {
    errors.push('Type must be Damage, Lost, or Expire');
  }
  if (data.type === 'Expire' && !data.expireDate) {
    errors.push('Expire date is required for expire requests');
  }
  if (!data.requestedBy) errors.push('Requested by is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateObjectId,
  validateStockIn,
  validateStockOut,
  validateDamageRequest
};