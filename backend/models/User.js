const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
// minor change for git tracking

const User = sequelize.define("User", {
  user_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM("student", "TA", "admin", "grader", "developer"),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  notifications_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  dark_mode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  must_change_password: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'users',
  timestamps: false,
});
// asu_id: {
  //   type: DataTypes.STRING(10),
  //   allowNull: false,
  //   unique: true,
  //   validate:{
  //     len: [10,10],
  //     isNumeric: true,
  //   },
  // },

module.exports = User;
