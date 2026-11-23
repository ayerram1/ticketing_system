//import React from 'react'
import { Avatar, Button, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArticleIcon from '@mui/icons-material/Article';
import TicketsViewController from '../../components/TicketsViewController';
import SideBar from '../../components/SideBar/SideBar'; //to make the sidebar highlight when clicking view all button in dashboard
// pasted from AdminDash
import PeopleIcon from "@mui/icons-material/People";
import CircularProgress from "@mui/material/CircularProgress";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstructorCard from "../../components/InstructorCard";
import Pagination from "../../components/Pagination/Pagination";
import { fetchTicketAssignmentsByUserId, fetchTicketById } from "../../services/ticketServices";
import GraderChart from './GraderGraph.js';
const baseURL = process.env.REACT_APP_API_BASE_URL;

const GraderDash = () => {
// start copy and paste from admindash
    const theme = useTheme();
    const [selectedPage, setSelectedPage] = useState(0); //copied from sidebar

    const [tickets, setTickets] = useState([]);
    const [GraderCounts, setGraderCounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalTickets, setTotalTickets] = useState(0);
    const [totalGraders, setTotalGraders] = useState(0);
    const [escalatedTickets, setEscalatedTickets] = useState(0);
    const [openTickets, setOpenTickets] = useState(0);
    const [closedTickets, setClosedTickets] = useState(0);
    const [statusCounts, setStatusCounts] = useState({});
    const [assignees, setAssignees] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [activeFilters, setActiveFilters] = useState({
        sort: null,
        status: null,
        search: "",
    });
    const [filterAnchor, setFilterAnchor] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    let navigate = useNavigate();

    const openTicket = (ticket) => navigate(`/ticketinfo?ticket=${ticket.ticket_id}`);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    useEffect(() => {
        fetchTickets();
        fetchGraderCounts();
    }, [currentPage, itemsPerPage]);

    const fetchGraderCounts = async () => {
        try {
            const token = Cookies.get("token");

            // Step 1: Fetch all users
            const usersResponse = await fetch(`${baseURL}/api/users`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!usersResponse.ok) {
                throw new Error(
                    `Failed to fetch users, status: ${usersResponse.status}`
                );
            }

            const users = await usersResponse.json();
            const graders = users.filter((user) => user.role === "grader"); // Filter TAs
            setTotalGraders(graders.length);

            const ticketCounts = {};

            graders.forEach((grader) => {
                ticketCounts[grader.user_id] = {
                    name: grader.name,
                    counts: { new: 0, ongoing: 0, resolved: 0 },
                };
            });

            // Fetch assignments for each TA using the role-filtered endpoint
            const countPromises = graders.map(async (grader) => {
                try {
                    const assignmentsResponse = await fetch(
                        `${baseURL}/api/ticketassignments/users/${grader.user_id}`,
                        {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    if (assignmentsResponse.ok) {
                        const assignments = await assignmentsResponse.json();

                        const ticketPromises = assignments.map(async (assignment) => {
                            try {
                                const ticketResponse = await fetch(`${baseURL}/api/tickets/${assignment.ticket_id}`, {
                                    method: "GET",
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`,
                                    },
                                });

                                if (ticketResponse.ok) {
                                    return await ticketResponse.json();
                                }
                            } catch (err) {
                                console.error(`Error fetching ticket ${assignment.ticket_id}:`, err);
                            }
                            return null;
                        });

                        const tickets = (await Promise.all(ticketPromises)).filter(Boolean);

                        tickets.forEach((ticket) => {
                            if (ticket.status === "new") {
                                ticketCounts[grader.user_id].counts.new += 1;
                            } else if (ticket.status === "ongoing") {
                                ticketCounts[grader.user_id].counts.ongoing += 1;
                            } else if (ticket.status === "resolved") {
                                ticketCounts[grader.user_id].counts.resolved += 1;
                            }
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching assignments for grader ${grader.user_id}:`, err);
                }
            });

            await Promise.all(countPromises);



            console.log(ticketCounts);
            setGraderCounts(ticketCounts); // Update state with counts
        } catch (err) {
            console.error("Error fetching grader ticket counts:", err);
        }
    };


    const filterUniqueTickets = (tickets) => { //Avoid duplicate tickets
        const seen = new Set();
        return tickets.filter((ticket) => {
            if (seen.has(ticket.ticket_id)) {
                return false;
            }
            seen.add(ticket.ticket_id);
            return true;
        });
    };

    const sortTicketsById = (tickets) => {
        return tickets.sort((a, b) =>  a.ticket_id - b.ticket_id);
    }

    const fetchTickets = async () => {
        try {
            const token = Cookies.get("token");

            const allInstructorTickets = await fetchTicketAssignmentsByUserId();
            //console.log('All instructor tickets:', allInstructorTickets);

            const sortedTickets = sortTicketsById(allInstructorTickets);
            const uniqueTickets = filterUniqueTickets(sortedTickets);
            const totalItems = uniqueTickets.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            const paginatedTicketAssignments = uniqueTickets.slice(startIndex, endIndex);

            // Fetch detailed ticket data for paginated subset only
            const ticketList = await Promise.all(
                paginatedTicketAssignments.map(async (ticket_) => {
                    const ticketData = await fetchTicketById(ticket_.ticket_id);
                    return {
                        ...ticketData,
                        userName: ticketData.student?.name || "Unknown",
                        ticketData: ticketData
                    };
                })
            );

            // Count different ticket types from ALL tickets (not just paginated)
            const allTicketDetails = await Promise.all(
                uniqueTickets.map(async (ticket_) => {
                    const ticketData = await fetchTicketById(ticket_.ticket_id);
                    return ticketData;
                })
            );

            const escalatedCount = allTicketDetails.filter(ticket =>
                ticket.escalated === true
            ).length;

            const openCount = allTicketDetails.filter(ticket =>
                ticket.status === 'new' || ticket.status === 'ongoing'
            ).length;

            const closedCount = allTicketDetails.filter(ticket =>
                ticket.status === 'resolved'
            ).length;

            // Set paginated tickets
            setTickets(ticketList);
            setTotalTickets(totalItems);
            setEscalatedTickets(escalatedCount);
            setOpenTickets(openCount);
            setClosedTickets(closedCount);

            // Set pagination metadata
            setPagination({
                totalItems: totalItems,
                totalPages: totalPages,
                hasNextPage: currentPage < totalPages,
                hasPreviousPage: currentPage > 1
            });

            setLoading(false);

        } catch (error) {
            console.error("Error fetching tickets:", error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh", // Full viewport height to center vertically
                    backgroundColor: theme.palette.background.default, // Use theme background
                    flexDirection: "column",
                    gap: 2.5,
                }}
            >
                <CircularProgress size={80} thickness={4} />{" "}
                {/* Adjust size and thickness */}
                <Typography variant="h6" sx={{ color: theme.palette.primary.main }}>
                    Loading, please wait...
                </Typography>
            </Box>
        );
    }

// end copy and paste from admindash
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: theme.palette.background.default,
                padding: 6.25,
                gap: 6.25,
            }}
        >
            <Typography
                variant="h1"
                sx={{ fontWeight: "bold", fontSize: "2rem", textAlign: "center" }}
            >
                Grader Dashboard
            </Typography>

            {/* TICKET SECTION CONTAINER */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2.5,
                    backgroundColor: theme.palette.background.paper,
                    padding: 2.5,
                    borderRadius: 1,
                    flex: 1,
                }}
            >
                {/* SECTION HEADER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <Avatar>
                            <ArticleIcon sx={{ fontSize: "2rem" }} />
                        </Avatar>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                                {totalTickets}
                            </Typography>
                            <Typography variant="p" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                Total Tickets
                            </Typography>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                                {openTickets}
                            </Typography>
                            <Typography variant="p" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                Open
                            </Typography>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                                {escalatedTickets}
                            </Typography>
                            <Typography variant="p" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                Escalated
                            </Typography>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                                {closedTickets}
                            </Typography>
                            <Typography variant="p" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                Closed
                            </Typography>
                        </div>
                        <Button
                            variant="contained"
                            disableElevation
                            sx={{ backgroundColor: theme.palette.primary.main, color: 'white', borderRadius: 999, fontSize: '0.75rem', width: '15%' }}
                            onClick={() => navigate("/gradertickets")}
                        >
                            View My Tickets
                        </Button>
                    </div>

                    {/* TICKETS */}
                    <TicketsViewController
                        tickets={tickets}
                        defaultView="grid"
                        onOpenTicket={openTicket}
                        header={<Typography variant="subtitle2">My Tickets</Typography>}
                    />

                    {/* PAGINATION */}
                    {pagination.totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={pagination.totalPages}
                            itemsPerPage={itemsPerPage}
                            totalItems={pagination.totalItems}
                            hasNextPage={pagination.hasNextPage}
                            hasPreviousPage={pagination.hasPreviousPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                            itemsPerPageOptions={[5, 10, 25, 50]}
                        />
                    )}
                </div>
            </Box>

            {/* TA SECTION CONTAINER */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2.5,
                    backgroundColor: theme.palette.background.paper,
                    padding: 2.5,
                    borderRadius: 1,
                    flex: 1,
                }}
            >
                {/* SECTION HEADER */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                    }}
                >
                    <Avatar>
                        <PeopleIcon sx={{ fontSize: "2rem" }} />
                    </Avatar>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <Typography
                            variant="h1"
                            sx={{ fontWeight: "bold", fontSize: "2rem" }}
                        >
                            {totalGraders}
                        </Typography>
                        <Typography
                            variant="p"
                            sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}
                        >
                            Assignees
                        </Typography>
                    </div>
                    <Button
                        variant="contained"
                        disableElevation
                        sx={{
                            backgroundColor: theme.palette.primary.main,
                            color: "white",
                            borderRadius: 999,
                            fontSize: "0.75rem",
                        }}
                        onClick={() => navigate("/allassignees")}
                    >
                        View All
                    </Button>
                </div>

                {/* TA CARDS */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "20px",
                        justifyContent: "center",
                        padding: "5px",
                        maxHeight: "950px",
                        overflowY: "hidden",
                    }}
                >
                    {Object.entries(GraderCounts).map(([id, ta]) => (
                        <InstructorCard
                            key={id}
                            name={ta.name || "Unknown"}
                            counts={ta.counts}
                            userId={id}
                        />
                    ))}
                </div>
            </Box>
            <Box sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          backgroundColor: theme.palette.background.paper,
          padding: 2.5,
          borderRadius: 1,
          flex: 1,
        }}>
        <GraderChart/>
      </Box>
        </Box>
    );
};

export default GraderDash