import AddCircleIcon from "@mui/icons-material/AddCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LayersIcon from "@mui/icons-material/Layers";
import ListIcon from "@mui/icons-material/List";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ASULogo from "../../assets/ASULogo.png";
import CreateTicket from "../CreateTicket/CreateTicket";
import BugReportIcon from "@mui/icons-material/BugReport";
import "./SideBar.css";

const SideBar = ({isCollapsed = false, onToggle = () => {}}) => {
  const [selectedPage, setSelectedPage] = React.useState(0);
  const [showModal, setShowModal] = useState(false);
  let navigate = useNavigate();
  const location = useLocation();


  //Update here when creating new sidebar sections for it to highlight
  useEffect(() => {
    const path = location.pathname.toLowerCase();

    // Keep the sidebar selection in sync with the current route
    if (path.startsWith("/alltickets")) {
      setSelectedPage(1); //All Tickets
    } else if (path.startsWith("/escalatedtickets")) {
      setSelectedPage(5); // Escalated Tickets
    } else if (path.startsWith("/allassignees") ||
               path.startsWith("/instructorprofile") 
    ) {
      setSelectedPage(2); // All Assignees
    } else if (
      path.startsWith("/mytickets") ||
      path.startsWith("/gradertickets") ||
      path.startsWith("/instructortickets")
    ) {
      setSelectedPage(1); //All Tickets
    } else if (path.startsWith("/admindash") || path === "/") {
      setSelectedPage(0); // Dashboard
    } else if (path.startsWith("/help/faq")) {
      setSelectedPage(8); // Help
    } else{
      setSelectedPage(-1); // No selection for unrecognized routes
    }
  }, [location.pathname]);

  const token = Cookies.get("token");
  const decodedToken = jwtDecode(token);
  const userType = decodedToken.role;

  const handleLogout = () => {
    setSelectedPage(4);
    Cookies.remove("token");
    navigate("/login");
  };

  const openModal = () => {
    setShowModal(true);
    document.body.classList.add("modal-open"); // Disable body scroll
  };

  const closeModal = () => {
    setShowModal(false);
    document.body.classList.remove("modal-open"); // Enable body scroll
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      className={`sideBar ${isCollapsed ? "collapsed" : ""}`}
      classes={{
        paper: `sidebar-paper ${isCollapsed ? "sidebar-paper-collapsed" : ""}`,
      }}
    >
      <img src={ASULogo} alt="Logo" className="sidebar-logo"/>
      <List className="ticketsNavigation">
        <ListItemButton
          className="buttonStyle"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ListItemIcon>
            {isCollapsed ? (
              <MenuIcon className="iconStyle" />
            ) : (
              <MenuOpenIcon className="iconStyle" />
            )}
          </ListItemIcon>
          <ListItemText className="fontStyle" primary={isCollapsed ? "Expand" : "Collapse"} />
        </ListItemButton>
        <ListItemButton
          className="buttonStyle"
          selected={selectedPage === 0}
          onClick={() => {
            setSelectedPage(0);
            if (userType == "admin") {
              navigate("/admindash");
            } else if (userType == "student") {
              navigate("/studentdash");
            } else if (userType == "TA") {
              navigate("/instructordash");
            } else if (userType == "grader") {
              navigate("/graderdash");
            } else if (userType == "developer") {
              navigate("/developerdash");
            }
          }}
        >
          <ListItemIcon>
            <DashboardIcon className="iconStyle" />
          </ListItemIcon>
          <ListItemText className="fontStyle" primary="Dashboard" />
        </ListItemButton>

        {/* Admin "All Tickets" Button */}
        {userType === "admin" && (
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 1}
            onClick={() => {
              setSelectedPage(1);
              navigate("/alltickets");
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="All Tickets" />
          </ListItemButton>
        )}

        {/* Student "My Tickets" Button */}
        {userType === "student" && (
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 1}
            onClick={() => {
              setSelectedPage(1);
              navigate("/mytickets");
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="My Tickets" />
          </ListItemButton>
        )}

        {/* TA Ticket Buttons */}
        {userType === "TA" && (
          <>
            <ListItemButton
              className="buttonStyle"
              selected={selectedPage === 1}
              onClick={() => {
                setSelectedPage(1);
                navigate("/instructortickets");
              }}
            >
              <ListItemIcon>
                <ListIcon className="iconStyle" />
              </ListItemIcon>
              <ListItemText className="fontStyle" primary="Assigned Tickets" />
            </ListItemButton>

            <ListItemButton
              className="buttonStyle"
              selected={selectedPage === 6} // Assign a unique selectedPage index for "My Tickets"
              onClick={() => {
                setSelectedPage(6);
                navigate("/TaRequestTickets");
              }}
            >
              {}
              <ListItemIcon>
                <ListIcon className="iconStyle" />
              </ListItemIcon>
              <ListItemText className="fontStyle" primary="My Tickets" />
            </ListItemButton>
          </>
        )}

        {/* Grader "My Tickets" Button */}
        {userType=="developer" &&(
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 1}
            onClick={() => {
              setSelectedPage(1);
              navigate("/AdminDash");
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="Admin View" />
          </ListItemButton>
          
          
        )}
        {userType=="developer" &&(
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 1}
            onClick={() => {
              setSelectedPage(1);
              navigate("/GraderDash");
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="Grader View" />
          </ListItemButton>
          
          
        )}

        {userType=="developer" &&(
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 1}
            onClick={() => {
              setSelectedPage(1);
              navigate("/StudentDash");
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="Student View" />
          </ListItemButton>
          
          
        )}

        
        {userType === "grader" && (
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 1}
            onClick={() => {
              setSelectedPage(1);
              navigate("/gradertickets");
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="My Tickets" />
          </ListItemButton>
        )}

        {/* User type developer */}

        {userType === "admin" && (
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 5} // Assign a unique selectedPage index for "Escalated Tickets"
            onClick={() => {
              setSelectedPage(5);
              navigate("/escalatedtickets"); // Navigate to a new route for escalated tickets
            }}
          >
            <ListItemIcon>
              <LayersIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="Escalated Tickets" />
          </ListItemButton>
        )}

        {userType !== "developer" && (
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 2} // Assign a unique selectedPage index for "All Assignees"
            onClick={() => {
              setSelectedPage(2);
              navigate("/allassignees"); // Navigate to a new route for all assignees
            }}
          >
            <ListItemIcon>
              <ListIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="All Assignees" />
          </ListItemButton>
        )}

          { userType === "TA" && (
              <ListItemButton
                  className="buttonStyle"
                  selected={selectedPage === 5} // Assign a unique selectedPage index for "Escalated Tickets"
                  onClick={() => {
                      setSelectedPage(5);
                      navigate("/escalatedticketsTA"); // Navigate to a new route for escalated tickets
                  }}
              >
                  <ListItemIcon>
                      <LayersIcon className="iconStyle" />
                  </ListItemIcon>
                  <ListItemText className="fontStyle" primary="Escalated Tickets" />
              </ListItemButton>
          )}

        {/* <ListItemButton
          className="buttonStyle"
          selected={selectedPage === 2} // Assign a unique selectedPage index for "All Assignees"
          onClick={() => {
            setSelectedPage(2);
            navigate("/allassignees"); // Navigate to a new route for all assignees
          }}
        >
          <ListItemIcon>
            <ListIcon className="iconStyle" />
          </ListItemIcon>
          <ListItemText className="fontStyle" primary="All Assignees" />
        </ListItemButton> */}

        <ListItemButton
          className="buttonStyle"
          selected={selectedPage === 8}
          onClick={() => {
            setSelectedPage(8);
            navigate("/help/faq");
          }}
        >
          <ListItemIcon>
            <HelpOutlineIcon className="iconStyle" />
          </ListItemIcon>
          <ListItemText className="fontStyle" primary="Help / FAQ" />
        </ListItemButton>

        { (userType === "student" || userType === "TA") && (
          <ListItemButton
            className="buttonStyle"
            selected={selectedPage === 3}
            onClick={() => {
              openModal();
              //setSelectedPage(3);
              //navigate("ticketsubmit");
            }}
          >
            <ListItemIcon>
              <AddCircleIcon className="iconStyle" />
            </ListItemIcon>
            <ListItemText className="fontStyle" primary="Create A Ticket" />
          </ListItemButton>
        )}
      </List>

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
            {(userType === "student" || userType === "TA") && (
                <CreateTicket
                    onClose={closeModal}
                    forcedRole={userType === "student" ? "student" : "TA"}
                />
            )}
        </div>
      )}

      {/*<List className="settingsAndLogOut">*/}
      {/*   <ListItemButton*/}
      {/*    className="buttonStyle"*/}
      {/*    selected={selectedPage === 7}*/}
      {/*    onClick={() => { setSelectedPage(7); navigate("/bug-report"); }}*/}
      {/*>*/}
      {/*  <ListItemIcon><BugReportIcon className="iconStyle" /></ListItemIcon>*/}
      {/*  <ListItemText className="fontStyle" primary="Report a Bug" />*/}
      {/*</ListItemButton>*/}
      {/*<ListItemButton*/}
      {/*    className="buttonStyle"*/}
      {/*    onClick={() => {*/}
      {/*      setSelectedPage(4);*/}
      {/*      if (userType === "admin") {*/}
      {/*        navigate("/adminsettings");*/}
      {/*      } else if (userType === "TA") {*/}
      {/*        navigate("/tasettings");*/}
      {/*      } else if (userType === "student") {*/}
      {/*        navigate("/studentsettings");*/}
      {/*      } else if (userType === "grader") {*/}
      {/*          navigate("/gradersettings");*/}
      {/*      }*/}
      {/*    }}*/}
      {/*    selected={selectedPage === 4}*/}
      {/*  >*/}
      {/*    <ListItemIcon>*/}
      {/*      <SettingsIcon className="iconStyle" />*/}
      {/*    </ListItemIcon>*/}
      {/*    <ListItemText className="fontStyle" primary="Settings" />*/}
      {/*  </ListItemButton>*/}
      {/*  <ListItemButton className="buttonStyle" onClick={handleLogout}>*/}
      {/*    <ListItemIcon>*/}
      {/*      <LogoutIcon className="iconStyle" />*/}
      {/*    </ListItemIcon>*/}
      {/*    <ListItemText className="fontStyle" primary="Log Out" />*/}
      {/*  </ListItemButton>*/}
      {/*</List>*/}
    </Drawer>
  );
};

export default SideBar;
