import React, { useEffect, useState } from "react";
import { Avatar, Button, Typography, Box, TextField, Menu, MenuItem } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArticleIcon from "@mui/icons-material/Article";
import CircularProgress from "@mui/material/CircularProgress";
import Cookies from "js-cookie";
import TicketsViewController from "../../components/TicketsViewController";
import TaTicketsViewController from "../../components/TaTicketsViewController";
import Pagination from "../../components/Pagination/Pagination";
import { fetchTicketAssignmentsByUserId, fetchTicketById, fetchTaTicketAssignmentsByUserId, fetchTaTicketById } from "../../services/ticketServices";
import { useNavigate } from "react-router-dom";
import { getDateRangeError, matchesTicketDateRange } from "../../utils/ticketDateRange";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3301";

const defaultActiveFilters = {
    sort: null,
    status: null,
    source: null,
    search: "",
    ticketIdSearch: "",
    teamNameSearch: "",
    sectionSearch: "",
    startDate: "",
    endDate: "",
};

const InstructorTickets = () => {
    const theme = useTheme();
    // ... (all other state declarations remain the same) ...
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalTickets, setTotalTickets] = useState(0);
    const [escalatedTickets, setEscalatedTickets] = useState(0);
    const [openTickets, setOpenTickets] = useState(0);
    const [closedTickets, setClosedTickets] = useState(0);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [activeFilters, setActiveFilters] = useState(defaultActiveFilters);
    const dateRangeError = getDateRangeError(activeFilters.startDate, activeFilters.endDate);
    const [hideResolved, setHideResolved] = useState(true);
    
    const [studentCurrentPage, setStudentCurrentPage] = useState(1);
    const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
    const [studentPagination, setStudentPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });
    
    const [taCurrentPage, setTaCurrentPage] = useState(1);
    const [taItemsPerPage, setTaItemsPerPage] = useState(10);
    const [taPagination, setTaPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });
    
    let navigate = useNavigate();

    const openTicket = (ticket) => {
        if (ticket.type === "ta") {
            navigate(`/taticketinfo?ticket=${ticket.ticket_id}`);
        } else {
            navigate(`/ticketinfo?ticket=${ticket.ticket_id}`);
        }
    };

    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const savedFilters = sessionStorage.getItem('instructorTickets_filters');
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            setActiveFilters({
                ...defaultActiveFilters,
                ...(filters.activeFilters || {}),
            });
            setHideResolved(filters.hideResolved ?? true);
            setStudentCurrentPage(filters.studentCurrentPage || 1);
            setStudentItemsPerPage(filters.studentItemsPerPage || 10);
            setTaCurrentPage(filters.taCurrentPage || 1);
            setTaItemsPerPage(filters.taItemsPerPage || 10);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        const filters = {
            activeFilters,
            hideResolved,
            studentCurrentPage,
            studentItemsPerPage,
            taCurrentPage,
            taItemsPerPage,
        };
        sessionStorage.setItem('instructorTickets_filters', JSON.stringify(filters));
    }, [activeFilters, hideResolved, studentCurrentPage, studentItemsPerPage, taCurrentPage, taItemsPerPage, isInitialized]);

    useEffect(() => {
        if (!isInitialized) return;
        loadTickets();
    }, [isInitialized]);

    useEffect(() => {
        applyFilters();
    }, [tickets, activeFilters, hideResolved, studentCurrentPage, studentItemsPerPage, taCurrentPage, taItemsPerPage]);
    
    // Reset pagination when filters change
    useEffect(() => {
        setStudentCurrentPage(1);
        setTaCurrentPage(1);
    }, [activeFilters, hideResolved]);

    useEffect(() => {
        if (activeFilters.status && activeFilters.status.toLowerCase() === "resolved") {
            setHideResolved(false);
        }
    }, [activeFilters.status]);

    const applyFilters = () => {
        let filtered = [...tickets];

        if (!dateRangeError && (activeFilters.startDate || activeFilters.endDate)) {
            filtered = filtered.filter((ticket) =>
                matchesTicketDateRange(ticket, activeFilters.startDate, activeFilters.endDate)
            );
        }

        // Apply sort filter
        if (activeFilters.sort === "newest") {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (activeFilters.sort === "oldest") {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (activeFilters.sort === "id-asc") {
            filtered.sort((a, b) => a.ticket_id - b.ticket_id);
        } else if (activeFilters.sort === "id-desc") {
            filtered.sort((a, b) => b.ticket_id - a.ticket_id);
        }

        // Apply status filter
        if (activeFilters.status) {
            if (activeFilters.status.toLowerCase() === "escalated") {
                filtered = filtered.filter((ticket) => ticket.escalated === true);
            } else {
                filtered = filtered.filter(
                    (ticket) =>
                        ticket.status?.toLowerCase() === activeFilters.status.toLowerCase()
                );
            }
        }

        // Apply search filter (search by user name)
        if (activeFilters.search) {
            filtered = filtered.filter((ticket) =>
                ticket.userName
                    ?.toLowerCase()
                    .includes(activeFilters.search.toLowerCase())
            );
        }

        // Search by ticket ID
        if (activeFilters.ticketIdSearch) {
            filtered = filtered.filter(
                (ticket) => ticket.ticket_id?.toString() === activeFilters.ticketIdSearch
            );
        }

        // Apply search filter (search by team name)
        if (activeFilters.teamNameSearch) {
            filtered = filtered.filter((ticket) =>
                ticket.teamName
                    ?.toLowerCase()
                    .includes(activeFilters.teamNameSearch.toLowerCase())
            );
        }

        // Apply search filter (search by section number)
        if (activeFilters.sectionSearch) {
            filtered = filtered.filter((ticket) =>
                ticket.section
                    ?.toLowerCase()
                    .includes(activeFilters.sectionSearch.toLowerCase())
            );
        }

        // Apply source filter
        if (activeFilters.source) {
            filtered = filtered.filter(
                (ticket) => ticket.type === activeFilters.source
            );
        }

        // Hide resolved tickets if toggle is active
        if (hideResolved) {
            filtered = filtered.filter(
                (ticket) => ticket.status?.toLowerCase() !== "resolved"
            );
        }

        setTotalTickets(filtered.length);
        setEscalatedTickets(filtered.filter((ticket) => ticket.escalated === true).length);
        setOpenTickets(filtered.filter((ticket) =>
            ["new", "ongoing"].includes(ticket.status?.toLowerCase())
        ).length);
        setClosedTickets(filtered.filter((ticket) =>
            ticket.status?.toLowerCase() === "resolved"
        ).length);

        const allStudentTickets = filtered.filter((ticket) => ticket.type === "student");
        const allTaTickets = filtered.filter((ticket) => ticket.type === "ta");

        const studentTotalPages = Math.ceil(allStudentTickets.length / studentItemsPerPage);
        const studentStartIndex = (studentCurrentPage - 1) * studentItemsPerPage;
        const studentEndIndex = studentStartIndex + studentItemsPerPage;
        const paginatedStudentTickets = allStudentTickets.slice(studentStartIndex, studentEndIndex);

        const taTotalPages = Math.ceil(allTaTickets.length / taItemsPerPage);
        const taStartIndex = (taCurrentPage - 1) * taItemsPerPage;
        const taEndIndex = taStartIndex + taItemsPerPage;
        const paginatedTaTickets = allTaTickets.slice(taStartIndex, taEndIndex);

        const paginatedFiltered = [...paginatedStudentTickets, ...paginatedTaTickets];

        setStudentPagination({
            totalItems: allStudentTickets.length,
            totalPages: studentTotalPages,
            hasNextPage: studentCurrentPage < studentTotalPages,
            hasPreviousPage: studentCurrentPage > 1
        });

        setTaPagination({
            totalItems: allTaTickets.length,
            totalPages: taTotalPages,
            hasNextPage: taCurrentPage < taTotalPages,
            hasPreviousPage: taCurrentPage > 1
        });

        setFilteredTickets(paginatedFiltered);
    };

    const handleFilterClick = (event) => {
        setFilterAnchor(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchor(null);
    };

    const handleClearFilters = () => {
        setActiveFilters(defaultActiveFilters);
    };

    const handleDateChange = (field) => (event) => {
        setActiveFilters((currentFilters) => ({
            ...currentFilters,
            [field]: event.target.value,
        }));
    };

    const handleClearDateRange = () => {
        setActiveFilters((currentFilters) => ({
            ...currentFilters,
            startDate: "",
            endDate: "",
        }));
    };

    const handleStudentPageChange = (pageNumber) => {
        setStudentCurrentPage(pageNumber);
    };

    const handleStudentItemsPerPageChange = (newItemsPerPage) => {
        setStudentItemsPerPage(newItemsPerPage);
        setStudentCurrentPage(1);
    };

    const handleTaPageChange = (pageNumber) => {
        setTaCurrentPage(pageNumber);
    };

    const handleTaItemsPerPageChange = (newItemsPerPage) => {
        setTaItemsPerPage(newItemsPerPage);
        setTaCurrentPage(1);
    };

    // Fetch a user's name from their ID.
    const fetchUserNameById = async (userId) => {
        if (!userId) return "Unknown";
        try {
            const token = Cookies.get("token");
            const res = await fetch(`${baseURL}/api/users/${userId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                console.warn(`Failed to fetch name for user_id=${userId}`);
                return "Unknown";
            }
            const data = await res.json();
            return data?.name || "Unknown";
        } catch (error) {
            console.error(`Error fetching name for user_id=${userId}:`, error);
            return "Unknown";
        }
    };

    const fetchTeamNameFromId = async (team_id) => {
        try {
            const token = Cookies.get("token");
            const res = await fetch(`${baseURL}/api/teams/${team_id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                console.warn(
                    `Failed to fetch user name for team_id=${team_id} (status ${res.status})`
                );
                return "Unknown";
            }

            const data = await res.json();
            return data?.team_name || "Unknown";
        } catch (error) {
            console.error(`Error fetching name for team_id=${team_id}:`, error);
            return "Unknown";
        }
    };

    const filterUniqueTickets = (tickets) => {
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
        return tickets.sort((a, b) => a.ticket_id - b.ticket_id);
    };

    // Load Tickets Assignments
    const loadTickets = async () => {
        try {
            const [instructorAssignments, taAssignments] = await Promise.all([
                fetchTicketAssignmentsByUserId(),
                fetchTaTicketAssignmentsByUserId(),
            ]);

            const typedInstructorAssignments = instructorAssignments.map((ticket) => ({
                ...ticket,
                type: "student",
            }));
            const typedTaAssignments = taAssignments.map((ticket) => ({
                ...ticket,
                type: "ta",
            }));

            const combinedAssignments = [
                ...typedInstructorAssignments,
                ...typedTaAssignments,
            ];

            const sortedTickets = sortTicketsById(combinedAssignments);
            const uniqueTickets = filterUniqueTickets(sortedTickets);

            const ticketList = await Promise.all(
                uniqueTickets.map(async (ticket_) => {
                    let ticketData;
                    if (ticket_.type === "ta") {
                        ticketData = await fetchTaTicketById(ticket_.ticket_id);
                    } else {
                        ticketData = await fetchTicketById(ticket_.ticket_id);
                    }

                    const teamName = await fetchTeamNameFromId(ticketData.team_id);

                    let userName;
                    if (ticket_.type === 'ta') {
                        // For TA tickets, fetch the name using the new helper function and the ta_id.
                        userName = await fetchUserNameById(ticketData.ta_id);
                    } else {
                        // For student tickets, the name is already nested in the object.
                        userName = ticketData.student?.name || "Unknown Student";
                    }

                    return {
                        ...ticketData,
                        userName: userName,
                        teamName: teamName,
                        ticketData: ticketData,
                        type: ticket_.type,
                    };
                })
            );

            const escalatedCount = ticketList.filter(
                (ticket) => ticket.escalated === true
            ).length;
            const openCount = ticketList.filter(
                (ticket) => ticket.status === "new" || ticket.status === "ongoing"
            ).length;
            const closedCount = ticketList.filter(
                (ticket) => ticket.status === "resolved"
            ).length;

            setTickets(ticketList);
            setFilteredTickets(ticketList);
            setTotalTickets(ticketList.length);
            setEscalatedTickets(escalatedCount);
            setOpenTickets(openCount);
            setClosedTickets(closedCount);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching instructor tickets:", error);
            setLoading(false);
        }
    };

    const studentTickets = filteredTickets.filter(
        (ticket) => ticket.type === "student"
    );
    const taTickets = filteredTickets.filter((ticket) => ticket.type === "ta");

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    backgroundColor: theme.palette.background.default,
                    flexDirection: "column",
                    gap: 2.5,
                }}
            >
                <CircularProgress size={80} thickness={4} />
                <Typography variant="h6" sx={{ color: theme.palette.primary.main }}>
                    Loading, please wait...
                </Typography>
            </Box>
        );
    }

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
                My Tickets
            </Typography>

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
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                    <Avatar>
                        <ArticleIcon sx={{ fontSize: "2rem" }} />
                    </Avatar>
                    <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                            {totalTickets}
                        </Typography>
                        <Typography variant="p" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            Total Tickets
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                            {openTickets}
                        </Typography>
                        <Typography variant="p" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            Open
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                            {escalatedTickets}
                        </Typography>
                        <Typography variant="p" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            Escalated
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                            {closedTickets}
                        </Typography>
                        <Typography variant="p" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            Closed
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        disableElevation
                        sx={{
                            backgroundColor: "primary.main",
                            color: "white",
                            borderRadius: 999,
                            fontSize: "0.75rem",
                        }}
                        onClick={() => navigate("/instructordash")}
                    >
                        Back to Dashboard
                    </Button>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2.5, }}>
                    <TextField
                        label="Search by Name"
                        variant="outlined"
                        value={activeFilters.search}
                        onChange={(e) =>
                            setActiveFilters({ ...activeFilters, search: e.target.value })
                        }
                        sx={{ flex: "1 1 220px", minWidth: 220 }}
                    />
                    <TextField
                        label="Search by Team Name"
                        variant="outlined"
                        value={activeFilters.teamNameSearch}
                        onChange={(e) =>
                            setActiveFilters({ ...activeFilters, teamNameSearch: e.target.value })
                        }
                        sx={{ flex: "1 1 220px", minWidth: 220 }}
                    />
                    <TextField
                        label="Search by Section Number"
                        variant="outlined"
                        value={activeFilters.sectionSearch}
                        onChange={(e) =>
                            setActiveFilters({ ...activeFilters, sectionSearch: e.target.value })
                        }
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        label="Start Date"
                        type="date"
                        value={activeFilters.startDate}
                        onChange={handleDateChange("startDate")}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ "aria-label": "Start Date" }}
                        sx={{ flex: "1 1 220px", minWidth: 220 }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        value={activeFilters.endDate}
                        onChange={handleDateChange("endDate")}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ "aria-label": "End Date" }}
                        sx={{ flex: "1 1 220px", minWidth: 220 }}
                    />
                    <Button
                        variant="outlined"
                        onClick={handleClearDateRange}
                        disabled={!activeFilters.startDate && !activeFilters.endDate}
                        sx={{ borderColor: "primary.main", color: "primary.main" }}
                    >
                        Clear Date Range
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFilterClick}
                        sx={{ backgroundColor: "primary.main", color: "white" }}
                    >
                        {activeFilters.sort || activeFilters.status || activeFilters.source
                            ? `Filters Active`
                            : "Add Filter"}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleClearFilters}
                        sx={{ borderColor: "primary.main", color: "primary.main" }}
                    >
                        Clear Filters
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => setHideResolved(prev => !prev)}
                        sx={{ borderColor: "primary.main", color: "primary.main" }}
                    >
                        {hideResolved ? "Include Resolved" : "Hide Resolved"}
                    </Button>
                </Box>
                {dateRangeError && (
                    <Typography role="alert" color="error" variant="body2">
                        {dateRangeError}
                    </Typography>
                )}

                <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={handleFilterClose}>
                    <MenuItem onClick={() => { setActiveFilters({ ...activeFilters, sort: activeFilters.sort === "newest" ? null : "newest" }); handleFilterClose(); }}>
                        {activeFilters.sort === "newest" && (<span style={{ marginRight: 8 }}>✔</span>)} Newest
                    </MenuItem>
                    <MenuItem onClick={() => { setActiveFilters({ ...activeFilters, sort: activeFilters.sort === "oldest" ? null : "oldest" }); handleFilterClose(); }}>
                        {activeFilters.sort === "oldest" && (<span style={{ marginRight: 8 }}>✔</span>)} Oldest
                    </MenuItem>
                    <MenuItem onClick={() => { setActiveFilters({ ...activeFilters, status: activeFilters.status === "New" ? null : "New" }); handleFilterClose(); }}>
                        {activeFilters.status === "New" && (<span style={{ marginRight: 8 }}>✔</span>)} Status: New
                    </MenuItem>
                    <MenuItem onClick={() => { setActiveFilters({ ...activeFilters, status: activeFilters.status === "Ongoing" ? null : "Ongoing" }); handleFilterClose(); }}>
                        {activeFilters.status === "Ongoing" && (<span style={{ marginRight: 8 }}>✔</span>)} Status: Ongoing
                    </MenuItem>
                    <MenuItem onClick={() => { setActiveFilters({ ...activeFilters, status: activeFilters.status === "Resolved" ? null : "Resolved" }); handleFilterClose(); }}>
                        {activeFilters.status === "Resolved" && (<span style={{ marginRight: 8 }}>✔</span>)} Status: Resolved
                    </MenuItem>
                    <MenuItem onClick={() => { setActiveFilters({ ...activeFilters, status: activeFilters.status === "Escalated" ? null : "Escalated" }); handleFilterClose(); }}>
                        {activeFilters.status === "Escalated" && (<span style={{ marginRight: 8 }}>✔</span>)} Status: Escalated
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            setActiveFilters({
                                ...activeFilters,
                                source: activeFilters.source === "student" ? null : "student",
                            });
                            handleFilterClose();
                        }}
                    >
                        {activeFilters.source === "student" && (
                            <span style={{ marginRight: 8 }}>✔</span>
                        )}
                        Source: Student
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            setActiveFilters({
                                ...activeFilters,
                                source: activeFilters.source === "ta" ? null : "ta",
                            });
                            handleFilterClose();
                        }}
                    >
                        {activeFilters.source === "ta" && (
                            <span style={{ marginRight: 8 }}>✔</span>
                        )}
                        Source: TA
                    </MenuItem>
                </Menu>

                <Box>
                    {(studentTickets.length > 0 || studentPagination.totalItems > 0) && (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
                                Student Tickets ({studentPagination.totalItems} total)
                            </Typography>
                            <TicketsViewController
                                tickets={studentTickets}
                                defaultView="grid"
                                onOpenTicket={openTicket}
                                enableShare={true}
                            />
                            
                            {/* Student Tickets Pagination */}
                            {studentPagination.totalPages > 1 && (
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                    <Pagination
                                        currentPage={studentCurrentPage}
                                        totalPages={studentPagination.totalPages}
                                        itemsPerPage={studentItemsPerPage}
                                        totalItems={studentPagination.totalItems}
                                        hasNextPage={studentPagination.hasNextPage}
                                        hasPreviousPage={studentPagination.hasPreviousPage}
                                        onPageChange={handleStudentPageChange}
                                        onItemsPerPageChange={handleStudentItemsPerPageChange}
                                        itemsPerPageOptions={[5, 10, 25, 50]}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}

                    {(taTickets.length > 0 || taPagination.totalItems > 0) && (
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ mb: 2, mt: (studentTickets.length > 0 || studentPagination.totalItems > 0) ? 4 : 2 }}
                            >
                                TA Tickets ({taPagination.totalItems} total)
                            </Typography>
                            <TaTicketsViewController
                                tickets={taTickets}
                                defaultView="grid"
                                onOpenTicket={openTicket}
                            />
                            
                            {/* TA Tickets Pagination */}
                            {taPagination.totalPages > 1 && (
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                    <Pagination
                                        currentPage={taCurrentPage}
                                        totalPages={taPagination.totalPages}
                                        itemsPerPage={taItemsPerPage}
                                        totalItems={taPagination.totalItems}
                                        hasNextPage={taPagination.hasNextPage}
                                        hasPreviousPage={taPagination.hasPreviousPage}
                                        onPageChange={handleTaPageChange}
                                        onItemsPerPageChange={handleTaItemsPerPageChange}
                                        itemsPerPageOptions={[5, 10, 25, 50]}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}

                    {filteredTickets.length === 0 && studentPagination.totalItems === 0 && taPagination.totalItems === 0 && (
                        <Typography sx={{ mt: 4, textAlign: 'center' }}>
                            No assigned tickets match the current filters.
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default InstructorTickets;
