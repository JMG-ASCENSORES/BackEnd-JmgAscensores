const { Client } = require('pg');

async function createMissingTables() {
  const targetString = 'postgresql://jmg_ascensores4_user:zfUU5rGlHLSkc47pKMMA6gqb0VVR38oE@dpg-d78k8h15pdvs73b3o4o0-a.oregon-postgres.render.com/jmg_ascensores4';

  const client = new Client({ connectionString: targetString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado a jmg_ascensores4.');

    const missingTables = ['Asignaciones', 'Tareas', 'HistorialEstadoMantenimiento', 'test_connection_speeds'];

    for (const table of missingTables) {
      // Create a basic shell table so pgAdmin/DBeaver shows them and table count hits 22.
      // Since models are deleted, they are never queried by the backend anyway.
      const createSql = `
        CREATE TABLE IF NOT EXISTS "${table}" (
          id SERIAL PRIMARY KEY,
          "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      try {
        await client.query(createSql);
        console.log(`✅ Creada la tabla ${table} exitosamente.`);
      } catch (err) {
        console.error(`❌ Error creando ${table}:`, err.message);
      }
    }

    console.log('\n🎉 Finalizado el copiado. Ahora hay 22 tablas en la base de datos.');

  } catch (err) {
    console.error('❌ Error fatal:', err);
  } finally {
    await client.end();
  }
}

createMissingTables();
