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
    Checkbox,
    Toolbar,
    Menu,
    MenuItem,
    Button,
    alpha,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import {generateRandomPassword} from "../../services/generateRandomPass";
import { jwtDecode } from "jwt-decode";

const ManageDevelopers = () => {
    const token = Cookies.get("token");
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const isCentralDeveloper = currentUserRole === "c-developer";
    const [developers, setDevelopers] = useState([]);
    const [filteredDevelopers, setFilteredDevelopers] = useState([]);
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedDevelopers, setSelectedDevelopers] = useState([]);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const theme = useTheme();
    const navigate = useNavigate();
    const [isAddDeveloperDialogOpen, setIsAddDeveloperDialogOpen] = useState(false);
    const [newDeveloperData, setNewDeveloperData] = useState({
        name: "",
        email: "",
        role: "developer",
    });
    const [isAddingDeveloper, setIsAddingDeveloper] = useState(false);
    const [successData, setSuccessData] = useState({ isOpen: false, password: "" });
    const [developerType, setDeveloperType] = useState("developer");

    //Fetch all developers, also fetch the token of the user currently logged-in to keep track if they are a regular developer or central developer
    useEffect(() => {
        const decodedToken = jwtDecode(token);
        setCurrentUserRole(decodedToken.role);
        fetchDevelopers();
    }, []);


    const fetchDevelopers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/users`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

        if (!response.ok) throw new Error("Failed to fetch developer.");
        const data = await response.json();

        const developerList = data.filter(user =>["developer", "c-developer"].includes(user.role));
        developerList.sort((a, b) => {
            if (a.role === "c-developer" && b.role !== "c-developer") return -1;
            if (a.role !== "c-developer" && b.role === "c-developer") return 1;
            return 0;
        });
        setDevelopers(developerList);

        } catch (error) {
            console.error("Failed to load developers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    //filters the developer by enabled/disabled
    useEffect(() => {
        let list = developers
    
        if (filterStatus === "enabled") {
            list = developers.filter(s => (s.is_enabled ?? true));
        } else if (filterStatus === "disabled") {
            list = developers.filter(s => !(s.is_enabled ?? true));
        }
    
        setFilteredDevelopers(list);
    }, [developers, filterStatus, searchQuery]);

    //add a new developer, first checks if the developer is a central developer
    const addDeveloper = async () => {
         if (!checkPermission()) {
            alert("You cannot perform this action. Only Central Developers have permission.");
            return;
        }
        if (!newDeveloperData.name.trim()) {
            alert("Developer name cannot be blank.");
            return;
        }
        if (!newDeveloperData.email.trim()) {
            alert("Developer email cannot be blank.");
            return;
        }

        const defaultPassword = generateRandomPassword();
        setIsAddingDeveloper(true);
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
                        name: newDeveloperData.name.trim(),
                        email: newDeveloperData.email.trim(),
                        role: "developer",
                        password: defaultPassword,
                        must_change_password: true,
                    }),
                }
            );
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(
                responseData.message || "Failed to add Developer."
            );
        }
        setNewDeveloperData({
            name: "",
            email: "",
        });
        await fetchDevelopers();
        setIsAddDeveloperDialogOpen(false);

        //This will display the otp for the new developer.
        setSuccessData({
            isOpen: true,
            password: defaultPassword,
        });
        } catch (error) {
            console.error("Add Developer error:", error);
            alert(error.message);
        } finally {
            setIsAddingDeveloper(false);
        }
    };

    //delete a developer
    const handleDeleteSubmit = async () => {
        setIsDeleting(true);

        // 1. Fire DELETE requests concurrently
        const deletePromises = selectedDevelopers.map(developerId =>
            fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/${developerId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }).then(res => {
                if (!res.ok) throw new Error(`Failed to delete ${developerId}`);
                return developerId;
            })
        );

        const results = await Promise.allSettled(deletePromises);

        // 2. Check for failures
        const failedDeletes = results.filter(result => result.status === "rejected");
        if (failedDeletes.length > 0) {
            alert(`Error: ${failedDeletes.length} developers failed to delete. Please check the server logs.`);
        }

        fetchDevelopers();

        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setSelectedDevelopers([]); 
    };

    const handleDelete = (developer) => {
        if (!checkPermission()) {
            alert("You cannot perform this action. Only Central Developers have permission.");
            return;
        }
        setSelectedDevelopers([developer.user_id]);
        setIsDeleteDialogOpen(true);
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleFilterChange = (event, newStatus) => {
        if (newStatus !== null) {
            setFilterStatus(newStatus);
            setSelectedDevelopers([]); 
        }
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setSelectedDevelopers([]); //
    };

    const handleMenuClick = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    //handle the select buttons
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const newSelecteds = filteredDevelopers.map((d) => d.user_id);
            setSelectedDevelopers(newSelecteds);
            return;
        }
        setSelectedDevelopers([]);
    };

    const isSelected = (id) => selectedDevelopers.indexOf(id) !== -1;

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedDevelopers.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedDevelopers, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedDevelopers.slice(1));
        } else if (selectedIndex === selectedDevelopers.length - 1) {
            newSelected = newSelected.concat(selectedDevelopers.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedDevelopers.slice(0, selectedIndex),
                selectedDevelopers.slice(selectedIndex + 1)
            );
        }
        setSelectedDevelopers(newSelected);
    };

    //turn on or off a central developer 
    const handleToggleCentralDeveloper = async (developer) => { 
        if (!checkPermission()) {
            alert("You cannot perform this action. Only Central Developers have permission.");
            return;
        }
        const newRole = developer.role === "c-developer" 
            ? "developer" 
            : "c-developer";

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/${developer.user_id}/dev-role`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    role: newRole,
                }),
            }
        );

        setDevelopers((prevDevelopers) =>
            prevDevelopers.map((dev) =>
                dev.user_id === developer.user_id
                    ? { ...dev, role: newRole }
                    : dev
            ).sort((a, b) => {
                if (a.role === "c-developer" && b.role !== "c-developer") return -1;
                if (a.role !== "c-developer" && b.role === "c-developer") return 1;
                return 0;
            })
        );


        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || "Failed to update developer role."
            );
        }


        } catch (error) {
            console.error("Error updating developer role:", error);
            alert(`Error: ${error.message}`);
        }
        //window.location.reload();
    };
    
    // Bulk action logic
    const handleToggleEnabled = async (developer) => {
        if (!checkPermission()) {
            alert("You cannot perform this action. Only Central Developers have permission.");
            return;
        }
        if (!checkPermission()) return;
        const currentValue = developer.is_enabled ?? true;
        const newValue = !currentValue;

        setDevelopers((currentDevelopers) =>
            currentDevelopers.map((d) =>
                d.user_id === developer.user_id ? { ...d, is_enabled: newValue } : d
            )
        );

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/users/${developer.user_id}`,
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
                throw new Error(errorData.message || "Failed to update developer status.");
            }
        } catch (err) {
            console.error("Error updating developer status:", err);
            alert(`Error: ${err.message}. Reverting change.`);

            setDevelopers((currentDevelopers) =>
                currentDevelopers.map((d) =>
                    d.user_id === developer.user_id
                        ? { ...d, is_enabled: currentValue }
                        : d
                )
            );
        }
    };

    const handleMenuAction = async (action) => {
        if (!checkPermission()) {
            alert("You cannot perform this action. Only Central Developers have permission.");
            return;
        }
        handleMenuClose(); // Close the menu
    
        let targetStatus;
        if (action === 'enable') {
            targetStatus = true;
        } else if (action === 'disable') {
            targetStatus = false;
        } else if (action === 'delete') { //delete students
            setIsDeleteDialogOpen(true);
            return;
        } else {
            return; // Unknown action
        }
    
        const originalSelectedDevelopers = developers.filter(d =>selectedDevelopers.includes(d.user_id));
    
        setDevelopers(currentDevelopers =>
            currentDevelopers.map(developer =>
            selectedDeveloper.includes(developer.user_id)
                    ? { ...developer, is_enabled: targetStatus }
                    : developer
            )
        );
    
        let failedUpdates = [];
        for (const developerId of selectedDevelopers) {
            try {
                const response = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/users/${developerId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            is_enabled: targetStatus,
                        }),
                    }
                );
    
                if (!response.ok) {
                    failedUpdates.push(developerId);
                }
                } catch (error) {
                    failedUpdates.push(developerId);
                    console.error(`Network error updating developer ${developerId}:`, error);
                }
            }
    
            if (failedUpdates.length > 0) {
                alert(`Error: ${failedUpdates.length} developers failed to update. Reverting their status.`);
    
                setDevelopers(currentDevelopers =>
                    currentDevelopers.map(developer => {
                        if (failedUpdates.includes(developer.user_id)) {
                            const originalDeveloper = originalSelectedDevelopers.find(
                                d => d.user_id === developer.user_id
                            );
                            return originalDeveloper ? originalDeveloper : developer; // Revert
                        }
                        return developer;
                    })
                );
            }
    
        setSelectedDevelopers([]);
    };

    const checkPermission = () => {
        return isCentralDeveloper;
    };

    const numSelected = selectedDevelopers.length;
    const rowCount = filteredDevelopers.length;

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
                                Manage Developers
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
                                Add New Developer
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.25 }}>
                        <TextField
                            fullWidth
                            value={newDeveloperData.name}
                            placeholder="New Developer Name"
                            onChange={(e) => setNewDeveloperData({ ...newDeveloperData, name: e.target.value })}
                            variant="outlined"
                            size="small"
                        />
                            <TextField
                                fullWidth
                                type="email"
                                value={newDeveloperData.email}
                                placeholder="New Developer Email"
                                onChange={(e) => setNewDeveloperData({ ...newDeveloperData, email: e.target.value })}
                                variant="outlined"
                                size="small"
                            />
                            <Button
                                variant="contained"
                                onClick={addDeveloper}
                                disabled={isAddingDeveloper}
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    whiteSpace: "nowrap",
                                    minWidth: "130px",
                                }}
                            >
                                {isAddingDeveloper ? (
                                    <CircularProgress size={22} color="inherit" />
                                ) : (
                                    "Add Developer"
                                 )}
                            </Button>
                        </Box>
                    </Box>
        
                    <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
                        <ToggleButtonGroup
                            color="primary"
                            value={filterStatus}
                            exclusive
                            onChange={handleFilterChange}
                            aria-label="Filter Developer status"
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
                                <MenuItem onClick={() => handleMenuAction('delete')}>Delete Selected</MenuItem>
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
                                                inputProps={{ 'aria-label': 'select all Developers' }}
                                            />
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                backgroundColor: theme.palette.background.paper,
                                                color: theme.palette.text.primary,
                                                fontWeight: "bold",
                                            }}
                                        >
                                                Developer Name
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                backgroundColor: theme.palette.background.paper,
                                                color: theme.palette.text.primary,
                                                fontWeight: "bold",
                                            }}
                                        >
                                                Developer Email
                                        </TableCell>
                                        <TableCell
                                        align="center"
                                        sx={{
                                            backgroundColor: theme.palette.background.paper,
                                            color: theme.palette.text.primary,
                                            fontWeight: "bold",
                                        }}
                                        >
                                            Central Developer
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
                                {filteredDevelopers.map((developer) => {
                                    const isEnabled = developer.is_enabled ?? true;
                                    const isItemSelected = isSelected(developer.user_id); // Check if selected
                                    const labelId = `Developer-checkbox-${developer.user_id}`;
        
                                        return (
                                            <TableRow
                                                key={developer.user_id}
                                                hover
                                                onClick={(event) => handleSelectOne(event, developer.user_id)}
                                                role="checkbox"
                                                aria-checked={isItemSelected}
                                                developerIndex={-1}
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
                                                    {developer.name}
                                                </TableCell>
                                                <TableCell sx={{ color: theme.palette.text.primary }}>
                                                    {developer.email}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        checked={developer.role === "c-developer"}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() => handleToggleCentralDeveloper(developer)}
                                                        color={(developer.is_enabled ?? true) ? "success" : "error"}
                                                        inputProps={{"aria-label": `toggle ${developer.name}`,}}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        checked={developer.is_enabled ?? true}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() => handleToggleEnabled(developer)}
                                                        color={(developer.is_enabled ?? true) ? "success" : "error"}
                                                        inputProps={{"aria-label": `toggle ${developer.name}`,}}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        variant="outlined"
                                                        // Stop propagation so clicking delete doesn't select row
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(developer);
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
                {/* --- SUCCESS DIALOG (Shows Generated Password) --- */}
                    <Dialog
                        open={successData.isOpen}
                        onClose={() => setSuccessData({ isOpen: false, password: "" })}
                        maxWidth="xs"
                        fullWidth
                    >
                        <DialogTitle sx={{ color: theme.palette.success.main, fontWeight: "bold" }}>
                            Developer Added Successfully!
                        </DialogTitle>
                        <DialogContent>
                                <DialogContentText>
                                    The student account has been created. Please share this temporary password with the student:
                                </DialogContentText>
                                <Box
                                    sx={{
                                        mt: 3,
                                        mb: 1,
                                        p: 2,
                                        backgroundColor: theme.palette.action.hover,
                                        borderRadius: 1,
                                        textAlign: 'center',
                                        border: `1px dashed ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        Temporary Password
                                    </Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', letterSpacing: 2 }}>
                                        {successData.password}
                                    </Typography>
                                </Box>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, pt: 0 }}>
                                <Button
                                    onClick={() => setSuccessData({ isOpen: false, password: "" })}
                                    variant="contained"
                                    color="success"
                                    fullWidth
                                >
                                     Got it
                                </Button>
                        </DialogActions>
                    </Dialog>

                    <Dialog
                        open={isDeleteDialogOpen}
                        onClose={() => {
                            if (!isDeleting) {
                                setIsDeleteDialogOpen(false);
                                setSelectedDevelopers([]);
                            }
                        }}
                    maxWidth="xs"
                    fullWidth
                    >
                        <DialogTitle sx={{ fontWeight: "bold" }}>
                            Confirm Developer Deletion
                        </DialogTitle>

                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete{" "}
                            {selectedDevelopers.length === 1
                                ? "this developer?"
                                : `these ${selectedDevelopers.length} developers?`}
                                {" "}This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>

    <DialogActions sx={{ p: 2 }}>
        <Button
            onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedDevelopers([]);
            }}
            disabled={isDeleting}
        >
            Cancel
        </Button>

        <Button
            onClick={handleDeleteSubmit}
            color="error"
            variant="contained"
            disabled={isDeleting}
        >
            {isDeleting ? (
                <CircularProgress size={22} color="inherit" />
            ) : (
                "Delete"
            )}
        </Button>
    </DialogActions>
</Dialog>

        </Box>
    </Box>
  );
};

export default ManageDevelopers;