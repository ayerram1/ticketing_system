'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn('teams', 'cohort_start_semester', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });

      await queryInterface.addColumn('teams', 'current_semester', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });

      await queryInterface.addColumn('teams', 'capstone_course', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });

      await queryInterface.addColumn('teams', 'program_type', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('teams', 'program_type', { transaction: t });
      await queryInterface.removeColumn('teams', 'capstone_course', { transaction: t });
      await queryInterface.removeColumn('teams', 'current_semester', { transaction: t });
      await queryInterface.removeColumn('teams', 'cohort_start_semester', { transaction: t });
    });
  },
};
