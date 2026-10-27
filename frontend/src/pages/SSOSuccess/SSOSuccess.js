import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

const SSOSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      try {
        const isLocalhost = window.location.hostname === "localhost";

        // Store token and user details in cookies matching Login.js behavior
        Cookies.set("token", token, {
          secure: !isLocalhost,
          sameSite: "Strict",
        });

        const decoded = jwtDecode(token);
        const userType = decoded.role;
        const userId = decoded.id;
        const userName = decoded.name;

        Cookies.set("user_id", userId, {
          secure: !isLocalhost,
          sameSite: "Strict",
        });

        Cookies.set("name", userName, {
          secure: !isLocalhost,
          sameSite: "Strict",
        });

        try {
          window.dispatchEvent(new CustomEvent("userChanged"));
          localStorage.setItem("user_changed", Date.now().toString());
        } catch (err) {
          console.warn("Theme/User change event failed:", err);
        }

        // Navigate to role-specific dashboard
        if (userType === "admin") navigate("/admindash");
        else if (userType === "student") navigate("/studentdash");
        else if (userType === "TA") navigate("/instructordash");
        else if (userType === "grader") navigate("/graderdash");
        else if (userType === "developer") navigate("/developerdash");
        else navigate("/studentdash");
      } catch (err) {
        console.error("Failed to decode SSO token:", err);
        navigate("/login?error=InvalidToken");
      }
    } else {
      navigate("/login?error=SSOFailed");
    }
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#ffffff",
      }}
    >
      <CircularProgress sx={{ color: "#8C1D40", mb: 2 }} />
      <Typography variant="h6" sx={{ color: "#8C1D40", fontWeight: 600 }}>
        Authenticating with ASU SSO...
      </Typography>
    </Box>
  );
};

export default SSOSuccess;
