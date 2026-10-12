const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Team = require("../models/Team");
const StudentData = require("../models/StudentData");
const Communication = require("../models/Communication"); 
const sendEmail = require('../services/emailService');
const TicketAssignment = require("../models/TicketAssignment");
const { Op } = require("sequelize");

const getResponseTimeForTicket = async (ticketId, createdAt) => {
  const firstCommunication = await Communication.findOne({
    where: { ticket_id: ticketId },
    order: [["created_at", "ASC"]],
  });

  if (!firstCommunication) {
    return "No response yet";
  }

  const responseTimeMs =
    new Date(firstCommunication.created_at).getTime() - new Date(createdAt).getTime();

  return Math.floor(responseTimeMs / (1000 * 60));
};

exports.getAllTickets = async (req, res) => {
  try {
    // Extract pagination parameters from query string
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      team_id,
      assigned_to,
      sort,
      hideResolved,
      escalatedBy
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause for filtering
      const whereClause = {};
      const normalizedStatus = status ? status.toLowerCase() : undefined;

      if (normalizedStatus) {
          if (normalizedStatus === 'escalated') {
              whereClause.escalated = true;
          } else {
              whereClause.status = normalizedStatus;
          }
      }

      // 2. Add the escalated_by filter to the DB query
      // This matches the column name 'escalated_by' from your migration
      if (escalatedBy) {
          whereClause.escalated_by = escalatedBy;
      }

      if (priority) whereClause.priority = priority;
      if (team_id) whereClause.team_id = team_id;
      if (assigned_to) whereClause.assigned_to = assigned_to;

      if (hideResolved === 'true' && typeof whereClause.status === 'undefined') {
          whereClause.status = { [Op.ne]: 'resolved' };
      }

    // Build order clause for sorting
    let orderClause = [['created_at', 'DESC']]; // Default: Most recent tickets first

    if (sort) {
      switch (sort) {
        case 'newest':
          orderClause = [['created_at', 'DESC']];
          break;
        case 'oldest':
          orderClause = [['created_at', 'ASC']];
          break;
        case 'id-asc':
          orderClause = [['ticket_id', 'ASC']];
          break;
        case 'id-desc':
          orderClause = [['ticket_id', 'DESC']];
          break;
        default:
          orderClause = [['created_at', 'DESC']];
      }
    }

    // Use findAndCountAll to get both tickets and total count
    const { count, rows } = await Ticket.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      order: orderClause,
      include: [
        {
          model: User,
          as: "student",
          attributes: ["name", "email"]
        }
      ]
    });

    // Get summary counts (all tickets, ignoring pagination but respecting filters)
    let totalTickets, openTickets, closedTickets, escalatedTickets;

    try {
      totalTickets = await Ticket.count({ where: whereClause });

      openTickets = await Ticket.count({
        where: {
          ...whereClause,
          status: { [Op.in]: ['new', 'ongoing'] }
        }
      });

      closedTickets = await Ticket.count({
        where: {
          ...whereClause,
          status: 'resolved'
        }
      });

      escalatedTickets = await Ticket.count({
        where: {
          ...whereClause,
          escalated: true
        }
      });

    } catch (summaryError) {
      console.error('Error calculating summary counts:', summaryError);
      // Fallback to basic counts
      totalTickets = count;
      openTickets = 0;
      closedTickets = 0;
      escalatedTickets = 0;
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      tickets: rows,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: count,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      summary: {
        totalTickets,
        openTickets,
        closedTickets,
        escalatedTickets
      }
    });
  } catch (error) {
    res.status(507).json({ error: error.message });
  }
};

