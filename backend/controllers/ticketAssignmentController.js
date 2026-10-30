const TicketAssignment = require("../models/TicketAssignment");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const sequelize = require("../config/db");
const { QueryTypes, UniqueConstraintError } = require("sequelize");

// This deliberately starts with the TA list and LEFT JOINs the assignments so
// TAs who have not been assigned a ticket are returned with zeroes as well.
// A UNION ALL keeps regular student tickets and TA-created tickets distinct:
// their ticket ids come from different tables and can overlap.
const TA_TICKET_WORKLOAD_QUERY = `
  SELECT
    users.user_id,
    COALESCE(SUM(CASE WHEN assignments.status IN ('new', 'ongoing') THEN 1 ELSE 0 END), 0) AS open_tickets,
    COUNT(assignments.ticket_id) AS total_tickets
  FROM users
  LEFT JOIN (
    SELECT DISTINCT ticketassignments.user_id, ticketassignments.ticket_id, CAST(tickets.status AS TEXT) AS status
    FROM ticketassignments
    INNER JOIN tickets ON tickets.ticket_id = ticketassignments.ticket_id
    UNION ALL
    SELECT DISTINCT taticketassignments.user_id, taticketassignments.ticket_id, CAST(tatickets.status AS TEXT) AS status
    FROM taticketassignments
    INNER JOIN tatickets ON tatickets.ticket_id = taticketassignments.ticket_id
  ) AS assignments ON assignments.user_id = users.user_id
  WHERE users.role = 'TA'
  GROUP BY users.user_id, users.name
  ORDER BY users.name ASC
`;

