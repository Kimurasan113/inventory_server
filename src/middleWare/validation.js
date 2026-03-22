const mongoose = require('mongoose');

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate Stock In Request
 */
const validateStockIn = (data) => {
  const errors = [];
  
  // Check required fields
  if (!data) {
    errors.push('Request data is required');
    return { isValid: false, errors };
  }
  
  // Validate items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    data.items.forEach((item, index) => {
      const itemErrors = [];
      
      if (!item.item) {
        itemErrors.push('item ID is required');
      } else if (!validateObjectId(item.item)) {
        itemErrors.push('invalid item ID format');
      }
      
      if (!item.quantity || item.quantity <= 0) {
        itemErrors.push('quantity must be greater than 0');
      }
      
      if (!item.unitPrice || item.unitPrice <= 0) {
        itemErrors.push('unit price must be greater than 0');
      }
      
      if (!item.unit) {
        itemErrors.push('unit is required');
      }
      
      if (itemErrors.length > 0) {
        errors.push(`Item ${index + 1}: ${itemErrors.join(', ')}`);
      }
    });
  }
  
  // Validate requester
  if (!data.requester) {
    errors.push('Requester is required');
  } else if (!validateObjectId(data.requester)) {
    errors.push('Invalid requester ID format');
  }
  
  // Validate supplier (optional)
  if (data.supplier && !validateObjectId(data.supplier)) {
    errors.push('Invalid supplier ID format');
  }
  
  // Validate notes (optional)
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes cannot exceed 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: data // Return validated data
  };
};

/**
 * Validate Stock Out Request
 */
const validateStockOut = (data) => {
  const errors = [];
  
  // Check required fields
  if (!data) {
    errors.push('Request data is required');
    return { isValid: false, errors };
  }
  
  // Validate items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    data.items.forEach((item, index) => {
      const itemErrors = [];
      
      if (!item.inventoryId) {
        itemErrors.push('inventory ID is required');
      } else if (!validateObjectId(item.inventoryId)) {
        itemErrors.push('invalid inventory ID format');
      }
      
      if (!item.quantity || item.quantity <= 0) {
        itemErrors.push('quantity must be greater than 0');
      }
      
      if (itemErrors.length > 0) {
        errors.push(`Item ${index + 1}: ${itemErrors.join(', ')}`);
      }
    });
  }
  
  // Validate department
  if (!data.department) {
    errors.push('Department is required');
  } else if (data.department.length < 2 || data.department.length > 100) {
    errors.push('Department name must be between 2 and 100 characters');
  }
  
  // Validate requester
  if (!data.requester) {
    errors.push('Requester is required');
  } else if (!validateObjectId(data.requester)) {
    errors.push('Invalid requester ID format');
  }
  
  // Validate purpose (optional)
  if (data.purpose && data.purpose.length > 500) {
    errors.push('Purpose cannot exceed 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: data
  };
};

/**
 * Validate Damage/Loss/Expire Request
 */
const validateDamageRequest = (data) => {
  const errors = [];
  
  // Check required fields
  if (!data) {
    errors.push('Request data is required');
    return { isValid: false, errors };
  }
  
  // Validate item ID
  if (!data.itemId) {
    errors.push('Item ID is required');
  } else if (!validateObjectId(data.itemId)) {
    errors.push('Invalid item ID format');
  }
  
  // Validate quantity
  if (!data.quantity) {
    errors.push('Quantity is required');
  } else if (data.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  } else if (!Number.isInteger(data.quantity)) {
    errors.push('Quantity must be an integer');
  }
  
  // Validate type
  const validTypes = ['Damage', 'Lost', 'Expire'];
  if (!data.type) {
    errors.push('Type is required');
  } else if (!validTypes.includes(data.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }
  
  // Validate expire date for Expire type
  if (data.type === 'Expire') {
    if (!data.expireDate) {
      errors.push('Expire date is required for expire requests');
    } else {
      const expireDate = new Date(data.expireDate);
      if (isNaN(expireDate.getTime())) {
        errors.push('Invalid expire date format');
      } else if (expireDate < new Date()) {
        errors.push('Expire date cannot be in the past');
      }
    }
  }
  
  // Validate requested by
  if (!data.requestedBy) {
    errors.push('Requested by is required');
  } else if (!validateObjectId(data.requestedBy)) {
    errors.push('Invalid requested by ID format');
  }
  
  // Validate reason (optional)
  if (data.reason && data.reason.length > 500) {
    errors.push('Reason cannot exceed 500 characters');
  }
  
  // Validate photos (optional)
  if (data.photos && Array.isArray(data.photos)) {
    if (data.photos.length > 10) {
      errors.push('Maximum 10 photos allowed');
    }
    data.photos.forEach((photo, index) => {
      if (photo && typeof photo !== 'string') {
        errors.push(`Photo ${index + 1} must be a valid URL or base64 string`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: data
  };
};

/**
 * Generic validation helper
 */
const validateRequired = (fields, data) => {
  const errors = [];
  
  for (const [field, value] of Object.entries(fields)) {
    if (value.required && (!data[field] || data[field] === '')) {
      errors.push(`${value.label || field} is required`);
    }
    
    if (data[field] && value.type === 'email') {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(data[field])) {
        errors.push(`${value.label || field} must be a valid email`);
      }
    }
    
    if (data[field] && value.type === 'phone') {
      const phoneRegex = /^[0-9]{9,11}$/;
      if (!phoneRegex.test(data[field])) {
        errors.push(`${value.label || field} must be a valid phone number`);
      }
    }
    
    if (data[field] && value.minLength && data[field].length < value.minLength) {
      errors.push(`${value.label || field} must be at least ${value.minLength} characters`);
    }
    
    if (data[field] && value.maxLength && data[field].length > value.maxLength) {
      errors.push(`${value.label || field} cannot exceed ${value.maxLength} characters`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateObjectId,
  validateStockIn,
  validateStockOut,
  validateDamageRequest,
  validateRequired
};