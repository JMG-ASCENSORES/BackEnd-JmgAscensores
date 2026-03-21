const { Programacion, OrdenTrabajo, sequelize } = require('./src/models');

async function fixMissingOrders() {
  try {
    console.log('--- Iniciando reparación de Órdenes de Trabajo faltantes ---');
    
    // Obtener todas las programaciones que no tienen una OrdenTrabajo asociada
    const programaciones = await Programacion.findAll({
      include: [{
        model: OrdenTrabajo,
        required: false
      }]
    });
    
    const missing = programaciones.filter(p => !p.OrdenTrabajo);
    console.log(`Se encontraron ${missing.length} programaciones sin Orden de Trabajo.`);
    
    for (const p of missing) {
      console.log(`Creando Orden para Programación ID: ${p.programacion_id}...`);
      await OrdenTrabajo.create({
        programacion_id: p.programacion_id,
        cliente_id: p.cliente_id,
        ascensor_id: p.ascensor_id,
        estado: p.estado === 'completado' ? 'completado' : 'en_progreso'
      });
    }
    
    console.log('--- Proceso de reparación completado con éxito ---');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la reparación:', error);
    process.exit(1);
  }
}

fixMissingOrders();
