const { sequelize } = require('../config/database');
const models = require('../models');

/**
 * Script para verificar la migración comparando conteos de registros
 * Uso: node src/scripts/verify-migration.js [ruta-al-metadata.json]
 */

async function verifyMigration(metadataPath) {
  try {
    console.log('🔍 Verificando migración de base de datos...\n');

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}\n`);

    let metadata = null;
    
    if (metadataPath) {
      const fs = require('fs');
      if (!fs.existsSync(metadataPath)) {
        console.log('⚠️  Archivo metadata no encontrado, verificando solo conteos actuales\n');
      } else {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log('📋 Comparando con backup:');
        console.log(`   Fecha: ${metadata.timestamp}`);
        console.log(`   Origen: ${metadata.host}\n`);
      }
    }

    const results = {
      matches: [],
      differences: [],
      errors: []
    };

    // Lista de todos los modelos
    const modelNames = [
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

    console.log('📊 Conteo de registros:\n');

    for (const modelName of modelNames) {
      const model = models[modelName];
      
      if (!model) {
        console.log(`⚠️  Modelo ${modelName} no encontrado`);
        continue;
      }

      try {
        const count = await model.count();
        const expectedCount = metadata?.tables?.[modelName]?.recordCount;

        if (metadata && expectedCount !== undefined) {
          const match = count === expectedCount;
          const status = match ? '✅' : '❌';
          const diff = count - expectedCount;
          const diffStr = diff > 0 ? `+${diff}` : diff;
          
          console.log(`${status} ${modelName.padEnd(35)} ${count.toString().padStart(6)} registros ${match ? '' : `(esperados: ${expectedCount}, diferencia: ${diffStr})`}`);
          
          if (match) {
            results.matches.push(modelName);
          } else {
            results.differences.push({ table: modelName, actual: count, expected: expectedCount, diff });
          }
        } else {
          console.log(`ℹ️  ${modelName.padEnd(35)} ${count.toString().padStart(6)} registros`);
          results.matches.push(modelName);
        }

      } catch (error) {
        console.log(`❌ ${modelName.padEnd(35)} Error: ${error.message}`);
        results.errors.push({ table: modelName, error: error.message });
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(60) + '\n');

    if (metadata) {
      console.log(`✅ Tablas coincidentes: ${results.matches.length}`);
      
      if (results.differences.length > 0) {
        console.log(`❌ Tablas con diferencias: ${results.differences.length}`);
        results.differences.forEach(({ table, actual, expected, diff }) => {
          console.log(`   ${table}: ${actual} (esperados: ${expected}, diferencia: ${diff})`);
        });
      }
    } else {
      console.log(`ℹ️  Tablas verificadas: ${results.matches.length}`);
    }

    if (results.errors.length > 0) {
      console.log(`\n❌ Errores: ${results.errors.length}`);
      results.errors.forEach(({ table, error }) => {
        console.log(`   ${table}: ${error}`);
      });
    }

    console.log('');

    // Verificar relaciones básicas
    console.log('🔗 Verificando relaciones básicas...\n');

    try {
      // Test: Cliente con Ascensores
      const clienteConAscensores = await models.Cliente.findOne({
        include: [{ model: models.Ascensor }],
        limit: 1
      });
      console.log('✅ Relación Cliente → Ascensor funciona');



      // Test: Informe con relaciones
      const informe = await models.Informe.findOne({
        include: [
          { model: models.Trabajador },
          { model: models.Cliente }
        ],
        limit: 1
      });
      console.log('✅ Relación Informe → Trabajador/Cliente funciona');

    } catch (error) {
      console.log(`❌ Error verificando relaciones: ${error.message}`);
    }

    console.log('\n✅ Verificación completada\n');

    await sequelize.close();
    
    const hasIssues = results.differences.length > 0 || results.errors.length > 0;
    process.exit(hasIssues ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Obtener ruta del metadata desde argumentos (opcional)
const metadataPath = process.argv[2];

if (metadataPath) {
  console.log(`📁 Usando metadata: ${metadataPath}\n`);
}

// Ejecutar verificación
verifyMigration(metadataPath);
