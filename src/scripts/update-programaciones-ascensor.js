const { sequelize } = require('../config/database');

/**
 * Script: update-programaciones-ascensor.js
 * Asigna ascensor_id en cada Programacion basándose en el cliente_id.
 * Para cada programacion, toma un ascensor que pertenezca al mismo cliente.
 */
async function updateProgramacionesAscensor() {
  try {
    console.log('🔍 Consultando programaciones sin ascensor_id...\n');

    // Obtener todas las programaciones que no tienen ascensor_id
    const [programaciones] = await sequelize.query(`
      SELECT programacion_id, cliente_id 
      FROM "Programaciones" 
      WHERE ascensor_id IS NULL OR ascensor_id = 0
      ORDER BY programacion_id
    `);

    if (programaciones.length === 0) {
      console.log('✅ Todas las programaciones ya tienen ascensor_id asignado.');
      return process.exit(0);
    }

    console.log(`📋 Se encontraron ${programaciones.length} programaciones sin ascensor_id.\n`);

    let actualizadas = 0;
    let sinAscensor = 0;

    for (const prog of programaciones) {
      // Buscar ascensores del mismo cliente (rotativamente si hay varios)
      const [ascensores] = await sequelize.query(`
        SELECT ascensor_id, tipo_equipo, marca, modelo
        FROM "Ascensores"
        WHERE cliente_id = :cliente_id
        ORDER BY ascensor_id
      `, {
        replacements: { cliente_id: prog.cliente_id }
      });

      if (ascensores.length === 0) {
        console.log(`⚠️  Programacion #${prog.programacion_id} (cliente_id=${prog.cliente_id}): sin ascensores para este cliente.`);
        sinAscensor++;
        continue;
      }

      // Elegir uno de forma rotatoria según el id de la programación
      const ascensor = ascensores[prog.programacion_id % ascensores.length];

      await sequelize.query(`
        UPDATE "Programaciones"
        SET ascensor_id = :ascensor_id, fecha_actualizacion = NOW()
        WHERE programacion_id = :programacion_id
      `, {
        replacements: {
          ascensor_id: ascensor.ascensor_id,
          programacion_id: prog.programacion_id
        }
      });

      console.log(`✅ Programacion #${prog.programacion_id} → Ascensor #${ascensor.ascensor_id} (${ascensor.marca} ${ascensor.modelo})`);
      actualizadas++;
    }

    console.log(`\n🎉 Resultado:`);
    console.log(`   - Actualizadas: ${actualizadas}`);
    console.log(`   - Sin ascensor disponible: ${sinAscensor}`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateProgramacionesAscensor();
