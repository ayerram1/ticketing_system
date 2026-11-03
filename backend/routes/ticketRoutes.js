const express = require("express");
const ticketController = require("../controllers/ticketController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.isStaff, //changed 2/20/25 to allow TA to view tickets on instructor dashboard
  ticketController.getAllTickets
);
router.get(
  "/assigned-to-me",
  authMiddleware.verifyToken,
  authMiddleware.isTA,
  ticketController.getTicketsAssignedToUser
);
router.get(
  "/user/:user_id",
  authMiddleware.verifyToken,
  ticketController.getTicketsByUserId
);
router.get( //depricated
  "/ta/:ta_id",
  authMiddleware.verifyToken,
  authMiddleware.isTAOrAdmin,
  ticketController.getTicketsByTAId
);
router.get(
  "/:ticket_id",
  authMiddleware.verifyToken,
  ticketController.getTicketById
);
router.get(
  "/info/:ticket_id",
  authMiddleware.verifyToken,
  authMiddleware.isStudentOrTAOrAdmin,
  ticketController.getAllTicketDataById
);
router.post(
  "/",
  authMiddleware.verifyToken,
  /*authMiddleware.isStudent,*/ ticketController.createTicket
);
router.put(
  "/:ticket_id",
  authMiddleware.verifyToken,
  authMiddleware.isStaffOrStudent,
  authMiddleware.isAssignedToTicket,
  ticketController.updateTicket
);
router.delete(
  "/:ticket_id",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  ticketController.deleteTicket
);
router.put(
  "/:ticket_id/status",
  authMiddleware.verifyToken,
  authMiddleware.isAssignedToTicket,
  authMiddleware.isStaff,
  ticketController.updateTicketStatus
);
router.put(
  "/:ticket_id/escalate",
  authMiddleware.verifyToken,
  authMiddleware.isTAOrGrader,
  ticketController.escalateTicket
);
router.put(
  "/:ticket_id/deescalate", 
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  ticketController.deescalateTicket
);
router.put(
  "/:ticket_id/reassign",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  ticketController.reassignTicket
);
//Robert: add backend route
router.put(
  "/:ticket_id/edit",
  authMiddleware.verifyToken,
  authMiddleware.isStaff,
  authMiddleware.isAssignedToTicket,
  ticketController.editTicket
);

module.exports = router;
