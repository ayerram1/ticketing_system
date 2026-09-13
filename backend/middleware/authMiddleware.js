const jwt = require("jsonwebtoken");
const TicketAssignment = require("../models/TicketAssignment");
// minor change for git tracking
const authMiddleware = {
  verifyToken: (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) {
        console.log("No token provided.");
        return res.status(403).json({ error: "No token provided" });
    }

    const bearerToken = token.split(" ")[1];
    console.log(" Token received:", bearerToken);

    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {

      if (err) {
        return res.status(404).json({ error: "Failed to authenticate token" });
      }
      req.user = decoded;
      next();
    });
},

isAdmin: (req, res, next) => {
  console.log("Checking Admin Privileges:", req.user);
  if (req.user && req.user.role === "admin") {
      console.log("User is Admin. Access granted.");
      next();
    } else {
      res.status(405).json({ error: "Forbidden" });
    }
  },
  isStudent: (req, res, next) => {
    if (req.user && req.user.role === "student") {
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  },
  isTA: (req, res, next) => {
    if (req.user && req.user.role === "TA") {
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  },
  isTAOrAdmin: (req, res, next) => {
    if (req.user && (req.user.role === "TA" || req.user.role === "admin")) {
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  },
  isStudentOrTAOrAdmin: (req, res, next) => {
    if (req.user && (req.user.role === "student" || req.user.role === "TA" || req.user.role === "admin")) {
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  },

    isStaff: (req, res, next) => {
        const staffRoles = ["admin", "TA", "grader"];
        if (req.user && staffRoles.includes(req.user.role)) {
            next(); // Access granted
        } else {
            res.status(403).json({ error: "Forbidden: Staff access required" });
        }
    },
    isTAOrGrader: (req, res, next) => {
        if (req.user && (req.user.role === "TA" || req.user.role === "grader")) {
            next();
        } else {
            res.status(403).json({ error: "Forbidden" });
        }
    },
    isStaffOrStudent: (req, res, next) => {
        const staffRoles = ["admin", "TA", "grader", "student"];
        if (req.user && staffRoles.includes(req.user.role)) {
            next(); // Access granted
        } else {
            res.status(403).json({ error: "Forbidden: Staff access required" });
        }
    },
    isSelfOrAdmin: (req, res, next) => {
    const requestedUserId = parseInt(req.params.user_id, 10);
    const loggedInUserId = req.user?.id;
    const loggedInRole = req.user?.role;

    if (loggedInRole === "admin") {
      return next();
    }

    if (loggedInRole === "TA" && loggedInUserId === requestedUserId) {
      return next();
    }

    return res.status(403).json({
      error: "Forbidden: You can only modify your own information.",
    });
  },
  canViewTAProfile: (req, res, next) => {
    const requestedUserId = parseInt(req.params.user_id);
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    
    // Admins can view any profile
    if (requestingUserRole === "admin") {
      next();
    }
    // TAs can only view their own profile or other TAs (for collaboration)
    else if (requestingUserRole === "TA") {
      // For now, allow TAs to view other TAs (you might want to restrict this further)
      next();
    }
    // Students can view TA profiles but with limited data
    else if (requestingUserRole === "student") {
      // Students can view TA profiles but will get filtered data
      req.isStudentViewing = true;
      next();
    } else {
      res.status(403).json({ error: "Forbidden: Cannot view this profile" });
    }
  },
  isAssignedToTicket: async (req, res, next) => {
    try {
      const TicketAssignment = require("../models/TicketAssignment");
      const Ticket = require("../models/Ticket");
      const ticketId = req.params.ticket_id;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Admins can always edit tickets
      if (userRole === "admin") {
        return next();
      }
      
      // Students can edit tickets they created
      if (userRole === "student") {
        const ticket = await Ticket.findOne({
          where: { ticket_id: ticketId, student_id: userId }
        });
        
        if (ticket) {
          return next();
        } else {
          return res.status(403).json({ error: "Forbidden: You can only edit tickets you created" });
        }
      }
      
      // TAs and graders can edit tickets they are assigned to
      if (userRole === "TA" || userRole === "grader") {
        const assignment = await TicketAssignment.findOne({
          where: { ticket_id: ticketId, user_id: userId }
        });
        
        if (assignment) {
          return next();
        } else {
          return res.status(403).json({ error: "Forbidden: You are not assigned to this ticket" });
        }
      }

        if (userRole === "grader") {
            const assignment = await TicketAssignment.findOne({
                where: { ticket_id: ticketId, user_id: userId }
            });

            if (assignment) {
                return next();
            } else {
                return res.status(403).json({ error: "Forbidden: You are not assigned to this ticket" });
            }
        }
      
      res.status(403).json({ error: "Forbidden: Access denied" });
    } catch (error) {
      console.error("Error checking ticket assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};


module.exports = authMiddleware;
