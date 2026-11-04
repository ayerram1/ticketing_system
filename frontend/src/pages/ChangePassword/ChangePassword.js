import React, { useEffect } from 'react';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import './ChangePassword.css';
import { passwordRequirementsText, validatePassword } from "../../utils/passwordValidator";

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const baseURL = process.env.REACT_APP_API_BASE_URL;

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [currentPasswordError, setCurrentPasswordError] = React.useState("");
  const [newPasswordError, setNewPasswordError] = React.useState("");
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("");
  const [generalError, setGeneralError] = React.useState("");

  const [showCurrentPass, setShowCurrentPass] = React.useState(false);
  const [showNewPass, setShowNewPass] = React.useState(false);
  const [showConfirmPass, setShowConfirmPass] = React.useState(false);

  useEffect(() => {
    // Block back button navigation to prevent escaping forced password change
    const handleBackButton = (e) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, []);

  const validateInputs = () => {
    let isValid = true;

    // Clear previous errors
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
    setGeneralError("");

    // Check current password provided
    if (!currentPassword || currentPassword.trim().length === 0) {
      setCurrentPasswordError("Current password is required");
      isValid = false;
    }

    if (!newPassword || newPassword.trim().length === 0) {
      setNewPasswordError("New password is required");
      isValid = false;
    } else {
      const passwordCheck = validatePassword(newPassword);
      if (!passwordCheck.valid) {
        setNewPasswordError(passwordCheck.errors.join(" "));
        isValid = false;
      }
    }

    // Check confirm password provided
    if (!confirmPassword || confirmPassword.trim().length === 0) {
      setConfirmPasswordError("Please confirm your new password");
      isValid = false;
    }

    // Check passwords match
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    }

    // Check new is different from current
    if (currentPassword && newPassword && newPassword === currentPassword) {
      setNewPasswordError("New password must be different from current password");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateInputs()) {
      return;
    }

    try {
      const token = Cookies.get("token");
      if (!token) {
        setGeneralError("Session expired. Please log in again.");
        navigate("/login");
        return;
      }

      const decoded = jwtDecode(token);
      const userId = decoded.id;

      const response = await fetch(`${baseURL}/api/users/change-password`, {
        method: "PUT",  // Changed from POST to PUT
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData?.error === "Password policy violation" && Array.isArray(errorData?.details)) {
          setNewPasswordError(errorData.details.join(" "));
        } else if (errorData.error && errorData.error.includes("Current password incorrect")) {
          setCurrentPasswordError("Current password is incorrect");
        } else {
          setGeneralError(errorData.error || "Failed to change password");
        }
        return;
      }

      // Success! Password changed
      alert("Password changed successfully! Redirecting to your dashboard...");

      // Redirect based on role
      const userRole = decoded.role;
      if (userRole === "admin") navigate("/admindash");
      else if (userRole === "student") navigate("/studentdash");
      else if (userRole === "TA") navigate("/instructordash");
      else if (userRole === "grader") navigate("/graderdash");

    } catch (error) {
      console.error("Error changing password:", error);
      setGeneralError("Failed to change password. Please try again.");
    }
  };

  return (
    <Stack className="signInContainer">
      <MuiCard className="card" variant="outlined" sx={{overflowY: 'auto'}}>
        <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
          Change Your Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          For security purposes, you must change your temporary password before accessing the system.
        </Typography>

        {generalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {generalError}
          </Alert>
        )}

        <Box
          className="loginForm"
          component="form"
          noValidate
          onSubmit={handleSubmit}
        >
          <FormControl>
            <FormLabel htmlFor="currentPassword">Current Password</FormLabel>
            <TextField
              error={!!currentPasswordError}
              helperText={currentPasswordError}
              name="currentPassword"
              placeholder="••••••"
              type={showCurrentPass ? "text" : "password"}
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
              required
              fullWidth
              variant="outlined"
              color={currentPasswordError ? "error" : "primary"}
            />
            <label className="checkBoxLabel">
              <input
                type="checkbox"
                onChange={(e) => setShowCurrentPass(e.target.checked)}
                checked={showCurrentPass}
                style={{ marginRight: '0px' }}
              />
              <span style={{ marginLeft: "0.5rem" }}>Show Password</span>
            </label>
          </FormControl>

          <FormControl sx={{ mt: 2 }}>
            <FormLabel htmlFor="newPassword">New Password</FormLabel>
            <TextField
              error={!!newPasswordError}
              helperText={newPasswordError || passwordRequirementsText}
              name="newPassword"
              placeholder="••••••"
              type={showNewPass ? "text" : "password"}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
              variant="outlined"
              color={newPasswordError ? "error" : "primary"}
            />
            <label className="checkBoxLabel">
              <input
                type="checkbox"
                onChange={(e) => setShowNewPass(e.target.checked)}
                checked={showNewPass}
                style={{ marginRight: '0px' }}
              />
              <span style={{ marginLeft: "0.5rem" }}>Show Password</span>
            </label>
          </FormControl>

          <FormControl sx={{ mt: 2 }}>
            <FormLabel htmlFor="confirmPassword">Confirm New Password</FormLabel>
            <TextField
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
              name="confirmPassword"
              placeholder="••••••"
              type={showConfirmPass ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              variant="outlined"
              color={confirmPasswordError ? "error" : "primary"}
            />
            <label className="checkBoxLabel">
              <input
                type="checkbox"
                onChange={(e) => setShowConfirmPass(e.target.checked)}
                checked={showConfirmPass}
                style={{ marginRight: '0px' }}
              />
              <span style={{ marginLeft: "0.5rem" }}>Show Password</span>
            </label>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
          >
            Change Password
          </Button>
        </Box>
      </MuiCard>
    </Stack>
  );
};

export default ChangePassword;
