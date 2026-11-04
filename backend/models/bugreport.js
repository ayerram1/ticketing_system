const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const BugReport = sequelize.define(
  "BugReport",
  {
    subject: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    severity: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "low",
    },
    status: {
      type: DataTypes.ENUM("open", "triaged", "in_progress", "resolved", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    reporter_id: { type: DataTypes.INTEGER, allowNull: true },
    reporter_context: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "bugreports", // match your migration’s table name
    timestamps: true,
  }
);

module.exports = BugReport;
