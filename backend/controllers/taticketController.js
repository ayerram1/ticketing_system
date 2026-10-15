const TaTicket = require("../models/TaTicket");
const User = require("../models/User");
const Communication = require("../models/Communication");
const TaCommunication = require("../models/TaCommunication");
const TaTicketAssignment = require("../models/TaTicketAssignment");
const {
    notifyTaTicketStatusChanged,
    notifyTaTicketEscalationChanged,
} = require("../services/ticketNotificationService");
const { Op } = require("sequelize");
const { getCreationDateRange } = require("../utils/dateRange");
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
            escalated,
            on_behalf_of,
            hideResolved,
            sort,
            startDate,
            endDate
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Build where clause for filtering
        const whereClause = {};
        // Normalize status to lowercase (DB uses lowercase enum values)
        const normalizedStatus = status ? status.toLowerCase() : undefined;
        if (normalizedStatus) {
            if (normalizedStatus === 'escalated') {
                whereClause.escalated = true;
            } else {
                whereClause.status = normalizedStatus;
            }
        }
        if (priority) whereClause.priority = priority;
        if (team_id) whereClause.team_id = team_id;
        if (assigned_to) whereClause.assigned_to = assigned_to;
        if (escalated !== undefined) whereClause.escalated = escalated === 'true';
        if (on_behalf_of) whereClause.on_behalf_of = on_behalf_of;
        // Only apply hideResolved when there is no explicit status filter provided
        if (hideResolved === 'true' && typeof whereClause.status === 'undefined') {
            whereClause.status = { [Op.ne]: 'resolved' };
        }

        const creationDateRange = getCreationDateRange({ startDate, endDate });
        if (creationDateRange.error) {
            return res.status(400).json({ error: creationDateRange.error });
        }
        if (creationDateRange.start || creationDateRange.endExclusive) {
            whereClause.created_at = {};
            if (creationDateRange.start) whereClause.created_at[Op.gte] = creationDateRange.start;
            if (creationDateRange.endExclusive) whereClause.created_at[Op.lt] = creationDateRange.endExclusive;
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
        const { count, rows } = await TaTicket.findAndCountAll({
            where: whereClause,
            limit: limitNum,
            offset: offset,
            order: orderClause,
            include: [
                { 
                    model: User, 
                    as: "TA", 
                    attributes: ["name", "email"] 
                },
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
            totalTickets = await TaTicket.count({ where: whereClause });
            
            openTickets = await TaTicket.count({ 
                where: { 
                    ...whereClause, 
                    status: { [Op.in]: ['new', 'ongoing'] } 
                } 
            });
            
            closedTickets = await TaTicket.count({ 
                where: { 
                    ...whereClause, 
                    status: 'resolved' 
                } 
            });
            
            escalatedTickets = await TaTicket.count({ 
                where: { 
                    ...whereClause, 
                    escalated: true 
                } 
            });
            
        } catch (summaryError) {
            console.error('Error calculating TA ticket summary counts:', summaryError);
            // Fallback to basic counts
            totalTickets = count;
            openTickets = 0;
            closedTickets = 0;
            escalatedTickets = 0;
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(count / limitNum);

        // Add ta_name manually for compatibility
        const ticketsWithNames = rows.map(ticket => ({
            ...ticket.dataValues,
            ta_name: ticket.TA ? ticket.TA.name : "Unknown TA",
            student_name: ticket.student ? ticket.student.name : "N/A",
        }));

        res.json({
            tickets: ticketsWithNames,
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
        const tickets = await TaTicket.findAll({
            where: { ta_id: req.params.user_id },
            include: [{ model: User, as: "TA", attributes: ["name"] },
                {model: User, as: "student", attributes: ["name", "email"]
            }   ], //  Fetch TA name
        });

        // Add ta_name manually if needed
        const ticketsWithNames = tickets.map(ticket => ({
            ...ticket.dataValues,
            ta_name: ticket.ta ? ticket.ta.name : "Unknown TA",
            student_name: ticket.student ? ticket.student.name : "N/A",
        }));

        res.json(ticketsWithNames);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTicketsByTAId = async (req, res) => {
    try {
        const tickets = await TaTicket.findAll({ where: { assigned_to: req.params.ta_id } });
        res.json(tickets);
    } catch (error) {
        res.status(509).json({ error: error.message });
    }
};

exports.getTicketById = async (req, res) => {
    try {
        const ticketId = req.params.ticket_id;

        //Make sure ticketId includes associated TA name as well.
        const ticket = await TaTicket.findByPk(ticketId, {
            include: [
                { model: User, as: 'TA', attributes: ['name'] },
                { model: User, as: 'student', attributes: ['name'] }
            ]
        });

        if (ticket) {
            res.json(ticket);
        } else {
            res.status(404).json({ error: "Ticket not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTicketResponseTime = async (req, res) => {
    try {
        const ticketId = req.params.ticket_id;

        const ticket = await TaTicket.findByPk(ticketId);

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        const communications = await TaCommunication.findAll({
            where: { ticket_id: ticketId },
            include: [
                {
                    model: User,
                    attributes: ["name", "role"],
                },
            ],
            order: [["created_at", "ASC"]],
        });

        const firstResponse = communications.find((comm) =>
            comm.User && ["TA", "admin", "grader"].includes(comm.User.role)
        );

        if (!firstResponse) {
            return res.json({
                ticket_id: ticketId,
                response_time_minutes: null,
                response_time_formatted: "No response yet",
            });
        }

        const createdAt = new Date(ticket.created_at);
        const responseAt = new Date(firstResponse.created_at);

        const diffMs = responseAt - createdAt;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        res.json({
            ticket_id: ticketId,
            ticket_created_at: ticket.created_at,
            first_response_at: firstResponse.created_at,
            responder_name: firstResponse.User?.name,
            responder_role: firstResponse.User?.role,
            response_time_minutes: diffMinutes,
            response_time_formatted: `${hours}h ${minutes}m`,
        });
    } catch (error) {
        console.error("Error calculating response time:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAllTicketDataById = async (req, res) => {
    try {
        const { ticket_id } = req.params;

        const ticket = await TaTicket.findByPk(ticket_id, {
            include: [
                { model: User, as: 'TA', attributes: ['name', 'email'] },
                { model: User, as: 'student', attributes: ['name', 'email'] }
            ]
        });

        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        // Admin/Authorization Check
        if (req.user.role !== 'admin') {
            const assignment = await TaTicketAssignment.findOne({
                where: { ticket_id: ticket_id, user_id: req.user.id }
            });
            if (ticket.ta_id !== req.user.id && !assignment) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        // Add the names manually for your frontend to find
        const data = ticket.get({ plain: true });
        data.ta_name = ticket.TA ? ticket.TA.name : "Unknown TA";
        data.student_name = ticket.student ? ticket.student.name : "N/A";

        res.json(data);
    } catch (error) {
        res.status(511).json({ error: error.message });
    }
};

exports.createTicket = async (req, res) => {
    try {
        console.log(" Request Body:", req.body);

        const { ta_id, student_id, issue_description, issue_type } = req.body;

        // 1. Validate TA
        const ta = await User.findByPk(ta_id);
        if (!ta) return res.status(404).json({ error: "TA not found" });

        // 2. Validate Student
        const student = await User.findByPk(student_id);
        if (!student) return res.status(404).json({ error: "Student not found" });

        // 3. Create ticket with EXPLICIT mapping
        const ticket = await TaTicket.create({
            ta_id,
            on_behalf_of: student_id, // This links the two!
            issue_description,
            issue_type,
            // Add any other fields from req.body you need here
        });

        res.status(201).json({
            ...ticket.get({ plain: true }), // Cleaner way to get dataValues
            ta_name: ta.name,
            student_name: student.name,
        });

    } catch (error) {
        console.error(" Error creating ticket:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTicket = async (req, res) => {
    try {
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
        if (ticket) {
            const previousStatus = ticket.status;
            const previousEscalated = ticket.escalated;

            await ticket.update(req.body);

            if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
                await notifyTaTicketStatusChanged({
                    ticketId: ticket.ticket_id,
                    previousStatus,
                    currentStatus: ticket.status,
                    actorUserId: req.user?.id,
                });
            }

            if (
                Object.prototype.hasOwnProperty.call(req.body, "escalated") &&
                previousEscalated !== ticket.escalated
            ) {
                await notifyTaTicketEscalationChanged({
                    ticketId: ticket.ticket_id,
                    isEscalated: ticket.escalated,
                    actorUserId: req.user?.id,
                });
            }

            res.json(ticket);
        } else {
            res.status(404).json({ error: "Ticket not found" });
        }
    } catch (error) {
        res.status(513).json({ error: error.message });
    }
};

exports.deleteTicket = async (req, res) => {
    try {
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
        if (ticket) {
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
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        const previousStatus = ticket.status;
        const previousEscalated = ticket.escalated;

        //Update ticket with request body data
        await ticket.update(req.body);

        if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
            await notifyTaTicketStatusChanged({
                ticketId: ticket.ticket_id,
                previousStatus,
                currentStatus: ticket.status,
                actorUserId: req.user?.id,
            });
        }

        if (
            Object.prototype.hasOwnProperty.call(req.body, "escalated") &&
            previousEscalated !== ticket.escalated
        ) {
            await notifyTaTicketEscalationChanged({
                ticketId: ticket.ticket_id,
                isEscalated: ticket.escalated,
                actorUserId: req.user?.id,
            });
        }

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
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        const previousStatus = ticket.status;
        await ticket.update({ status: req.body.status });
        const updatedTicket = await TaTicket.findByPk(req.params.ticket_id);

        await notifyTaTicketStatusChanged({
            ticketId: ticket.ticket_id,
            previousStatus,
            currentStatus: updatedTicket.status,
            actorUserId: req.user?.id,
        });

        res.json(updatedTicket);
    } catch (error) {
        console.error("Error updating ticket and sending email:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.escalateTicket = async (req, res) => {
    try {
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
        if (ticket) {
            const previousEscalated = ticket.escalated;
            await ticket.update({ escalated: true });

            if (!previousEscalated) {
                await notifyTaTicketEscalationChanged({
                    ticketId: ticket.ticket_id,
                    isEscalated: true,
                    actorUserId: req.user?.id,
                });
            }

            res.json(ticket);
        } else {
            res.status(404).json({ error: "Ticket not found" });
        }
    } catch (error) {
        res.status(516).json({ error: error.message });
    }
};

exports.deescalateTicket = async (req, res) => {
    try {
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
        if (ticket) {
            const previousEscalated = ticket.escalated;
            await ticket.update({ escalated: false });

            if (previousEscalated) {
                await notifyTaTicketEscalationChanged({
                    ticketId: ticket.ticket_id,
                    isEscalated: false,
                    actorUserId: req.user?.id,
                });
            }

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
        const ticket = await TaTicket.findByPk(req.params.ticket_id);
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