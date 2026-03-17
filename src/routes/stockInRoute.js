const express = require("express");
const router = express.Router();
const controller = require("../controllers/stockInController");
const { protect, authorize } = require("../middleWare/authMiddleWare");

router.post("/create",protect, authorize("Supplier", "Admin"), controller.create);

router.get("/readall",protect, authorize("Storekeeper", "Admin","User","Supplier"), controller.getAllStockIns);
router.put("/:id/approve",protect, authorize("Storekeeper","Admin"), controller.approve);
router.put("/:id/reject", protect, authorize("Storekeeper","Admin"), controller.reject);


module.exports = router;