exports.getAllTicketAssignments = async (req, res) => {
  try {
    const ticketAssignments = await TicketAssignment.findAll();
    res.json(ticketAssignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketAssignmentsByTicketId = async (req, res) => {
     const { ticket_id } = req.params;
    const { role, id: userId } = req.user;

    try {
        const ticket = await Ticket.findByPk(ticket_id);

        const isStaff = role === 'admin' || role === 'TA' || role === 'grader';
        if (!isStaff && ticket.student_id !== userId) {
            return res.status(403).json({ error: "Access denied: You can only view assignments for your own tickets." });
        }

        const assignments = await TicketAssignment.findAll({ where: { ticket_id } });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTicketAssignmentsByUserId = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.user_id);
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Get all ticket assignments for the requested TA
    const ticketAssignments = await TicketAssignment.findAll({
      where: { user_id: requestedUserId },
    });

    let filteredAssignments = ticketAssignments;

    // If a student is requesting, filter to only show assignments for tickets they created
    if (requestingUserRole === 'student') {
      // Get all tickets created by this student
      const studentTickets = await Ticket.findAll({
        where: { student_id: requestingUserId },
        attributes: ['ticket_id']
      });
      
      const studentTicketIds = studentTickets.map(ticket => ticket.ticket_id);
      
      // Filter assignments to only include tickets the student created
      filteredAssignments = ticketAssignments.filter(assignment => 
        studentTicketIds.includes(assignment.ticket_id)
      );
    }
    
    // TAs and Admins see all assignments (no filtering needed)
    res.json(filteredAssignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignTicket = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticket_id);
    const assigneeId = Number(req.body.user_id);

    if (!Number.isInteger(ticketId) || !Number.isInteger(assigneeId)) {
      return res.status(400).json({ error: "A valid ticket_id and user_id are required" });
    }

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // The assignment picker only exposes TAs. Enforce that server-side so a
    // caller cannot use the sharing endpoint to assign an arbitrary account.
    const assignee = await User.findByPk(assigneeId);
    if (!assignee || assignee.role !== "TA") {
      return res.status(400).json({ error: "Tickets can only be assigned to a TA" });
    }

    const requestingUserId = Number(req.user.id);
    const { role } = req.user;

    if (role === "TA") {
      // A TA may share only tickets already assigned to that TA. This is the
      // authorization boundary for group sharing from /instructortickets.
      const requesterAssignment = await TicketAssignment.findOne({
        where: { ticket_id: ticketId, user_id: requestingUserId },
      });
      if (!requesterAssignment) {
        return res.status(403).json({ error: "You can only share tickets assigned to you" });
      }
    } else if (role === "student") {
      // Preserve the existing ticket-submission flow: a student creates a
      // ticket and immediately assigns its selected TA.
      if (ticket.student_id !== requestingUserId) {
        return res.status(403).json({ error: "You can only assign your own tickets" });
      }
    } else if (role !== "admin") {
      // In particular, graders must never be able to initiate sharing.
      return res.status(403).json({ error: "You are not allowed to share tickets" });
    }

    const [ticketAssignment, created] = await TicketAssignment.findOrCreate({
      where: {
        ticket_id: ticketId,
        user_id: assigneeId,
      },
      defaults: {
        ticket_id: ticketId,
        user_id: assigneeId,
      },
    });

    if (!created) {
      return res.status(409).json({ error: "Assignment already exists" });
    }

    res.status(201).json(ticketAssignment);
  } catch (error) {
    // handle unique constraint race if it still occurs
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ error: "Assignment already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.removeTicketAssignment = async (req, res) => {
  try {
    const ticketAssignment = await TicketAssignment.findOne({
      where: { ticket_id: req.params.ticket_id, user_id: req.params.user_id },
    });
    if (ticketAssignment) {
      await ticketAssignment.destroy();
      res.status(204).json();
    } else {
      res.status(404).json({ error: "Ticket assignment not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketCountsByTA = async (req, res) => {
  try {
    const workloads = await sequelize.query(TA_TICKET_WORKLOAD_QUERY, {
      type: QueryTypes.SELECT,
    });

    res.json(workloads.map((workload) => ({
      user_id: Number(workload.user_id),
      open_tickets: Number(workload.open_tickets),
      total_tickets: Number(workload.total_tickets),
    })));
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching TA ticket workloads." });
  }
};

exports.reassignTA = async (req, res) => {
  try {
    const ticketAssignment = await TicketAssignment.findOne({
      where: { ticket_id: req.params.ticket_id, user_id: req.params.user_id },
    });
    if (ticketAssignment) {
      const updatedTicketAssignment = await ticketAssignment.update({ user_id: req.body.new_user_id });
      res.json(updatedTicketAssignment);
    } else {
      res.status(404).json({ error: "Ticket Assignment not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSecureTAProfile = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.user_id);
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const isStudentViewing = req.isStudentViewing || false;

    // Get TA's ticket assignments
    const ticketAssignments = await TicketAssignment.findAll({
      where: { user_id: requestedUserId },
    });

    let filteredAssignments = ticketAssignments;

    // If a student is viewing, only show assignments for tickets they created
    if (isStudentViewing) {
      // Get all tickets to filter by student
      const allTickets = await Ticket.findAll({
        where: { student_id: requestingUserId }
      });
      
      const studentTicketIds = allTickets.map(ticket => ticket.ticket_id);
      
      // Filter assignments to only include student's own tickets
      filteredAssignments = ticketAssignments.filter(assignment => 
        studentTicketIds.includes(assignment.ticket_id)
      );
    }

    // Return filtered data based on role
    res.json({
      assignments: filteredAssignments,
      isStudentView: isStudentViewing,
      viewerRole: requestingUserRole
    });
    
  } catch (error) {
    console.error('Error in getSecureTAProfile:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketAssignmentsById = async (req, res) => {
  try {
    const ticketAssignments = await TicketAssignment.findAll({
      where: { user_id: req.params.user_id },
    });
    res.json(ticketAssignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// exports.getTicketCountsByTA = async (req, res) => {
//   try {
//     // Fetch all users with the role "TA"
//     console.log(User.associations);
//     const TAs = await User.findAll({
//       where: { role: "TA" },
//       attributes: ["user_id", "name", "role"],
//       include: [
//         {
//           model: TicketAssignment,
//           include: [
//             {
//               model: Ticket,
//               attributes: ["status"], // Only include the status field
//             },
//           ],
//         },
//       ],
//     });

//     // Process the data to get ticket counts by status for each TA
//     const result = TAs.map((TA) => {
//       // Initialize ticket counts for each status
//       const ticketCounts = { new: 0, ongoing: 0, resolved: 0, escalated: 0 };

//       // Loop through each ticket assignment for this TA
//       TA.TicketAssignments.forEach((assignment) => {
//         const ticketStatus = assignment.Ticket?.status; // Check if ticket exists and get its status
//         if (ticketStatus) {
//           // Increment the count for the appropriate status
//           if (ticketCounts.hasOwnProperty(ticketStatus)) {
//             ticketCounts[ticketStatus] += 1;
//           }
//         }
//       });

//       // Return a simplified object with TA information and ticket counts
//       return {
//         TA_name: TA.name,
//         TA_id: TA.user_id,
//         ticketCounts,
//       };
//     });

//     console.log("Processed TA ticket counts:", result); // Log processed result
//     res.json(result); // Send the processed result as response
//   } catch (error) {
//     console.error("Detailed error message:", error.message);
//     console.error("Error stack trace:", error.stack);
//     res.status(500).json({ error: "An error occurred while fetching TAs." });
//   }
// };
