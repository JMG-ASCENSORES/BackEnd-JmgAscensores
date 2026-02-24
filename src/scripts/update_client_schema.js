const { sequelize } = require('../config/database');
const Cliente = require('../models/Cliente');

async function updateSchema() {
  try {
    console.log('🔄 Checking Client schema...');
    
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('Clientes');

    if (!tableInfo.latitud) {
      console.log('➕ Adding latitud column...');
      await queryInterface.addColumn('Clientes', 'latitud', {
        type: sequelize.Sequelize.FLOAT,
        allowNull: true
      });
    }

    if (!tableInfo.longitud) {
      console.log('➕ Adding longitud column...');
      await queryInterface.addColumn('Clientes', 'longitud', {
        type: sequelize.Sequelize.FLOAT,
        allowNull: true
      });
    }

    console.log('✅ Client schema updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  }
}

updateSchema();
