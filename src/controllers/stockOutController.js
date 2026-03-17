const stockOutService = require("../services/stockOutService");

// POST /stockout
exports.create = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const data = {
      ...req.body,
      requester: req.user._id, // from auth middleware
    };
    const result = await stockOutService.createStockOut(data);
    res.status(201).json({
      success: true,
      message: "StockOut request created",
      data: result,
    });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// PATCH /stockout/:id/approve
exports.approve = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await stockOutService.approveStockOut(
      req.params.id,
      req.user._id
    );
    res.json({
      success: true,
      message: "StockOut approved",
      data: result,
    });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// PATCH /stockout/:id/reject
exports.reject = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await stockOutService.rejectStockOut(
      req.params.id,
      req.user._id
    );
    res.json({
      success: true,
      message: "StockOut rejected",
      data: result,
    });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// GET /stockout
exports.getAll = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const stocks = await stockOutService.getAllStockOuts();
    res.json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};

// GET /stockout/:id
exports.getOne = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const stock = await stockOutService.getStockOutById(req.params.id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "StockOut not found",
      });
    }
    res.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};