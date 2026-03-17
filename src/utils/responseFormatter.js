// utils/responseFormatter.js

/**
 * Success response formatter
 */
const successResponse = (data, message = 'Success', statusCode = 200) => ({
  success: true,
  message,
  data,
  statusCode,
  timestamp: new Date().toISOString()
});

/**
 * Error response formatter
 */
const errorResponse = (message, error = null, statusCode = 400) => ({
  success: false,
  message,
  error: error?.message || error,
  statusCode,
  timestamp: new Date().toISOString()
});

/**
 * Pagination formatter
 */
const paginatedResponse = (data, page, limit, total, message = 'Success') => ({
  success: true,
  message,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  },
  timestamp: new Date().toISOString()
});

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};