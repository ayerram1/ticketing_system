import { Avatar, Button, Typography, Box, Chip, Badge } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
const baseURL = process.env.REACT_APP_API_BASE_URL;



function stringAvatar(name) {
  if (!name || typeof name !== "string") {
    return {
      sx: { bgcolor: "#000" },
      children: "?"
    };
  }
  const nameParts = name.split(" ");
  const initials = nameParts[0]
    ? (nameParts[1] ? `${nameParts[0][0]}${nameParts[1][0]}` : nameParts[0][0])
    : "?";
  return {
    sx: { bgcolor: stringToColor(name) },
    children: initials.toUpperCase(),
  };
}

function stringToColor(string) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (i = 0; i < 3; i += 1) {
    let value = (hash >> (i * 8)) & 0xff;
    if (value > 200) value -= 55;
    if (value < 55) value += 55;
    if (i === 0 && value > 180) value -= 40;
    if (i === 1 && value > 180) value -= 40;
    if (i === 2 && value > 180) value -= 40;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

const defaultProps = {
  name: "Unknown Name",
  counts: {
    new: -1,
    ongoing: -1,
    resolved: -1,
  },
  userId: "1",
};

const InstructorCard = ({
  name = defaultProps.name,
  counts = defaultProps.counts,
  workload,
  userId = defaultProps.userId,
  roleLabel = "UGTA",
}) => {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [officeHours, setOfficeHours] = useState({
    monday: {start: '', end: ''},
    tuesday: {start: '', end: ''},
    wednesday: {start: '', end: ''},
    thursday: {start: '', end: ''},
    friday: {start: '', end: ''},
    saturday: {start: '', end: ''},
    sunday: {start: '', end: ''}
  });



  let navigate = useNavigate();

  useEffect(() => {
    fetchUserDetails();
    fetchOfficeHours();
  }, [userId]);

  const fetchOfficeHours = async () => {
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${baseURL}/api/officehours/users/${userId}`,{
        headers: {
        'Authorization': `Bearer ${token}`,
      },
      });
      
      const data = await response.json();
      
      if (response.ok && data.office_hours) {
        setOfficeHours(data.office_hours);
      }
      
    } catch (err) {
      console.error("error fetching office hours:", err);
    }
  };

  function handleDisplayTime(time) {
    if (time) {
      let hrs = parseInt(time.split(':')[0]), mins = time.split(':')[1];
      if (hrs > 12) {
        return (hrs - 12) + ':' + mins + ' PM';
      } else if (hrs === 12) {
        return '12:' + mins + ' PM';
      } else if (hrs === 0) {
        return '12:' + mins + ' AM';
      } else {
        return hrs + ':' + mins + ' AM';
      }
    }
    return '';
  }

  const getActiveOfficeHours = () => {
    const dayAbbreviations = {
      monday: 'Mon',
      tuesday: 'Tue', 
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };

    const daysInOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    const activeHours = [];
    daysInOrder.forEach(day => {
      const hours = officeHours[day];
      
      if (hours && hours.start && hours.end && hours.start !== '' && hours.end !== '') {
        const processedHour = {
          day: dayAbbreviations[day],
          start: handleDisplayTime(hours.start),
          end: handleDisplayTime(hours.end)
        };
        activeHours.push(processedHour);
      }
    });

    return activeHours; 
  };

  const getAvailabilityStatus = () => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = officeHours[currentDay];
    if (todayHours && todayHours.start && todayHours.end) {
      const [startHour, startMin] = todayHours.start.split(':').map(Number);
      const [endHour, endMin] = todayHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return { status: 'available', label: 'Available Now', color: 'success' };
      }
    }
    
    if (todayHours && todayHours.start && todayHours.end) {
      const [startHour, startMin] = todayHours.start.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      if (currentTime < startTime) {
        return { 
          status: 'later', 
          label: `Available at ${handleDisplayTime(todayHours.start)}`, 
          color: 'warning' 
        };
      }
    }
    
    return { status: 'offline', label: 'Not Available', color: 'default' };
  };

  const getTotalActiveTickets = () => {
    if (workload) {
      return workload.openTickets;
    }
    return counts.new + counts.ongoing;
  };

  const onViewProfile = () => {
    navigate(`/instructorprofile?user=${userId}`)
  }

  const fetchUserDetails = async () => {
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${baseURL}/api/users/${userId}`, {
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
      setUser(taData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching TA details:", error);
      setLoading(false);
    }

  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: theme.palette.background.paper,
        padding: 2.5,
        borderRadius: 1,
        flex: 1,
        gap: 1.25,
        width: "100%",
        height: "370px",
        overflow: "hidden",
        boxSizing: "border-box",
        border: 1,
        borderColor: theme.palette.divider,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative"
        }}
      >
        <Avatar {...stringAvatar(name)} />
        
        {/* Status Indicator */}
        <Box
          sx={{
            position: "absolute",
            top: -19.5,
            right: -18,
            zIndex: 2
          }}
        >
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: "0.7rem !important" }} />}
            label={getAvailabilityStatus().label}
            color={getAvailabilityStatus().color}
            size="small"
            sx={{
              fontSize: "0.7rem",
              height: "20px",
              "& .MuiChip-label": {
                padding: "0 6px"
              }
            }}
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: "1rem",
              color: theme.palette.text.primary,
              fontWeight: "bold",
              textAlign: "right",
              marginBottom: 0.5
            }}
          >
            {name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}
            >
              {roleLabel}
            </Typography>
            <Badge
              badgeContent={getTotalActiveTickets()}
              color={getTotalActiveTickets() > 5 ? "error" : "primary"}
              sx={{ marginLeft: 1 }}
            >
              <AssignmentIcon sx={{ fontSize: "1rem", color: theme.palette.text.secondary }} />
            </Badge>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flex: 1,
          minHeight: 0, 
        }}
      >
        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 1, 
            backgroundColor: theme.palette.background.default,
            padding: 1.5,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: "bold", 
              color: theme.palette.text.primary,
              display: "flex",
              alignItems: "center",
              gap: 0.5
            }}
          >
            <AssignmentIcon sx={{ fontSize: "0.9rem" }} />
            Tickets
          </Typography>
          
          {workload ? (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 2, justifyContent:"center" }}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1965D8", fontSize: "1.25rem" }}>
                  {workload.openTickets}
                </Typography>
                <Typography variant="caption" sx={{ color: "#1965D8", fontSize: "0.7rem" }}>
                  Open
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: theme.palette.text.secondary, fontSize: "1rem" }}>
                  {workload.totalTickets}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: "0.7rem" }}>
                  Total
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 2, justifyContent:"center" }}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#D00505", fontSize: "1rem" }}>
                  {counts.new}
                </Typography>
                <Typography variant="caption" sx={{ color: "#D00505", fontSize: "0.7rem" }}>
                  New
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1965D8", fontSize: "1rem" }}>
                  {counts.ongoing}
                </Typography>
                <Typography variant="caption" sx={{ color: "#1965D8", fontSize: "0.7rem" }}>
                  Active
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1C741F", fontSize: "1rem" }}>
                  {counts.resolved}
                </Typography>
                <Typography variant="caption" sx={{ color: "#1C741F", fontSize: "0.7rem" }}>
                  Done
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: "column",
            backgroundColor: theme.palette.background.default,
            padding: 1.5,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            flex: 1,
            minHeight: 0,
            overflow: "hidden"
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              color: theme.palette.text.primary, 
              fontSize: "0.85rem",
              fontWeight: "bold",
              marginBottom: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5
            }}
          >
            <AccessTimeIcon sx={{ fontSize: "0.9rem" }} />
            Office Hours
          </Typography>
          
          <Box sx={{ 
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            paddingLeft: 0.5,
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            paddingRight:0.5
          }}>
            {getActiveOfficeHours().length > 0 ? (
              getActiveOfficeHours().map((hours, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.primary,
                      fontSize: "0.8rem",
                      fontWeight: "medium",
                      minWidth: "35px"
                    }}
                  >
                    {hours.day}:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: "0.8rem",
                    }}
                  >
                    {hours.start} - {hours.end}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme.palette.text.disabled, 
                  fontSize: "0.8rem",
                  fontStyle: "italic",
                  paddingLeft: 0.5
                }}
              >
                No office hours set
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Button
        variant="contained"
        disableElevation
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: "white",
          borderRadius: 999,
          fontSize: "0.75rem",
          width: "fit-content",
          alignSelf: "flex-end",
        }} 
        onClick={onViewProfile}
      >
        View Profile
      </Button>
    </Box>
  );
};

export default InstructorCard;
