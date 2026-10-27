import React, { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const baseURL = process.env.REACT_APP_API_BASE_URL;
const LATEST_BATCH = "__latest__";

const BulkUploadHistory = () => {
  const [history, setHistory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(LATEST_BATCH);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const theme = useTheme();
  const token = Cookies.get("token");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (selectedBatch !== LATEST_BATCH) params.set("uploadBatchId", selectedBatch);
    return params.toString();
  }, [selectedBatch]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${baseURL}/api/bulk-upload/history?${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const data = contentType.includes("application/json")
          ? await response.json().catch(() => ({}))
          : {};
        throw new Error(data.error || "Failed to load bulk upload history.");
      }

      if (!contentType.includes("application/json")) {
        throw new Error("Bulk upload history API is not available. Restart the backend server and try again.");
      }

      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
      setBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (err) {
      console.error("Failed to load bulk upload history:", err);
      setError(err.message || "Could not load bulk upload history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [queryString]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return <em style={{ color: theme.palette.text.disabled }}>none</em>;
    }
    return value;
  };

  const activeBatch = selectedBatch === LATEST_BATCH ? batches[0] || "" : selectedBatch;

  const visibleHistory = useMemo(() => {
    return history.filter((row) => {
      if (activeBatch && row.upload_batch_id !== activeBatch) return false;
      if (row.change_type === "created" || row.change_type === "added") return false;
      if (row.entity_type === "team_member") return false;
      return true;
    });
  }, [history, activeBatch]);

  const formatFieldName = (fieldName) => {
    const labels = {
      section: "Section",
      team_id: "Team",
      sponsor_name: "Sponsor Name",
      sponsor_email: "Sponsor Email",
      name: "Student Name",
    };
    return labels[fieldName] || fieldName || "Change";
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 60px)",
        backgroundColor: theme.palette.background.default,
        padding: "20px 0",
      }}
    >
      <Box
        sx={{
          padding: 4,
          backgroundColor: theme.palette.background.paper,
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          maxWidth: "1200px",
          margin: "40px auto",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: theme.palette.text.primary }}>
            Bulk Upload Changes
          </Typography>
          <Button variant="outlined" onClick={fetchHistory} disabled={isLoading}>
            Refresh
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Upload Batch</InputLabel>
            <Select
              value={selectedBatch}
              label="Upload Batch"
              onChange={(event) => setSelectedBatch(event.target.value)}
            >
              <MenuItem value={LATEST_BATCH}>Latest upload</MenuItem>
              {batches.map((batch) => (
                <MenuItem key={batch} value={batch}>
                  {batch}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: "none", border: `1px solid ${theme.palette.divider}` }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: theme.palette.action.hover }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Person or Team</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Before</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>After</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Changed By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleHistory.length > 0 ? (
                  visibleHistory.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.changed_at)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.entity_name || row.entity_type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.change_type === "moved" ? "Moved" : "Updated"}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatFieldName(row.field_name)}</TableCell>
                      <TableCell>{formatValue(row.old_value)}</TableCell>
                      <TableCell>{formatValue(row.new_value)}</TableCell>
                      <TableCell>
                        {row.changedBy
                          ? `${row.changedBy.name} (${row.changedBy.email})`
                          : "System"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: theme.palette.text.secondary }}>
                      No changes were found for this upload.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default BulkUploadHistory;
