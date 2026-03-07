const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const models = require('../models');

/**
 * Script para restaurar la base de datos desde archivos JSON
 * Uso: node src/scripts/restore-database.js [ruta-al-backup]
 * Ejemplo: node src/scripts/restore-database.js backups/backup-2026-02-03T16-30-00-000Z
 */

// Orden de importación (mismo que exportación)
const IMPORT_ORDER = [
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

async function restoreBackup(backupPath) {
  try {
    console.log('🔄 Iniciando restauración de base de datos...\n');

    // Verificar que existe el directorio de backup
    if (!fs.existsSync(backupPath)) {
      throw new Error(`No se encontró el directorio de backup: ${backupPath}`);
    }

    // Leer metadata
    const metadataPath = path.join(backupPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error('No se encontró el archivo metadata.json en el backup');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('📋 Información del backup:');
    console.log(`   Fecha: ${metadata.timestamp}`);
    console.log(`   Base de datos origen: ${metadata.database}`);
    console.log(`   Host origen: ${metadata.host}\n`);

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conectado a la nueva base de datos');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}\n`);

    // Confirmar antes de proceder
    console.log('⚠️  ADVERTENCIA: Esta operación creará las tablas y importará los datos.');
    console.log('   Asegúrate de que la base de datos esté vacía o que quieras sobrescribir.\n');

    // Sincronizar modelos (crear tablas)
    console.log('🔨 Creando estructura de tablas...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Tablas creadas\n');

    const importResults = {
      success: [],
      failed: [],
      totalRecords: 0
    };

    // Importar cada tabla
    for (const modelName of IMPORT_ORDER) {
      const model = models[modelName];
      
      if (!model) {
        console.log(`⚠️  Modelo ${modelName} no encontrado, saltando...`);
        continue;
      }

      const filename = `${modelName}.json`;
      const filepath = path.join(backupPath, filename);

      if (!fs.existsSync(filepath)) {
        console.log(`⚠️  Archivo ${filename} no encontrado, saltando...`);
        continue;
      }

      console.log(`📥 Importando ${modelName}...`);

      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        if (data.length === 0) {
          console.log(`   ℹ️  Sin datos para importar\n`);
          importResults.success.push({ table: modelName, count: 0 });
          continue;
        }

        // Importar en lotes para mejor rendimiento
        const BATCH_SIZE = 100;
        let imported = 0;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          await model.bulkCreate(batch, {
            validate: true,
            ignoreDuplicates: false
          });
          imported += batch.length;
        }

        importResults.success.push({ table: modelName, count: imported });
        importResults.totalRecords += imported;
        console.log(`   ✅ ${imported} registros importados\n`);

      } catch (error) {
        console.error(`   ❌ Error importando ${modelName}:`, error.message);
        importResults.failed.push({ table: modelName, error: error.message });
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESTAURACIÓN');
    console.log('='.repeat(60) + '\n');

    console.log('✅ Tablas importadas exitosamente:');
    importResults.success.forEach(({ table, count }) => {
      console.log(`   ${table}: ${count} registros`);
    });

    if (importResults.failed.length > 0) {
      console.log('\n❌ Tablas con errores:');
      importResults.failed.forEach(({ table, error }) => {
        console.log(`   ${table}: ${error}`);
      });
    }

    console.log(`\n📈 Total de registros importados: ${importResults.totalRecords}`);
    console.log('\n✅ ¡Restauración completada!\n');

    await sequelize.close();
    process.exit(importResults.failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Error durante la restauración:', error);
    process.exit(1);
  }
}

// Obtener ruta del backup desde argumentos
const backupPath = process.argv[2];

if (!backupPath) {
  console.error('❌ Error: Debes proporcionar la ruta al directorio de backup');
  console.log('\nUso: node src/scripts/restore-database.js [ruta-al-backup]');
  console.log('Ejemplo: node src/scripts/restore-database.js backups/backup-2026-02-03T16-30-00-000Z\n');
  process.exit(1);
}

// Ejecutar restauración
restoreBackup(backupPath);
