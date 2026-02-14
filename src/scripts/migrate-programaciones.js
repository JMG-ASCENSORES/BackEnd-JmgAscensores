const { sequelize } = require('../config/database');

/**
 * Migration script to add ascensor_id and tipo_trabajo to Programaciones table
 * Run this script once to update your existing database
 */
async function migrateProgramacionesTable() {
  try {
    console.log('🔄 Iniciando migración de tabla Programaciones...');

    // Add ascensor_id column
    await sequelize.query(`
      ALTER TABLE "Programaciones" 
      ADD COLUMN IF NOT EXISTS "ascensor_id" INTEGER 
      REFERENCES "Ascensores"("ascensor_id");
    `);
    console.log('✅ Columna ascensor_id agregada');

    // Add tipo_trabajo column
    await sequelize.query(`
      ALTER TABLE "Programaciones" 
      ADD COLUMN IF NOT EXISTS "tipo_trabajo" VARCHAR(50) 
      DEFAULT 'mantenimiento';
    `);
    console.log('✅ Columna tipo_trabajo agregada');

    // Add constraint for tipo_trabajo values
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'programaciones_tipo_trabajo_check'
        ) THEN
          ALTER TABLE "Programaciones" 
          ADD CONSTRAINT programaciones_tipo_trabajo_check 
          CHECK (tipo_trabajo IN ('mantenimiento', 'reparacion', 'inspeccion', 'emergencia'));
        END IF;
      END $$;
    `);
    console.log('✅ Constraint para tipo_trabajo agregado');

    console.log('✅ Migración completada exitosamente!');
    console.log('\n📊 Verificando estructura de la tabla...');

    // Verify columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Programaciones'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Columnas de la tabla Programaciones:');
    console.table(columns);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Run migration
migrateProgramacionesTable();
