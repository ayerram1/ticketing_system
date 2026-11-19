const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.put(
  "/change-password",
  authMiddleware.verifyToken,
  userController.changePassword
);

router.get(
  "/profile",
  authMiddleware.verifyToken,
  userController.getUserProfile
);

router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isTAOrAdminOrDeveloper,
  userController.getAllUsers
);
router.get(
  "/:user_id", 
  authMiddleware.verifyToken, 
  userController.getUserById
);
router.get(
  "/email/:email", 
  authMiddleware.verifyToken,
  userController.getUserByEmail
);
router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  userController.createUser
);
router.put( //changed to allow students and TAs to edit their own profile
  "/:user_id",
  authMiddleware.verifyToken,
  authMiddleware.isStudentOrTAOrAdmin,
  userController.updateUser
);
router.delete(
  "/:user_id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  userController.deleteUser
);
router.get(
  "/role/:role",
  authMiddleware.verifyToken,
  userController.getUsersByRole
);
router.post(
  "/email-notification",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  userController.emailNotification
);
router.post(
  "/email-notification-2",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  userController.emailNotification2
);
router.post(
  "/email-notification-3",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  userController.emailNotification3
);
router.post(
  "/email-notification-4",
  authMiddleware.verifyToken,
  authMiddleware.isStaffOrStudent,
  userController.emailNotification4
);
module.exports = router;
