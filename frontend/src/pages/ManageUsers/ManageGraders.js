import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useTheme } from "@mui/material/styles";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Switch,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Button,
    TextField,
    Checkbox,
    Toolbar,
    Menu,
    MenuItem,
    alpha,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import ConfirmTADelete from "../../components/ConfirmTADelete/ConfirmTADelete";
import {generateRandomPassword} from "../../services/generateRandomPass";

const ManageGraders = () => {
    // Master list of all TAs from API
    const [graders, setGraders] = useState([]);
    // The list of TAs to display after filtering
    const [filteredGraders, setFilteredGraders] = useState([]);
    // The current filter state
    const [filterStatus, setFilterStatus] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    const token = Cookies.get("token");
    const theme = useTheme();
    const navigate = useNavigate();

    // State for delete modal
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedGrader, setSelectedGrader] = useState(null);
    const [idNameMap, setIdToNameMap] = useState({});
    const [deleteStatus, setDeleteStatus] = useState(false);

    // Add state for new TA inputs
    const [newGraderName, setNewGraderName] = useState("");
    const [newGraderEmail, setNewGraderEmail] = useState("");
    const [newGraderPopup, setGraderPopup] = useState(false); // new implementation

    // Add new state for selection and action menu
    const [selectedGraders, setSelectedGraders] = useState([]);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);

    // Add deleteStatus to dependency array to refresh list
    useEffect(() => {
        fetchGraders();
    }, [deleteStatus]);

    // This useEffect runs whenever the master list or the filter changes
    useEffect(() => {
        let list = graders; // Start with the full list

        if (filterStatus === "enabled") {
            list = graders.filter((t) => t.is_enabled ?? true);
        } else if (filterStatus === "disabled") {
            list = graders.filter((t) => !(t.is_enabled ?? true));
        }

        setFilteredGraders(list);
    }, [graders, filterStatus]);

    // Helper function to create ID-to-Name map
    const convertToMap = (list) => {
        return list.reduce((acc, obj) => {
            //map ID to name
            acc[obj.user_id] = obj.name;
            return acc;
        }, {});
    };

    const fetchGraders = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/users/role/grader`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error("Failed to fetch Graders.");
            const data = await response.json();
            setGraders(data); // Set the master TA list

            // Create the map for the delete modal
            const idToNameMap = convertToMap(data);
            setIdToNameMap(idToNameMap);
        } catch (error) {
            console.error("Failed to load Graders:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleEnabled = async (grader) => {
        const currentValue = grader.is_enabled ?? true;
        const newValue = !currentValue;

        setGraders((currentTas) =>
            currentTas.map((t) =>
                t.user_id === grader.user_id ? { ...t, is_enabled: newValue } : t
            )
        );

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/users/${grader.user_id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        is_enabled: newValue,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to update Grader status.");
            }
        } catch (err) {
            console.error("Error updating Grader status:", err);
            alert(`Error: ${err.message}. Reverting change.`);

            setGraders((currentGraders) =>
                currentGraders.map((t) =>
                    t.user_id === grader.user_id
                        ? { ...t, is_enabled: currentValue }
                        : t
                )
            );
        }
    };

    // Add encryptPassword and addTA functions
    const encryptPassword = async (password) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/encrypt`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ password }),
                }
            );

            if (!response.ok) throw new Error("Failed to encrypt password.");
            const data = await response.json();
            return data.hashedPassword;

        } catch (error) {
            console.error(error);
        }
    }

    const addGrader = async () => {
        if (!newGraderName.trim()) { //validation check
            alert("Grader name cannot be blank.");
            return;
        }
        if (!newGraderEmail.trim()) { //validation check
            alert("Grader Email name cannot be blank.");
            return;
        }

        const defaultPassword = generateRandomPassword();  // Encrypt the default password
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: newGraderName,
                        email: newGraderEmail,
                        role: "grader",
                        password: defaultPassword, // Default password
                        must_change_password: true
                    }),
                }
            );

            if (!response.ok) throw new Error("Failed to add Grader.");
            setNewGraderName("");
            setNewGraderEmail("");
            fetchGraders(); // Refresh the list of TAs
            graderConfirmationPopup(); // new implementation
        } catch (error) {
            console.error(error);
        }
    };


    const handleBack = () => {
        navigate(-1);
    };

    const handleFilterChange = (event, newStatus) => {
        if (newStatus !== null) {
            setFilterStatus(newStatus);
            setSelectedGraders([]);
        }
    };

    const graderConfirmationPopup = () => { // new implementation
        setGraderPopup(true);
        const timer = setTimeout(() => { setGraderPopup(false); }, 3000);
        return () => clearTimeout(timer);
    }

    // Handlers for the delete modal
    const handleDelete = (ta) => {
        setSelectedGrader(ta);
        setDeleteOpen(true);
    };

    const deletePopupClose = () => {
        setDeleteOpen(false);
        setSelectedGrader(null); // Clear the selected TA
    };

    const updateStatus = (status) => {
        setDeleteStatus(status);
    };

    // Handlers for selection
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            // Select all IDs from the *filtered* list
            const newSelecteds = filteredGraders.map((t) => t.user_id);
            setSelectedGraders(newSelecteds);
            return;
        }
        setSelectedGraders([]);
    };

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedGraders.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            // Not in array, add it
            newSelected = newSelected.concat(selectedGraders, id);
        } else if (selectedIndex === 0) {
            // At the start, remove
            newSelected = newSelected.concat(selectedGraders.slice(1));
        } else if (selectedIndex === selectedGraders.length - 1) {
            // At the end, remove
            newSelected = newSelected.concat(selectedGraders.slice(0, -1));
        } else if (selectedIndex > 0) {
            // In the middle, remove
            newSelected = newSelected.concat(
                selectedGraders.slice(0, selectedIndex),
                selectedGraders.slice(selectedIndex + 1)
            );
        }
        setSelectedGraders(newSelected);
    };

    const isSelected = (id) => selectedGraders.indexOf(id) !== -1;

    // Handlers for the Action Menu
    const handleMenuClick = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleMenuAction = async (action) => {
        handleMenuClose(); // Close the menu

        let targetStatus;
        if (action === 'enable') {
            targetStatus = true;
        } else if (action === 'disable') {
            targetStatus = false;
        } else {
            return; // Unknown action
        }

        const originalSelectedTAs = graders.filter(t =>
            selectedGraders.includes(t.user_id)
        );

        setGraders(currentTas =>
            currentTas.map(ta =>
                selectedGraders.includes(ta.user_id)
                    ? { ...ta, is_enabled: targetStatus }
                    : ta
            )
        );

        let failedUpdates = [];
        for (const taId of selectedGraders) {
            try {
                const response = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/users/${taId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            is_enabled: targetStatus, // Send the target status
                        }),
                    }
                );

                if (!response.ok) {
                    // If this one fails, add its ID to the failed list
                    failedUpdates.push(taId);
                }
            } catch (error) {
                // Network error, also a failure
                failedUpdates.push(taId);
                console.error(`Network error updating TA ${taId}:`, error);
            }
        }

        if (failedUpdates.length > 0) {
            alert(`Error: ${failedUpdates.length} TA(s) failed to update. Reverting their status.`);

            // Revert *only* the TAs that failed
            setGraders(currentTas =>
                currentTas.map(ta => {
                    // Is this a TA that failed?
                    if (failedUpdates.includes(ta.user_id)) {
                        // Find its original status from our backup
                        const originalTA = originalSelectedTAs.find(
                            t => t.user_id === ta.user_id
                        );
                        return originalTA ? originalTA : ta; // Revert
                    }
                    // Not a failed TA, keep its new status
                    return ta;
                })
            );
        }

        setSelectedGraders([]);
    };

    const numSelected = selectedGraders.length;
    const rowCount = filteredGraders.length;

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
                    padding: 5,
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    maxWidth: "900px",
                    margin: "40px auto",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        position: "relative",
                        marginBottom: 3,
                    }}
                >
                    <IconButton
                        onClick={handleBack}
                        sx={{
                            position: "absolute",
                            left: 0,
                            color: theme.palette.text.primary,
                        }}
                    >
                        <ArrowBackIosNewIcon />
                    </IconButton>
                    <Typography
                        variant="h4"
                        sx={{
                            flexGrow: 1,
                            textAlign: "center",
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                        }}
                    >
                        Manage Graders
                    </Typography>
                </Box>

                <Box
                    sx={{
                        marginBottom: 2,
                        backgroundColor: theme.palette.background.paper,
                        borderRadius: "10px",
                        border: `1px solid ${theme.palette.divider}`,
                        padding: 2.5,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            marginBottom: 2,
                            fontWeight: "bold",
                            display: 'inline-flex', // new implementation
                            color: theme.palette.text.primary
                        }}
                    >
                        Add New Grader

                    <Box 
                        sx={{ // new Implementation
                            color: 'green', 
                            fontWeight: 'bold',
                            justifyContent: "center", 
                            marginBottom: 2, 
                            position: 'relative',
                            transition: 'opacity 1s ease-in-out', 
                            marginLeft: '12px',
                            opacity: newGraderPopup ? 1 : 0
                        }}
                    >
                            Successfully Added Grader
                    </Box> 
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.25 }}>
                        <TextField
                            fullWidth
                            value={newGraderName}
                            placeholder="New Grader Name"
                            onChange={(e) => setNewGraderName(e.target.value)}
                            variant="outlined"
                            size="small"
                        />
                        <TextField
                            fullWidth
                            type="email"
                            value={newGraderEmail}
                            placeholder="New Grader Email"
                            onChange={(e) => setNewGraderEmail(e.target.value)}
                            variant="outlined"
                            size="small"
                        />
                        <Button
                            variant="contained"
                            onClick={addGrader}
                            sx={{ backgroundColor: theme.palette.primary.main, whiteSpace: 'nowrap' }}
                        >
                            Add
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
                    <ToggleButtonGroup
                        color="primary"
                        value={filterStatus}
                        exclusive
                        onChange={handleFilterChange}
                        aria-label="Filter Grader status"
                        sx={{
                            '& .MuiToggleButton-root.Mui-selected': {
                                color: '#fff',
                            },
                        }}
                    >
                        <ToggleButton value="all">All</ToggleButton>
                        <ToggleButton value="enabled">Enabled</ToggleButton>
                        <ToggleButton value="disabled">Disabled</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {numSelected > 0 && (
                    <Toolbar
                        sx={{
                            mb: 2,
                            borderRadius: 1,
                            bgcolor: (theme) =>
                                alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
                        }}
                    >
                        <Typography
                            sx={{ flex: '1 1 100%' }}
                            color="inherit"
                            variant="subtitle1"
                            component="div"
                        >
                            {numSelected} selected
                        </Typography>

                        <Button
                            variant="contained"
                            onClick={handleMenuClick}
                            sx={{ backgroundColor: theme.palette.primary.main }}
                        >
                            Actions
                        </Button>
                        <Menu
                            anchorEl={menuAnchorEl}
                            open={Boolean(menuAnchorEl)}
                            onClose={handleMenuClose}
                        >
                            <MenuItem onClick={() => handleMenuAction('enable')}>Enable Selected</MenuItem>
                            <MenuItem onClick={() => handleMenuAction('disable')}>Disable Selected</MenuItem>
                        </Menu>
                    </Toolbar>
                )}

                {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", marginY: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            indeterminate={numSelected > 0 && numSelected < rowCount}
                                            checked={rowCount > 0 && numSelected === rowCount}
                                            onChange={handleSelectAll}
                                            inputProps={{ 'aria-label': 'select all tas' }}
                                        />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: theme.palette.background.paper,
                                            color: theme.palette.text.primary,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Name
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            backgroundColor: theme.palette.background.paper,
                                            color: theme.palette.text.primary,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Email
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            backgroundColor: theme.palette.background.paper,
                                            color: theme.palette.text.primary,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Enabled
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            backgroundColor: theme.palette.background.paper,
                                            color: theme.palette.text.primary,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredGraders.map((ta) => {
                                    const isEnabled = ta.is_enabled ?? true;
                                    const isItemSelected = isSelected(ta.user_id); // Check if selected
                                    const labelId = `ta-checkbox-${ta.user_id}`;

                                    return (
                                        <TableRow
                                            key={ta.user_id}
                                            hover
                                            onClick={(event) => handleSelectOne(event, ta.user_id)} // Click row to select
                                            role="checkbox"
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            selected={isItemSelected}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    checked={isItemSelected}
                                                    inputProps={{ 'aria-labelledby': labelId }}
                                                />
                                            </TableCell>
                                            <TableCell component="th" id={labelId} scope="row" sx={{ color: theme.palette.text.primary }}>
                                                {ta.name}
                                            </TableCell>
                                            <TableCell sx={{ color: theme.palette.text.primary }}>
                                                {ta.email}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Switch
                                                    checked={isEnabled}
                                                    // Stop propagation so clicking switch doesn't select row
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => handleToggleEnabled(ta)}
                                                    color={isEnabled ? "success" : "error"}
                                                    inputProps={{ "aria-label": `toggle ${ta.name}` }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    variant="outlined"
                                                    // Stop propagation so clicking delete doesn't select row
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(ta);
                                                    }}
                                                    sx={{
                                                        color:
                                                            theme.palette.mode === "dark" ? "white" : "black",
                                                        borderColor:
                                                            theme.palette.mode === "dark" ? "white" : "black",
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Add the modal component */}
                {deleteOpen && (
                    <ConfirmTADelete
                        handleOpen={deleteOpen}
                        handleClose={deletePopupClose}
                        ta={selectedGrader}
                        idNameMap={idNameMap}
                        updateStatus={updateStatus}
                    />
                )}
            </Box>
        </Box>
    );
};

export default ManageGraders;