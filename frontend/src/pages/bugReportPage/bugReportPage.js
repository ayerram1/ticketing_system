import React, { useState } from "react";
import Cookies from "js-cookie";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";
import { useLocation } from "react-router-dom";

const getBrowserName = () => {
        const ua = navigator.userAgent;
        const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
        const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Unknown browser";
        return `${browser} on ${os}`;
      };

export default function BugReportPage() {
  const location = useLocation();
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "Medium",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const token = Cookies.get("token");
      if (!token) throw new Error("No token found. Please log in again.");


      const payload = {
        subject: form.subject,
        description: form.description,
        severity: form.priority.toLowerCase(),
        context: {
          page: location.state?.from || "",
          browser: getBrowserName(),
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      };

      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL || ""}/api/bug-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.errors?.join(", ") || data?.error || `Submit failed: ${res.status}`
        );
      }

      setResult({
        type: "success",
        msg: "Thanks! Your bug report was submitted.",
      });

      setForm({
        subject: "",
        description: "",
        priority: "Medium",
      });
    } catch (err) {
      setResult({ type: "error", msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.dark}11, ${theme.palette.secondary.main}22)`,
        p: 3,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 720,
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          backdropFilter: "blur(4px)",
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: (theme) => theme.palette.primary.main,
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BugReportIcon fontSize="large" />
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary">
                Help Us Improve
              </Typography>
              <Typography variant="h4" component="h1">
                Report a Bug
              </Typography>
              <Typography color="text.secondary">
                Share what went wrong and our engineers will jump on it as soon
                as possible.
              </Typography>
            </Box>
          </Stack>

          {result && (
            <Alert severity={result.type} onClose={() => setResult(null)}>
              {result.msg}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} display="grid" gap={3}>
            <TextField
              label="Subject"
              name="subject"
              value={form.subject}
              onChange={onChange}
              required
              placeholder="E.g. Unable to upload attachments"
              fullWidth
            />

            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={onChange}
              multiline
              minRows={5}
              required
              placeholder="Tell us what happened, the steps to reproduce it, and any context that might help."
              fullWidth
            />

            <TextField
              select
              label="Priority"
              name="priority"
              value={form.priority}
              onChange={onChange}
              required
              fullWidth
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </TextField>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{
                py: 1.4,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: (theme) => theme.shadows[4],
              }}
            >
              {submitting ? "Submitting…" : "Submit Bug"}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}