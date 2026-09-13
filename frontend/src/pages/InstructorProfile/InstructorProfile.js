import {
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  TextField,
  Typography,
  Box
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import React, { useEffect, useRef, useState } from "react";
import TicketCard from "../../components/TicketCard";
import ArticleIcon from "@mui/icons-material/Article";
import PeopleIcon from "@mui/icons-material/People";
import { Avatar } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import InstructorCard from "../../components/InstructorCard";
import { jwtDecode } from "jwt-decode";
import TicketsViewController from "../../components/TicketsViewController";
import Pagination from "../../components/Pagination/Pagination";

const baseURL = process.env.REACT_APP_API_BASE_URL;
//const token = Cookies.get("token");
const InstructorProfile = () => {
  const theme = useTheme();
  const [allTickets, setAllTickets] = useState([]); 
  const [tickets, setTickets] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [filterAnchor, setFilterAnchor] = useState(null); // For dropdown
  const [escalatedTickets, setEscalatedTickets] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [closedTickets, setClosedTickets] = useState(0);
  const [filteredTickets, setFilteredTickets] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [TA, setTA] = useState(null);
  const [TATickets, setTATickets] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    sort: null,
    status: null,
    search: "",
	  teamNameSearch: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isUser, setIsUser] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [newTime, setNewTime] = useState(null);
  const [time, setTime] = useState({monday: {start: '', end: '', location: ''}, 
			    tuesday: {start: '', end: '', location: ''},
	 		    wednesday: {start: '', end: '', location: ''},
			    thursday: {start: '', end: '', location: ''},
			    friday: {start: '', end: '', location: ''},
			    saturday: {start: '', end: '', location: ''},
			    sunday: {start: '', end: '', location: ''}});  
  const [selectedDays, setSelectedDays] = useState({
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  });
  
  const location = useLocation();
  const urlParameters = new URLSearchParams(location.search);
  const userId = urlParameters.get("user");
  const latestUserIdRef = useRef(userId);
  let navigate = useNavigate();

  useEffect(() => {
    latestUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (userId) {
      // Reset state when userId changes to prevent showing stale data
      setLoading(true);
      setAllTickets([]);
      setTickets([]);
      setFilteredTickets([]);
      setTA(null);
      setTotalTickets(0);
      setTATickets([]);
      setIsUser(false);
      setCurrentPage(1);
      setPagination({
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });

      // Fetch fresh data for the new TA
      fetchTicketsAssigned();
      fetchTADetails();
      fetchOfficeHours();
    }
  }, [userId]);

  useEffect(() => {
    applyFilters();
  }, [allTickets, activeFilters, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters]);

  const fetchOfficeHours = async () => {
    const requestedUserId = userId;
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${baseURL}/api/officehours/users/${requestedUserId}`,{
        headers: {
        'Authorization': `Bearer ${token}`,
      },
      });
      
      const data = await response.json();

      if (latestUserIdRef.current !== requestedUserId) {
        return;
      }
      
      console.log("response okay?: ", response.ok, "data?: ", data) 
      if (response.ok && data.office_hours) { // if ta is found in table and office_hours is not null
        setTime(data.office_hours);
        
        // Update selectedDays based on fetched office hours
        const updatedSelectedDays = {};
        Object.keys(data.office_hours).forEach(day => {
          const dayHours = data.office_hours[day];
          // A day is selected if it has both start and end times set and they're not the default 12:00
          updatedSelectedDays[day] = !!(dayHours.start && dayHours.end && 
            !(dayHours.start === '12:00' && dayHours.end === '12:00'));
        });
        setSelectedDays(updatedSelectedDays);
        
        console.log("fetched office hours:", data.office_hours);
        console.log("updated selected days:", updatedSelectedDays);
      }
      
    } catch (err) {
      if (latestUserIdRef.current !== requestedUserId) {
        return;
      }
      console.error("error fetching office hours:", err);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    try {
    const token = Cookies.get("token");
    const response = await fetch(`${baseURL}/api/officehours/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
      body: JSON.stringify({ office_hours: time }), //put in jsonb format for database
    });

    const result = await response.json();
    console.log('saved office hours', result);
    
    if (response.ok) {
      await fetchOfficeHours();
      setIsEditing(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      console.error('Failed to save office hours:', result);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
    } catch (error) {
      console.error('failed to save office hours', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };
  const handleCloseClick = () => {
    // some way to set it back to previous information
    setIsEditing(false);
  };

  const handleTime = (e,start_or_end) => {
	
        const {value} = e.target;
        setInputTime(prev => ({...prev, value})); 
  console.log(value);
  };        
       
  function handleDisplayTime(time) {
    if (time) {
      let hrs = time.split(':')[0], mins = time.split(':')[1];
      if (hrs > 12){return (hrs - 12) + ':' + mins + ' PM';}
      else if (hrs == 0) {return '12:' + mins + ' PM';}
      else {return (time + ' AM');}
    }
  }
  
  const handleDayChange = (day) => {
    const isCurrentlySelected = selectedDays[day];
    const newSelectedState = !isCurrentlySelected;
    
    setSelectedDays((prevState) => ({
      ...prevState,
      [day]: newSelectedState,
    }));
    
    if (isCurrentlySelected && !newSelectedState) {
      setTime(prevTime => ({
        ...prevTime,
        [day]: { start: '', end: '' }
      }));
    }
  };
 
  const handleChange = (day, field, value) => {
    setTime(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const fetchTeamNameFromId = async (team_id) => {
    if (!team_id) return "No Team";
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
        console.warn(`Failed to fetch team name for team_id=${team_id}`);
        return "Unknown Team";
      }

      const data = await res.json();
      return data?.team_name || "Unknown Team";
    } catch (error) {
      console.error(`Error fetching team name for team_id=${team_id}:`, error);
      return "Unknown Team";
    }
  };

  const fetchTADetails = async () => {
    const requestedUserId = userId;
    try {
    const token = Cookies.get("token");
      const response = await fetch(`${baseURL}/api/users/${requestedUserId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch TA details");
      }

      const taData = await response.json();
      if (latestUserIdRef.current !== requestedUserId) {
        return;
      }
      setTA(taData);
      const decodedToken = jwtDecode(token);
      console.log("token",decodedToken.id)
      setIsUser(decodedToken.id === taData.user_id); //set logged in user for edit function on office hours
      setCurrentUserRole(decodedToken.role); //set current user role for conditional rendering
      console.log("TA data: ", taData);
      setLoading(false);
    } catch (error) {
      if (latestUserIdRef.current !== requestedUserId) {
        return;
      }
      console.error("Error fetching TA details:", error);
      setLoading(false);
    }
  
  };
  


  const applyFilters = () => {
    let filtered = [...allTickets];

    // Apply sort filters
    if (activeFilters.sort === "newest") {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (activeFilters.sort === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (activeFilters.sort === "id-asc") {
      filtered.sort((a, b) => a.ticket_id - b.ticket_id);
    } else if (activeFilters.sort === "id-desc") {
      filtered.sort((a, b) => b.ticket_id - a.ticket_id);
    }

    // Apply status filters
    if (activeFilters.status) {
      if (activeFilters.status === "escalated") {
        filtered = filtered.filter((ticket) => ticket.escalated === true);
      } else {
        filtered = filtered.filter((ticket) =>
          ticket.status.toLowerCase() === activeFilters.status.toLowerCase()
        );
      }
    }

    // Apply search filters
    if (activeFilters.search) {
      filtered = filtered.filter((ticket) =>
        ticket.userName?.toLowerCase().includes(activeFilters.search.toLowerCase())
      );
    }

    if (activeFilters.teamNameSearch) {
      filtered = filtered.filter((ticket) =>
        ticket.teamName?.toLowerCase().includes(activeFilters.teamNameSearch.toLowerCase())
      );
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedFiltered = filtered.slice(startIndex, endIndex);

    setPagination({
      totalItems: totalItems,
      totalPages: totalPages,
      currentPage: currentPage,
      itemsPerPage: itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
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
    setActiveFilters({ sort: null, status: null, search: "", teamNameSearch: "" });
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); 
  };

  const fetchNameFromId = async (student_id) => {
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${baseURL}/api/users/${student_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch user name for ticket ${student_id}`);
        return "Unknown Name"; // Default name if user fetch fails
      }

      const data = await response.json();
      return data.name; // Assuming the API returns { name: "User Name" }
    } catch (error) {
      console.error(`Error fetching name for ticket ${student_id}:`, error);
      return "Unknown Name";
    }
  };
  const fetchTicketDetails = async (ticketId) => {
  try {
    const token = Cookies.get("token");
    const response = await fetch(`${baseURL}/api/tickets/${ticketId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch details for ticket ${ticketId}`);
    }

    return await response.json(); // Assuming the response returns ticket details
  } catch (error) {
    console.error(`Error fetching ticket ${ticketId}:`, error);
    return null; // Return null for failed requests
  }
  };

  const fetchTicketsAssigned = async () => {
    const requestedUserId = userId;
    try {
      const token = Cookies.get("token");
      const decodedToken = jwtDecode(token);
      
      // Check if current user is viewing their own profile
      const isViewingOwnProfile = decodedToken.id.toString() === requestedUserId;
      
      if (isViewingOwnProfile && decodedToken.role === 'TA') {
        // Use new streamlined endpoint for instructors viewing their own tickets
        const response = await fetch(`${baseURL}/api/tickets/assigned-to-me?page=1&limit=1000`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch assigned tickets");
        }

        const data = await response.json();
        if (latestUserIdRef.current !== requestedUserId) {
          return;
        }
        
        const ticketsWithNames = await Promise.all(
          data.tickets.map(async (ticket) => {
            const teamName = await fetchTeamNameFromId(ticket.team_id);
            return { 
              ...ticket, 
              userName: ticket.student ? ticket.student.name : "Unknown Student",
              teamName 
            };
          })
        );
        
        setAllTickets(ticketsWithNames);
        setTotalTickets(data.summary.totalTickets);
        setEscalatedTickets(data.summary.escalatedTickets);
        setOpenTickets(data.summary.openTickets);
        setClosedTickets(data.summary.closedTickets);
        
        // Set empty TA tickets array since we're using the new endpoint
        setTATickets([]);
        
      } else if (decodedToken.role === 'TA') {
        // TA viewing another TA's profile - only show shared tickets
        const [otherTAResponse, myAssignmentsResponse] = await Promise.all([
          fetch(`${baseURL}/api/ticketassignments/users/${requestedUserId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${baseURL}/api/ticketassignments/users/${decodedToken.id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
        ]);
        
        if (!otherTAResponse.ok || !myAssignmentsResponse.ok) {
          throw new Error("Failed to fetch assignment details");
        }

        const [otherTAAssignments, myAssignments] = await Promise.all([
          otherTAResponse.json(),
          myAssignmentsResponse.json()
        ]);
        
        if (latestUserIdRef.current !== requestedUserId) {
          return;
        }
        
        // Find shared ticket IDs
        const myTicketIds = myAssignments.map(a => a.ticket_id);
        const sharedTicketIds = otherTAAssignments
          .filter(a => myTicketIds.includes(a.ticket_id))
          .map(a => a.ticket_id);
        
        // Get shared ticket details
        const ticketDetailsPromises = sharedTicketIds.map((ticketId) => fetchTicketDetails(ticketId));
        const ticketDetails = await Promise.all(ticketDetailsPromises);
        const validTicketDetails = ticketDetails.filter(Boolean);
        let uniqueTickets = [...new Map(validTicketDetails.map((ticket) => [ticket.ticket_id, ticket])).values()];
        
        // Set the filtered assignments for shared tickets only
        const sharedAssignments = otherTAAssignments.filter(a => sharedTicketIds.includes(a.ticket_id));
        setTATickets(sharedAssignments);
        
        const ticketsWithNames = await Promise.all(
          uniqueTickets.map(async (ticket) => {
            const userName = await fetchNameFromId(ticket.student_id);
            const teamName = await fetchTeamNameFromId(ticket.team_id);
            return { ...ticket, userName, teamName };
          })
        );
        
        if (latestUserIdRef.current !== requestedUserId) {
          return;
        }
        
        setAllTickets(ticketsWithNames);
        setTotalTickets(uniqueTickets.length);
        
        // Calculate statistics for shared tickets
        const escalatedCount = ticketsWithNames.filter(ticket => ticket.escalated === true).length;
        const openCount = ticketsWithNames.filter(ticket => 
          ticket.status === 'new' || ticket.status === 'ongoing'
        ).length;
        const closedCount = ticketsWithNames.filter(ticket => ticket.status === 'resolved').length;

        setEscalatedTickets(escalatedCount);
        setOpenTickets(openCount);
        setClosedTickets(closedCount);
        
      } else {
        // Use existing logic for admins, students, or other roles viewing TAs' profiles
        const response = await fetch(`${baseURL}/api/ticketassignments/users/${requestedUserId}`, {
          method: "GET",
          headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch Ticket Assignment details");
      }

      const ticketsAssigned = await response.json();
      if (latestUserIdRef.current !== requestedUserId) {
        return;
      }
      setTATickets(ticketsAssigned);
      // get ticket_ids from the ticketsAssigned data
      const ticketIds = ticketsAssigned.map((assignment) => assignment.ticket_id);

      // api requests to fetch details for each ticket
      const ticketDetailsPromises = ticketIds.map((ticketId) => fetchTicketDetails(ticketId));

      const ticketDetails = await Promise.all(ticketDetailsPromises);
      const validTicketDetails = ticketDetails.filter(Boolean);
      let uniqueTickets = [...new Map(validTicketDetails.map((ticket) => [ticket.ticket_id, ticket])).values()];
      
      // Filter tickets based on user role - students only see their own tickets
      if (decodedToken.role === 'student') {
        uniqueTickets = uniqueTickets.filter(ticket => ticket.student_id === decodedToken.id);
      }
      
      const ticketsWithNames = await Promise.all(
          uniqueTickets.map(async (ticket) => {
            const userName = await fetchNameFromId(ticket.student_id);
            const teamName = await fetchTeamNameFromId(ticket.team_id);
            return { ...ticket, userName, teamName };
          })
        );
        if (latestUserIdRef.current !== requestedUserId) {
          return;
        }
        setAllTickets(ticketsWithNames);
        setTotalTickets(uniqueTickets.length);
      
      const escalatedCount = ticketsWithNames.filter(ticket => ticket.escalated === true).length;
      const openCount = ticketsWithNames.filter(ticket => 
        ticket.status === 'new' || ticket.status === 'ongoing'
      ).length;
      const closedCount = ticketsWithNames.filter(ticket => ticket.status === 'resolved').length;

      setEscalatedTickets(escalatedCount);
      setOpenTickets(openCount);
      setClosedTickets(closedCount);
      }
      
      setLoading(false);
    } catch (error) {
        if (latestUserIdRef.current !== requestedUserId) {
          return;
        }
        console.error("Error fetching Ticket Assignment details:", error);
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
        p: 6.25,
        gap: 6.25,
      }}
    >
      <Typography
        variant="h1"
        sx={{ 
          fontWeight: "bold", 
          fontSize: "2rem", 
          textAlign: "center",
          color: theme.palette.text.primary
        }}
      >
        {currentUserRole === "student" 
          ? `${TA?.name || ''} - Teaching Assistant` 
          : `${TA?.name || ''} Profile`}
      </Typography>

      {currentUserRole === "student" && (
        <Typography
          variant="subtitle1"
          sx={{ 
            fontSize: "1rem", 
            textAlign: "center", 
            color: theme.palette.text.secondary,
            marginTop: -4,
            marginBottom: 2
          }}
        >
          Office hours, contact information, and your ticket status
        </Typography>
      )}

      {/* CONDITIONAL TICKET STATISTICS SECTION - Hide detailed stats for students */}
      {currentUserRole !== "student" && (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          backgroundColor: theme.palette.background.paper,
          p: 2.5,
          borderRadius: 1,
          flex: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        {/* TICKET HEADER WITH STATS */}
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
        </div>

        {/* SEARCH AND FILTER SECTION */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
          <TextField
            label="Search by Student Name"
            variant="outlined"
            value={activeFilters.search}
            onChange={(e) => setActiveFilters({ ...activeFilters, search: e.target.value })}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Search by Team Name"
            variant="outlined"
            value={activeFilters.teamNameSearch}
            onChange={(e) => setActiveFilters({ ...activeFilters, teamNameSearch: e.target.value })}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleFilterClick}
            sx={{ backgroundColor: theme.palette.primary.main, color: "white" }}
          >
            {activeFilters.sort || activeFilters.status
              ? `Filters: ${activeFilters.sort || ""} ${activeFilters.status || ""}`
              : "Add Filter"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
          >
            Clear Filters
          </Button>
        </Box>

        {/*FILTER DROPDOWN */}
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={handleFilterClose}
        >
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              sort: activeFilters.sort === "newest" ? null : "newest" 
            }); 
            handleFilterClose(); 
          }}>
            Sort: Newest First
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              sort: activeFilters.sort === "oldest" ? null : "oldest" 
            }); 
            handleFilterClose(); 
          }}>
            Sort: Oldest First
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              sort: activeFilters.sort === "id-asc" ? null : "id-asc" 
            }); 
            handleFilterClose(); 
          }}>
            Sort: ID Ascending
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              sort: activeFilters.sort === "id-desc" ? null : "id-desc" 
            }); 
            handleFilterClose(); 
          }}>
            Sort: ID Descending
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              status: activeFilters.status === "new" ? null : "new" 
            }); 
            handleFilterClose(); 
          }}>
            Status: New
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              status: activeFilters.status === "ongoing" ? null : "ongoing" 
            }); 
            handleFilterClose(); 
          }}>
            Status: Ongoing
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              status: activeFilters.status === "resolved" ? null : "resolved" 
            }); 
            handleFilterClose(); 
          }}>
            Status: Resolved
          </MenuItem>
          <MenuItem onClick={() => { 
            setActiveFilters({ 
              ...activeFilters, 
              status: activeFilters.status === "escalated" ? null : "escalated" 
            }); 
            handleFilterClose(); 
          }}>
            Status: Escalated
          </MenuItem>
        </Menu>

        {/* TICKET SECTION */}
        <TicketsViewController
          tickets={filteredTickets}
          defaultView="grid"
          onOpenTicket={(ticket) => navigate(`/ticketinfo?ticket=${ticket.ticket_id}`)}
          header={<Typography variant="subtitle2">
            {currentUserRole === "student" ? "Your Tickets with this TA" : `Assigned Tickets (Page ${currentPage} of ${pagination.totalPages})`}
          </Typography>}
        />
        
        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
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
          </Box>
        )}
      </Box>
      )}

      {/* SIMPLIFIED VIEW FOR STUDENTS - Show only their tickets */}
      {currentUserRole === "student" && totalTickets > 0 && (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          backgroundColor: theme.palette.background.paper,
          p: 2.5,
          borderRadius: 1,
          flex: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: theme.palette.text.primary,
            display: "flex",
            alignItems: "center",
            gap: 1
          }}
        >
          <ArticleIcon />
          Your Tickets ({totalTickets})
        </Typography>

        <TicketsViewController
          tickets={filteredTickets}
          defaultView="grid"
          onOpenTicket={(ticket) => navigate(`/ticketinfo?ticket=${ticket.ticket_id}`)}
          header={<Typography variant="subtitle2">
            {pagination.totalPages > 1 ? `Click on a ticket to view details (Page ${currentPage} of ${pagination.totalPages})` : "Click on a ticket to view details"}
          </Typography>}
        />
        
        {/* PAGINATION FOR STUDENTS */}
        {pagination.totalPages > 1 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
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
          </Box>
        )}
      </Box>
      )}

      {/*Schedule section*/}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          backgroundColor: theme.palette.background.paper,
          p: 2.5,
          borderRadius: 1,
          flex: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      ><Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 2.5,
          }}
        ><Typography
              variant="h1"
              sx={{ 
                fontWeight: "bold", 
                fontSize: "2rem", 
                textAlign: "center",
                color: theme.palette.text.primary
              }}
            >
              Office Hours
            </Typography>
	{/*check if logged in user is viewing their own profile*/}
	{isUser && (
	
          <Button
            variant="contained"
            onClick={handleEditClick}
            sx={{ backgroundColor: theme.palette.primary.main, color: "white" }}
          >
          Edit
          </Button>
	 )}
        </Box>

  {saveStatus === 'success' && (
    <Typography sx={{ color: 'success.main', textAlign: 'center', fontWeight: 500 }}>
      ✓ Office hours saved successfully.
    </Typography>
  )}
  {saveStatus === 'error' && (
    <Typography sx={{ color: 'error.main', textAlign: 'center', fontWeight: 500 }}>
      ✗ Failed to save office hours. Please try again.
    </Typography>
  )}
        	
	<div style={{ display: "grid", flexDirection: "column", justifyContent: "center" }}>
	{isEditing ? (
	<>
  	<Typography variant="p" sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', alignItems: 'center', color: "#737373", fontSize: "0.8rem", padding: "2px" }}>
	<label> <input
          type="checkbox"
          checked={selectedDays.monday}
          onChange={() => handleDayChange('monday')}
        />
        Monday </label>
	
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
		   <input type="time" 
		   step="300" 
		   id="monday" 
		   name="monday" 
		   value={time.monday.start} 
		   onChange={e=> handleChange("monday", "start", e.target.value)}
		   style={{ width: "120px" }}
		   />
		    - 
		   <input type="time" 
		   step="300"
		   id="monday"
		   name="monday" 
		   value={time.monday.end}
		   onChange={e=> handleChange("monday", "end", e.target.value)}
		   style={{ width: "120px" }}
		   />
       <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.monday.location}
        onChange={e=> handleChange("monday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
	</div>
	
        <label> <input
          type="checkbox"
          checked={selectedDays.tuesday}
          onChange={() => handleDayChange('tuesday')}
        />
        Tuesday </label>
	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <input type="time" 
		   id="tuesday" 
		   step="300"
		   value={time.tuesday.start} 
		   onChange={e=> handleChange("tuesday", "start", e.target.value)}
		   style={{ width: "120px" }}
		   /> 
		    - 
		   <input type="time" 
		   step="300" 
		   value={time.tuesday.end}
		   onChange={e=> handleChange("tuesday", "end", e.target.value)}
		   style={{ width: "120px" }}
   		   />
         <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.tuesday.location}
        onChange={e=> handleChange("tuesday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
        </div>
        <label> <input
          type="checkbox"
          checked={selectedDays.wednesday}
          onChange={() => handleDayChange('wednesday')}
        />
        Wednesday </label>
	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <input type="time" 
		   step="300"
		   value={time.wednesday.start}
		   onChange={e=> handleChange("wednesday", "start", e.target.value)}
		   style={{ width: "120px" }}
		   /> 
		    - 
		   <input type="time" 
		   step="300"
		   value={time.wednesday.end}
		   onChange={e=> handleChange("wednesday", "end", e.target.value)}
		   style={{ width: "120px" }}
   		   />
         <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.wednesday.location}
        onChange={e=> handleChange("wednesday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
        </div>
        <label> <input
          type="checkbox"
          checked={selectedDays.thursday}
          onChange={() => handleDayChange('thursday')}
        />
        Thursday </label>
	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <input type="time" 
		   step="300"
		   value={time.thursday.start} 
		   onChange={e=> handleChange("thursday", "start", e.target.value)}
		   style={{ width: "120px" }}
  		   />
		    - 
		   <input type="time" 
		   step="300" 
		   value={time.thursday.end}
		   onChange={e=> handleChange("thursday", "end", e.target.value)}
		   style={{ width: "120px" }}
  		   />
         <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.thursday.location}
        onChange={e=> handleChange("thursday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
        </div>
        <label> <input
          type="checkbox"
          checked={selectedDays.friday}
          onChange={() => handleDayChange('friday')}
        />
        Friday </label>
	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <input type="time" 
		   step="300"
		   value={time.friday.start} 
		   onChange={e=> handleChange("friday", "start", e.target.value)}
		   style={{ width: "120px" }}
		   /> 
		    - 
		   <input type="time" 
		   step="300"
		   value={time.friday.end}
		   onChange={e=> handleChange("friday", "end", e.target.value)}
		   style={{ width: "120px" }}
		   />
       <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.friday.location}
        onChange={e=> handleChange("friday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
        </div>
        <label> <input
          type="checkbox"
          checked={selectedDays.saturday}
          onChange={() => handleDayChange('saturday')}
        />
        Saturday </label>
	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <input type="time" 
		   step="300"
		   value={time.saturday.start}
		   onChange={e=> handleChange("saturday", "start", e.target.value)}
		   style={{ width: "120px" }}
		   />
		    - 
		   <input type="time" 
		   step="300"
		   value={time.saturday.end}
		   onChange={e=> handleChange("saturday", "end", e.target.value)}
		   style={{ width: "120px" }}
		   />
       <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.saturday.location}
        onChange={e=> handleChange("saturday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
        </div>
        <label> <input
          type="checkbox"
          checked={selectedDays.sunday}
          onChange={() => handleDayChange('sunday')}
        />
        Sunday </label>
	<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <input type="time" 
		   step="300"
		   value={time.sunday.start}
		   onChange={e=> handleChange("sunday", "start", e.target.value)}
		   style={{ width: "120px" }}
		   /> 
		    - 
		   <input type="time" 
	   	   step="300"
		   value={time.sunday.end}
		   onChange={e=> handleChange("sunday", "end", e.target.value)}
		   style={{ width: "120px" }}
		   />
       <input type="text"
        placeholder="Location"
        maxLength={100}
        value={time.sunday.location}
        onChange={e=> handleChange("sunday", "location", e.target.value)}
        style={{ width: "180px" }}
        />
        </div>
          </Typography>
	<div style= {{ display: "flex", flexDirection: "row", justifyContent: "space-between" }} >
	<Button
		variant="contained"
		onClick={handleSaveClick}
		sx={{ backgroundColor: theme.palette.primary.main, color: "white", padding:"2px 10px" }}
	>
	Save
	</Button>
	<Button
                variant="contained"
                onClick={handleCloseClick}
                sx={{ backgroundColor: theme.palette.primary.main, color: "white", padding:"2px" }}
        >
        Close
        </Button>
	</div>
	</>) : ( <>
	  <Typography variant="p" sx={{  display: 'grid', gridTemplateColumns: '1fr 2fr', alignItems: 'center', gap: '4px', color: theme.palette.text.secondary, fontSize: "0.8rem" , textAlign: "left"}}>
	  {selectedDays.monday && (time.monday.start != '' && time.monday.end != '') && ( <>
	    <label> Monday: </label>
	    <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.monday.start)} - {handleDisplayTime(time.monday.end)}
            {time.monday.location && ` (${time.monday.location})`}
	    </div>
            </>)}
          {selectedDays.tuesday && (time.tuesday.start != '' && time.tuesday.end != '') && ( <>
	    <label> Tuesday: </label>
            <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.tuesday.start)} - {handleDisplayTime(time.tuesday.end)}
            {time.tuesday.location && ` (${time.tuesday.location})`}
	    </div>
            </>)}
          {selectedDays.wednesday && (time.wednesday.start != '' && time.wednesday.end != '') && ( <>
	    <label> Wednesday: </label>
            <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.wednesday.start)} - {handleDisplayTime(time.wednesday.end)}
            {time.wednesday.location && ` (${time.wednesday.location})`}
            </div>
	    </>)}
          {selectedDays.thursday && (time.thursday.start != '' && time.thursday.end != '') && ( <>
	    <label> Thursday: </label>
            <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.thursday.start)} - {handleDisplayTime(time.thursday.end)}
            {time.thursday.location && ` (${time.thursday.location})`}
            </div>
	    </>)}
          {selectedDays.friday && (time.friday.start != '' && time.friday.end != '') && ( <>
	    <label> Friday: </label>
            <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.friday.start)} - {handleDisplayTime(time.friday.end)}
            {time.friday.location && ` (${time.friday.location})`}
            </div>
	    </>)}
          {selectedDays.saturday && (time.saturday.start != '' && time.saturday.end != '') && ( <>
	    <label> Saturday: </label>
            <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.saturday.start)} - {handleDisplayTime(time.saturday.end)}
            {time.saturday.location && ` (${time.saturday.location})`}
            </div>
	    </>)}
          {selectedDays.sunday && (time.sunday.start != '' && time.sunday.end != '') && ( <>
	    <label> Sunday: </label>
            <div style={{ display: "flex", alignItems: "left", gap: "8px" }}>
            {handleDisplayTime(time.sunday.start)} - {handleDisplayTime(time.sunday.end)}
            {time.sunday.location && ` (${time.sunday.location})`}
            </div>
	    </>)}
          </Typography>
	  </>)}
        </div>
	</Box> 
    </Box>
  );
};

export default InstructorProfile;
