const { sequelize } = require('../config/database');

async function migrateMantenimientos() {
  try {
    console.log('🔄 Iniciando migración de tabla Mantenimientos...');

    // 1. Añadir columna titulo
    console.log('Adding titulo column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "titulo" VARCHAR(100);
    `);

    // 2. Añadir columna trabajador_id
    console.log('Adding trabajador_id column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "trabajador_id" INTEGER;
    `);

    // 3. Añadir columna tipo_trabajo
    console.log('Adding tipo_trabajo column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "tipo_trabajo" VARCHAR(50) DEFAULT 'mantenimiento';
    `);

    // 4. Añadir columna color
    console.log('Adding color column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "color" VARCHAR(20) DEFAULT '#3788d8';
    `);

    // 5. Añadir columna fecha_inicio
    console.log('Adding fecha_inicio column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "fecha_inicio" TIMESTAMP WITH TIME ZONE;
    `);

    // 6. Añadir columna fecha_fin
    console.log('Adding fecha_fin column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "fecha_fin" TIMESTAMP WITH TIME ZONE;
    `);

    // 7. Añadir columna descripcion
    console.log('Adding descripcion column...');
    await sequelize.query(`
      ALTER TABLE "Mantenimientos" 
      ADD COLUMN IF NOT EXISTS "descripcion" TEXT;
    `);

    console.log('✅ Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrateMantenimientos();
