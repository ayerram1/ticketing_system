import Cookies from "js-cookie";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box, Button, Typography, TextField, FormControl,
    InputLabel, Select, MenuItem, Grid2 as Grid, CircularProgress,
    Snackbar, Alert, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, IconButton, Tooltip
} from '@mui/material';
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { loadTicketDraft, saveTicketDraft, removeTicketDraft } from "../../services/ticketDraftStorage";

const baseURL = process.env.REACT_APP_API_BASE_URL;

const CreateTicket = ({ onClose }) => {
    const theme = useTheme();
    const navigate = useNavigate();

    // Auth Data
    const token = Cookies.get("token");
    const userId = Cookies.get("user_id");
    const userName = Cookies.get("name") || "";

    // State for Role and Loading
    const [isStudent, setIsStudent] = useState(null);
    const [formLoadError, setFormLoadError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const submittedRef = useRef(false);
    const [pendingDraft, setPendingDraft] = useState(null);
    const [draftReady, setDraftReady] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const [draftError, setDraftError] = useState("");

    // Form State
    const [issueType, setIssueType] = useState("");
    const [description, setDescription] = useState("");
    const [instructorId, setInstructorId] = useState(""); // For Student view (Assigned TA/Grader)

    // Pop-up (Snackbar) State
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    const closeTicketForm = () => {
        persistDraft();
        if (onClose) {
            onClose();
            return;
        }

        navigate(-1);
    };

    // Function to close the pop-up
    const handleCloseToast = (event, reason) => {
        if (reason === 'clickaway') return;
        setToast({ ...toast, open: false });
    };

    // Team & Student Selection (For Staff/TA View)
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [studentsOnTeam, setStudentsOnTeam] = useState([]);

    // Data Lists
    const [studentData, setStudentData] = useState({ section: "", sponsor: "" });
    const [teamList, setTeamList] = useState([]);
    const [taList, setTaList] = useState([]);
    const [graderList, setGraderList] = useState([]);

    const draftValues = useMemo(() => ({
        issueType, description, instructorId, selectedTeamId, selectedStudentId,
    }), [issueType, description, instructorId, selectedTeamId, selectedStudentId]);

    const persistDraft = useCallback(() => {
        if (!draftReady || submittedRef.current || isStudent === null) return;
        const result = saveTicketDraft(userId, isStudent ? "student" : "staff", draftValues);
        setDraftSavedAt(result.savedAt);
        setDraftError(result.error);
    }, [draftReady, userId, isStudent, draftValues]);

    useEffect(() => {
        if (isStudent === null) return;
        const result = loadTicketDraft(userId, isStudent ? "student" : "staff");
        setPendingDraft(result.draft);
        setDraftError(result.error);
        setDraftReady(!result.draft);
    }, [userId, isStudent]);

    useEffect(() => {
        persistDraft();
    }, [persistDraft]);

    useEffect(() => {
        determineRoleAndLoadData();
    }, []);

    const determineRoleAndLoadData = async () => {
        setFormLoadError("");
        try {
            // 1. Check if user is a student
            const studentRes = await fetch(`${baseURL}/api/users/role/student`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!studentRes.ok) throw new Error("Could not load the ticket form.");
            const students = await studentRes.json();
            if (!Array.isArray(students)) throw new Error("Could not load the ticket form.");
            const me = students.find(s => String(s.user_id) === String(userId));

            if (me) {
                setStudentData({ section: me.section || "", sponsor: me.sponsor || "" });

                // Fetch the dropdown list of all teams
                await fetchTeams();

                // NEW: Fetch the specific student's assigned team
                try {
                    const myTeamRes = await fetch(`${baseURL}/api/studentdata/user/${userId}/team`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (myTeamRes.ok) {
                        const myTeamData = await myTeamRes.json();
                        // Auto-populate the team dropdown!
                        setSelectedTeamId(myTeamData.team_id);
                    }
                } catch (teamErr) {
                    console.error("Could not fetch student's assigned team:", teamErr);
                }

                // Load staff lists
                await Promise.all([
                    fetchUsersByRole("TA", setTaList),
                    fetchUsersByRole("grader", setGraderList),
                ]);
                setIsStudent(true);
            } else {
                await fetchTeams(); // TAs need the full team list to start the filter
                setIsStudent(false);
            }
        } catch (error) {
            console.error("Role detection failed:", error);
            setFormLoadError("The ticket form could not be loaded. Your saved draft has not been changed.");
        }
    };

    const fetchTeams = async () => {
        const res = await fetch(`${baseURL}/api/teams`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Could not load teams.");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Could not load teams.");
        setTeamList(data);
    };

    const fetchUsersByRole = async (role, setter) => {
        const res = await fetch(`${baseURL}/api/users/role/${role}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Could not load staff.");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Could not load staff.");
        setter(data);
    };

    // New: Fetch students when a TA selects a team
    const handleTeamChange = async (teamId, restoredStudentId = "") => {
        setSelectedTeamId(teamId);
        setSelectedStudentId(""); // Reset student selection
        setStudentsOnTeam([]);

        if (!teamId) return [];

        try {
            const res = await fetch(`${baseURL}/api/studentdata/team/${teamId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Could not load students for this team.");
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Could not load students for this team.");
            const students = data;
            setStudentsOnTeam(students);
            const restoredStudent = students.find((student) => String(student.user_id) === String(restoredStudentId));
            if (restoredStudent) setSelectedStudentId(restoredStudent.user_id);
            return students;
        } catch (error) {
            console.error("Error fetching students for team:", error);
            setToast({ open: true, message: "Could not load students for this team. Please try again.", severity: "error" });
            return null;
        }
    };

    const handleResumeDraft = async () => {
        const { values } = pendingDraft;
        setLoading(true);
        setIssueType(values.issueType);
        setDescription(values.description);
        let needsReview = false;

        if (isStudent) {
            const staffList = values.issueType === "gradeAppeal" ? graderList : taList;
            const staff = staffList.find((person) => String(person.user_id) === values.instructorId && person.is_enabled !== false);
            setInstructorId(staff ? staff.user_id : "");
            needsReview = Boolean(values.instructorId && !staff);
        } else {
            const team = teamList.find((item) => String(item.team_id) === values.selectedTeamId);
            if (team) {
                const students = await handleTeamChange(team.team_id, values.selectedStudentId);
                if (students === null) {
                    setLoading(false);
                    return;
                }
                needsReview = Boolean(values.selectedStudentId && !students.some((student) => String(student.user_id) === values.selectedStudentId));
            } else {
                needsReview = Boolean(values.selectedTeamId);
            }
        }

        setPendingDraft(null);
        setDraftReady(true);
        setLoading(false);
        if (needsReview) {
            setToast({ open: true, message: "Some saved selections are no longer available. Please select them again.", severity: "warning" });
        }
    };

    const handleDiscardDraft = () => {
        const error = removeTicketDraft(userId);
        setDraftError(error);
        if (error) return;
        setPendingDraft(null);
        setDraftSavedAt(null);
        setDraftReady(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading || submittedRef.current || !draftReady) return;
        persistDraft();
        setLoading(true);

        try {
            const endpoint = isStudent ? `${baseURL}/api/tickets` : `${baseURL}/api/tatickets`;

            const payload = isStudent ? {
                team_id: selectedTeamId,
                student_id: userId,
                sponsor_name: studentData.sponsor,
                section: studentData.section,
                issue_type: issueType,
                issue_description: description,
            } : {
                ta_id: userId,
                student_id: selectedStudentId, // The "On Behalf Of" student
                issue_type: issueType,
                issue_description: description,
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create ticket.");
            }

            const ticket = await response.json();
            submittedRef.current = true;
            setSubmitted(true);
            setDraftReady(false);
            const clearError = removeTicketDraft(userId);
            setDraftSavedAt(null);
            setDraftError(clearError);

            // Handle Student Assignment logic (if Student created it)
            if (isStudent && instructorId) {
                await fetch(`${baseURL}/api/ticketassignments/ticket/${ticket.ticket_id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ user_id: instructorId }),
                });
            }

            setToast({ open: true, message: "Ticket submitted successfully!", severity: "success" });

            if (clearError) return;

            // Delay the close and reload so the user can read the pop-up
            setTimeout(() => {
                closeTicketForm();
                window.location.reload();
            }, 1500);
        } catch (error) {
            setToast({ open: true, message: error.message || "An error occurred", severity: "error" });        }
        finally {
            setLoading(false);
        }
    };

    if (isStudent === null) {
        return (
            <Box role="dialog" aria-label="Loading ticket form" sx={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'rgba(0, 0, 0, 0.4)' }}>
                {formLoadError ? (
                    <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 1, width: '90%', maxWidth: 480 }}>
                        <Alert severity="error">{formLoadError}</Alert>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                            <Button onClick={closeTicketForm}>Close</Button>
                            <Button onClick={determineRoleAndLoadData} variant="contained">Retry</Button>
                        </Box>
                    </Box>
                ) : <CircularProgress />}
            </Box>
        );
    }

    return (
        <Box sx={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            bgcolor: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1000
        }}>
            <Box sx={{
                bgcolor: theme.palette.background.paper, p: 4, borderRadius: 2,
                width: '95%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
                boxSizing: 'border-box', position: 'relative', boxShadow: 24
            }}>
                <Tooltip title="Close">
                    <IconButton aria-label="Close ticket form" onClick={closeTicketForm} disabled={loading} sx={{ position: "absolute", top: 8, right: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </Tooltip>

                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, textAlign: 'center', color: '#8C1D40' }}>
                    {isStudent ? "New Student Ticket" : "New Staff/TA Ticket"}
                </Typography>

                {draftError && <Alert severity="warning" sx={{ mb: 2 }}>{draftError}</Alert>}

                <Box component="form" aria-label="Create ticket" onSubmit={handleSubmit}>
                <Box component="fieldset" disabled={loading || submitted || !draftReady} sx={{ m: 0, p: 0, border: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Grid container spacing={2}>
                        <Grid size={isStudent ? 4 : 12}>
                            <TextField label={isStudent ? "Name" : "Created By (TA)"} variant="filled" size="small" value={userName} fullWidth InputProps={{ readOnly: true }} />
                        </Grid>
                        {isStudent && (
                            <>
                                <Grid size={4}><TextField label="Section" variant="filled" size="small" value={studentData.section} fullWidth InputProps={{ readOnly: true }} /></Grid>
                                <Grid size={4}><TextField label="Sponsor" variant="filled" size="small" value={studentData.sponsor} fullWidth InputProps={{ readOnly: true }} /></Grid>
                            </>
                        )}
                    </Grid>

                    {/* Team Selection */}
                    {isStudent ? (
                        <TextField
                            label="Assigned Team"
                            variant="filled"
                            size="small"
                            value={teamList.find(t => t.team_id === selectedTeamId)?.team_name || "Loading..."}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                    ) : (
                        <FormControl fullWidth required>
                            <InputLabel id="ticket-team-label">Team Name</InputLabel>
                            <Select
                                labelId="ticket-team-label"
                                disabled={loading || submitted || !draftReady}
                                value={selectedTeamId}
                                label="Team Name"
                                onChange={(e) => handleTeamChange(e.target.value)}
                            >
                                {teamList.map((t) => (
                                    <MenuItem key={t.team_id} value={t.team_id}>
                                        {t.team_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* On Behalf Of - Staff Only */}
                    {!isStudent && selectedTeamId && (
                        <FormControl fullWidth required>
                            <InputLabel id="ticket-student-label">On Behalf Of (Student)</InputLabel>
                            <Select
                                labelId="ticket-student-label"
                                disabled={loading || submitted || !draftReady}
                                value={selectedStudentId}
                                label="On Behalf Of (Student)"
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                            >
                                {studentsOnTeam.map((s) => (
                                    <MenuItem key={s.user_id} value={s.user_id}>{s.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl fullWidth required>
                        <InputLabel id="ticket-issue-label">Issue Type</InputLabel>
                        <Select labelId="ticket-issue-label" disabled={loading || submitted || !draftReady} value={issueType} label="Issue Type" onChange={(e) => { setIssueType(e.target.value); setInstructorId(""); }}>
                            <MenuItem value="sponsorIssue">Issues communicating with the Sponsor</MenuItem>
                            <MenuItem value="sponsorWorkingIssue">Issues working with the Sponsor</MenuItem>
                            <MenuItem value="teamIssue">Issues within the Team</MenuItem>
                            <MenuItem value="teamMemberIssue">Issues with a team mate</MenuItem>
                            <MenuItem value="gradeAppeal">Appeal to an assignment grade </MenuItem>
                            <MenuItem value="extensionRequest">Request an extension for an assignment</MenuItem>
                            <MenuItem value="accommodationRequest">Request an accommodation for the course</MenuItem>
                            <MenuItem value="generalQuestion">General questions about the course</MenuItem>
                            <MenuItem value="Feature Request">Feature Request</MenuItem>
                            <MenuItem value="Question">Question about this system</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Student-only Staff Assignment */}
                    {isStudent && (
                        <FormControl fullWidth required>
                            <InputLabel id="ticket-staff-label">{issueType === "gradeAppeal" ? "Assigned Grader" : "Assigned TA"}</InputLabel>
                            <Select
                                labelId="ticket-staff-label"
                                value={instructorId}
                                label={issueType === "gradeAppeal" ? "Assigned Grader" : "Assigned TA"}
                                onChange={(e) => setInstructorId(e.target.value)}
                                disabled={!issueType || loading || submitted || !draftReady}
                            >
                                {(issueType === "gradeAppeal" ? graderList : taList).map((staff) => (
                                    <MenuItem key={staff.user_id} value={staff.user_id}>{staff.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <TextField
                        label="Description" required fullWidth multiline rows={4}
                        value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please provide as much detail as possible..."
                        slotProps={{htmlInput: { maxLength: 3000 }}} 
                    />

                    {draftSavedAt && !draftError && (
                        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                            <CheckCircleOutlineIcon fontSize="small" />
                            <Typography variant="caption">Draft saved</Typography>
                        </Box>
                    )}

                    <Button type="submit" variant="contained" disabled={loading || submitted || !draftReady}
                            sx={{ py: 1.5, bgcolor: "#8C1D40", fontWeight: 'bold', "&:hover": { bgcolor: "#5F0E24" } }}>
                        {loading ? <CircularProgress size={24} color="inherit" /> : submitted ? "Ticket Submitted" : "Submit Ticket"}
                    </Button>
                </Box>
                </Box>
            </Box>
            <Dialog open={Boolean(pendingDraft)} aria-labelledby="ticket-draft-title" fullWidth maxWidth="xs">
                <DialogTitle id="ticket-draft-title">Resume ticket draft?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {pendingDraft && `Last saved ${new Date(pendingDraft.savedAt).toLocaleString()}`}
                    </DialogContentText>
                    {draftError && <Alert severity="warning" sx={{ mt: 2 }}>{draftError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDiscardDraft} disabled={loading}>Discard Draft</Button>
                    <Button onClick={handleResumeDraft} disabled={loading} variant="contained">Resume Draft</Button>
                </DialogActions>
            </Dialog>
            {/* NEW: Material-UI Snackbar Pop-up */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', boxShadow: 3 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CreateTicket;
