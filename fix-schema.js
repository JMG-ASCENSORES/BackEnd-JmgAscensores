const { sequelize } = require('./src/config/database');
require('dotenv').config();

async function fixSchema() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    console.log('Adding "token" column to "Sesiones" table...');
    await sequelize.query('ALTER TABLE "Sesiones" ADD COLUMN IF NOT EXISTS "token" TEXT;');
    
    console.log('Schema updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
}

fixSchema();
