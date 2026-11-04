import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Collapse,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination/Pagination";

const EMAIL_TYPE_LABELS = {
  ticket_status_change: "Ticket Status Change",
  ticket_escalation: "Ticket Escalation",
  ta_ticket_status_change: "TA Ticket Status Change",
  ta_ticket_escalation: "TA Ticket Escalation",
  password_reset: "Password Reset",
  welcome: "Welcome",
  manual: "Manual",
};

const EmailLogs = () => {
  const [logs, setLogs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filters
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [emailType, setEmailType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const token = Cookies.get("token");
  const navigate = useNavigate();
  const userRole = token ? jwtDecode(token).role : null;
  const theme = useTheme();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      if (recipient) params.append("recipient", recipient);
      if (subject) params.append("subject", subject);
      if (status) params.append("status", status);
      if (emailType) params.append("emailType", emailType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/email/logs?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch email logs");

      const data = await response.json();
      setLogs(data.logs);
      setTotalItems(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching email logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, recipient, subject, status, emailType, startDate, endDate, token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearFilters = () => {
    setRecipient("");
    setSubject("");
    setStatus("");
    setEmailType("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRow(null);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setExpandedRow(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const sectionStyle = {
    backgroundColor: theme.palette.background.paper,
    borderRadius: "10px",
    border: `1px solid ${theme.palette.divider}`,
    padding: 2.5,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  };

  return (
    <Box
      sx={{
        padding: { xs: 2, md: 4 },
        maxWidth: "1400px",
        margin: "auto",
        color: theme.palette.text.primary,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
        <IconButton
          onClick={() => navigate(userRole === "developer" ? "/developerdash" : "/adminsettings")}
          sx={{ marginRight: 1, color: theme.palette.text.primary }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Email Logs
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ ...sectionStyle, marginBottom: 3 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", marginBottom: 2, color: theme.palette.text.primary }}
        >
          Filters
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            label="Recipient"
            size="small"
            value={recipient}
            onChange={(e) => { setRecipient(e.target.value); setCurrentPage(1); }}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Subject"
            size="small"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setCurrentPage(1); }}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Email Type</InputLabel>
            <Select
              value={emailType}
              label="Email Type"
              onChange={(e) => { setEmailType(e.target.value); setCurrentPage(1); }}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />

          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />

          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ height: 40 }}
          >
            Clear Filters
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Box sx={sectionStyle}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Typography
            sx={{ textAlign: "center", padding: 4, color: theme.palette.text.secondary }}
          >
            No email logs found.
          </Typography>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", width: 50 }} />
                    <TableCell sx={{ fontWeight: "bold" }}>Sent At</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Recipient</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Ticket</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      {/* Main row */}
                      <TableRow
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() =>
                          setExpandedRow(expandedRow === log.id ? null : log.id)
                        }
                      >
                        <TableCell>
                          <IconButton size="small">
                            {expandedRow === log.id ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>{formatDate(log.sent_at)}</TableCell>
                        <TableCell>
                          <Box>
                            {log.recipient_name && (
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {log.recipient_name}
                                {log.recipient_role && (
                                  <Chip
                                    label={log.recipient_role}
                                    size="small"
                                    variant="outlined"
                                    sx={{ marginLeft: 1, fontSize: "0.7rem", height: 20 }}
                                  />
                                )}
                              </Typography>
                            )}
                            <Typography
                              variant={log.recipient_name ? "caption" : "body2"}
                              sx={{ color: log.recipient_name ? theme.palette.text.secondary : "inherit" }}
                            >
                              {log.recipient}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 250,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.subject}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={EMAIL_TYPE_LABELS[log.email_type] || log.email_type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {log.ticket_id ? `#${log.ticket_id}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.status}
                            size="small"
                            color={log.status === "success" ? "success" : "error"}
                          />
                        </TableCell>
                      </TableRow>

                      {/* Expandable detail row */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{ paddingBottom: 0, paddingTop: 0, borderBottom: expandedRow === log.id ? undefined : "none" }}
                        >
                          <Collapse
                            in={expandedRow === log.id}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ margin: 2 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: "bold", marginBottom: 1 }}
                              >
                                Email Body:
                              </Typography>
                              <Box
                                sx={{
                                  backgroundColor: theme.palette.action.hover,
                                  borderRadius: 1,
                                  padding: 2,
                                  whiteSpace: "pre-wrap",
                                  fontFamily: "monospace",
                                  fontSize: "0.875rem",
                                  maxHeight: 300,
                                  overflowY: "auto",
                                }}
                              >
                                {log.body}
                              </Box>

                              {log.status === "failed" && log.error_message && (
                                <Box sx={{ marginTop: 2 }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: "bold", marginBottom: 1, color: theme.palette.error.main }}
                                  >
                                    Error Message:
                                  </Typography>
                                  <Box
                                    sx={{
                                      backgroundColor: theme.palette.error.light + "20",
                                      border: `1px solid ${theme.palette.error.light}`,
                                      borderRadius: 1,
                                      padding: 2,
                                      fontFamily: "monospace",
                                      fontSize: "0.875rem",
                                    }}
                                  >
                                    {log.error_message}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ marginTop: 2 }}>
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
                hasNextPage={currentPage < totalPages}
                hasPreviousPage={currentPage > 1}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default EmailLogs;
