const { errorResponse } = require("../utils/responseFormatter");

const errorHandler = (err, req, res, next) => {

  // Default error
  let statusCode = err.status || 500;
  let message = err.message || "Internal Server Error";

  // Handle specific errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(", ");
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json(errorResponse(message, err.message, statusCode));
};

module.exports = errorHandler;