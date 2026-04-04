require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');
const models = require('./src/models');

const IMPORT_ORDER = [
  'Administradores',
  'Firmas',
  'Trabajadores',
  'Clientes',
  'Configuracion',
  'TareasMaestras',
  'Ascensores',
  'MantenimientosFijos',
  'Programaciones',
  'OrdenesTrabajo',
  'DetallesOrden',
  'Informes',
  'Evidencias',
  'RutasDiarias',
  'DetalleRuta',
  'Notificaciones',
  'Auditoria',
  'Sesiones',
  'HistorialEstadoMantenimiento'
];

async function rawRestore() {
  const backupDir = path.join(__dirname, 'backups', 'raw-backup-2026-04-04T17-00-40-494Z');
  
  if (!fs.existsSync(backupDir)) {
    console.error('❌ Directorio de backup no encontrado:', backupDir);
    process.exit(1);
  }

  try {
    console.log('🔄 Sincronizando estructura de tablas con Sequelize...');
    await sequelize.authenticate();
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Tablas base de datos sincronizadas y creadas.');

    const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    console.log('\n🔄 Conectando cliente nativo PG...');
    await client.connect();
    console.log('✅ Conectado exitosamente.\n');

    let totalImported = 0;

    for (const table of IMPORT_ORDER) {
      const file = path.join(backupDir, `${table}.json`);
      if (!fs.existsSync(file)) {
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.length === 0) {
        console.log(`ℹ️ Omitiendo ${table} (0 registros)`);
        continue;
      }
      
      console.log(`📥 Importando ${table} (${data.length} registros)...`);
      const columns = Object.keys(data[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');

      let successCount = 0;
      for (const row of data) {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        try {
          await client.query(`INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
          successCount++;
        } catch (err) {
          console.error(`   ❌ Fallo insertando fila en ${table}: ${err.message}`);
        }
      }
      
      totalImported += successCount;
      console.log(`   ✅ ${successCount}/${data.length} registros insertados en ${table}.\n`);
    }

    console.log(`\n🎉 Restauración completa. Total registros insertados: ${totalImported}`);
    
    await client.end();
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error general durante la restauración:', error);
    process.exit(1);
  }
}

rawRestore();
