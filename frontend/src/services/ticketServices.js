import Cookies from "js-cookie"; 
import { jwtDecode } from "jwt-decode"; 
 

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3301";

// Helper function for fetch with token
const apiFetch = async (url, method = "GET", body = null) => {
  const token = Cookies.get("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "API request failed.");
  }

  return response.json();
};

// Fetch all tickets with pagination
export const fetchAllTickets = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });
  
  const url = `${baseURL}/api/tickets?${params}`;
  return apiFetch(url);
};

// Fetch tickets by user ID with pagination
export const fetchTicketsByUserId = async (page = 1, limit = 10, filters = {}) => {
  const token = Cookies.get("token");
  if (!token) throw new Error("No token found");

  const decodedToken = jwtDecode(token);
  const userId = decodedToken.id; // Extract user ID from JWT

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });

  const url = `${baseURL}/api/tickets/user/${userId}?${params}`;
  return apiFetch(url);
};

// Fetch tickets assigned to current user (for instructors/TAs)
export const fetchAssignedTickets = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });
  
  const url = `${baseURL}/api/tickets/assigned-to-me?${params}`;
  return apiFetch(url);
};

export const fetchTicketAssignmentsByUserId = async () => {
  const token = Cookies.get("token");
  if (!token) throw new Error("No token found");

  const decodedToken = jwtDecode(token);
  const userId = decodedToken.id; // Extract user ID from JWT

  const url = `${baseURL}/api/ticketassignments/users/${userId}`;
  return apiFetch(url);

}

// Fetch tickets by TA ID
export const fetchTicketsByTAId = async () => {
  const token = Cookies.get("token");
  if (!token) throw new Error("No token found");

  const decodedToken = jwtDecode(token);
  const userId = decodedToken.id; // Extract user ID from JWT

  const url = `${baseURL}/api/tickets/ta/${taId}`;
  return apiFetch(url);
};

// Fetch ticket by ticket ID
export const fetchTicketById = async (ticketId) => {
  const url = `${baseURL}/api/tickets/${ticketId}`;
  return apiFetch(url);
};

// Fetch all ticket data (detailed view)
export const fetchAllTicketDataById = async (ticketId) => {
  const url = `${baseURL}/api/tickets/info/${ticketId}`;
  return apiFetch(url);
};

//Fetch all TAs
export const fetchAllTAs = async () => {
  const url = `${baseURL}/api/users/role/TA`;
  return apiFetch(url);
};

//Fetch all Teams
export const fetchAllTeams = async () => {
  const url = `${baseURL}/api/teams`;
  return apiFetch(url);
}

// Fetch TA assignments by ticket ID
export const fetchTAsByTicketId = async (ticketId) => {
  const url = `${baseURL}/api/ticketassignments/ticket/${ticketId}`;
  return apiFetch(url);
};

//
export const handleSaveEdit = async (ticketId) => {
  const url = `${baseURL}/api/tickets/${ticketId}/edit`;
  const body = { status: "Update" }; 
  return apiFetch(url, "PUT", body);
};

//
export const handleStatusChange = async (ticketId) => {
  const url = `${baseURL}/api/tickets/${ticketId}/status`;
  const body = { status: newStatus };
  return apiFetch(url, "PUT", body);
};

//Update a ticket's TA assignment
export const handleTAUpdate = async (ticketId, oldTAID, newTAID) => {
  const url = `${baseURL}/api/ticketassignments/ticket/${ticketId}/assignment/${oldTAID}`;
  const body  = { new_user_id: newTAID };
  return apiFetch(url, "PUT", body);
};

//Add new TAs (Note: uses default password)
export const addTA = async (newTAName, newTAEmail) => {
  const url = `${baseURL}/api/users`;
  const body = {
    name: newTAName,
    email: newTAEmail,
    role: "TA",
    password: "password", // Default password
  };
  return apiFetch(url, "POST", body);
};

//Add new Teams
export const addTeam = async (newTeamName) => {
  const url = `${baseURL}/api/teams`;
  const body = { team_name: newTeamName };
  return apiFetch(url, "POST", body);
};

//Delete TA
export const deleteTA = async (taId) => {
  const url = `${baseURL}/api/users/${taId}`;
  return apiFetch(url, "DELETE");
};

//Delete Team
export const deleteTeam = async (teamId) => {
  const url = `${baseURL}/api/teams/${teamId}`;
  return apiFetch(url, "DELETE");
};

export const fetchTaTicketById = async (ticketId) => {
    const url = `${baseURL}/api/tatickets/${ticketId}`;
    return apiFetch(url);
};

export const fetchTaTicketAssignmentsByUserId = async () => {
    const token = Cookies.get("token");
    if (!token) throw new Error("No token found");

    const decodedToken = jwtDecode(token);
    const userId = decodedToken.id; // Extract user ID from JWT

    const url = `${baseURL}/api/taticketassignments/users/${userId}`;
    return apiFetch(url);

}

// Fetch tickets by user ID
export const fetchTaTicketsByUserId = async () => {
    const token = Cookies.get("token");
    if (!token) throw new Error("No token found");

    const decodedToken = jwtDecode(token);
    const userId = decodedToken.id; // Extract user ID from JWT

    const url = `${baseURL}/api/tatickets/user/${userId}`;
    return apiFetch(url);
};

// Check if current user can edit a specific ticket based on assignments
export const canUserEditTicket = async (ticketId) => {
  try {
    const token = Cookies.get("token");
    if (!token) return false;

    const decodedToken = jwtDecode(token);
    
    // Admins can always edit
    if (decodedToken.role === "admin") {
      return true;
    }
    
    // For TAs, check if they are assigned to the ticket
    if (decodedToken.role === "TA") {
      const assignments = await fetchTicketAssignmentsByUserId();
      return assignments.some(assignment => assignment.ticket_id === parseInt(ticketId));
    }
    
    return false;
  } catch (error) {
    console.error("Error checking ticket edit permissions:", error);
    return false;
  }
};
