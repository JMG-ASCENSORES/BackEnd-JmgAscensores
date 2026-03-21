const { RutaDiaria, DetalleRuta, OrdenTrabajo, Cliente, Ascensor, Programacion } = require('./src/models');
const { sequelize } = require('./src/config/database');

const TRABAJADOR_ID = 83; // Juan Carlos Morales Sánchez
const CLIENTES_ASCENSORES = [
  { cliente_id: 233, ascensor_id: 742 },
  { cliente_id: 233, ascensor_id: 743 },
  { cliente_id: 234, ascensor_id: 745 },
  { cliente_id: 234, ascensor_id: 746 },
  { cliente_id: 235, ascensor_id: 749 },
  { cliente_id: 235, ascensor_id: 750 }
];

async function generateData() {
  try {
    console.log('--- Iniciando generación de datos de prueba ---');
    
    // Generar para los últimos 2 días y los próximos 10 días
    for (let i = -2; i <= 10; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      console.log(`Generando datos para: ${fechaStr}`);

      // 1. Crear Ruta Diaria (opcional pero bueno para integridad)
      const ruta = await RutaDiaria.create({
        trabajador_id: TRABAJADOR_ID,
        fecha_ruta: fechaStr,
        numero_paradas: CLIENTES_ASCENSORES.length,
        estado_ruta: 'programado',
        hora_inicio: '08:00:00'
      });
      
      // 2. Crear Programaciones y Órdenes
      for (let j = 0; j < CLIENTES_ASCENSORES.length; j++) {
        const item = CLIENTES_ASCENSORES[j];
        const horaStart = 8 + j;
        const horaEnd = 9 + j;
        
        const fechaInicio = new Date(fecha);
        fechaInicio.setHours(horaStart, 0, 0, 0);
        const fechaFin = new Date(fecha);
        fechaFin.setHours(horaEnd, 0, 0, 0);

        const tipo = i % 2 === 0 ? 'mantenimiento' : 'reparacion';

        // Crear Programación
        const prog = await Programacion.create({
          titulo: `${tipo.toUpperCase()} - Parada ${j+1}`,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          cliente_id: item.cliente_id,
          ascensor_id: item.ascensor_id,
          trabajador_id: TRABAJADOR_ID,
          tipo_trabajo: tipo,
          estado: 'pendiente',
          color: tipo === 'mantenimiento' ? '#3788d8' : '#f39c12'
        });

        // Crear Orden de Trabajo
        const orden = await OrdenTrabajo.create({
          programacion_id: prog.programacion_id,
          cliente_id: item.cliente_id,
          ascensor_id: item.ascensor_id,
          trabajador_id: TRABAJADOR_ID,
          estado: 'en_progreso'
        });

        // Crear Detalle de Ruta
        await DetalleRuta.create({
          ruta_id: ruta.ruta_id,
          cliente_id: item.cliente_id,
          ascensor_id: item.ascensor_id,
          // Nota: DetalleRuta en el modelo no tiene orden_id según vimos, 
          // pero si la DB lo tiene, se guardará.
          estado_visita: 'pendiente'
        });
      }
    }
    
    console.log('--- Generación completada con éxito ---');
  } catch (error) {
    console.error('Error generando datos:', error);
    if (error.errors) {
        error.errors.forEach(e => console.log(`- ${e.message} (${e.path})`));
    }
  } finally {
    process.exit();
  }
}

generateData();
