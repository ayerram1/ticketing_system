const express = require("express");
const ticketController = require("../controllers/taticketController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authMiddleware.verifyToken,
    authMiddleware.isTAOrAdminOrDeveloper, //changed 2/20/25 to allow TA to view tickets on instructor dashboard
    ticketController.getAllTickets
);
router.get(
    "/user/:user_id",
    authMiddleware.verifyToken,
    ticketController.getTicketsByUserId
);
router.get( //depricated
    "/ta/:ta_id",
    authMiddleware.verifyToken,
    authMiddleware.isTAOrAdminOrDeveloper,
    ticketController.getTicketsByTAId
);
router.get(
    "/:ticket_id/response-time",
    authMiddleware.verifyToken,
    ticketController.getTicketResponseTime
);
router.get(
    "/:ticket_id",
    authMiddleware.verifyToken,
    ticketController.getTicketById
);
router.get(
    "/info/:ticket_id",
    authMiddleware.verifyToken,
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
    authMiddleware.isStudentOrTAOrAdmin,
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
    authMiddleware.isTAOrAdminOrDeveloper,
    ticketController.updateTicketStatus
);
router.put(
    "/:ticket_id/escalate",
    authMiddleware.verifyToken,
    authMiddleware.isTA,
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
    authMiddleware.isAdmin,
    ticketController.editTicket
);

module.exports = router;
