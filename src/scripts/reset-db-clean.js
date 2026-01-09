const { sequelize } = require('../config/database');
const seedDatabase = require('../seeders/initialData');

const resetDB = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa.');
    
    // 1. Get all table names
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    if (results.length > 0) {
      console.log(`⚠️ Encontradas ${results.length} tablas. Eliminando TODAS...`);
      
      // Disable constraints temporarily if needed, but CASCADE usually handles it
      for (const row of results) {
        const tableName = row.table_name;
        console.log(`❌ Eliminando tabla: ${tableName}`);
        await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
      }
    } else {
      console.log('ℹ️ No se encontraron tablas para eliminar.');
    }

    // 2. Recreate tables from models
    console.log('✨ Recreando tablas desde Modelos (sync force: true)...');
    await sequelize.sync({ force: true });
    console.log('✅ Tablas creadas correctamente.');

    // 3. Seed data
    console.log('🌱 Insertando datos iniciales...');
    await seedDatabase();
    console.log('✅ Datos insertados correctamente.');

    console.log('🚀 ¡Base de datos limpiada y restaurada al 100%!');
    
    // List created tables
    const [newTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 TABLAS ACTUALES (Solo las necesarias):');
    newTables.forEach(t => console.log(`- ${t.table_name}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal limpiando la BD:', error);
    process.exit(1);
  }
};

resetDB();
