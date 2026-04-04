const { Client } = require('pg');

async function copyLegacyTables() {
  const sourceString = 'postgresql://jmg_ascensores3_user:5XmTYR7aBbGAwxY6oHcdpteMCnaDCj36@dpg-d6krkof5r7bs73e6o28g-a.oregon-postgres.render.com/jmg_ascensores3';
  const targetString = 'postgresql://jmg_ascensores4_user:zfUU5rGlHLSkc47pKMMA6gqb0VVR38oE@dpg-d78k8h15pdvs73b3o4o0-a.oregon-postgres.render.com/jmg_ascensores4';

  const sourceClient = new Client({ connectionString: sourceString, ssl: { rejectUnauthorized: false } });
  const targetClient = new Client({ connectionString: targetString, ssl: { rejectUnauthorized: false } });

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ Conectado a ambas bases de datos.');

    const missingTables = ['Asignaciones', 'Tareas', 'HistorialEstadoMantenimiento', 'test_connection_speeds'];

    for (const table of missingTables) {
      console.log(`\n🔍 Analizando esquema de: ${table}...`);
      
      const query = `
        SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
      `;
      const res = await sourceClient.query(query, [table]);

      if (res.rows.length === 0) {
        console.log(`⚠️  No se encontraron columnas para ${table} en la DB origen.`);
        continue;
      }

      let columnDefs = [];
      for (const col of res.rows) {
        let type = col.data_type;
        
        // Handle special types mapping roughly for identical shell creation
        if (type === 'USER-DEFINED') type = 'VARCHAR(255)';
        if (type === 'timestamp with time zone') type = 'TIMESTAMPTZ';
        if (type === 'character varying') {
           type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
        }

        let def = `"${col.column_name}" ${type}`;
        
        // Let's just create basic columns without constraints since it's just dummy shells
        columnDefs.push(def);
      }

      const createSql = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${columnDefs.join(',\n  ')}\n);`;
      
      try {
        await targetClient.query(createSql);
        console.log(`✅ Creada la tabla ${table} con ${columnDefs.length} columnas en jmg_ascensores4.`);
      } catch (err) {
        console.error(`❌ Error creando ${table}:`, err.message);
      }
    }

    console.log('\n🎉 Finalizado el copiado de tablas vacías.');

  } catch (err) {
    console.error('❌ Error fatal:', err);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

copyLegacyTables();
