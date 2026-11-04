import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import React from "react";

const ROLE_DISPLAY_NAMES = {
  student: "Students",
  TA: "TAs",
  grader: "Graders",
  admin: "Admins",
  developer: "Developers",
};

const FAQ_ITEMS = [
  // All users
  {
    id: "create-ticket",
    question: "How do I create a ticket?",
    answer:
      "Use the Create A Ticket option in the sidebar, complete the form, and submit.",
  },
  {
    id: "check-ticket-status",
    question: "How do I check my ticket status?",
    answer:
      "Open your tickets list and select a ticket to view its current status and details.",
  },
  {
    id: "ticket-status-meaning",
    question: "What do ticket statuses mean?",
    answer:
      "New means recently submitted, Ongoing means in progress, and Resolved means completed.",
  },
  {
    id: "update-password",
    question: "How do I update my account password?",
    answer: "Go to your account/profile area and use the change password option.", 
  },
  {
    id: "forgot-password",
    question: "I forgot my password. What should I do?",
    answer:
      "Use the reset password flow from the login page to request a password reset link.",
  },
  {
    id: "report-problems",
    question: "Where can I report problems with the system?",
    answer:
      "Use the Report a Bug option from the profile menu to submit technical issues. You can check the status of your reports any time under My Bug Reports in the sidebar.",
  },
  {
    id: "all-assignees",
    question: "What is 'All Assignees' for?",
    answer:
      "This is where users can find all relevant faculty members and their office hours in one centralized place. Users can see what tickets they have assigned with a staff member and who is available to help them.",
  },
  {
    id: "email-notifications",
    question: "Where can I turn off email notifications?",
    answer:
      "In the top right, select your user icon and select 'Settings'. Under preferences, you are able to opt in or out of the email notifications system that we use to notify about ticket statuses and escalated tickets. ",
  },
  // Students
  {
    id: "replying-to-tickets",
    question: "What is the reply feature to tickets that I have submitted?",
    answer: "The reply feature is a way to have a conversation history on a ticket that you have submitted. It is not possible to make edits to a ticket after it has been submitted. This can only be done by the grader/TA that has been assigned to your ticket.",
    roles: ["student"]
  },
  {
    id: "changes-in-class-or-sponsor",
    question: "After account creation my sponsor was changed or my class was updated, what do I do?",
    answer: "Initial sponsor and class is assigned to your account after account creation and cannot be changed without the help of an administrator. Please contact your teacher or an admin for further assistance and further guidance.",
    roles: ["student"]
  },
  // TAs and Graders and Admin
  {
    id: "assigned-vs-mytickets",
    question: "What is the difference between Assigned Tickets and My Tickets?",
    answer: "Assigned tickets are tickets that have been assigned to you from another user. This can be from a student or a user that you report to. Graders and TAs are able to submit their own tickets and can be seen in the 'My Tickets' tab to keep track of their own ticket submissions. ",
    roles: ["TA", "grader", "admin"]
  },
  {
    id: "ticket-escalation",
    question: "What is a ticket escalation and how do I do it?",
    answer: "Escalated tickets require urgent attention. As a grader, ticket escalation goes to your TA. As a TA, ticket escalation goes to the admin. Appropriate users are notified via email upon ticket escalations. Once escalated, tickets can only be resolved by the recipient.",
    roles: ["TA", "grader", "admin"]
  },  
  {
    id: "ticket-sharing",
    question: "What is ticket sharing?",
    answer: "When you are assigned tickets, you can share them with other faculty members by selecting the ticket and choosing who you want to share it with. This action cannot be undone, contact an administrator if issues arise or a mistake is made.",
    roles: ["TA", "grader", "admin"]
  },
  {
    id: "setting-office-hours",
    question: "How do I set my office hours?",
    answer: "Go to the 'All Assignees' tab and find your profile. Click on 'View Profile' and scroll down to office hours and select 'Edit' to add your office hours. Your schedule can be seen from other users and can be updated accordingly, ensure it is always up to date so other students and staff can know when to reach out to you for help!",
    roles: ["TA", "grader", "admin"]
  },
  {
    id: "ticket-closing",
    question: "What happens when a ticket is closed/resolved?",
    answer: "Tickets are not deleted from the system when they are closed. This is so previous tickets can be used for reference for future situations and to keep track of them appropriately. If you are unsure with what to do next with a ticket contact another faculty member or administrator.",
    roles: ["TA", "grader", "admin"]
  },
  /*
  {
    id: "resolving-escalations",
    question: "What happens if I were to resolve an escalated ticket?",              FIXME
    answer: "",
    roles: ["TA", "grader", "admin"]
  },*/

  // Admin
  {
    id: "adding-users",
    question: "Where can I add a single, specific type of user, instead of through the bulk upload?",
    answer: "In the top right, select the profile icon and go to 'Settings'. Under people management, the admin is able to add a single user if they have the appropiate information or use our templates to upload users and class information in bulk.",
    roles: ["admin"]
  },
  {
    id: "bulk-upload",
    question: "Where can I upload my class and student information for a project?",
    answer: "In the top right, select the profile icon and go to 'Settings'. Under data management, go to data upload and download the given project and student templates to upload data to our system. Ensure that the project is uploaded first before trying to upload student information. If an error were to occur, please contact the developer team for more help or to verify that data is uploaded correctly.",
    roles: ["admin"]
  },

    // Developers
  {
    id: "dev-bug-status-meaning",
    question: "What do the bug report statuses mean?",
    answer:
      "Open means newly submitted and not yet reviewed. Triaged means reviewed and prioritized. In Progress means someone is working on it. Resolved means a fix is done. Closed means finished and locked.",
    roles: ["developer"],
  },
  {
    id: "dev-bug-severity-meaning",
    question: "How should I choose a severity?",
    answer:
      "Low is a cosmetic or minor issue. Medium affects a feature but has a workaround. High blocks a feature for many users. Critical means the system is unusable or data is at risk.",
    roles: ["developer"],
  },
  {
    id: "dev-update-bug",
    question: "How do I update a bug report?",
    answer:
      "Click a report in the table to open it, change the status or severity, and press Save Changes.",
    roles: ["developer"],
  },
  {
    id: "dev-closed-locked",
    question: "Why can't I edit a bug report?",
    answer:
      "Closed reports are locked. Reports marked Resolved are closed automatically after 24 hours, so reopen the work by submitting a new report if the problem comes back.",
    roles: ["developer"],
  },
  {
    id: "dev-find-bugs",
    question: "How do I find a specific bug report?",
    answer:
      "Use the search box to search subjects, descriptions, and reporter names. Use Add Filters to filter by status or severity and to sort by newest or oldest. Press Clear Filters to reset.",
    roles: ["developer"],
  },
  {
    id: "dev-summary-cards",
    question: "What do the summary cards show?",
    answer:
      "They count all bug reports regardless of your filters: total, open, in progress (triaged and in progress), active critical reports, and resolved or closed reports.",
    roles: ["developer"],
  },
  {
    id: "dev-internal-notes",
    question: "What are internal notes?",
    answer:
      "Notes you add inside a bug report to share progress with other developers. Only developers and admins can see them. The person who reported the bug cannot.",
    roles: ["developer"],
  },
  {
    id: "dev-reporter-context",
    question: "What is reporter context?",
    answer:
      "Details saved when the bug was submitted: the reporter's role, the page they were on, their browser, and their window size. Use it to reproduce the problem. Reports submitted before this feature may not have it.",
    roles: ["developer"],
  },
];

