const { sequelize } = require('../models');

const checkTables = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a BD exitosa.');
    
    // Query to list tables in the current database
    const [results, metadata] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 TABLAS ENCONTRADAS EN LA BD:');
    console.log('--------------------------------');
    if (results.length === 0) {
      console.log('⚠️ NO SE ENCONTRARON TABLAS EN EL ESQUEMA PUBLIC.');
    } else {
      results.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    console.log('--------------------------------');
    
    // Verify specific table counts
    const tablesToCheck = ['Clientes', 'Ascensores', 'Mantenimientos', 'Administradores'];
    for (const table of tablesToCheck) {
      try {
        const [count] = await sequelize.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`📈 Registros en ${table}: ${count[0].count}`);
      } catch (e) {
        console.log(`❌ Error contando en ${table}: Tabla no existe?`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
    process.exit(1);
  }
};

checkTables();
