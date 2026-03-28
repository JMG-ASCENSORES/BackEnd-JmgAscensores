require('dotenv').config();
const { sequelize } = require('../config/database');
require('../models'); // Import all models and associations

async function syncDatabase() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected.');

    console.log('🔄 Synchronizing database models (alter: true)...');
    console.log('⚠️  This may take a while depending on network latency.');
    
    const start = Date.now();
    await sequelize.sync({ force: false, alter: true });
    
    const duration = Date.now() - start;
    console.log(`✅ Database synchronized successfully in ${duration}ms.`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to synchronize database:', error);
    process.exit(1);
  }
}

syncDatabase();
