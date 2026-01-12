const { sequelize } = require('./src/config/database');
require('dotenv').config();

async function fixSesionesTable() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const table = 'Sesiones';
    const columnsToAdd = [
      { name: 'admin_id', type: 'INTEGER' },
      { name: 'trabajador_id', type: 'INTEGER' },
      { name: 'cliente_id', type: 'INTEGER' },
      { name: 'token', type: 'TEXT' },
      { name: 'ip_address', type: 'VARCHAR(255)' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'expira_en', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'fecha_creacion', type: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' }
    ];

    console.log(`Updating table "${table}"...`);

    for (const col of columnsToAdd) {
      try {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
        console.log(`✅ Column "${col.name}" checked/added.`);
      } catch (err) {
        console.error(`❌ Error adding column "${col.name}":`, err.message);
      }
    }

    console.log('Schema update completed!');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error during schema update:', err);
    process.exit(1);
  }
}

fixSesionesTable();
