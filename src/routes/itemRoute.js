const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const { protect, authorize } = require("../middleWare/authMiddleWare");
router.post("/",protect, authorize("Supplier","Storekeeper", "Admin"), itemController.createItem);
router.get("/",protect, authorize("Supplier", "Admin","Storekeeper","User"), itemController.getAllItems);
router.get("/:id",protect, authorize("Supplier", "Admin"), itemController.getItem);
router.put("/:id",protect, authorize("Storekeeper", "Admin"),itemController.updateItem);
router.delete("/:id",protect, authorize("Storekeeper", "Admin"), itemController.deleteItem);

module.exports = router;
