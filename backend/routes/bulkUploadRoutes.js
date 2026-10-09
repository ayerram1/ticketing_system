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
  "/preview",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  bulkUploadController.previewBulk
);

router.post(
  "/import",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  bulkUploadController.importBulk
);

module.exports = router;
