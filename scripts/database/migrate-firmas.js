const { sequelize, Informe, Firma } = require('./src/models');

async function migrateFirmas() {
  try {
    console.log('Iniciando migración de firmas...');
    
    // 1. Sync database to create new tables and columns
    await sequelize.sync({ alter: true });
    console.log('Tablas sincronizadas.');

    try {
        // 2. Fetch all reports that have base64 text in old columns
        const [informesTarget] = await sequelize.query(`
            SELECT informe_id, firma_tecnico, firma_cliente 
            FROM "Informes" 
            WHERE firma_tecnico IS NOT NULL OR firma_cliente IS NOT NULL;
        `);

        console.log(`Encontrados ${informesTarget.length} informes con firmas legacy que migrar.`);
        
        let migradas = 0;
        for (const inf of informesTarget) {
            let updateQuery = `UPDATE "Informes" SET `;
            let updates = [];
            let params = [];
            let paramCount = 1;

            if (inf.firma_tecnico) {
                const nuevaFirmaT = await Firma.create({ base64_data: inf.firma_tecnico });
                updates.push(`firma_tecnico_id = $${paramCount++}`);
                params.push(nuevaFirmaT.firma_id);
                // We're assuming the columns will be dropped later manually or are still there.
            }

            if (inf.firma_cliente) {
                const nuevaFirmaC = await Firma.create({ base64_data: inf.firma_cliente });
                updates.push(`firma_cliente_id = $${paramCount++}`);
                params.push(nuevaFirmaC.firma_id);
            }

            if (updates.length > 0) {
                updateQuery += updates.join(', ') + ` WHERE informe_id = $${paramCount}`;
                params.push(inf.informe_id);
                await sequelize.query(updateQuery, { bind: params });
                migradas++;
            }
        }
        
        console.log(`Migración exitosa. Se migraron ${migradas} informes.`);
    } catch (err) {
        if (err.message.includes('does not exist') || err.message.includes('No existe la columna')) {
            console.log('Las columnas antiguas de firmas ya no existen. Probablemente Sequelize ya alteró la tabla eliminándolas.');
        } else {
            throw err;
        }
    }
    
    console.log('Migración de firmas completada.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

migrateFirmas();
