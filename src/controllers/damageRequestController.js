const damageRequestService = require("../services/damageRequestService");

// Create new damage/lost/expire request
const createRequest = async (req, res, next) => {
  try {
    const requestData = {
      ...req.body,
      requestedBy: req.user._id, // logged in user
    };

    const request = await damageRequestService.createDamageRequest(requestData);
    
    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// Approve request (storekeeper/admin only)
const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await damageRequestService.approveDamageRequest(id, req.user._id);
    
    res.json({
      success: true,
      message: "Request approved successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// Reject request (storekeeper/admin only)
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await damageRequestService.rejectDamageRequest(id, req.user._id);
    
    res.json({
      success: true,
      message: "Request rejected successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// Get all requests with filters
const getAllRequests = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );
    
    const requests = await damageRequestService.getAllDamageRequests(filters);
    
    res.json({
      success: true,
      count: requests.requests?.length || 0,
      summary: requests.summary,
      data: requests.requests,
    });
  } catch (error) {
    next(error);
  }
};

// Get single request
const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await damageRequestService.getDamageRequestById(id);
    
    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    if (error.message === "Damage request not found") {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }
    next(error);
  }
};

// Get damage/lost/expire summary for an inventory item
const getSummary = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;
    const summary = await damageRequestService.getDamageLostSummary(inventoryId);
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error.message === "Inventory not found") {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }
    next(error);
  }
};

// Get dashboard statistics
const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await damageRequestService.getDamageDashboard();
    
    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

// Get my requests (for current user)
const getMyRequests = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
    };
    
    const requests = await damageRequestService.getAllDamageRequests({
      ...filters,
      requestedBy: req.user._id
    });
    
    res.json({
      success: true,
      count: requests.requests?.length || 0,
      data: requests.requests,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  approveRequest,
  rejectRequest,
  getAllRequests,
  getRequestById,
  getSummary,
  getDashboard,
  getMyRequests,
};