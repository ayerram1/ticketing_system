'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bugreports', 'reporter_context', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.createTable('bugreport_notes', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      bug_report_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bugreports', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      note: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('bugreport_notes', ['bug_report_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bugreport_notes');
    await queryInterface.removeColumn('bugreports', 'reporter_context');
  },
};