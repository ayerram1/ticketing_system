import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  MenuItem,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import "./DeveloperDash.css";
import SideBar from "../../components/SideBar/SideBar";
import TopBar from "../../components/TopBar/TopBar"

const STATUS_OPTIONS = ["open", "triaged", "in_progress", "resolved"];
const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"];

const statusChipStyles = {
  open: { backgroundColor: "#FDE8E7", color: "#B42318", label: "Open" },
  triaged: { backgroundColor: "#FFF4D6", color: "#B26A00", label: "Triaged" },
  in_progress: { backgroundColor: "#A0C0F0", color: "#1965D8", label: "In Progress" },
  resolved: { backgroundColor: "#ADE1BE", color: "#1C741F", label: "Resolved" },
  closed: { backgroundColor: "#D9D9D9", color: "#4B4B4B", label: "Closed" },
  unknown: { backgroundColor: "#D3D3D3", color: "#000000", label: "Unknown" },
};

const severityChipStyles = {
  low: { backgroundColor: "#E8F4EA", color: "#2E7D32", label: "Low" },
  medium: { backgroundColor: "#FFF4D6", color: "#B26A00", label: "Medium" },
  high: { backgroundColor: "#FFE0DB", color: "#C2410C", label: "High" },
  critical: { backgroundColor: "#FFD6D6", color: "#B91C1C", label: "Critical" },
  unknown: { backgroundColor: "#D3D3D3", color: "#000000", label: "Unknown" },
};

