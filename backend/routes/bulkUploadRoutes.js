const express = require("express");
const bulkUploadController = require("../controllers/bulkUploadController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/history",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  bulkUploadController.getChangeHistory
);

router.post(
  "/import",
  authMiddleware.verifyToken,
  bulkUploadController.importBulk
);

module.exports = router;
