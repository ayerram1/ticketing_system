import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Modal } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const baseURL = process.env.REACT_APP_API_BASE_URL;

// Fetch current ticket details
//const ticketId = urlParameters.get("ticket");

const TaEditTicket = ({ onClose}) => {
    const theme = useTheme();
    const [instructorName, setInstructorName] = useState("");
    // const [section, setSection] = useState("");
    // const [team, setTeam] = useState("");
    // const [sponsorName, setSponsorName] = useState("");
    // const [instructor, setInstructor] = useState("");
    const [issueType, setIssueType] = useState("");
    const [description, setDescription] = useState("");
    // const [teamList, setTeamList] = useState([]); //empty array
    // const [taList, setTaList] = useState([]); //empty array

    const location = useLocation();
    const urlParameters = new URLSearchParams(location.search);
    const ticketId = urlParameters.get("ticket");

    useEffect(() => {
        console.log("Fetching ticket details for ticketId:", ticketId);
        fetchTicketDetails(ticketId);
        // fetchTAs();
        // fetchTeams();
    }, []);

    // Fetch TA users from the API
    // const fetchTAs = async () => {
    //     try {
    //         const token = Cookies.get("token");
    //         const response = await fetch(`${baseURL}/api/users/role/TA`, {
    //             method: "GET",
    //             headers: {
    //                 "Content-Type": "application/json",
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         });
    //         const data = await response.json();
    //         setTaList(Array.isArray(data) ? data : []);
    //     } catch (error) {
    //         console.error("Failed to fetch TAs:", error);
    //         setTaList([]); // Fallback to empty array
    //     }
    // };

    // // Fetch Teams from the API
    // const fetchTeams = async () => {
    //     try {
    //         const token = Cookies.get("token");
    //         const response = await fetch(`${baseURL}/api/teams`, {
    //             method: "GET",
    //             headers: {
    //                 "Content-Type": "application/json",
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         });
    //         const data = await response.json();
    //         setTeamList(Array.isArray(data) ? data : []);
    //     } catch (error) {
    //         console.error("Failed to fetch teams:", error);
    //         setTeamList([]); // Fallback to empty array
    //     }
    // };

    const fetchTicketDetails = async (event) => {
        try {
            const token = Cookies.get("token");

            const response = await fetch(`${baseURL}/api/tatickets/${ticketId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const ticketData = await response.json();
            console.log("Fetched ticket data:", ticketData);

            setInstructorName(ticketData.ta.name);
            // setTeam(ticketData.team_id);
            // setSponsorName(ticketData.sponsor_name);
            // setSection(ticketData.section);
            //setInstructor(ticketData.instructor_id);
            setIssueType(ticketData.issue_type);
            setDescription(ticketData.issue_description);
        } catch (error) {
            console.error("Failed to fetch ticket details:", error);
        }
    };


    // Handle submission for editing the ticket
    const handleEdit = async (event) => {
        event.preventDefault();

        console.log("Submitting ticket data:", {
            // team_id: team,
            // sponsor_name: sponsorName,
            // section: section,
            issue_type: issueType,
            issue_description: description,
            //instructor_id: instructor,
        });

        try {
            const token = Cookies.get("token");
            const response = await fetch(`${baseURL}/api/tatickets/${ticketId}/edit`, {
                method: "PUT", // Use PUT or PATCH based on your backend setup
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    // team_id: team,
                    // sponsor_name: sponsorName,
                    // section: section,
                    issue_type: issueType,
                    issue_description: description,
                    //instructor_id: instructor, // Update assigned TA if necessary
                }),
            });

            const responseData = await response.json();
            console.log("Response from server:", responseData);

            if(response.ok) {
                alert("Ticket updated successfully!");
                onClose(); // Close the modal after updating
                window.location.reload(); //refresh page to reflect new changes
            }
            else {
                console.error("Failed to update ticket:", responseData.message || "Unknown error");
                alert("Failed to update ticket.");
            }
        } catch (error) {
            console.error("Error updating ticket:", error);
            alert("Failed to update the ticket.");
        }
    };

    console.log("Current state values:", {
        instructorName,
        // section,
        // team,
        // sponsorName,
        //instructor,
        issueType,
        description,
    });


    return (
        <Modal open={true} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 600,
                    maxWidth: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    bgcolor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                }}
            >
                <Button
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        minWidth: "32px",
                        minHeight: "32px",
                        borderRadius: "50%",
                        backgroundColor: theme.palette.primary.main,
                        color: "white",
                        "&:hover": {
                            backgroundColor: theme.palette.primary.dark,
                        },
                    }}
                >
                    &times;
                </Button>

                <Typography variant="h4" component="h1" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
                    Edit Ticket
                </Typography>

                <Box component="form" onSubmit={handleEdit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Instructor Name"
                        type="text"
                        value={instructorName}
                        onChange={(e) => setInstructorName(e.target.value)}
                        disabled
                        fullWidth
                        variant="outlined"
                    />

                    {/*<TextField*/}
                    {/*    label="Section"*/}
                    {/*    type="text"*/}
                    {/*    value={section}*/}
                    {/*    onChange={(e) => setSection(e.target.value)}*/}
                    {/*    required*/}
                    {/*    fullWidth*/}
                    {/*    variant="outlined"*/}
                    {/*/>*/}

                    {/*<FormControl fullWidth required>*/}
                    {/*    <InputLabel>Team</InputLabel>*/}
                    {/*    <Select*/}
                    {/*        value={team}*/}
                    {/*        onChange={(e) => setTeam(e.target.value)}*/}
                    {/*        label="Team"*/}
                    {/*    >*/}
                    {/*        <MenuItem value="">Select a team</MenuItem>*/}
                    {/*        {teamList.map((team) => (*/}
                    {/*            <MenuItem key={team.team_id} value={team.team_id}>*/}
                    {/*                {team.team_name}*/}
                    {/*            </MenuItem>*/}
                    {/*        ))}*/}
                    {/*    </Select>*/}
                    {/*</FormControl>*/}

                    {/*<TextField*/}
                    {/*    label="Sponsor Name"*/}
                    {/*    type="text"*/}
                    {/*    value={sponsorName}*/}
                    {/*    onChange={(e) => setSponsorName(e.target.value)}*/}
                    {/*    required*/}
                    {/*    fullWidth*/}
                    {/*    variant="outlined"*/}
                    {/*/>*/}

                    <FormControl fullWidth required>
                        <InputLabel>Issue Type</InputLabel>
                        <Select
                            value={issueType}
                            onChange={(e) => setIssueType(e.target.value)}
                            label="Issue Type"
                        >
                            <MenuItem value="">Select an issue</MenuItem>
                            <MenuItem value="sponsorIssue">Issues communicating with the Sponsor</MenuItem>
                            <MenuItem value="sponsorWorkingIssue">Issues working with the Sponsor</MenuItem>
                            <MenuItem value="teamIssue">Issues within the Team</MenuItem>
                            <MenuItem value="teamMemberIssue">Issues with a team mate</MenuItem>
                            <MenuItem value="gradeAppeal">Grade Appeal</MenuItem>
                            <MenuItem value="extensionRequest">Extension request</MenuItem>
                            <MenuItem value="accommodationRequest">Accommodation request</MenuItem>
                            <MenuItem value="generalQuestion">General question about the course</MenuItem>
                            <MenuItem value="FeatureRequest">Feature Request</MenuItem>
                            <MenuItem value="Question">Question</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        fullWidth
                        multiline
                        rows={8}
                        variant="outlined"
                        slotProps={{htmlInput: { maxLength: 3000 }}}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        sx={{
                            mt: 2,
                            backgroundColor: theme.palette.primary.main,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.dark,
                            },
                        }}
                    >
                        Update Ticket
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default TaEditTicket;

