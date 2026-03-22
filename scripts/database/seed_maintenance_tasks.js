const { TareaMaestra, sequelize } = require('../../src/models');

const tasks = [
  // SISTEMAS DE PUERTAS
  { categoria: 'SISTEMAS DE PUERTAS', descripcion_tarea: 'Operador de puerta.', tipo_equipo: 'Ascensor' },
  { categoria: 'SISTEMAS DE PUERTAS', descripcion_tarea: 'Puerta de cabina protector de puerta.', tipo_equipo: 'Ascensor' },
  { categoria: 'SISTEMAS DE PUERTAS', descripcion_tarea: 'Cerradores, cable y cadenas.', tipo_equipo: 'Ascensor' },
  { categoria: 'SISTEMAS DE PUERTAS', descripcion_tarea: 'Cerraduras y guías inferiores.', tipo_equipo: 'Ascensor' },
  { categoria: 'SISTEMAS DE PUERTAS', descripcion_tarea: 'Funcionamiento de desenclavamiento mecánico (llave de emergencia).', tipo_equipo: 'Ascensor' },
  { categoria: 'SISTEMAS DE PUERTAS', descripcion_tarea: 'Hojas de puertas, alineadas y ajustadas correctamente.', tipo_equipo: 'Ascensor' },

  // CUADRO DE MANDO
  { categoria: 'CUADRO DE MANDO', descripcion_tarea: 'Limpie, observa relés y deflectores.', tipo_equipo: 'Ascensor' },
  { categoria: 'CUADRO DE MANDO', descripcion_tarea: 'Corrija conexiones flojas.', tipo_equipo: 'Ascensor' },
  { categoria: 'CUADRO DE MANDO', descripcion_tarea: 'Sobrecarga - fases invertidas.', tipo_equipo: 'Ascensor' },
  { categoria: 'CUADRO DE MANDO', descripcion_tarea: 'Parámetros de variador y tarjeta.', tipo_equipo: 'Ascensor' },

  // MÁQUINA / MOTOR DE TRACCIÓN
  { categoria: 'MÁQUINA / MOTOR DE TRACCIÓN', descripcion_tarea: 'Limpie y observe motor de tracción.', tipo_equipo: 'Ascensor' },
  { categoria: 'MÁQUINA / MOTOR DE TRACCIÓN', descripcion_tarea: 'Corrija conexiones flojas.', tipo_equipo: 'Ascensor' },
  { categoria: 'MÁQUINA / MOTOR DE TRACCIÓN', descripcion_tarea: 'Verifique zapatas de freno.', tipo_equipo: 'Ascensor' },
  { categoria: 'MÁQUINA / MOTOR DE TRACCIÓN', descripcion_tarea: 'Verifique nivel de aceite.', tipo_equipo: 'Ascensor' },
  { categoria: 'MÁQUINA / MOTOR DE TRACCIÓN', descripcion_tarea: 'Observe estado del cable tracción.', tipo_equipo: 'Ascensor' },

  // ENCIMA DE LA CABINA
  { categoria: 'ENCIMA DE LA CABINA', descripcion_tarea: 'Limpie, observe y lubrique.', tipo_equipo: 'Ascensor' },
  { categoria: 'ENCIMA DE LA CABINA', descripcion_tarea: 'Elementos de fijación contactos de seguridad.', tipo_equipo: 'Ascensor' },
  { categoria: 'ENCIMA DE LA CABINA', descripcion_tarea: 'Luz de guiadores y operación de rodillos.', tipo_equipo: 'Ascensor' },
  { categoria: 'ENCIMA DE LA CABINA', descripcion_tarea: 'Comprobar funcionamiento del mando de inspección.', tipo_equipo: 'Ascensor' },

  // POZO Y SOBRERRECORRIDO
  { categoria: 'POZO Y SOBRERRECORRIDO', descripcion_tarea: 'Limites finales, poleas, deflectoras y cinta.', tipo_equipo: 'Ascensor' },
  { categoria: 'POZO Y SOBRERRECORRIDO', descripcion_tarea: 'Tensión de cables y resortes.', tipo_equipo: 'Ascensor' },
  { categoria: 'POZO Y SOBRERRECORRIDO', descripcion_tarea: 'Guiadores de contrapeso y resortes.', tipo_equipo: 'Ascensor' },
  { categoria: 'POZO Y SOBRERRECORRIDO', descripcion_tarea: 'Limpieza de pozo.', tipo_equipo: 'Ascensor' },

  // DEBAJO DE LA CABINA Y FOSA
  { categoria: 'DEBAJO DE LA CABINA Y FOSA', descripcion_tarea: 'Limpie, lubrique poleas y amortiguadores.', tipo_equipo: 'Ascensor' },
  { categoria: 'DEBAJO DE LA CABINA Y FOSA', descripcion_tarea: 'Guiadores y bloques de seguridad.', tipo_equipo: 'Ascensor' },
  { categoria: 'DEBAJO DE LA CABINA Y FOSA', descripcion_tarea: 'Estado y medida de la polea tensora del cable del limitador.', tipo_equipo: 'Ascensor' },
  { categoria: 'DEBAJO DE LA CABINA Y FOSA', descripcion_tarea: 'Funcionamiento del contacto eléctrico de la polea tensora.', tipo_equipo: 'Ascensor' },
  { categoria: 'DEBAJO DE LA CABINA Y FOSA', descripcion_tarea: 'Verificar nivelación de pisos.', tipo_equipo: 'Ascensor' },

  // DENTRO DE LA CABINA
  { categoria: 'DENTRO DE LA CABINA', descripcion_tarea: 'Interruptores, ventilación, luz de emergencia y puertas.', tipo_equipo: 'Ascensor' },
  { categoria: 'DENTRO DE LA CABINA', descripcion_tarea: 'Panel de operación y botones/dispositivos de comunicación.', tipo_equipo: 'Ascensor' },
  { categoria: 'DENTRO DE LA CABINA', descripcion_tarea: 'Sensores de puerta (cortina luminosa y células fotoeléctricas).', tipo_equipo: 'Ascensor' },
  { categoria: 'DENTRO DE LA CABINA', descripcion_tarea: 'Funcionamiento de indicadores de posición.', tipo_equipo: 'Ascensor' },

  // DEBAJO DE LA CABINA - PARACAÍDAS
  { categoria: 'DEBAJO DE LA CABINA - PARACAÍDAS', descripcion_tarea: 'Comprobar visualmente el mecanismo del paracaídas.', tipo_equipo: 'Ascensor' }
];

async function seed() {
  try {
    console.log('--- Iniciando Carga de Tareas Maestras de Mantenimiento ---');
    
    // Opcional: Limpiar tareas previas de Ascensor para evitar duplicados si se re-corre
    // await TareaMaestra.destroy({ where: { tipo_equipo: 'Ascensor' } });

    for (const task of tasks) {
      await TareaMaestra.findOrCreate({
        where: { descripcion_tarea: task.descripcion_tarea, categoria: task.categoria },
        defaults: task
      });
    }

    console.log('✅ 33 tareas maestros cargadas/verificadas exitosamente.');
  } catch (error) {
    console.error('❌ Error cargando tareas maestros:', error);
  } finally {
    await sequelize.close();
  }
}

seed();
