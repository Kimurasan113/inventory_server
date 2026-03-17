const service = require("../services/stockInService");

exports.create = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await service.createStockIn(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

exports.approve = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await service.approveStockIn(
      req.params.id,
      req.user.id
    );
    res.json(result);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

exports.reject = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const result = await service.rejectStockIn(
      req.params.id,
      req.user.id
    );
    res.json(result);
  } catch (err) {
    next(err);  // ✅ error handler ဆီပို့
  }
};

exports.getAllStockIns = async (req, res, next) => {  // ✅ next ထည့်
  try {
    const stocks = await service.getAllStockIns();
    res.status(200).json(stocks);
  } catch (error) {
    next(error);  // ✅ error handler ဆီပို့
  }
};