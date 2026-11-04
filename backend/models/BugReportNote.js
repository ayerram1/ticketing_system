const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const BugReportNote = sequelize.define(
  "BugReportNote",
  {
    bug_report_id: { type: DataTypes.INTEGER, allowNull: false },
    author_id: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: false },
  },
  { tableName: "bugreport_notes", timestamps: true }
);

module.exports = BugReportNote;