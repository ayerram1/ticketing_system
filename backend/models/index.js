const User = require("./User");
const Team = require("./Team");
const Ticket = require("./Ticket");
const TeamMember = require("./TeamMember");
const TicketAssignment = require("./TicketAssignment");
const PasswordResetToken = require("./PasswordResetToken");
const StudentData = require("./StudentData");
const BugReport = require("./bugreport");
const EmailLog = require("./EmailLog");
const TeamSponsorHistory = require("./TeamSponsorHistory");
const BulkUploadChangeHistory = require("./BulkUploadChangeHistory");

// Associations
User.hasMany(TeamMember, { foreignKey: "user_id" });
TeamMember.belongsTo(User, { foreignKey: "user_id" });

Team.hasMany(TeamMember, { foreignKey: "team_id" });
TeamMember.belongsTo(Team, { foreignKey: "team_id" });

User.hasMany(TicketAssignment, { foreignKey: "user_id" });
TicketAssignment.belongsTo(User, { foreignKey: "user_id" });

Ticket.hasMany(TicketAssignment, { foreignKey: "ticket_id" });
TicketAssignment.belongsTo(Ticket, { foreignKey: "ticket_id" });
Ticket.belongsTo(User, { foreignKey: "student_id", as: "student" });

User.hasMany(BugReport, { foreignKey: "reporter_id" });
BugReport.belongsTo(User, { foreignKey: "reporter_id", as: "reporter" });

StudentData.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(StudentData, { foreignKey: "user_id" });

Team.hasMany(TeamSponsorHistory, { foreignKey: "team_id" });
TeamSponsorHistory.belongsTo(Team, { foreignKey: "team_id" });
TeamSponsorHistory.belongsTo(User, { foreignKey: "changed_by", as: "changedBy" });

BulkUploadChangeHistory.belongsTo(User, { foreignKey: "changed_by", as: "changedBy" });

module.exports = {
  User,
  Team,
  Ticket,
  TeamMember,
  TicketAssignment,
  PasswordResetToken,
  StudentData,
  BugReport,
  EmailLog,
  TeamSponsorHistory,
  BulkUploadChangeHistory,
};
