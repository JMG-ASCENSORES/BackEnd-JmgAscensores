const { sequelize } = require('../config/database');
const models = require('../models');

const fixAllSequences = async () => {
  try {
    console.log('🔄 Iniciando sincronización de secuencias...');
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada.');

    const modelNames = [
      'Administrador', 'Trabajador', 'Cliente', 'Ascensor', 'Tarea', 
      'Asignacion', 'Informe', 'Evidencia', 'RutaDiaria', 'DetalleRuta', 
      'Notificacion', 'Auditoria', 'Sesion', 'HistorialEstadoMantenimiento', 
      'Configuracion', 'Programacion'
    ];

    for (const modelName of modelNames) {
      const model = models[modelName];
      if (!model) continue;

      const tableName = model.tableName;
      
      // Get primary key field name (assuming single PK)
      const pkField = Object.keys(model.primaryKeys)[0];
      if (!pkField) continue;

      try {
        const maxIdResult = await model.max(pkField);
        const maxId = maxIdResult || 0;
        
        // Use COALESCE in case sequence doesn't exist, to avoid breaking the loop
        const query = `
          DO $$
          DECLARE
            seq_name text;
          BEGIN
            SELECT pg_get_serial_sequence('"${tableName}"', '${pkField}') INTO seq_name;
            IF seq_name IS NOT NULL THEN
              PERFORM setval(seq_name, ${maxId === 0 ? 1 : maxId}, ${maxId !== 0});
            END IF;
          END $$;
        `;
        
        await sequelize.query(query);
        console.log(`✅ Secuencia sincronizada para ${tableName} (Máx ID: ${maxId})`);
      } catch (err) {
        console.error(`⚠️  Omitiendo secuencia para ${tableName}: ${err.message}`);
      }
    }

    console.log('✅ Todas las secuencias sincronizadas con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando secuencias:', error);
    process.exit(1);
  }
};

fixAllSequences();
