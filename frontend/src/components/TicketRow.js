// src/components/TicketRow.js
import React from "react";
import { Avatar, Chip, Typography, IconButton, Stack, Box, Tooltip, Checkbox } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { generateTicketNumber } from "../constants/IssueTypes";
import { formatTicketCreationDate } from "../utils/ticketDateRange";

const statusChip = (s = "unknown") => {
  const m = {
    ongoing:   { label: "Ongoing",   sx: { bgcolor: "#A0C0F0", color: "#1965D8" } },
    //escalated: { label: "Escalated", sx: { bgcolor: "#A9CDEB", color: "#326D94" } },
    new:       { label: "New",       sx: { bgcolor: "#F89795", color: "#D00505" } },
    resolved:  { label: "Resolved",  sx: { bgcolor: "#ADE1BE", color: "#1C741F" } },
    unknown:   { label: "Unknown",   sx: { bgcolor: "#D3D3D3", color: "#000" } },
  };
  return <Chip size="small" {...(m[(s || "").toLowerCase()] || m.unknown)} />;
};

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "??";
  const a = parts[0][0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

export default function TicketRow({ ticket, onOpen, escalated, showCheckboxes, selectedCheckboxes, onToggleSelect }) {
  const {
    ticket_id,
    issue_type,
    issue_description,
    status,
    userName,
    student_name,
    teamName,
    team_name,
    sponsor_name,
    created_at,
    updated_at,
  } = ticket;

  // Handle different field names for team data
  const displayTeamName = teamName || team_name || "No Team";
  const displaySponsorName = sponsor_name || "No Sponsor";


  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => {
        if (showCheckboxes) {
          onToggleSelect?.(ticket_id ?? ticket.id);
        } else {
          onOpen?.(ticket);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (showCheckboxes) {
            onToggleSelect?.(ticket_id ?? ticket.id);
          } else {
            onOpen?.(ticket);
          }
        }
      }}
      sx={{
        display: "grid",
        gridTemplateColumns: showCheckboxes ? "40px 30px 0px 1fr 1fr 1fr 2fr 100px 100px 100px" : "30px 0px 1fr 1fr 1fr 2fr 100px 100px 100px",
        gap: 2,
        px: 2,
        py: 1.5,
        alignItems: "center",
        borderBottom: "1px solid",
        borderColor: "divider",
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
        minHeight: 56
      }}
      aria-label={`Open ticket for ${userName}`}
    >
      {/*Checkbox Column*/}      
        {showCheckboxes && (
          <span>
            <Checkbox
              size="small"
              checked={selectedCheckboxes}
              onClick={(e) => e.stopPropagation()} /* prevent row click */
              onChange={() => onToggleSelect?.(ticket_id ?? ticket.id)}
            />
          </span>
        )}

      {/* Avatar Column */}
      <Avatar sx={{ width: 32, height: 32 }}>{initials(userName)}</Avatar>
      
      <Stack spacing={0.25} sx={{ minWidth: 0 }}></Stack>

      {/* Owner Name Column */}
      <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" fontWeight={600} noWrap title={userName}>
          {userName || student_name}
        </Typography>
        {escalated && (
          <Chip 
            label="Escalated"
            size="small"
            sx={{ 
              bgcolor: "#D00505", 
              color: "white", 
              fontSize: "0.65rem", 
              height: "16px", 
              fontWeight: "bold",
              mt: 0.5
            }}
          />
        )}
      </Box>

      {/* Team Column */}
      <Typography variant="body2" noWrap title={displayTeamName} sx={{ color: "text.primary", textAlign: "center" }}>
        {displayTeamName}
      </Typography>

      {/* Sponsor Column */}
      <Typography variant="body2" noWrap title={displaySponsorName} sx={{ color: "text.primary", textAlign: "center" }}>
        {displaySponsorName}
      </Typography>

      {/* Description Column */}
      <Typography 
        variant="body2" 
        color="text.secondary"
        noWrap
        title={issue_description}
        sx={{ minWidth: 0, textAlign: "center" }}
      >
        {issue_description}
      </Typography>

      {/* Ticket Number Column */}
      <Typography 
        variant="body2" 
        fontWeight={600} 
        sx={{ 
          color: "primary.main",
          fontFamily: "monospace",
          whiteSpace: "nowrap",
          textAlign: "center"
        }}
      >
        {generateTicketNumber(issue_type, ticket_id)}
      </Typography>

      {/* Created Date Column */}
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ whiteSpace: "nowrap", minWidth: 80, textAlign: "center" }}
      >
        {formatTicketCreationDate(created_at)}
      </Typography>

      {/* Status Column */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {statusChip(status)}
      </Box>
    </Box>
  );
}
