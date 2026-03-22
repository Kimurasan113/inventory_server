const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { errorResponse } = require("../utils/responseFormatter");

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json(errorResponse("Not authorized, no token", null, 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select("-password -refreshToken -sessions");

    if (!user) {
      return res.status(401).json(errorResponse("User not found", null, 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(errorResponse("Token expired", null, 401));
    }
    return res.status(401).json(errorResponse("Invalid token", error.message, 401));
  }
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse("Authentication required", null, 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(errorResponse(
        `Access denied. Required role: ${allowedRoles.join(", ")}`, 
        null, 
        403
      ));
    }
    next();
  };
};