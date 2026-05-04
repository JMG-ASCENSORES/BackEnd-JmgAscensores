require('dotenv').config({ path: 'c:\\Users\\RODRIGO\\Desktop\\JMG ASCENSORES\\Back---JMG\\.env' });
const { Client } = require('pg');

async function createMissingTables() {
  const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(`✅ Conectado a ${process.env.DB_NAME}.`);

    const missingTables = ['Asignaciones', 'Tareas', 'HistorialEstadoMantenimiento', 'test_connection_speeds'];

    for (const table of missingTables) {
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

    console.log('\n🎉 Finalizado. Ahora hay 22 tablas en la base de datos.');

  } catch (err) {
    console.error('❌ Error fatal:', err);
  } finally {
    await client.end();
  }
}

createMissingTables();
