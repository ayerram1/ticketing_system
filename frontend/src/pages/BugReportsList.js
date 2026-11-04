import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

const STATUS_COLORS = {
  open: "error",
  triaged: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "default",
};

const formatLabel = (value) =>
  value
    ? value
        .toString()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "-";

export default function BugReportsList() {
  const theme = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseURL = process.env.REACT_APP_API_BASE_URL || "";

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = Cookies.get("token");
        const res = await fetch(`${baseURL}/api/bug-reports?mine=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load bug reports: ${res.status}`);
        const json = await res.json();
        setData(json.data || []);
      } catch (err) {
        setError(err.message || "Failed to load bug reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [baseURL]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.default,
        padding: 6.25,
      }}
    >
      <Typography
        variant="h1"
        sx={{ fontWeight: "bold", fontSize: "2rem", textAlign: "center", mb: 3 }}
      >
        My Bug Reports
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
          {error}
        </Typography>
      )}

      <Paper sx={{ backgroundColor: theme.palette.background.paper }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><b>Subject</b></TableCell>
              <TableCell><b>Description</b></TableCell>
              <TableCell><b>Priority</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Submitted</b></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  You haven't submitted any bug reports yet.
                </TableCell>
              </TableRow>
            )}

            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.subject}</TableCell>
                <TableCell sx={{ maxWidth: 420, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {item.description}
                </TableCell>
                <TableCell>{formatLabel(item.priority || item.severity)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={formatLabel(item.status)}
                    color={STATUS_COLORS[item.status] || "default"}
                  />
                </TableCell>
                <TableCell>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}