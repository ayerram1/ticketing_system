import ArticleIcon from "@mui/icons-material/Article";
import PeopleIcon from "@mui/icons-material/People";
import { Avatar, Button, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstructorCard from "../../components/InstructorCard";
import TicketsViewController from "../../components/TicketsViewController";
import Pagination from "../../components/Pagination/Pagination";
import NewChart from "./NewChart";


const baseURL = process.env.REACT_APP_API_BASE_URL;



const AdminDash = () => {

  
  const theme = useTheme();
  const [tickets, setTickets] = useState([]);
  const [escalatedTickets, setEscalatedTickets] = useState([]);
  const [TACounts, setTACounts] = useState([]);
  const [TAs, setTAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalEscalatedTickets, setTotalEscalatedTickets] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [closedTickets, setClosedTickets] = useState(0);
  const [totalTAs, setTotalTAs] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [assignees, setAssignees] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const [escalatedCurrentPage, setEscalatedCurrentPage] = useState(1);
  const [escalatedItemsPerPage, setEscalatedItemsPerPage] = useState(10);
  const [escalatedPagination, setEscalatedPagination] = useState({
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  
  let navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
    fetchTACounts();
    const token = Cookies.get("token");
    if (token) {
      fetchEscalatedTickets(token);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      fetchEscalatedTickets(token);
    }
  }, [escalatedCurrentPage, escalatedItemsPerPage]);

  const fetchTACounts = async () => {
    try {
      const token = Cookies.get("token");

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
      const tas = users.filter((user) => user.role === "TA"); // Filter TAs
      setTotalTAs(tas.length);
      setTAs(tas);



      const ticketCounts = {};

      tas.forEach((ta) => {
        ticketCounts[ta.user_id] = {
          name: ta.name,
          counts: { new: 0, ongoing: 0, resolved: 0 },
        };
      });

      // Fetch assignments for each TA using the role-filtered endpoint
      const countPromises = tas.map(async (ta) => {
        try {
          const assignmentsResponse = await fetch(
            `${baseURL}/api/ticketassignments/users/${ta.user_id}`,
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
                ticketCounts[ta.user_id].counts.new += 1;
              } else if (ticket.status === "ongoing") {
                ticketCounts[ta.user_id].counts.ongoing += 1;
              } else if (ticket.status === "resolved") {
                ticketCounts[ta.user_id].counts.resolved += 1;
              }
            });
          }
        } catch (err) {
          console.error(`Error fetching assignments for TA ${ta.user_id}:`, err);
        }
      });

      await Promise.all(countPromises);

      console.log(ticketCounts);
      setTACounts(ticketCounts); // Update state with counts
    } catch (err) {
      console.error("Error fetching TA ticket counts:", err);
    }
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

  const fetchEscalatedTickets = async (token) => {
    try {
      // Try fetching escalated tickets - use status parameter first
      const params = new URLSearchParams({
        page: escalatedCurrentPage,
        limit: escalatedItemsPerPage,
        status: 'escalated'  // Try status parameter first
      });

      const response = await fetch(`${baseURL}/api/tickets?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch escalated tickets");
      }

      const responseData = await response.json();
      
      // Debug: Log the API response to see what we're getting
      console.log('Escalated tickets API response:', responseData);
      console.log('Total escalated tickets from API:', responseData.pagination?.totalItems);
      console.log('Current page:', responseData.pagination?.currentPage);
      console.log('Total pages:', responseData.pagination?.totalPages);
      
      // Filter to get only escalated tickets and add usernames
      const actualEscalatedTickets = responseData.tickets.filter(ticket => ticket.escalated === true);
      
      const escalatedWithNames = await Promise.all(
        actualEscalatedTickets.map(async (ticket) => {
          const userName = await fetchNameFromId(ticket.student_id);
          return { ...ticket, userName };
        })
      );

      setEscalatedTickets(escalatedWithNames);
      
      // Calculate pagination based on actual escalated tickets count
      const actualEscalatedCount = actualEscalatedTickets.length;
      const totalEscalatedFromSummary = responseData.summary?.escalatedTickets || actualEscalatedCount;
      const calculatedTotalPages = Math.ceil(totalEscalatedFromSummary / escalatedItemsPerPage);
      
      const paginationData = {
        currentPage: escalatedCurrentPage,
        totalPages: calculatedTotalPages,
        totalItems: totalEscalatedFromSummary,
        itemsPerPage: escalatedItemsPerPage,
        hasNextPage: escalatedCurrentPage < calculatedTotalPages,
        hasPreviousPage: escalatedCurrentPage > 1
      };
      setEscalatedPagination(paginationData);
      
    } catch (error) {
      console.error("Error fetching escalated tickets:", error);
      setEscalatedTickets([]);
      setEscalatedPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: escalatedItemsPerPage,
        hasNextPage: false,
        hasPreviousPage: false
      });
    }
  };

  const fetchTickets = async () => {
    try {
      // Get the token from cookies
      const token = Cookies.get("token");

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      // Get paginated tickets with summary counts
      const response = await fetch(`${baseURL}/api/tickets?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }

      const responseData = await response.json();
      
      // Handle both old format (array) and new format (object with pagination)
      const ticketsData = responseData.tickets || responseData;
      
      // Set counts from summary if available, otherwise calculate from current data
      if (responseData.summary) {
        setTotalTickets(responseData.summary.totalTickets);
        setOpenTickets(responseData.summary.openTickets);
        setClosedTickets(responseData.summary.closedTickets);
        setTotalEscalatedTickets(responseData.summary.escalatedTickets);
      } else {
        const escalatedCount = ticketsData.filter(ticket => ticket.escalated === true).length;
        const openCount = ticketsData.filter(ticket => 
          ticket.status === 'new' || ticket.status === 'ongoing'
        ).length;
        const closedCount = ticketsData.filter(ticket => 
          ticket.status === 'resolved'
        ).length;
        
        setTotalTickets(responseData.pagination ? responseData.pagination.totalItems : ticketsData.length);
        setOpenTickets(openCount);
        setClosedTickets(closedCount);
        setTotalEscalatedTickets(escalatedCount);
      }

      // Add usernames to tickets for display (use all paginated tickets)
      const ticketsWithNames = await Promise.all(
        ticketsData.map(async (ticket) => {
          const userName = await fetchNameFromId(ticket.student_id);
          return { ...ticket, userName };
        })
      );

      setTickets(ticketsWithNames);
      
      setPagination(responseData.pagination || {
        totalItems: ticketsData.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      //setError("Could not fetch tickets. Please try again later.");
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
          backgroundColor: theme.palette.background.default, // Optional: a subtle background color
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

  const openTicket = (t) => navigate(`/ticketinfo?ticket=${t.ticket_id}`);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); 
  };

  const handleEscalatedPageChange = (pageNumber) => {
    setEscalatedCurrentPage(pageNumber);
  };

  const handleEscalatedItemsPerPageChange = (newItemsPerPage) => {
    setEscalatedItemsPerPage(newItemsPerPage);
    setEscalatedCurrentPage(1); 
  };
  

  


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
        Admin Dashboard
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
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <Avatar>
            <ArticleIcon sx={{ fontSize: "2rem" }} />
          </Avatar>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Typography
              variant="h1"
              sx={{ fontWeight: "bold", fontSize: "2rem" }}
            >
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
              {totalEscalatedTickets}
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
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: "white",
              borderRadius: 999,
              fontSize: "0.75rem",
              width: "15%",
            }}
            onClick={() => navigate("/alltickets")}
          >
            View All
          </Button>
        </div>

        {/* TICKETS */}
        <TicketsViewController
          tickets={tickets}
          defaultView="list"
          onOpenTicket={openTicket}
          header={<Typography variant="subtitle2">Latest Tickets</Typography>}
        />
        
        {/* PAGINATION */}
        <Pagination
          currentPage={currentPage}
          totalItems={pagination.totalItems}
          itemsPerPage={itemsPerPage}
          totalPages={pagination.totalPages}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </Box>

      {/* Escalated TICKET SECTION CONTAINER */}
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
            <ArticleIcon sx={{ fontSize: "2rem" }} />
          </Avatar>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Typography
              variant="h1"
              sx={{ fontWeight: "bold", fontSize: "2rem" }}
            >
              {totalEscalatedTickets}
            </Typography>
            <Typography
              variant="p"
              sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}
            >
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
            onClick={() => navigate("/escalatedtickets")}
          >
            View
          </Button>
        </div>

        {/* TICKETS */}
        <TicketsViewController
          tickets={escalatedTickets}
          defaultView="list"
          onOpenTicket={openTicket}
          header={<Typography variant="subtitle2">Escalated Tickets</Typography>}
        />
        
        {/* ESCALATED TICKETS PAGINATION */}
        {escalatedTickets.length > 0 && (
          <Pagination
            currentPage={escalatedPagination.currentPage || escalatedCurrentPage}
            totalPages={escalatedPagination.totalPages || Math.ceil(escalatedTickets.length / escalatedItemsPerPage)}
            itemsPerPage={escalatedPagination.itemsPerPage || escalatedItemsPerPage}
            totalItems={escalatedPagination.totalItems || escalatedTickets.length}
            hasNextPage={escalatedPagination.hasNextPage || false}
            hasPreviousPage={escalatedPagination.hasPreviousPage || false}
            onPageChange={handleEscalatedPageChange}
            onItemsPerPageChange={handleEscalatedItemsPerPageChange}
            itemsPerPageOptions={[5, 10, 25, 50]}
          />
        )}
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
              {totalTAs}
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

        {/* TICKETS */}
        <div
          style={{
            display: "grid", // Use grid layout for better alignment
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", // Responsive columns
            gap: "20px", // Space between cards
            justifyContent: "center", // Center-align cards
            padding: "5px", // Add padding around the grid
            maxHeight: "950px", // CHANGED HERE: Limits height to approximately 3 rows (adjust as needed)
            overflowY: "hidden",
          }}
        >
          {Object.entries(TACounts).map(([id, ta]) => (
            <InstructorCard
              key={id}
              name={ta.name || "Unknown"}
              counts={ta.counts}
              userId={id} //doesn't work when its ta.user_id ????
            />
          ))}
        </div>
      </Box>
      <Box
      sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          backgroundColor: theme.palette.background.paper,
          padding: 2.5,
          borderRadius: 1,
          flex: 1,
        }}>
        <NewChart/>
      </Box>
    </Box>
    
  );
};

export default AdminDash;