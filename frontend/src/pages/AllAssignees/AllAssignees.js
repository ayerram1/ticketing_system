import { Button, CircularProgress, TextField, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import InstructorCard from "../../components/InstructorCard";
import StudentInstructorCard from "../../components/StudentInstructorCard";
import { jwtDecode } from "jwt-decode";
const baseURL = process.env.REACT_APP_API_BASE_URL;

const AllAssignees = () => {
  const theme = useTheme();
  const [tas, setTAs] = useState([]);
  const [filteredTAs, setFilteredTAs] = useState([]);
  const [graders, setGraders] = useState([]);
  const [filteredGraders, setFilteredGraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [taCounts, setTACounts] = useState({});
  const [taWorkloads, setTAWorkloads] = useState({});
  const [graderCounts, setGraderCounts] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedFilters = sessionStorage.getItem('allAssignees_filters');
    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      // restore search filter
      setSearch(filters.search || "");
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const filters = {
      search,
    };
    //save search filter to sessionStorage if it changes
    sessionStorage.setItem('allAssignees_filters', JSON.stringify(filters));
  }, [search, isInitialized]);

  useEffect(() => {
    // Get user role from token
    const token = Cookies.get("token");
    if (token) {
      const decodedToken = jwtDecode(token);
      setUserRole(decodedToken.role);
    }
    fetchTAs();
    fetchGraders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tas, graders, search]);

  const fetchTAs = async () => {
    try {
      const token = Cookies.get("token");
      const decodedToken = jwtDecode(token);

      const taResponse = await fetch(`${baseURL}/api/users/role/TA`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!taResponse.ok) {
        throw new Error("Failed to fetch TAs");
      }

      const tasData = await taResponse.json();

      // All roles see all TAs - no filtering needed
      setTAs(tasData);
      setFilteredTAs(tasData);

      // The workload endpoint is intentionally admin-only. Other page viewers
      // retain the existing, visibility-filtered status counts.
      if (decodedToken.role === "admin") {
        const workloadResponse = await fetch(
          `${baseURL}/api/ticketassignments/ticketCountsByTA`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!workloadResponse.ok) {
          throw new Error("Failed to fetch TA ticket workloads");
        }

        const workloads = await workloadResponse.json();
        setTAWorkloads(
          workloads.reduce((workloadsByUserId, workload) => {
            workloadsByUserId[workload.user_id] = {
              openTickets: workload.open_tickets,
              totalTickets: workload.total_tickets,
            };
            return workloadsByUserId;
          }, {})
        );
      } else {
        await fetchAssigneeCounts(tasData, setTACounts);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching TAs:", error);
      setLoading(false);
    }
  };

  const fetchGraders = async () => {
    try {
      const token = Cookies.get("token");

      const response = await fetch(`${baseURL}/api/users/role/grader`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch graders");
      }

      let gradersData = await response.json();

      setGraders(gradersData);
      setFilteredGraders(gradersData);
      await fetchAssigneeCounts(gradersData, setGraderCounts);
    } catch (error) {
      console.error("Error fetching graders:", error);
    }
  };

  const fetchAssigneeCounts = async (usersData, setCountsFn) => {
    try {
      const token = Cookies.get("token");
      const decodedToken = jwtDecode(token);
      const currentUserRole = decodedToken.role;

      // Use role-based ticket assignment endpoint for each user
      const ticketCounts = {};

      // Initialize counts for all users
      usersData.forEach((user) => {
        ticketCounts[user.user_id] = {
          name: user.name,
          counts: { new: 0, ongoing: 0, resolved: 0 },
        };
      });

      // Fetch assignments for each user using the role-filtered endpoint
      const countPromises = usersData.map(async (user) => {
        try {
          // Use assigned-to-me endpoint if staff member is viewing their own stats
          if ((currentUserRole === 'TA' || currentUserRole === 'grader') && user.user_id === decodedToken.id) {
            const response = await fetch(`${baseURL}/api/tickets/assigned-to-me`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              // Use summary counts from the endpoint
              ticketCounts[user.user_id].counts = {
                new: data.summary.openTickets - data.tickets.filter(t => t.status === 'ongoing').length,
                ongoing: data.tickets.filter(t => t.status === 'ongoing').length,
                resolved: data.summary.closedTickets,
              };
            }
          } else if ((currentUserRole === 'TA' || currentUserRole === 'grader') && user.user_id !== decodedToken.id) {
            // For TAs/graders viewing others, only show shared tickets
            const [assignmentsResponse, myAssignmentsResponse] = await Promise.all([
              fetch(`${baseURL}/api/ticketassignments/users/${user.user_id}`, {
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

            if (assignmentsResponse.ok && myAssignmentsResponse.ok) {
              const [otherAssignments, myAssignments] = await Promise.all([
                assignmentsResponse.json(),
                myAssignmentsResponse.json()
              ]);

              // Find shared ticket IDs
              const myTicketIds = myAssignments.map(a => a.ticket_id);
              const sharedTicketIds = otherAssignments
                .filter(a => myTicketIds.includes(a.ticket_id))
                .map(a => a.ticket_id);

              // Get shared ticket details
              const sharedTicketPromises = sharedTicketIds.map(async (ticketId) => {
                try {
                  const ticketResponse = await fetch(`${baseURL}/api/tickets/${ticketId}`, {
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
                  console.error(`Error fetching shared ticket ${ticketId}:`, err);
                }
                return null;
              });

              const sharedTickets = (await Promise.all(sharedTicketPromises)).filter(Boolean);

              // Count shared tickets by status
              sharedTickets.forEach((ticket) => {
                if (ticket.status === "new") {
                  ticketCounts[user.user_id].counts.new += 1;
                } else if (ticket.status === "ongoing") {
                  ticketCounts[user.user_id].counts.ongoing += 1;
                } else if (ticket.status === "resolved") {
                  ticketCounts[user.user_id].counts.resolved += 1;
                }
              });
            }
          } else {
            // Use existing logic for admins and students
            const assignmentsResponse = await fetch(
              `${baseURL}/api/ticketassignments/users/${user.user_id}`,
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

              // Get ticket details for each assignment
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

              // Count by status
              tickets.forEach((ticket) => {
                if (ticket.status === "new") {
                  ticketCounts[user.user_id].counts.new += 1;
                } else if (ticket.status === "ongoing") {
                  ticketCounts[user.user_id].counts.ongoing += 1;
                } else if (ticket.status === "resolved") {
                  ticketCounts[user.user_id].counts.resolved += 1;
                }
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching assignments for user ${user.user_id}:`, err);
        }
      });

      await Promise.all(countPromises);
      setCountsFn(ticketCounts);
    } catch (err) {
      console.error("Error fetching ticket counts:", err);
    }
  };

  const applyFilters = () => {
    const searchLower = search.toLowerCase();
    const filteredTAList = tas.filter((ta) =>
      ta.name.toLowerCase().includes(searchLower)
    );
    const filteredGraderList = graders.filter((grader) =>
      grader.name.toLowerCase().includes(searchLower)
    );
    setFilteredTAs(filteredTAList);
    setFilteredGraders(filteredGraderList);
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
          gap: "20px",
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
        {userRole === "student" ? "Teaching Assistants & Graders" : "All Assignees"}
      </Typography>
      {userRole === "student" && (
        <Typography
          variant="subtitle1"
          sx={{
            fontSize: "1rem",
            textAlign: "center",
            color: theme.palette.text.secondary,
            marginTop: -4
          }}
        >
          Find office hours and contact information for your course TAs and graders
        </Typography>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <TextField
          label={userRole === "student" ? "Search TAs & Graders" : "Search Assignees"}
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: "300px" }}
          placeholder="Search by name..."
        />
        <Button
          variant="outlined"
          onClick={() => setSearch("")}
          sx={{ color: theme.palette.primary.main, borderColor: theme.palette.primary.main }}
        >
          Clear Search
        </Button>
      </div>

      {/* Teaching Assistants Section */}
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", fontSize: "1.4rem" }}
      >
        Teaching Assistants
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: userRole === "student"
            ? "repeat(auto-fill, minmax(280px, 1fr))"
            : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 2.5,
          maxHeight: "70vh",
          overflowY: "auto",
          padding: 0.625,
          border: 1,
          borderColor: theme.palette.divider,
          borderRadius: 1,
        }}
      >
        {filteredTAs.length > 0 ? (
          filteredTAs.map((ta) => (
            userRole === "student" ? (
              <StudentInstructorCard
                key={ta.user_id}
                name={ta.name}
                userId={ta.user_id}
                roleLabel="Teaching Assistant"
              />
            ) : (
              <InstructorCard
                key={ta.user_id}
                name={ta.name}
                counts={taCounts[ta.user_id]?.counts || {new:0, ongoing:0, resolved:0}}
                workload={userRole === "admin" ? taWorkloads[ta.user_id] : undefined}
                userId={ta.user_id}
                roleLabel="UGTA"
              />
            )
          ))
        ) : (
          <Typography
            variant="body1"
            sx={{ color: theme.palette.text.secondary, padding: 2, fontStyle: "italic" }}
          >
            No teaching assistants found.
          </Typography>
        )}
      </Box>

      {/* Graders Section */}
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", fontSize: "1.4rem" }}
      >
        Graders
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: userRole === "student"
            ? "repeat(auto-fill, minmax(280px, 1fr))"
            : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 2.5,
          maxHeight: "70vh",
          overflowY: "auto",
          padding: 0.625,
          border: 1,
          borderColor: theme.palette.divider,
          borderRadius: 1,
        }}
      >
        {filteredGraders.length > 0 ? (
          filteredGraders.map((grader) => (
            userRole === "student" ? (
              <StudentInstructorCard
                key={grader.user_id}
                name={grader.name}
                userId={grader.user_id}
                roleLabel="Grader"
              />
            ) : (
              <InstructorCard
                key={grader.user_id}
                name={grader.name}
                counts={graderCounts[grader.user_id]?.counts || {new:0, ongoing:0, resolved:0}}
                userId={grader.user_id}
                roleLabel="Grader"
              />
            )
          ))
        ) : (
          <Typography
            variant="body1"
            sx={{ color: theme.palette.text.secondary, padding: 2, fontStyle: "italic" }}
          >
            No graders found.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AllAssignees;
