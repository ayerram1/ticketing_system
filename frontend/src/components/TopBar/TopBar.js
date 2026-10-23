import * as React from 'react';
import {
    AppBar, Toolbar, Stack, Avatar, IconButton,
    Menu, MenuItem, ListItemIcon, Divider
} from '@mui/material';
import BugReportIcon from "@mui/icons-material/BugReport";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import PlaceholderProfilePicture from '../../assets/pfp.png';
import './TopBar.css';

const TopBar = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    // Get user role for dynamic settings routing
    const token = Cookies.get("token");
    const userType = token ? jwtDecode(token).role : null;

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNavigation = (path) => {
        navigate(path);
        handleCloseMenu();
    };

    const handleLogout = () => {
        Cookies.remove("token");
        navigate("/login");
        handleCloseMenu();
    };

    const goToSettings = () => {
        const routes = {
            admin: "/adminsettings",
            TA: "/tasettings",
            student: "/studentsettings",
            grader: "/gradersettings",
            developer: "/developersettings"
        };
        handleNavigation(routes[userType] || "/settings");
    };

    return (
        <AppBar position="static" className='topBar'>
            <Toolbar className='toolBar'>
                <Stack direction="row" justifyContent="flex-end" sx={{ width: '100%' }}>

                    <IconButton onClick={handleOpenMenu} size="small" sx={{ ml: 2 }}>
                        <Avatar alt="User Profile" src={PlaceholderProfilePicture} />
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleCloseMenu}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <MenuItem onClick={() => handleNavigation("/profile")}>
                            <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
                            Profile
                        </MenuItem>

                        <MenuItem onClick={() => handleNavigation("/bug-report")}>
                            <ListItemIcon><BugReportIcon fontSize="small" /></ListItemIcon>
                            Report a Bug
                        </MenuItem>

                        <MenuItem onClick={goToSettings}>
                            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                            Settings
                        </MenuItem>

                        <Divider />

                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                            Logout
                        </MenuItem>
                    </Menu>

                </Stack>
            </Toolbar>
        </AppBar>
    );
}

export default TopBar;