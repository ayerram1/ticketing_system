"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("email_logs", "email_type", {
      type: Sequelize.ENUM(
        "ticket_status_change",
        "ticket_escalation",
        "ta_ticket_status_change",
        "ta_ticket_escalation",
        "password_reset",
        "welcome",
        "manual",
        "bulk_upload_welcome"
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("email_logs", "email_type", {
      type: Sequelize.ENUM(
        "ticket_status_change",
        "ticket_escalation",
        "ta_ticket_status_change",
        "ta_ticket_escalation",
        "password_reset",
        "welcome",
        "manual"
      ),
      allowNull: false,
    });
  },
};