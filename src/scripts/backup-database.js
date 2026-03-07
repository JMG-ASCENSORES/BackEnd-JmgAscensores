const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const models = require('../models');

/**
 * Script para hacer backup de toda la base de datos a archivos JSON
 * Uso: node src/scripts/backup-database.js
 */

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Orden de exportación (respetando dependencias)
const EXPORT_ORDER = [
  'Administrador',
  'Trabajador',
  'Cliente',
  'Ascensor',
  'Tarea',
  'Asignacion',
  'Informe',
  'Evidencia',
  'RutaDiaria',
  'DetalleRuta',
  'Notificacion',
  'Auditoria',
  'Sesion',
  'HistorialEstadoMantenimiento',
  'Configuracion',
  'Programacion'
];

async function createBackup() {
  try {
    console.log('🔄 Iniciando backup de base de datos...\n');

    // Crear directorio de backup con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    fs.mkdirSync(backupPath, { recursive: true });

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    const backupMetadata = {
      timestamp,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      tables: {}
    };

    // Exportar cada tabla
    for (const modelName of EXPORT_ORDER) {
      const model = models[modelName];
      
      if (!model) {
        console.log(`⚠️  Modelo ${modelName} no encontrado, saltando...`);
        continue;
      }

      console.log(`📦 Exportando ${modelName}...`);
      
      try {
        const data = await model.findAll({
          raw: true,
          nest: false
        });

        const filename = `${modelName}.json`;
        const filepath = path.join(backupPath, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        
        backupMetadata.tables[modelName] = {
          filename,
          recordCount: data.length
        };

        console.log(`   ✅ ${data.length} registros exportados\n`);
      } catch (error) {
        console.error(`   ❌ Error exportando ${modelName}:`, error.message);
        backupMetadata.tables[modelName] = {
          error: error.message
        };
      }
    }

    // Guardar metadata
    const metadataPath = path.join(backupPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(backupMetadata, null, 2), 'utf8');

    console.log('\n✅ ¡Backup completado exitosamente!');
    console.log(`📁 Ubicación: ${backupPath}`);
    console.log('\n📊 Resumen:');
    
    let totalRecords = 0;
    Object.entries(backupMetadata.tables).forEach(([table, info]) => {
      if (info.recordCount !== undefined) {
        console.log(`   ${table}: ${info.recordCount} registros`);
        totalRecords += info.recordCount;
      } else if (info.error) {
        console.log(`   ${table}: ❌ Error`);
      }
    });
    
    console.log(`\n   Total: ${totalRecords} registros\n`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante el backup:', error);
    process.exit(1);
  }
}

// Ejecutar backup
createBackup();
