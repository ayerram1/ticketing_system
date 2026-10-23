import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import ASULogo from "../../assets/ASULogo.png";
import ASUPitchfork from "../../assets/ASUPitchfork.png";

// Force light theme for login page
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#8C1D40', // ASU Maroon
        },
        secondary: {
            main: '#FFC627', // ASU Gold
        },
        background: {
            default: '#ffffff',
            paper: '#ffffff',
        },
        text: {
            primary: '#000000',
            secondary: '#666666',
        },
    },
});

export default function SignIn() {
    const navigate = useNavigate();
    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [rememberMe, setRememberMe] = React.useState(false);
    const [showPass, setShowPass] = React.useState(false);
    const baseURL = process.env.REACT_APP_API_BASE_URL;

    const handleClickOpen = () => navigate("/requestreset");
    const handleClose = () => setOpen(false);
    const handleSignUp = () => navigate("/registration");

    const validateInputs = () => {
        const email = document.getElementById("email");
        const password = document.getElementById("password");
        let ok = true;

        if (!email.value || !/^\S+@asu\.edu$/.test(email.value)) {
            setEmailError(true);
            setEmailErrorMessage("Please enter your ASU email address.");
            ok = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage("");
        }

        if (!password.value || password.value.length < 4) {
            setPasswordError(true);
            setPasswordErrorMessage("Password must be at least 4 characters long.");
            ok = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage("");
        }

        return ok;
    };

    const handleSubmit = async (event) => {
        try {
            event.preventDefault();

            if (!validateInputs()) {
                return;
            }

            const data = new FormData(event.currentTarget);

            const response = await fetch(`${baseURL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.get("email"),
                    password: data.get("password"),
                }),
            });

            if (!response.ok) {
                let msg = "Incorrect Email or Password";

                if (response.status === 403) {
                    try {
                        const errorData = await response.json();
                        if (errorData.error && errorData.error.includes("disabled")) {
                            msg = "This account has been disabled. Please contact an administrator.";
                        }
                    } catch (e) {
                        // Response wasn't JSON, just use a generic 403 message
                        msg = "This account has been disabled. Please contact an administrator.";
                    }
                }

                setEmailError(true);
                setPasswordError(true);
                setEmailErrorMessage(msg);
                setPasswordErrorMessage(msg);
                return;
            }

            const { token, mustChangePassword } = await response.json();

const isLocalhost = window.location.hostname === "localhost";

Cookies.set("token", token, {
    secure: !isLocalhost,
    sameSite: "Strict",
    expires: rememberMe ? 7 : undefined
});

const decoded = jwtDecode(token);
const userType = decoded.role;
const userId = decoded.id;
const userName = decoded.name;

Cookies.set("user_id", userId, {
    secure: !isLocalhost,
    sameSite: "Strict"
});

Cookies.set("name", userName, {
    secure: !isLocalhost,
    sameSite: "Strict"
});

            try {
                window.dispatchEvent(new CustomEvent('userChanged'));
                localStorage.setItem('user_changed', Date.now().toString());
            } catch (error) {
                console.warn('Theme event/storage failed:', error);
            }

            // Check if user must change password on first login
            if (mustChangePassword) {
                navigate("/change-password", { state: { forced: true } });
                return;
            }

            if (userType === "admin") navigate("/admindash");
            else if (userType === "student") navigate("/studentdash");
            else if (userType === "TA") navigate("/instructordash");
            else if (userType === "grader") navigate("/graderdash");
            else if (userType === "developer") navigate("/developerdash");
        } catch (e) {
            console.error(e);
            setEmailErrorMessage("Something went wrong. Please try again.");
        }
    };


    return (
        <ThemeProvider theme={lightTheme}>
            <Stack className="signInContainer">
                <Box className="brandHeader">
                    <img src={ASULogo} alt="ASU Logo" className="brandLogo" />
                </Box>

                <Box className="centerStage">
                    {/* Mission statement (left) */}
                    <Box className="missionWrapper">
                        <p className="missionText">
                            ASU is a comprehensive public research university, measured not by whom it
                            excludes, but by whom it includes and how they succeed; advancing research
                            and discovery of public value; and assuming fundamental responsibility for
                            the economic, social, cultural and overall health of the communities it serves.
                        </p>
                    </Box>

                    {/* Login (center) */}
                    <MuiCard className="card" variant="outlined">
                        <Typography component="h1" variant="h4">
                            Sign in
                        </Typography>
                        <Box
                            className="loginForm"
                            component="form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <FormControl>
                                <FormLabel className="emailLabel" htmlFor="email">
                                    Email
                                </FormLabel>
                                <TextField
                                    error={emailError}
                                    helperText={emailErrorMessage}
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="your@asu.edu"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    fullWidth
                                    variant="outlined"
                                    color={emailError ? "error" : "primary"}
                                />
                            </FormControl>
                            <FormControl>
                                <Box className="passwordControls">
                                    <FormLabel htmlFor="password">Password</FormLabel>
                                    <Link
                                        component="button"
                                        type="button"
                                        onClick={handleClickOpen}
                                        variant="body2"
                                    >
                                        Forgot your password?
                                    </Link>
                                </Box>
                                <TextField
                                    error={passwordError}
                                    helperText={passwordErrorMessage}
                                    name="password"
                                    placeholder="••••••"
                                    type={showPass ? "text" : "password"}
                                    id="password"
                                    autoComplete="current-password"
                                    required
                                    fullWidth
                                    variant="outlined"
                                    color={passwordError ? "error" : "primary"}
                                />
                                <label className="checkBoxLabel">
                                    <input
                                        type="checkbox"
                                        id="showPassCheckBox"
                                        onChange={e => setShowPass(e.target.checked)}
                                        checked={showPass}
                                        style={{ marginRight: '0px'}}
                                    />
                                    <span style={{ marginLeft: "0.5rem" }}>Show Password</span>
                                </label>
                            </FormControl>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Remember me"
                            />
                            {/* <ForgotPassword open={open} handleClose={handleClose} /> */}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                // onClick={validateInputs} // Removed onClick, validation is in handleSubmit
                                className="primaryButton"
                            >
                                Sign in
                            </Button>

                            
                            {/*<Typography>
                                Don&apos;t have an account?{" "}
                                <span>
                <Link
                    href=""
                    variant="body2"
                    onClick={handleSignUp}
                >
                  Sign up
                </Link>
              </span>
                            </Typography>*/} 
                        </Box>
                    </MuiCard>
                    {/* Sparky (right) */}
                    <Box className="pitchforkWrapper">
                        <img src={ASUPitchfork} alt="ASU Pitchfork" className="pitchforkLogo" />
                    </Box>
                </Box>
            </Stack>
        </ThemeProvider>
    );
}