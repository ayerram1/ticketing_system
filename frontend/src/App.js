import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import NavBarLayout from "./components/NavBarLayout/NavBarLayout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import TicketView from "./components/TicketView/TicketView";
import AdminDash from "./pages/AdminDash/AdminDash";
import AllAssignees from "./pages/AllAssignees/AllAssignees";
import AllTickets from "./pages/AllTickets/AllTickets";
import InstructorDash from "./pages/InstructorDash/InstructorDash";
import TicketSubmit from "./pages/IssueSubmissionForm/IssueSubmissionForm";
import Login from "./pages/Login/Login";
import MyTickets from "./pages/MyTickets/MyTickets";
import AdminSettings from "./pages/Settings/AdminSettings";
import StudentSettings from "./pages/Settings/StudentSettings";
import TASettings from "./pages/Settings/TASettings";
import StudentDash from "./pages/StudentDash/StudentDash";
import TAinfo from "./pages/TAInfo/TAinfo";
import TicketInfo from "./pages/TicketInfo/TicketInfo";
import TicketQueue from "./pages/TicketQueue/TicketQueue";
import Unauthorized from "./pages/Unauthorized/Unauthorized";
import Registration from "./pages/Registration/Registration";
import Profile from "./pages/Profile/Profile";
import InstructorTickets from "./pages/InstructorTickets/InstructorTickets";
import InstructorProfile from "./pages/InstructorProfile/InstructorProfile"; 
import EscalatedTickets from "./pages/EscalatedTickets/EscalatedTickets";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import RequestReset from "./pages/RequestReset/RequestReset";
import ChangePassword from "./pages/ChangePassword/ChangePassword";
import TaRequestTickets from "./pages/InstructorTickets/TaRequestTickets";
import TaTicketView from "./components/TicketView/TaTicketView";
import TaTicketInfo from "./pages/TicketInfo/TaTicketInfo";
import BulkUpload from "./pages/BulkUpload/BulkUpload";
import ManageStudents from "./pages/ManageUsers/ManageStudents";
import ManageTAs from "./pages/ManageUsers/ManageTAs";
import ManageAdmins from "./pages/ManageUsers/ManageAdmins";
import ManageTeams from "./pages/ManageUsers/ManageTeams";
import BugReportPage from "./pages/bugReportPage/bugReportPage";
import BugReportsList from "./pages/BugReportsList";
import FAQ from "./pages/FAQ/FAQ";
import ManageGraders from "./pages/ManageUsers/ManageGraders";
import GraderDash from "./pages/GraderDash/GraderDash";
import GraderTickets from "./pages/GraderTickets/GraderTickets";
import GraderSettings from "./pages/Settings/GraderSettings";
import DeveloperDash from "./pages/DeveloperDash/DeveloperDash";
import EscalatedTicketsTA from "./pages/EscalatedTickets/EscalatedTicketsTA";
import EmailLogs from "./pages/EmailLogs/EmailLogs";
import TeamSponsorHistory from "./pages/ManageUsers/TeamSponsorHistory";
import CreateTicket from "./components/CreateTicket/CreateTicket";
import BulkUploadHistory from "./pages/BulkUploadHistory/BulkUploadHistory";


function App() {
  return (
    <Routes>
        {/* --- PUBLIC ROUTES --- */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/registration" element={<Registration />} />
      <Route path="/resetpassword" element={<ResetPassword />} />
      <Route path="/requestreset" element={<RequestReset />} />
      
      {/* Change password - protected but without navbar (forced flow) */}
      <Route 
        path="/change-password" 
        element={
          <ProtectedRoute
            element={<ChangePassword />}
            authorizedRoles={["admin", "student", "TA", "grader", "developer"]}
          />
        } 
      />

      <Route
        path="/developerdash"
        element={
          <ProtectedRoute
            element={<DeveloperDash />}
            authorizedRoles={["developer"]}
          />
        }
      />

      {/*Verify that user is logged in before rendering any of these routes*/}
      <Route
        element={
          <ProtectedRoute
            element={<NavBarLayout />}
            authorizedRoles={["admin", "student", "TA", "grader"]}
          />
        }
      >
          {/* --- Shared Pages--- */}

          <Route element={<ProtectedRoute authorizedRoles={["admin", "student", "TA", "grader"]} />}>
            <Route path="/allassignees" element={<AllAssignees />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ta-info" element={<TAinfo />} />
            <Route path="/ticketview" element={<TicketView />} />
            <Route path="/ticketinfo" element={<TicketInfo />} />
            <Route path="/instructorprofile" element={<InstructorProfile />} />
            <Route path="/mytickets" element={<MyTickets />} />
            <Route path="/bug-report" element={<BugReportPage />} />
            <Route path="/bug-reports-list" element={<BugReportsList />} />
            <Route path="/help/faq" element={<FAQ />} />
          </Route>

          <Route element={<ProtectedRoute authorizedRoles={["student", "TA"]} />}>
              <Route path="/createticket" element={<CreateTicket />} />
          </Route>

          <Route element={<ProtectedRoute authorizedRoles={["admin", "TA", "grader"]} />}>
              <Route path="/ticketsubmit" element={<TicketSubmit />} />
              <Route path="/ticketqueue" element={<TicketQueue />} />
              <Route path="/taticketinfo" element={<TaTicketInfo />} />
              <Route path="/taticketview" element={<TaTicketView />} />
              <Route path="/team-sponsor-history" element={<TeamSponsorHistory />} />
          </Route>

          {/* --- Admin Pages--- */}
          <Route element={<ProtectedRoute authorizedRoles={["admin"]} />}>
              <Route path="/admindash" element={<AdminDash />} />
              <Route path="/adminsettings" element={<AdminSettings />} />
              <Route path="/managestudents" element={<ManageStudents />} />
              <Route path="/manageadmins" element={<ManageAdmins />} />
              <Route path="/manageTAs" element={<ManageTAs />} />
              <Route path="/manageTeams" element={<ManageTeams />} />
              <Route path="/manageGraders" element={<ManageGraders />} />
              <Route path="/bulkupload" element={<BulkUpload />} />
              <Route path="/bulk-upload-history" element={<BulkUploadHistory />} />
              <Route path="/escalatedtickets" element={<EscalatedTickets />} />
              <Route path="/alltickets" element={<AllTickets />} />
              <Route path="/email-logs" element={<EmailLogs />} />
          </Route>

          {/* --- Student Pages--- */}
          <Route element={<ProtectedRoute authorizedRoles={["student"]} />}>
              <Route path="/studentdash" element={<StudentDash />} />
              <Route path="/studentsettings" element={<StudentSettings />} />
          </Route>

          {/* --- TAs Pages--- */}
          <Route element={<ProtectedRoute authorizedRoles={["TA"]} />}>
              <Route path="/instructordash" element={<InstructorDash />} />
              <Route path="/tasettings" element={<TASettings />} />
              <Route path="/instructortickets" element={<InstructorTickets />} />
              <Route path="/TaRequestTickets" element={<TaRequestTickets />} />
              <Route path="/escalatedticketsTA" element={<EscalatedTicketsTA />} />

          </Route>

          {/* --- Grader Pages--- */}
          <Route element={<ProtectedRoute authorizedRoles={["grader"]} />}>
              <Route path="/gradersettings" element={<GraderSettings />} />
              <Route path="/graderdash" element={<GraderDash />} />
              <Route path="/gradertickets" element={<GraderTickets />} />

          </Route>

      </Route>

      {/*Default to login page for unrecognized routes*/}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
