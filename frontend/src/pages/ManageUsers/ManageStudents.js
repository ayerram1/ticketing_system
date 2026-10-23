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
    Tooltip,
    alpha,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import {generateRandomPassword} from "../../services/generateRandomPass";

const ManageStudents = () => {
    // Master list of all students from API
    const [students, setStudents] = useState([]);
    // The list of students to display after filtering
    const [filteredStudents, setFilteredStudents] = useState([]);
    // The current filter state
    const [filterStatus, setFilterStatus] = useState("all");

    // State for selection and action menu
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [confirmNotifyOpen, setConfirmNotifyOpen] = useState(false);
    const [isSendingNotify, setIsSendingNotify] = useState(false);
    const [notifySent, setNotifySent] = useState(false);
    const [selectedNotificationType, setSelectedNotificationType] = useState("email-notification");

    // Add new state for search query
    const [searchQuery, setSearchQuery] = useState("");

    // ---  STATES FOR TEAM ASSIGNMENT ---
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);
    const [studentsToAssign, setStudentsToAssign] = useState([]);

    // --- STATES FOR SECTION ASSIGNMENT ---
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState("");
    const [isAssigningSection, setIsAssigningSection] = useState(false);

    // --- STUDENT STATES ---
    const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
    const [newStudentData, setNewStudentData] = useState({
        name: "",
        email: "",
        section: "",
        semester: "",
        team_id: ""
    });
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [successData, setSuccessData] = useState({ isOpen: false, password: "" });

    // --- DELETE STUDENT STATES ---
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const token = Cookies.get("token");
    const theme = useTheme();
    const navigate = useNavigate();

    // Initial data fetch
    useEffect(() => {
        fetchStudents();
        fetchTeams();
    }, []);

    // useEffect now handles filtering AND search
    useEffect(() => {
        let list = students; // Start with the full list

        // Filter by status
        if (filterStatus === "enabled") {
            list = students.filter(s => (s.is_enabled ?? true));
        } else if (filterStatus === "disabled") {
            list = students.filter(s => !(s.is_enabled ?? true));
        }

        // Filter by search query
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (lowerCaseQuery) {
            list = list.filter(student => {
                const name = student.name?.toLowerCase() || "";
                const email = student.email?.toLowerCase() || "";
                const team = student.team_name?.toLowerCase() || "n/a";
                const sponsor = student.sponsor?.toLowerCase() || "n/a";
                const semester = student.semester?.toLowerCase() || "n/a";
                const section = student.section?.toLowerCase() || "n/a";

                return (
                    name.includes(lowerCaseQuery) ||
                    email.includes(lowerCaseQuery) ||
                    team.includes(lowerCaseQuery) ||
                    sponsor.includes(lowerCaseQuery) ||
                    semester.includes(lowerCaseQuery) ||
                    section.includes(lowerCaseQuery)
                );
            });
        }

        setFilteredStudents(list);
    }, [students, filterStatus, searchQuery]);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/users/role/student`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error("Failed to fetch students.");
            const data = await response.json();
            setStudents(data);
        } catch (error) {
            console.error("Failed to load students:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTeams = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/teams`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setTeams(data); // Assuming the API returns an array of team objects
            }
        } catch (error) {
            console.error("Failed to fetch teams:", error);
        }
    };

    const handleAddStudentSubmit = async () => {
        const { name, email, section, semester, team_id } = newStudentData;

        if (!name.trim() || !email.trim()) {
            alert("Name and Email are required.");
            return;
        }

        setIsAddingStudent(true);
        const password = generateRandomPassword();

        try {
            // STEP 1: Create user account
            const responseUser = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password: password,
                    role: "student",
                    must_change_password: true
                }),
            });

            const responseUserData = await responseUser.json();

            if (!responseUser.ok || responseUserData?.created === false || responseUserData.status === 409) {
                throw new Error(`Failed to create user: ${responseUserData?.message || responseUserData?.error || "Unknown error"}`);
            }

            const { user_id } = responseUserData.user;

            // STEP 2: Create student data
            const responseSD = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/studentdata/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    user_id: user_id,
                    team_id: team_id || null, // Optional if no team is selected
                    section: section.trim() || null,
                    semester: semester.trim() || null,
                }),
            });

            if (!responseSD.ok) {
                const errorData = await responseSD.json();
                throw new Error(`User created, but failed to create Student Data: ${errorData.message}`);
            }

            // Optional STEP 3: If you need to add to a separate 'teammembers' table like in your createStudent snippet
            if (team_id) {
                await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/teammembers`, { // Adjust URL to your actual endpoint
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ team_id: team_id, user_id: user_id })
                });
            }

            // SUCCESS: Refresh the list and close dialog
            fetchStudents();
            setIsAddStudentDialogOpen(false);
            setNewStudentData({ name: "", email: "", section: "", semester:"", team_id: "" });

            // Optional: alert the admin of the generated password or rely on email
            setSuccessData({ isOpen: true, password: password });
        } catch (error) {
            console.error("Add student error:", error);
            alert(error.message);
        } finally {
            setIsAddingStudent(false);
        }
    };

    const handleToggleEnabled = async (student) => {
        const currentValue = student.is_enabled ?? true;
        const newValue = !currentValue;

        setStudents((currentStudents) =>
            currentStudents.map((s) =>
                s.user_id === student.user_id ? { ...s, is_enabled: newValue } : s
            )
        );

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_BASE_URL}/api/users/${student.user_id}`,
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
                throw new Error(errorData.message || "Failed to update student status.");
            }
        } catch (err) {
            console.error("Error updating student status:", err);
            alert(`Error: ${err.message}. Reverting change.`);
            setStudents((currentStudents) =>
                currentStudents.map((s) =>
                    s.user_id === student.user_id
                        ? { ...s, is_enabled: currentValue }
                        : s
                )
            );
        }
    };

    const handleDeleteSubmit = async () => {
        setIsDeleting(true);

        // 1. Fire DELETE requests concurrently
        const deletePromises = selectedStudents.map(studentId =>
            fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/${studentId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }).then(res => {
                if (!res.ok) throw new Error(`Failed to delete ${studentId}`);
                return studentId;
            })
        );

        const results = await Promise.allSettled(deletePromises);

        // 2. Check for failures
        const failedDeletes = results.filter(result => result.status === "rejected");

        if (failedDeletes.length > 0) {
            alert(`Error: ${failedDeletes.length} student(s) failed to delete. Please check the server logs.`);
        }

        // 3. Re-fetch students to update the UI
        fetchStudents();

        // 4. Cleanup
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setSelectedStudents([]); // Clear checkboxes
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleFilterChange = (event, newStatus) => {
        if (newStatus !== null) {
            setFilterStatus(newStatus);
            setSelectedStudents([]); // Clear selection when filter changes
        }
    };

    // Handler for search input change
    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setSelectedStudents([]); // Clear selection when search query changes
    };

    // Handlers for selection
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const newSelecteds = filteredStudents.map((s) => s.user_id);
            setSelectedStudents(newSelecteds);
            return;
        }
        setSelectedStudents([]);
    };

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedStudents.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedStudents, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedStudents.slice(1));
        } else if (selectedIndex === selectedStudents.length - 1) {
            newSelected = newSelected.concat(selectedStudents.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedStudents.slice(0, selectedIndex),
                selectedStudents.slice(selectedIndex + 1)
            );
        }
        setSelectedStudents(newSelected);
    };

    const isSelected = (id) => selectedStudents.indexOf(id) !== -1;

    // Handlers for the Action Menu
    const handleMenuClick = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleAssignTeamSubmit = async () => {
        if (!selectedTeamId) return;
        setIsAssigning(true);

        // Find the team name for the optimistic UI update
        const selectedTeam = teams.find(t => t.team_id === selectedTeamId);

        // 1. Optimistic UI update
        setStudents((currentStudents) =>
            currentStudents.map((student) =>
                studentsToAssign.includes(student.user_id)
                    ? { ...student, team_name: selectedTeam?.team_name, team_id: selectedTeamId }
                    : student
            )
        );

        // 2. Fire API requests (Targeting the StudentData route)
        const updatePromises = studentsToAssign.map(studentId =>
            fetch(`${process.env.REACT_APP_API_BASE_URL}/api/studentData/${studentId}`, { // <-- UPDATED ROUTE HERE
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ team_id: selectedTeamId }),
            }).then(res => {
                if (!res.ok) throw new Error(`Failed to assign team for ${studentId}`);
                return studentId;
            })
        );

        const results = await Promise.allSettled(updatePromises);

        const failedUpdates = results.filter(result => result.status === "rejected");
        if (failedUpdates.length > 0) {
            alert(`${failedUpdates.length} student(s) failed to update. Please try again or refresh.`);
            fetchStudents(); // Re-fetch to guarantee sync on failure
        }

        // 3. Cleanup and close dialog
        setIsAssigning(false);
        setIsTeamDialogOpen(false);
        setSelectedStudents([]); // Clear checkboxes
        setSelectedTeamId(""); // Reset dropdown
    };

    const handleEditSectionSubmit = async () => {
        const trimmedSection = selectedSection.trim();
        if (!trimmedSection) return;

        setIsAssigningSection(true);

        // 1. Optimistic UI update
        setStudents((currentStudents) =>
            currentStudents.map((student) =>
                studentsToAssign.includes(student.user_id)
                    ? { ...student, section: trimmedSection }
                    : student
            )
        );

        // 2. Fire API requests targeting the StudentData route
        const updatePromises = studentsToAssign.map(studentId =>
            fetch(`${process.env.REACT_APP_API_BASE_URL}/api/studentData/${studentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ section: trimmedSection }),
            }).then(res => {
                if (!res.ok) throw new Error(`Failed to assign section for ${studentId}`);
                return studentId;
            })
        );

        const results = await Promise.allSettled(updatePromises);

        const failedUpdates = results.filter(result => result.status === "rejected");
        if (failedUpdates.length > 0) {
            alert(`${failedUpdates.length} student(s) failed to update. Please try again or refresh.`);
            fetchStudents(); // Re-fetch to guarantee sync on failure
        }

        // 3. Cleanup and close dialog
        setIsAssigningSection(false);
        setIsSectionDialogOpen(false);
        setSelectedStudents([]); // Clear checkboxes
        setSelectedSection(""); // Reset input
    };

    const handleConfirmNotify = async () => {
        setIsSendingNotify(true);
        await handleNotifySelected();
        setIsSendingNotify(false);
        setNotifySent(true);
    };

    const handleCloseNotifyDialog = () => {
        setConfirmNotifyOpen(false);
        if (notifySent) {
            setSelectedStudents([]);
            setNotifySent(false);
        }
        setIsSendingNotify(false);
    };

    const handleCancelNotify = () => {
        if (!isSendingNotify) {
            setConfirmNotifyOpen(false);
        }
    };

    const handleNotifySelected = async () => {
        const selectedStudentData = students.filter(s => selectedStudents.includes(s.user_id));
        const endpoint = selectedNotificationType;

        for (const student of selectedStudentData) {
            const { email } = student;
            console.log("Sending to", student);
            try {
                //Ideally you send the one that's already in there, but I can't figure out how to get that
                const randomPass = generateRandomPassword();
                // console.log("Generated password:", randomPass);

                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/${endpoint}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: student.name,
                        email: student.email,
                        password: randomPass,
                        role: "student",
                    }),
                });

                if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || "Failed to send welcome email");
                }

                console.log("Notification sent to", student.email);
            } catch (error) {
                console.error(`Failed to send notification to ${email}:`, error);
            }
        }
    };

    // Bulk action logic
    const handleMenuAction = async (action) => {
        handleMenuClose(); // Close the menu

        let targetStatus;
        if (action === 'enable') {
            targetStatus = true;
        } else if (action === 'disable') {
            targetStatus = false;
        } else if (action === 'assign_team') {
            // Save the currently selected students so we know who to update
            setStudentsToAssign([...selectedStudents]);
            setIsTeamDialogOpen(true);
            return; // Stop here, the Dialog takes over
        } else if (action === 'edit_section') {
            setStudentsToAssign([...selectedStudents]);
            setIsSectionDialogOpen(true);
            return;
        } else if (action === 'notify') {
            setConfirmNotifyOpen(true);
            setMenuAnchorEl(null);
            return; // Stop here for other actions
        } else if (action === 'delete') { //delete students
            setIsDeleteDialogOpen(true);
            return;
        } else {
            return; // Unknown action
        }

        const originalSelectedStudents = students.filter(s =>
            selectedStudents.includes(s.user_id)
        );

        setStudents(currentStudents =>
            currentStudents.map(student =>
                selectedStudents.includes(student.user_id)
                    ? { ...student, is_enabled: targetStatus }
                    : student
            )
        );

        let failedUpdates = [];
        for (const studentId of selectedStudents) {
            try {
                const response = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/users/${studentId}`,
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
                    failedUpdates.push(studentId);
                }
            } catch (error) {
                failedUpdates.push(studentId);
                console.error(`Network error updating student ${studentId}:`, error);
            }
        }

        if (failedUpdates.length > 0) {
            alert(`Error: ${failedUpdates.length} student(s) failed to update. Reverting their status.`);

            setStudents(currentStudents =>
                currentStudents.map(student => {
                    if (failedUpdates.includes(student.user_id)) {
                        const originalStudent = originalSelectedStudents.find(
                            s => s.user_id === student.user_id
                        );
                        return originalStudent ? originalStudent : student; // Revert
                    }
                    return student;
                })
            );
        }

        setSelectedStudents([]);
    };

    const numSelected = selectedStudents.length;
    const rowCount = filteredStudents.length;

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
                    maxWidth: "1200px",
                    margin: "40px auto",
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        marginBottom: 3,
                    }}
                >
                    <IconButton
                        onClick={handleBack}
                        sx={{
                            position: 'absolute',
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
                        Manage Students
                    </Typography>
                </Box>

                {/* --- SEARCH BAR --- */}
                {/* --- TOOLBAR (Search & Actions) --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                    <TextField
                        variant="outlined"
                        placeholder="Search by name, email, team, sponsor, or section..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        sx={{ width: '100%', maxWidth: '400px' }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setIsAddStudentDialogOpen(true)}
                    >
                        + Add Student
                    </Button>
                </Box>
                {/* --- END OF SEARCH BAR --- */}

                <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                    <ToggleButtonGroup
                        color="primary"
                        value={filterStatus}
                        exclusive
                        onChange={handleFilterChange}
                        aria-label="Filter student status"
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
                            <MenuItem onClick={() => handleMenuAction('assign_team')}>Assign Team</MenuItem>
                            <MenuItem onClick={() => handleMenuAction('edit_section')}>Edit Section</MenuItem>
                            <MenuItem onClick={() => handleMenuAction('notify')}>Notify Selected</MenuItem>
                            <MenuItem
                                onClick={() => handleMenuAction('delete')} // delete button action
                                sx={{ color: theme.palette.error.main, fontWeight: 'bold' }}
                            >
                                Remove Selected
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                )}

                <Dialog
                    open={confirmNotifyOpen}
                    onClose={handleCancelNotify}
                    aria-labelledby="notify-confirmation-dialog-title"
                >
                    <DialogTitle id="notify-confirmation-dialog-title">
                        {isSendingNotify ? "Sending..." : notifySent ? "Notifications Sent" : "Confirm Notify"}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {isSendingNotify ? (
                                `Sending message to ${selectedStudents.length} student${selectedStudents.length === 1 ? '' : 's'}... Please wait.`
                            ) : notifySent ? (
                                `Notifications have been sent to ${selectedStudents.length} selected student${selectedStudents.length === 1 ? '' : 's'}.`
                            ) : (
                                `You have selected ${selectedStudents.length} student${selectedStudents.length === 1 ? '' : 's'}. Are you sure you want to notify them?`
                            )}
                        </DialogContentText>
                        {!isSendingNotify && !notifySent && (
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel id="notification-type-label">Notification type</InputLabel>
                                <Select
                                    labelId="notification-type-label"
                                    id="notification-type"
                                    value={selectedNotificationType}
                                    label="Notification type"
                                    onChange={(event) => setSelectedNotificationType(event.target.value)}
                                >
                                    <MenuItem value="email-notification">Welcome E-mail</MenuItem>
                                    {/* <MenuItem value="email-notification-2">Test2</MenuItem>
                                    <MenuItem value="email-notification-3">Test3</MenuItem> */}
                                </Select>
                            </FormControl>
                        )}
                    </DialogContent>
                    <DialogActions>
                        {!isSendingNotify && !notifySent && (
                            <>
                                <Button onClick={handleCancelNotify}>Cancel</Button>
                                <Button onClick={handleConfirmNotify} variant="contained" color="primary">
                                    Notify
                                </Button>
                            </>
                        )}
                        {isSendingNotify && (
                            <Button disabled variant="contained" color="primary">
                                Sending...
                            </Button>
                        )}
                        {notifySent && (
                            <Button onClick={handleCloseNotifyDialog} variant="contained" color="primary">
                                Close
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', marginY: 5 }}>
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
                                            inputProps={{ 'aria-label': 'select all students' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Name
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Email
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Team
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Sponsor
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Semester
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Section
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Enabled
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold", color: theme.palette.text.primary, backgroundColor: theme.palette.background.paper }}>
                                        Sponsor History
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredStudents.map((student) => {
                                    const isEnabled = student.is_enabled ?? true;
                                    const isItemSelected = isSelected(student.user_id);
                                    const labelId = `student-checkbox-${student.user_id}`;

                                    return (
                                        <TableRow
                                            key={student.user_id}
                                            hover
                                            onClick={(event) => handleSelectOne(event, student.user_id)}
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
                                                {student.name}
                                            </TableCell>
                                            <TableCell sx={{ color: theme.palette.text.primary }}>
                                                {student.email}
                                            </TableCell>
                                            <TableCell
                                                align="center"
                                                sx={{ color: theme.palette.text.primary }}
                                            >
                                                {student.team_name || "N/A"}
                                            </TableCell>
                                            <TableCell
                                                align="center"
                                                sx={{ color: theme.palette.text.primary }}
                                            >
                                                {student.sponsor || "N/A"}
                                            </TableCell>
                                            <TableCell
                                                align="center"
                                                sx={{ color: theme.palette.text.primary }}
                                            >
                                                {student.semester || "N/A"}
                                            </TableCell>
                                            <TableCell
                                                align="center"
                                                sx={{ color: theme.palette.text.primary }}
                                            >
                                                {student.section || "N/A"}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Switch
                                                    checked={isEnabled}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => handleToggleEnabled(student)}
                                                    color={isEnabled ? "success" : "error"}
                                                    inputProps={{ "aria-label": `toggle ${student.name}` }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={!student.team_id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/team-sponsor-history?team_id=${student.team_id}&team_name=${encodeURIComponent(student.team_name || "")}`);
                                                    }}
                                                >
                                                    Sponsor History
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
            <Dialog
                open={isTeamDialogOpen}
                onClose={() => !isAssigning && setIsTeamDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Assign Team</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 3 }}>
                        Select a team to assign to the {studentsToAssign.length} selected student(s).
                    </DialogContentText>
                    <FormControl fullWidth>
                        <InputLabel id="team-select-label">Team</InputLabel>
                        <Select
                            labelId="team-select-label"
                            value={selectedTeamId}
                            label="Team"
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            disabled={isAssigning}
                        >
                            {teams.map((team) => (
                                <MenuItem key={team.team_id} value={team.team_id}>
                                    {team.team_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setIsTeamDialogOpen(false)}
                        disabled={isAssigning}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAssignTeamSubmit}
                        disabled={!selectedTeamId || isAssigning}
                    >
                        {isAssigning ? <CircularProgress size={24} color="inherit" /> : "Assign"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- EDIT SECTION DIALOG --- */}
            <Dialog
                open={isSectionDialogOpen}
                onClose={() => !isAssigningSection && setIsSectionDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Edit Section</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 3 }}>
                        Enter the new section number for the {studentsToAssign.length} selected student(s).
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="section"
                        label="Section Number"
                        type="text" // Keep as text to prevent the up/down arrows, but enforce numbers via regex
                        fullWidth
                        variant="outlined"
                        value={selectedSection}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Only update state if the value is empty OR contains only numbers
                            if (value === '' || /^[0-9]+$/.test(value)) {
                                setSelectedSection(value);
                            }
                        }}
                        disabled={isAssigningSection}
                        slotProps={{
                            htmlInput: {
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                maxLength: 10 // Optional: prevent absurdly long section numbers
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setIsSectionDialogOpen(false)}
                        disabled={isAssigningSection}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleEditSectionSubmit}
                        disabled={!selectedSection.trim() || isAssigningSection}
                    >
                        {isAssigningSection ? <CircularProgress size={24} color="inherit" /> : "Save Section"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- STUDENT DIALOG --- */}
            <Dialog
                open={isAddStudentDialogOpen}
                onClose={() => !isAddingStudent && setIsAddStudentDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Add New Student</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Create a new student account. A temporary password will be auto-generated.
                    </DialogContentText>

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Full Name *"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newStudentData.name}
                        onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                        disabled={isAddingStudent}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        margin="dense"
                        label="Email Address *"
                        type="email"
                        fullWidth
                        variant="outlined"
                        value={newStudentData.email}
                        onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                        disabled={isAddingStudent}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        margin="dense"
                        label="Section Number"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newStudentData.section}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[0-9]+$/.test(val)) {
                                setNewStudentData({ ...newStudentData, section: val });
                            }
                        }}
                        disabled={isAddingStudent}
                        slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Semester"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newStudentData.semester}
                        onChange={(e) => setNewStudentData({ ...newStudentData, semester: e.target.value })}
                        disabled={isAddingStudent}
                        sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="add-student-team-label">Assign Team (Optional)</InputLabel>
                        <Select
                            labelId="add-student-team-label"
                            value={newStudentData.team_id}
                            label="Assign Team (Optional)"
                            onChange={(e) => setNewStudentData({ ...newStudentData, team_id: e.target.value })}
                            disabled={isAddingStudent}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {teams.map((team) => (
                                <MenuItem key={team.team_id} value={team.team_id}>
                                    {team.team_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        onClick={() => setIsAddStudentDialogOpen(false)}
                        disabled={isAddingStudent}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAddStudentSubmit}
                        disabled={!newStudentData.name.trim() || !newStudentData.email.trim() || isAddingStudent}
                    >
                        {isAddingStudent ? <CircularProgress size={24} color="inherit" /> : "Create Student"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- SUCCESS DIALOG (Shows Generated Password) --- */}
            <Dialog
                open={successData.isOpen}
                onClose={() => setSuccessData({ isOpen: false, password: "" })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ color: theme.palette.success.main, fontWeight: "bold" }}>
                    Student Added Successfully!
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

            {/* --- DELETE STUDENT CONFIRMATION DIALOG --- */}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ color: theme.palette.error.main, fontWeight: 'bold' }}>
                    Remove Student(s)?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to permanently remove the <strong>{selectedStudents.length}</strong> selected student(s)? This action cannot be undone and will remove all associated student data.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={isDeleting}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteSubmit}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : "Confirm Removal"}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default ManageStudents;