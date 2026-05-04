require('dotenv').config({ path: 'c:\\Users\\RODRIGO\\Desktop\\JMG ASCENSORES\\Back---JMG\\.env' });
const { Client } = require('pg');

async function dropDummyTables() {
  const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(`✅ Conectado a ${process.env.DB_NAME}.`);

    const tablesToDrop = ['Asignaciones', 'Tareas', 'HistorialEstadoMantenimiento', 'test_connection_speeds'];

    for (const table of tablesToDrop) {
      const dropSql = `DROP TABLE IF EXISTS "${table}" CASCADE;`;
      
      try {
        await client.query(dropSql);
        console.log(`✅ Tabla ${table} eliminada exitosamente.`);
      } catch (err) {
        console.error(`❌ Error eliminando ${table}:`, err.message);
      }
    }

    console.log('\n🗑️ Limpieza finalizada. Ahora tienes exactamente las 18 tablas útiles.');

  } catch (err) {
    console.error('❌ Error fatal:', err);
  } finally {
    await client.end();
  }
}

dropDummyTables();