exports.getTicketsByUserId = async (req, res) => {
  try {
    // Extract pagination parameters and filters
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      sort,
      escalated,
      hideResolved
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause = { student_id: req.params.user_id };
    
    // Handle status filtering
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    
    // Handle escalated filtering
    if (escalated === 'true') {
      whereClause.escalated = true;
    }
    
    // Handle hideResolved filtering
    if (hideResolved === 'true') {
      whereClause.status = { [Op.ne]: 'resolved' };
    }

    // Build order clause for sorting
    let orderClause = [['created_at', 'DESC']]; // Default
    if (sort) {
      switch (sort) {
        case 'newest':
          orderClause = [['created_at', 'DESC']];
          break;
        case 'oldest':
          orderClause = [['created_at', 'ASC']];
          break;
        case 'id-asc':
          orderClause = [['ticket_id', 'ASC']];
          break;
        case 'id-desc':
          orderClause = [['ticket_id', 'DESC']];
          break;
        default:
          orderClause = [['created_at', 'DESC']];
      }
    }

    const { count, rows } = await Ticket.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      order: orderClause,
      include: [{ model: User, as: "student", attributes: ["name"] }]
    });

    // Add student_name manually if needed
    const ticketsWithNames = rows.map(ticket => ({
      ...ticket.dataValues,
      student_name: ticket.student ? ticket.student.name : "Unknown Student",
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      tickets: ticketsWithNames,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: count,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketsAssignedToUser = async (req, res) => {
  try {
    // Extract pagination parameters from query string
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      sort,
      hideResolved
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const userId = req.user.id; 

    // Get ticket IDs assigned to this user
    const assignments = await TicketAssignment.findAll({
      where: { user_id: userId },
      attributes: ['ticket_id']
    });

    const assignedTicketIds = assignments.map(a => a.ticket_id);

    if (assignedTicketIds.length === 0) {
      return res.json({
        tickets: [],
        pagination: {
          currentPage: pageNum,
          itemsPerPage: limitNum,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        },
        summary: {
          totalTickets: 0,
          openTickets: 0,
          closedTickets: 0,
          escalatedTickets: 0
        }
      });
    }

    // Build where clause for filtering
    const whereClause = { ticket_id: assignedTicketIds };
    
    const normalizedStatus = status ? status.toLowerCase() : undefined;
    if (normalizedStatus) {
      if (normalizedStatus === 'escalated') {
        whereClause.escalated = true;
      } else {
        whereClause.status = normalizedStatus;
      }
    }
    if (priority) whereClause.priority = priority;
    
    if (hideResolved === 'true' && typeof whereClause.status === 'undefined') {
      whereClause.status = { [Op.ne]: 'resolved' };
    }

    let orderClause = [['created_at', 'DESC']];
    
    if (sort) {
      switch (sort) {
        case 'newest':
          orderClause = [['created_at', 'DESC']];
          break;
        case 'oldest':
          orderClause = [['created_at', 'ASC']];
          break;
        case 'id-asc':
          orderClause = [['ticket_id', 'ASC']];
          break;
        case 'id-desc':
          orderClause = [['ticket_id', 'DESC']];
          break;
        default:
          orderClause = [['created_at', 'DESC']];
      }
    }

    const { count, rows } = await Ticket.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      order: orderClause,
      include: [
        { 
          model: User, 
          as: "student", 
          attributes: ["name", "email"] 
        }
      ]
    });

    // Get summary counts 
    let totalTickets, openTickets, closedTickets, escalatedTickets;
    
    try {
      const summaryWhereClause = { ticket_id: assignedTicketIds };
      
      totalTickets = await Ticket.count({ where: summaryWhereClause });
      
      openTickets = await Ticket.count({ 
        where: { 
          ...summaryWhereClause, 
          status: { [Op.in]: ['new', 'ongoing'] } 
        } 
      });
      
      closedTickets = await Ticket.count({ 
        where: { 
          ...summaryWhereClause, 
          status: 'resolved' 
        } 
      });
      
      escalatedTickets = await Ticket.count({ 
        where: { 
          ...summaryWhereClause, 
          escalated: true 
        } 
      });
      
    } catch (summaryError) {
      console.error('Error calculating summary counts:', summaryError);
      totalTickets = count;
      openTickets = 0;
      closedTickets = 0;
      escalatedTickets = 0;
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      tickets: rows,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: count,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      summary: {
        totalTickets,
        openTickets,
        closedTickets,
        escalatedTickets
      }
    });
  } catch (error) {
    console.error('Error fetching assigned tickets:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketsByTAId = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { assigned_to: req.params.ta_id } });
    res.json(tickets);
  } catch (error) {
    res.status(509).json({ error: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticketId = req.params.ticket_id;

    //Make sure ticketId includes associated student name as well. 
    const ticket = await Ticket.findByPk(ticketId, {
      include: [{
        model: User,
        as: 'student',
        attributes: ['name']
      }]
    });

    if (ticket) {
      const responseTime = await getResponseTimeForTicket(ticket.ticket_id, ticket.createdAt);

      res.json({
        ...ticket.toJSON(),
        responseTime,
      });
    } else {
      res.status(404).json({ error: "Ticket not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllTicketDataById = async (req, res) => {
  console.log(" Request from User:", req.user);
  console.log(" Requested Ticket ID:", req.params.ticket_id);

  if (req.user.role !== 'admin') {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    const ticketAssignments = await TicketAssignment.findAll({where: { ticket_id: req.params.ticket_id },});
    const firstAssignment = ticketAssignments[0]; // Get the first element
     if (
      !(!ticket || ticket.student_id !== req.user_id) &&
      (!firstAssignment || firstAssignment.user_id !== req.user_id)
      ) {
      console.log(" Access Denied - User is not allowed to view this ticket.");
      return res.status(403).json({ error: "Access denied: You can only view your own tickets." });
    }
  }

  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (ticket) {
      const student = await User.findByPk(ticket.dataValues.student_id);
      const team = await Team.findByPk(ticket.dataValues.team_id);
      const studentData = await StudentData.findByPk(ticket.dataValues.student_id);
      ticket.dataValues.student_name = student.dataValues.name;
      ticket.dataValues.team_name = team.team_name;
      ticket.dataValues.section = studentData.dataValues.section;

      res.json(ticket);
    } else {
      res.status(404).json({ error: "Ticket not found" });
    }
  } catch (error) {
    res.status(511).json({ error: error.message });
  }
};

exports.createTicket = async (req, res) => {
  try {
    console.log(" Request Body:", req.body); //  Debugging input data

    const { student_id, team_id, issue_description, sponsor_name, section, issue_type } = req.body;

    const MAX_LENGTH = 3000;

    if (issue_description.length > MAX_LENGTH) {
      return res.status(400).json({ error: "MAX 3,000 characters allowed" }); 
    }

    // Check if student exists
    const student = await User.findByPk(student_id);
    if (!student) {
      console.error(" Student not found in database:", student_id);
      return res.status(404).json({ error: "Student not found" });
    }

    console.log(" Student found:", student.name); //  Log correct name

    // Create ticket
    const ticket = await Ticket.create({
      student_id,
      team_id,
      issue_description,
      sponsor_name,
      section,
      issue_type,
    });

    res.status(201).json({
      ...ticket.dataValues,
      student_name: student.name, // Ensure correct name is returned
    });

  } catch (error) {
    console.error(" Error creating ticket:", error);
    res.status(512).json({ error: error.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    await ticket.update(req.body);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (ticket) {
      // Delete associated ticket assignments first
      await TicketAssignment.destroy({
        where: { ticket_id: req.params.ticket_id }
      });

      // Delete associated communications
      await Communication.destroy({
        where: { ticket_id: req.params.ticket_id }
      });

      // Now delete the ticket
      await ticket.destroy();
      res.status(204).json();
    } else {
      res.status(404).json({ error: "Ticket not found" });
    }
  } catch (error) {
    res.status(514).json({ error: error.message });
  }
};

//Robert: need to have backend controller
exports.editTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    //Update ticket with request body data
    await ticket.update(req.body);

    res.status(200).json({
      message: "Ticket updated successfully",
      ticket, //Return updated ticket data
    });
  } catch(error) {
    console.error("Error editing ticket:", error);
    res.status(500).json({ error: error.message});
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    await ticket.update({ status: req.body.status });
    const updatedTicket = await Ticket.findByPk(req.params.ticket_id);

    const student = await User.findByPk(ticket.student_id);

    if (!student || !student.email) {
      console.warn("Student not found or missing email.");
    } else if (!student.notifications_enabled) {
      console.log(`Email not sent — notifications disabled for ${student.email}`);
    } else {
      const isEscalated = req.body.status.toLowerCase() === 'escalated';

      const subject = isEscalated
        ? 'Your Ticket Has Been Escalated'
        : 'Ticket Status Updated';

      const body = isEscalated
        ? `Your ticket (ID: ${ticket.ticket_id}) has been escalated and is under review.`
        : `Your ticket (ID: ${ticket.ticket_id}) has been updated to "${req.body.status}".`;

      //await sendEmail(student.email, subject, body);

      if (isEscalated) {
        // const instructorEmails = ['instructor1@asu.edu', 'instructor2@asu.edu'];
        // for (const email of instructorEmails) {
        //   await sendEmail(
        //     email,
        //     `Ticket Escalated: ID ${ticket.ticket_id}`,
        //     `Ticket ID ${ticket.ticket_id} has been escalated.\n\nStudent: ${student.name} (${student.email})`
        //   );
        // }
      }
    }

    res.json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket and sending email:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.escalateTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.ticket_id);

        // 1. Extract the data sent from the frontend body
        const { escalatedBy } = req.body;

        if (ticket) {
            // 2. Add 'escalated_by' to the update object
            await ticket.update({
                escalated: true,
                escalated_by: escalatedBy
            });

            res.json(ticket);
        } else {
            res.status(404).json({ error: "Ticket not found" });
        }
    } catch (error) {
        // Note: 516 is a non-standard HTTP status code, but keeping it as per your snippet
        res.status(516).json({ error: error.message });
    }
};

exports.deescalateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (ticket) {
      await ticket.update({ escalated: false });
      res.json(ticket);
    } else {
      res.status(404).json({ error: "Ticket not found" });
    }
  } catch (error) {
    res.status(516).json({ error: error.message });
  }
};

exports.reassignTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.ticket_id);
    if (ticket) {
      await ticket.update({ assigned_to: req.body.assigned_to });
      res.json(ticket);
    } else {
      res.status(404).json({ error: "Ticket not found" });
    }
  } catch (error) {
    res.status(517).json({ error: error.message });
  }
};