const FAQ = () => {
  const [expandedPanel, setExpandedPanel] = React.useState(false);

  const getPanelId = React.useCallback((item, index) => {
    if (item.id) return item.id;

    const base = String(item.question || "faq")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return base ? `faq-${base}` : `faq-${index}`;
  }, []);

  const userRole = React.useMemo(() => {
    const token = Cookies.get("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      return decoded?.role ?? null;
    } catch {
      return null;
    }
  }, []);

  const generalFaqs = React.useMemo(
    () => FAQ_ITEMS.filter((item) => !item.roles),
    []
  );

  const roleFaqs = React.useMemo(() => {
    if (!userRole) return [];
    return FAQ_ITEMS.filter((item) =>
      Array.isArray(item.roles) ? item.roles.includes(userRole) : false
    );
  }, [userRole]);

  const handleChange = (panelId) => (_event, isExpanded) => {
    setExpandedPanel(isExpanded ? panelId : false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "background.default",
        padding: 6.25,
        gap: 2.5,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1100 }}>
        <Typography
          variant="h1"
          sx={{ fontWeight: "bold", fontSize: "2rem", textAlign: "center" }}
        >
          Help / FAQ
        </Typography>

        <Typography variant="body1" sx={{ color: "text.secondary", mt: 2.5 }}>
          General questions for all users.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          {generalFaqs.map((item, index) => {
            const panelId = getPanelId(item, index);

            return (
              <Accordion
                key={item.id || item.question}
                expanded={expandedPanel === panelId}
                onChange={handleChange(panelId)}
                disableGutters
                sx={{
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  "&:before": { display: "none" },
                  "&:hover": {
                    borderColor: "text.secondary",
                  },
                  "&.Mui-expanded": {
                    margin: 0,
                  },
                }}
              >
                <AccordionSummary
                  id={`${panelId}-header`}
                  aria-controls={`${panelId}-content`}
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    transition: "background-color 0.2s ease",
                    "& .MuiAccordionSummary-content": { my: 0 },
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                    "&.Mui-focusVisible": {
                      outline: "none",
                      boxShadow: 2,
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {item.question}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails
                  id={`${panelId}-content`}
                  sx={{
                    backgroundColor: "action.selected",
                    borderTop: "1px solid",
                    borderColor: "divider",
                    px: 2.5,
                    pt: 0,
                    pb: 2.5,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: "text.primary", mt: 0.5, lineHeight: 1.6 }}
                  >
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {roleFaqs.length > 0 && (
          <>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", mt: 4 }}
            >
              User specific questions
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: "text.secondary", mt: 1 }}
            >
              {ROLE_DISPLAY_NAMES[userRole]
                ? `Applicable for ${ROLE_DISPLAY_NAMES[userRole]}.`
                : "Applicable for your role."}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              {roleFaqs.map((item, index) => {
                const panelId = getPanelId(item, index);

                return (
                  <Accordion
                    key={item.id || item.question}
                    expanded={expandedPanel === panelId}
                    onChange={handleChange(panelId)}
                    disableGutters
                    sx={{
                      backgroundColor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "hidden",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      "&:before": { display: "none" },
                      "&:hover": {
                        borderColor: "text.secondary",
                      },
                      "&.Mui-expanded": {
                        margin: 0,
                      },
                    }}
                  >
                    <AccordionSummary
                      id={`${panelId}-header`}
                      aria-controls={`${panelId}-content`}
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        transition: "background-color 0.2s ease",
                        "& .MuiAccordionSummary-content": { my: 0 },
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                        "&.Mui-focusVisible": {
                          outline: "none",
                          boxShadow: 2,
                        },
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {item.question}
                      </Typography>
                    </AccordionSummary>

                    <AccordionDetails
                      id={`${panelId}-content`}
                      sx={{
                        backgroundColor: "action.selected",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        px: 2.5,
                        pt: 0,
                        pb: 2.5,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          color: "text.primary",
                          mt: 0.5,
                          lineHeight: 1.6,
                        }}
                      >
                        {item.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default FAQ;