function stringToColor(string = "") {
  let hash = 0;

  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (let i = 0; i < 3; i += 1) {
    let value = (hash >> (i * 8)) & 0xff;
    if (value > 200) value -= 55;
    if (value < 55) value += 55;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

function stringAvatar(name = "Bug Report") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "B";
  const second = parts[1]?.[0] || "R";

  return {
    sx: { bgcolor: stringToColor(name) },
    children: `${first}${second}`,
  };
}

const formatEnumLabel = (value) =>
  value
    ? value
        .toString()
        .replaceAll("_", " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Unknown";

const getReporterDisplayName = (report, reporterNames) =>
  report?.reporter?.name ||
  reporterNames[report?.reporter_id] ||
  (report?.reporter_id != null ? "Loading..." : "-");

const formatDisplayValue = (value) => {
  if (value == null || value === "") return "-";
  return formatEnumLabel(value);
};

const BugReportCard = ({
  report,
  draftStatus,
  draftSeverity,
  saveError,
  saveSuccess,
  isSaving,
  onClose,
  onDraftChange,
  onSave,
  formatCreatedAt,
  reporterNames,
}) => {
  const theme = useTheme();

  if (!report) return null;

  const normalizedStatus = (draftStatus || report.status || "unknown").toLowerCase();
  const normalizedSeverity = (draftSeverity || report.severity || "unknown").toLowerCase();
  const statusStyle = statusChipStyles[normalizedStatus] || statusChipStyles.unknown;
  const severityStyle =
    severityChipStyles[normalizedSeverity] || severityChipStyles.unknown;
  const isClosed = (report.status || "").toLowerCase() === "closed";
  const hasChanges =
    draftStatus !== (report.status || "open") ||
    draftSeverity !== (report.severity || "low");

  return (
    <Modal open={Boolean(report)} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 560,
          maxWidth: "92%",
        }}
      >
        <Box
          className="developer-report-modal-enter"
          sx={{
            maxHeight: "85vh",
            overflow: "auto",
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            position: "relative",
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              minWidth: "32px",
              minHeight: "32px",
              borderRadius: "50%",
              backgroundColor: theme.palette.primary.main,
              color: "white",
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            &times;
          </Button>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Avatar {...stringAvatar(report.subject || "Bug Report")} />
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: theme.palette.text.secondary, letterSpacing: 1.2 }}
                >
                  Bug Report
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {report.subject || "Untitled bug report"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            {saveSuccess && <Alert severity="success">{saveSuccess}</Alert>}
            {isClosed && (
              <Alert severity="info">
                This bug report is closed. Status and severity are locked.
              </Alert>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Status:
              </Typography>
              <Chip label={statusStyle.label} size="small" sx={statusStyle} />
            </Box>

            <TextField
              select
              label="Update Status"
              value={draftStatus}
              onChange={(event) => onDraftChange("status", event.target.value)}
              size="small"
              fullWidth
              disabled={isClosed}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {formatEnumLabel(option)}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Severity:
              </Typography>
              <Chip label={severityStyle.label} size="small" sx={severityStyle} />
            </Box>

            <TextField
              select
              label="Update Severity"
              value={draftSeverity}
              onChange={(event) => onDraftChange("severity", event.target.value)}
              size="small"
              fullWidth
              disabled={isClosed}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {formatEnumLabel(option)}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                Description
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  lineHeight: 1.6,
                  p: 2,
                  borderRadius: 1.5,
                  backgroundColor: "#f6f6f6",
                  border: "1px solid #e0e0e0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {report.description || "No description provided."}
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Reporter
                </Typography>
                <Typography variant="body2">
                  {getReporterDisplayName(report, reporterNames)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Created
                </Typography>
                <Typography variant="body2">
                  {formatCreatedAt(report.createdAt || report.created_at)}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              disableElevation
              disabled={isClosed || !hasChanges || isSaving}
              onClick={onSave}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: "white",
                borderRadius: 999,
                fontSize: "0.8rem",
                width: "fit-content",
                alignSelf: "flex-end",
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

const DeveloperDash = () => {
  const [bugReports, setBugReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reporterNames, setReporterNames] = useState({});
  const [draftStatus, setDraftStatus] = useState("");
  const [draftSeverity, setDraftSeverity] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBugReports = async () => {
      setLoading(true);
      setError("");

      try {
        const token = Cookies.get("token");
        if (!token) {
          throw new Error("No token found. Please log in again.");
        }

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL || ""}/api/bug-reports`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load bug reports: ${response.status}`);
        }

        const payload = await response.json();
        const reports = Array.isArray(payload?.data) ? payload.data : [];
        setBugReports(reports);

        const reporterIds = [
          ...new Set(
            reports
              .map((report) => report.reporter_id)
              .filter((reporterId) => reporterId != null)
          ),
        ];

        const namesById = {};
        await Promise.all(
          reporterIds.map(async (reporterId) => {
            try {
              const userResponse = await fetch(
                `${process.env.REACT_APP_API_BASE_URL || ""}/api/users/${reporterId}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  credentials: "include",
                }
              );

              if (!userResponse.ok) {
                return;
              }

              const userPayload = await userResponse.json();
              if (userPayload?.name) {
                namesById[reporterId] = userPayload.name;
              }
            } catch (userError) {
              console.error(`Failed to load reporter ${reporterId}:`, userError);
            }
          })
        );

        setReporterNames(namesById);
      } catch (err) {
        setError(err.message || "Failed to load bug reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchBugReports();
  }, []);

  const formatCreatedAt = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setDraftStatus(report.status || "open");
    setDraftSeverity(report.severity || "low");
    setSaveError("");
    setSaveSuccess("");
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
    setDraftStatus("");
    setDraftSeverity("");
    setSaveError("");
    setSaveSuccess("");
    setIsSaving(false);
  };

  const handleDraftChange = (field, value) => {
    setSaveError("");
    setSaveSuccess("");

    if (field === "status") {
      setDraftStatus(value);
      return;
    }

    if (field === "severity") {
      setDraftSeverity(value);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedReport?.id) return;

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No token found. Please log in again.");
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL || ""}/api/bug-reports/${selectedReport.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            status: draftStatus,
            severity: draftSeverity,
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error || payload?.errors?.join(", ") || `Failed to save bug report: ${response.status}`
        );
      }

      const updatedReport = payload.data;
      setBugReports((currentReports) =>
        currentReports.map((report) =>
          report.id === updatedReport.id ? updatedReport : report
        )
      );
      setSelectedReport(updatedReport);
      setDraftStatus(updatedReport.status || "open");
      setDraftSeverity(updatedReport.severity || "low");
      setSaveSuccess("Bug report updated.");
    } catch (err) {
      setSaveError(err.message || "Failed to update bug report.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="developer-shell">
      <SideBar />
    
    <div className="developer-content">
      <TopBar logoutOnly />

      <main className="developer-main">
        <h1>Developer Dashboard</h1>

        <section className="developer-report-card">
          <h2>Bug Reports</h2>
          <p>Current Bugs/Issues with the ticketing system.</p>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <table>
            <thead>
              <tr>
                <th>subject</th>
                <th>status</th>
                <th>severity</th>
                <th>reporter</th>
                <th>createdAt</th>
              </tr>
            </thead>

            <tbody>
              {!loading && bugReports.length === 0 && (
                <tr>
                  <td colSpan="5" className="developer-empty-row">
                    No bug reports loaded yet.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="5" className="developer-empty-row">
                    Loading bug reports...
                  </td>
                </tr>
              )}

              {!loading &&
                bugReports.map((report, index) => (
                  <tr
                    key={report.id}
                    className="developer-report-row developer-report-row-enter"
                    style={{ animationDelay: `${index * 90}ms` }}
                    onClick={() => handleOpenReport(report)}
                  >
                    <td>{formatDisplayValue(report.subject)}</td>
                    <td>
                      <Chip
                        label={formatDisplayValue(report.status)}
                        size="small"
                        className="developer-table-chip"
                        sx={statusChipStyles[(report.status || "unknown").toLowerCase()] || statusChipStyles.unknown}
                      />
                    </td>
                    <td>
                      <Chip
                        label={formatDisplayValue(report.severity)}
                        size="small"
                        className="developer-table-chip"
                        sx={
                          severityChipStyles[(report.severity || "unknown").toLowerCase()] ||
                          severityChipStyles.unknown
                        }
                      />
                    </td>
                    <td>{formatDisplayValue(getReporterDisplayName(report, reporterNames))}</td>
                    <td>{formatCreatedAt(report.createdAt || report.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        <BugReportCard
          report={selectedReport}
          draftStatus={draftStatus}
          draftSeverity={draftSeverity}
          saveError={saveError}
          saveSuccess={saveSuccess}
          isSaving={isSaving}
          onClose={handleCloseReport}
          onDraftChange={handleDraftChange}
          onSave={handleSaveReport}
          formatCreatedAt={formatCreatedAt}
          reporterNames={reporterNames}
        />
      </main>
    </div>
    </div>
  );
};

export default DeveloperDash;
