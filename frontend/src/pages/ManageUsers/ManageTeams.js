import React, { useEffect, useState, useMemo } from "react";
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
    IconButton,
    TextField,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";

const ManageTeam = () => {
    // --- Data States ---
    const [teams, setTeams] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [graders, setGraders] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Action States ---
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Create States
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTeamData, setNewTeamData] = useState({
        team_name: "",
        instructor_user_id: "",
        sponsor_name: "",
        sponsor_email: "",
        grader_user_id: "" // Used locally for selection
    });

    // Edit States
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editTeamData, setEditTeamData] = useState({
        team_name: "",
        instructor_user_id: "",
        sponsor_name: "",
        sponsor_email: "",
        grader_user_id: ""
    });

    // Delete States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const token = Cookies.get("token");
    const theme = useTheme();
    const navigate = useNavigate();

    // Initial data fetch
    useEffect(() => {
        fetchTeams();
        fetchStaff();
    }, []);

    const fetchTeams = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/teams`, {
                method: "GET",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch teams.");
            setTeams(await response.json());
        } catch (error) {
            console.error("Failed to load teams:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const resInst = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/role/TA`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resInst.ok) setInstructors(await resInst.json());

            const resGrad = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/role/grader`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resGrad.ok) setGraders(await resGrad.json());
        } catch (error) {
            console.error("Failed to fetch staff lists:", error);
        }
    };

    const handleBack = () => navigate(-1);
    const handleSearchChange = (event) => setSearchQuery(event.target.value);

    // --- CREATE HANDLERS ---
    const handleCreateClick = () => {
        setNewTeamData({ team_name: "", instructor_user_id: "", sponsor_name: "", sponsor_email: "", grader_user_id: "" });
        setIsCreateDialogOpen(true);
    };

    const handleCreateSubmit = async () => {
        const { team_name, instructor_user_id, sponsor_name, sponsor_email, grader_user_id } = newTeamData;
        if (!team_name.trim()) return;

        setIsProcessing(true);

        const selectedGrader = graders.find(g => g.user_id === grader_user_id);
        const payload = {
            team_name: team_name.trim(),
            instructor_user_id: instructor_user_id || null,
            sponsor_name: sponsor_name.trim() || null,
            sponsor_email: sponsor_email.trim() || null,
            grader_name: selectedGrader ? selectedGrader.name : null,
            grader_email: selectedGrader ? selectedGrader.email : null
        };

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to create team.");
            const createdTeam = await response.json();

            setTeams(currentTeams => [...currentTeams, createdTeam]);
            setIsCreateDialogOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error creating team: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- EDIT HANDLERS ---
    const handleEditClick = (team) => {
        setSelectedTeam(team);

        // Attempt to find the grader's user_id by matching their email to our graders list
        const matchedGrader = graders.find(g => g.email === team.grader_email);

        setEditTeamData({
            team_name: team.team_name || "",
            instructor_user_id: team.instructor_user_id || "",
            sponsor_name: team.sponsor_name || "",
            sponsor_email: team.sponsor_email || "",
            grader_user_id: matchedGrader ? matchedGrader.user_id : ""
        });
        setIsEditDialogOpen(true);
    };

    const handleEditSubmit = async () => {
        const { team_name, instructor_user_id, sponsor_name, sponsor_email, grader_user_id } = editTeamData;
        if (!team_name.trim() || !selectedTeam) return;

        setIsProcessing(true);

        const selectedGrader = graders.find(g => g.user_id === grader_user_id);
        const payload = {
            team_name: team_name.trim(),
            instructor_user_id: instructor_user_id || null,
            sponsor_name: sponsor_name.trim() || null,
            sponsor_email: sponsor_email.trim() || null,
            grader_name: selectedGrader ? selectedGrader.name : null,
            grader_email: selectedGrader ? selectedGrader.email : null
        };

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/teams/${selectedTeam.team_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to update team.");

            setTeams(currentTeams =>
                currentTeams.map(t =>
                    t.team_id === selectedTeam.team_id ? { ...t, ...payload } : t
                )
            );

            setIsEditDialogOpen(false);
        } catch (error) {
            console.error(error);
            alert("An error occurred while updating the team.");
        } finally {
            setIsProcessing(false);
            setSelectedTeam(null);
        }
    };

    // --- DELETE HANDLERS ---
    const handleDeleteClick = (team) => {
        setSelectedTeam(team);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteSubmit = async () => {
        if (!selectedTeam) return;
        setIsProcessing(true);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/teams/${selectedTeam.team_id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to delete team.");
            setTeams(currentTeams => currentTeams.filter(t => t.team_id !== selectedTeam.team_id));
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error(error);
            alert("An error occurred while deleting the team.");
        } finally {
            setIsProcessing(false);
            setSelectedTeam(null);
        }
    };

    // Performant local filtering
    const filteredTeams = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (!lowerCaseQuery) return teams;

        return teams.filter(team => {
            const name = team.team_name?.toLowerCase() || "";
            const sponsor = team.sponsor_name?.toLowerCase() || "";
            const grader = team.grader_name?.toLowerCase() || "";
            return name.includes(lowerCaseQuery) || sponsor.includes(lowerCaseQuery) || grader.includes(lowerCaseQuery);
        });
    }, [teams, searchQuery]);

    // Helper to get instructor name for table display
    const getInstructorName = (id) => {
        const inst = instructors.find(i => i.user_id === id);
        return inst ? inst.name : "Unassigned";
    };

    return (
        <Box sx={{ minHeight: "calc(100vh - 60px)", backgroundColor: theme.palette.background.default, padding: "20px 0" }}>
            <Box sx={{ padding: 5, backgroundColor: theme.palette.background.paper, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", maxWidth: "1100px", margin: "40px auto" }}>

                {/* --- HEADER --- */}
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: 4 }}>
                    <IconButton onClick={handleBack} sx={{ position: 'absolute', left: 0, color: theme.palette.text.primary }}>
                        <ArrowBackIosNewIcon />
                    </IconButton>
                    <Typography variant="h4" sx={{ flexGrow: 1, textAlign: "center", fontWeight: "bold", color: theme.palette.text.primary }}>
                        Manage Teams
                    </Typography>
                </Box>

                {/* --- TOOLBAR --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                    <TextField
                        variant="outlined"
                        placeholder="Search teams, sponsors, or graders..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        sx={{ width: '100%', maxWidth: '400px' }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    />
                    <Button variant="contained" color="primary" onClick={handleCreateClick}>
                        + Create New Team
                    </Button>
                </Box>

                {/* --- DATA TABLE --- */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', marginY: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper} sx={{ boxShadow: "none", border: `1px solid ${theme.palette.divider}` }}>
                        <Table>
                            <TableHead sx={{ backgroundColor: theme.palette.action.hover }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Team Name</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Instructor</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Sponsor</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Grader</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold" }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTeams.length > 0 ? (
                                    filteredTeams.map((team, index) => (
                                        <TableRow key={team.team_id || index} hover>
                                            <TableCell sx={{ color: theme.palette.text.secondary }}>{team.team_id}</TableCell>
                                            <TableCell sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>{team.team_name}</TableCell>
                                            <TableCell sx={{ color: theme.palette.text.secondary }}>{getInstructorName(team.instructor_user_id)}</TableCell>
                                            <TableCell sx={{ color: theme.palette.text.secondary }}>{team.sponsor_name || "N/A"}</TableCell>
                                            <TableCell sx={{ color: theme.palette.text.secondary }}>{team.grader_name || "N/A"}</TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ mr: 1 }}
                                                    onClick={() => navigate(`/team-sponsor-history?team_id=${team.team_id}&team_name=${encodeURIComponent(team.team_name)}`)}
                                                >
                                                    Sponsor History
                                                </Button>
                                                <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleEditClick(team)}>
                                                    Edit
                                                </Button>
                                                <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteClick(team)}>
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: theme.palette.text.secondary }}>
                                            No teams found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* --- CREATE TEAM DIALOG --- */}
            <Dialog open={isCreateDialogOpen} onClose={() => !isProcessing && setIsCreateDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create New Team</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Team Name *" fullWidth value={newTeamData.team_name} onChange={(e) => setNewTeamData({ ...newTeamData, team_name: e.target.value })} disabled={isProcessing} />

                        <FormControl fullWidth>
                            <InputLabel>Instructor</InputLabel>
                            <Select value={newTeamData.instructor_user_id} label="Instructor" onChange={(e) => setNewTeamData({ ...newTeamData, instructor_user_id: e.target.value })} disabled={isProcessing}>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {instructors.map((inst) => <MenuItem key={inst.user_id} value={inst.user_id}>{inst.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Grader</InputLabel>
                            <Select value={newTeamData.grader_user_id} label="Grader" onChange={(e) => setNewTeamData({ ...newTeamData, grader_user_id: e.target.value })} disabled={isProcessing}>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {graders.map((grad) => <MenuItem key={grad.user_id} value={grad.user_id}>{grad.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField label="Sponsor Name" fullWidth value={newTeamData.sponsor_name} onChange={(e) => setNewTeamData({ ...newTeamData, sponsor_name: e.target.value })} disabled={isProcessing} />
                            <TextField label="Sponsor Email" fullWidth value={newTeamData.sponsor_email} onChange={(e) => setNewTeamData({ ...newTeamData, sponsor_email: e.target.value })} disabled={isProcessing} />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsCreateDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleCreateSubmit} variant="contained" disabled={!newTeamData.team_name.trim() || isProcessing}>
                        {isProcessing ? <CircularProgress size={24} /> : "Create Team"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- EDIT TEAM DIALOG --- */}
            <Dialog open={isEditDialogOpen} onClose={() => !isProcessing && setIsEditDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Team</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Team Name *" fullWidth value={editTeamData.team_name} onChange={(e) => setEditTeamData({ ...editTeamData, team_name: e.target.value })} disabled={isProcessing} />

                        <FormControl fullWidth>
                            <InputLabel>Instructor</InputLabel>
                            <Select value={editTeamData.instructor_user_id} label="Instructor" onChange={(e) => setEditTeamData({ ...editTeamData, instructor_user_id: e.target.value })} disabled={isProcessing}>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {instructors.map((inst) => <MenuItem key={inst.user_id} value={inst.user_id}>{inst.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Grader</InputLabel>
                            <Select value={editTeamData.grader_user_id} label="Grader" onChange={(e) => setEditTeamData({ ...editTeamData, grader_user_id: e.target.value })} disabled={isProcessing}>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {graders.map((grad) => <MenuItem key={grad.user_id} value={grad.user_id}>{grad.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField label="Sponsor Name" fullWidth value={editTeamData.sponsor_name} onChange={(e) => setEditTeamData({ ...editTeamData, sponsor_name: e.target.value })} disabled={isProcessing} />
                            <TextField label="Sponsor Email" fullWidth value={editTeamData.sponsor_email} onChange={(e) => setEditTeamData({ ...editTeamData, sponsor_email: e.target.value })} disabled={isProcessing} />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleEditSubmit} variant="contained" disabled={!editTeamData.team_name.trim() || isProcessing}>
                        {isProcessing ? <CircularProgress size={24} /> : "Save Changes"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- DELETE TEAM CONFIRMATION DIALOG --- */}
            <Dialog open={isDeleteDialogOpen} onClose={() => !isProcessing && setIsDeleteDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ color: theme.palette.error.main }}>Delete Team?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{selectedTeam?.team_name}</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleDeleteSubmit} variant="contained" color="error" disabled={isProcessing}>
                        {isProcessing ? <CircularProgress size={24} /> : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ManageTeam;