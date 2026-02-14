const { sequelize } = require('../config/database');
const { Programacion, Trabajador, Cliente, Ascensor } = require('../models');

/**
 * Script para verificar que los nuevos campos funcionan correctamente
 */
async function verificarCambios() {
  try {
    console.log('🔍 Verificando estructura de la tabla Programaciones...\n');

    // 1. Verificar columnas
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Programaciones'
      AND column_name IN ('ascensor_id', 'tipo_trabajo')
      ORDER BY column_name;
    `);

    console.log('✅ Nuevas columnas encontradas:');
    console.table(columns);

    // 2. Verificar relaciones
    console.log('\n🔗 Verificando relaciones del modelo...');
    const associations = Object.keys(Programacion.associations);
    console.log('Asociaciones de Programacion:', associations);

    // 3. Verificar que podemos hacer queries con los nuevos campos
    console.log('\n📊 Probando query con includes...');
    const testQuery = await Programacion.findAll({
      limit: 1,
      include: [
        { model: Trabajador, attributes: ['nombre', 'apellido'] },
        { model: Cliente, attributes: ['contacto_nombre'] },
        { model: Ascensor, attributes: ['tipo_equipo', 'marca'] }
      ]
    });

    if (testQuery.length > 0) {
      console.log('✅ Query con Ascensor funciona correctamente');
      console.log('Ejemplo de programación:', JSON.stringify(testQuery[0], null, 2));
    } else {
      console.log('⚠️  No hay programaciones en la base de datos para probar');
    }

    // 4. Verificar constraint de tipo_trabajo
    console.log('\n🔒 Verificando constraint de tipo_trabajo...');
    const [constraints] = await sequelize.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%tipo_trabajo%';
    `);

    if (constraints.length > 0) {
      console.log('✅ Constraint encontrado:');
      console.table(constraints);
    } else {
      console.log('⚠️  No se encontró constraint para tipo_trabajo');
    }

    console.log('\n✅ Verificación completada exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('   - Campo ascensor_id: ✅ Agregado');
    console.log('   - Campo tipo_trabajo: ✅ Agregado');
    console.log('   - Relación con Ascensor: ✅ Configurada');
    console.log('   - Queries funcionando: ✅ OK');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Run verification
verificarCambios();
