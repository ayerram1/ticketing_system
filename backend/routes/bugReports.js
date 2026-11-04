const express = require("express");
const router = express.Router();

const bugReportController = require("../controllers/bugReportController"); 
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware.verifyToken, bugReportController.create);
router.get("/", authMiddleware.verifyToken, bugReportController.list);
router.get("/:id", authMiddleware.verifyToken, bugReportController.getOne);
router.patch("/:id", authMiddleware.verifyToken, authMiddleware.isDeveloperOrAdmin, bugReportController.update);
router.delete("/:id", authMiddleware.verifyToken, authMiddleware.isDeveloperOrAdmin, bugReportController.remove);

router.get("/:id/notes", authMiddleware.verifyToken, authMiddleware.isDeveloperOrAdmin, bugReportController.listNotes);
router.post("/:id/notes", authMiddleware.verifyToken, authMiddleware.isDeveloperOrAdmin, bugReportController.addNote);

module.exports = router;