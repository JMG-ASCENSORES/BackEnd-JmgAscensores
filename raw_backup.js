require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function rawBackup() {
  const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`🔄 Conectando a la base de datos: ${process.env.DB_NAME}...`);
    await client.connect();
    console.log('✅ Conectado exitosamente.');

    // Create backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups', `raw-backup-${timestamp}`);
    if (!fs.existsSync(path.join(__dirname, 'backups'))) {
      fs.mkdirSync(path.join(__dirname, 'backups'));
    }
    fs.mkdirSync(backupDir);

    // Get all public tables
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `;
    const resTables = await client.query(tableQuery);
    const tables = resTables.rows.map(r => r.table_name);
    
    console.log(`Encontradas ${tables.length} tablas para respaldar.`);

    const metadata = { timestamp, database: process.env.DB_NAME, tables: {} };
    let totalRecords = 0;

    for (const table of tables) {
      try {
        console.log(`📦 Exportando tabla pura "${table}"...`);
        const res = await client.query(`SELECT * FROM "${table}"`);
        fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(res.rows, null, 2));
        console.log(`   ✅ ${res.rows.length} registros exportados`);
        metadata.tables[table] = { filename: `${table}.json`, recordCount: res.rows.length };
        totalRecords += res.rows.length;
      } catch (err) {
        console.log(`   ❌ Error exportando ${table}: ${err.message}`);
        metadata.tables[table] = { error: err.message };
      }
    }

    fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    console.log(`\n✅ Backup puro completado: ${totalRecords} registros en total.`);
    console.log(`📁 Guardado en: ${backupDir}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await client.end();
  }
}

rawBackup();
