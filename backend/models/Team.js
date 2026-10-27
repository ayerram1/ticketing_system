const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Team = sequelize.define("Team", {
  team_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  team_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  instructor_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sponsor_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sponsor_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  grader_name: {
      type: DataTypes.STRING,
      allowNull: true,
  },
  grader_email: {
      type: DataTypes.STRING,
      allowNull: true,
  }
},{
  tableName: 'teams', // Ensure the table name is lowercase
  timestamps: false,
});

module.exports = Team;