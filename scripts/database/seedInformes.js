const { sequelize, Informe, Evidencia, Trabajador, Cliente, Ascensor } = require('./src/models');

// ── Descripciones de trabajo por tipo ────────────────────────────────────────

const descripcionesTecnico = [
  'Se realizó inspección técnica completa del sistema de tracción. Se verificaron poleas, cables de acero y freno de emergencia. Todos los componentes dentro de parámetros normales.',
  'Diagnóstico del sistema eléctrico del equipo. Se revisaron contactores, relés de seguridad y fusibles. Se detectó desgaste en contactor principal, se recomienda reemplazo preventivo.',
  'Revisión técnica de puertas de cabina y puertas de piso. Se ajustaron sensores infrarrojos y se calibró el mecanismo de apertura/cierre. Tiempo de cierre ajustado a norma.',
  'Evaluación del sistema de control y maniobra. Se actualizó firmware del controlador a última versión disponible. Se verificaron todas las funciones de seguridad.',
  'Inspección de foso y cuarto de máquinas. Se verificó nivel de aceite, estado de amortiguadores y dispositivos de enclavamiento. Se limpió cuarto de máquinas.',
  'Análisis de vibraciones y ruido en cabina. Se detectaron vibraciones anormales en piso 5. Causa: guía lateral desalineada. Se procedió a realinear.',
  'Pruebas de velocidad y nivelación en todos los pisos. Se corrigió desnivelación de 15mm en piso 3 y 8mm en piso 7. Velocidad nominal verificada: conforme.',
  'Revisión del sistema de intercomunicación y alarma. Se reemplazó micrófono de cabina por falla. Se verificó comunicación con central de monitoreo.',
  'Diagnóstico de consumo energético del equipo. Se registraron lecturas en vacío y con carga nominal. Consumo dentro de rangos esperados para el modelo.',
  'Inspección post-incidente. Equipo quedó detenido entre pisos por corte de energía. Se verificó funcionamiento del rescate manual y se reinició el sistema.',
  'Evaluación de componentes mecánicos del techo de cabina. Se revisaron poleas de desvío, contrapeso y limitador de velocidad.',
  'Revisión integral del sistema de señalización. Se verificaron indicadores de piso, flechas direccionales y display de cabina. Se reemplazó LED defectuoso en piso 2.',
];

const descripcionesMantenimiento = [
  'Mantenimiento preventivo trimestral. Se lubricaron guías, se limpiaron rieles y se verificó tensión de cables. Se reemplazaron zapatas de freno por desgaste.',
  'Mantenimiento mensual programado. Limpieza de puertas, lubricación de bisagras y rodillos. Verificación de iluminación de cabina y ventilación.',
  'Mantenimiento correctivo: reemplazo de botonera de cabina por vandalismo. Se instaló modelo antivandálico de acero inoxidable con indicadores LED.',
  'Mantenimiento preventivo semestral. Cambio de aceite del motor, inspección de poleas y verificación de todos los dispositivos de seguridad.',
  'Mantenimiento correctivo por falla en sensor de puerta. Se reemplazó barrera infrarroja y se recalibró tiempo de espera de cierre.',
  'Mantenimiento general programado. Se realizó limpieza profunda de foso, lubricación de todas las articulaciones y revisión de cuadro eléctrico.',
  'Mantenimiento preventivo. Ajuste de freno de emergencia, verificación de paracaídas y prueba de limitador de velocidad.',
  'Mantenimiento correctivo: reparación de sistema de tracción. Se tensaron cables de acero y se alinearon poleas de tracción.',
  'Mantenimiento preventivo anual. Inspección completa según normativa vigente. Todos los sistemas verificados y documentados.',
  'Mantenimiento de emergencia por ruido excesivo. Causa identificada: rodamiento del motor desgastado. Se procedió al reemplazo inmediato.',
  'Mantenimiento preventivo bimestral. Se verificó estado de pulsadores, indicadores, iluminación y sistema de ventilación de cabina.',
  'Mantenimiento correctivo: ajuste de nivelación automática. Se recalibró encoder del motor y se ajustaron parámetros del variador de frecuencia.',
];

// ── Observaciones ────────────────────────────────────────────────────────────

const observacionesTecnico = [
  'Se recomienda programar mantenimiento correctivo para la próxima semana.',
  'Equipo operativo. Sin observaciones adicionales por el momento.',
  'Se adjuntan fotografías del estado actual de los componentes inspeccionados.',
  'Cliente informado sobre la necesidad de modernización del sistema de control.',
  'Se sugiere reemplazo de cables de acero en el próximo mantenimiento semestral.',
  'Pendiente aprobación del cliente para proceder con el cambio de componentes.',
  'Todos los parámetros dentro de norma. Próxima inspección programada en 3 meses.',
  'Se detectaron señales de corrosión leve en el foso. Se recomienda tratamiento anticorrosivo.',
  'El equipo requiere actualización para cumplir con nueva normativa. Cotización enviada al cliente.',
  null,
  null,
];

const observacionesMantenimiento = [
  'Trabajo realizado sin contratiempos. Equipo entregado operativo al 100%.',
  'Se utilizaron repuestos originales de fábrica. Garantía de 6 meses.',
  'Cliente presente durante el mantenimiento. Satisfecho con el servicio.',
  'Se recomienda intervención adicional en el próximo mes para completar ajustes.',
  'Piezas reemplazadas registradas en historial del equipo.',
  'Se dejó el área de trabajo limpia y ordenada. Ascensor liberado para uso normal.',
  'El próximo mantenimiento preventivo debe realizarse antes de 90 días.',
  'Se actualizó la bitácora del equipo con las intervenciones realizadas.',
  null,
  null,
];

// ── Ubicaciones de envío ─────────────────────────────────────────────────────

const ubicacionesEnvio = [
  'Lima, Miraflores', 'Lima, San Isidro', 'Lima, Surco', 'Lima, San Borja',
  'Lima, La Molina', 'Lima, Jesús María', 'Lima, Lince', 'Lima, Barranco',
  'Lima, Chorrillos', 'Lima, San Miguel', 'Lima, Cercado', 'Lima, Pueblo Libre',
  'Lima, Los Olivos', 'Lima, Ate', 'Lima, Independencia', 'Lima, Surquillo',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// ── Generación ───────────────────────────────────────────────────────────────

const generateInformes = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // Limpiar
    const deletedEv = await Evidencia.destroy({ where: {} });
    console.log(`🗑️  Eliminadas ${deletedEv} evidencias.`);
    const deletedInf = await Informe.destroy({ where: {} });
    console.log(`🗑️  Eliminados ${deletedInf} informes.`);

    // Obtener datos necesarios
    const trabajadores = await Trabajador.findAll({ attributes: ['trabajador_id', 'nombre', 'apellido'] });
    const clientes = await Cliente.findAll({
      attributes: ['cliente_id', 'ubicacion', 'distrito'],
      include: [{ model: Ascensor, attributes: ['ascensor_id'] }]
    });

    if (!trabajadores.length || !clientes.length) {
      console.log('❌ No hay trabajadores o clientes. Ejecuta primero los seeds correspondientes.');
      process.exit(1);
    }

    // Filtrar clientes que tengan al menos 1 equipo
    const clientesConEquipo = clientes.filter(c => c.Ascensors && c.Ascensors.length > 0);
    if (!clientesConEquipo.length) {
      console.log('❌ Ningún cliente tiene equipos. Ejecuta primero seedEquipos.js');
      process.exit(1);
    }

    console.log(`\n📋 Generando informes para ${clientesConEquipo.length} clientes con equipos...\n`);

    const informesToCreate = [];
    const today = new Date();
    let totalTecnico = 0;
    let totalMantenimiento = 0;

    // Generar entre 1 y 3 informes por cliente con equipo (máx ~200-300 informes)
    for (const cliente of clientesConEquipo) {
      const numInformes = randBetween(1, 3);

      for (let j = 0; j < numInformes; j++) {
        // Seleccionar un equipo aleatorio de este cliente
        const equipo = pick(cliente.Ascensors);
        const trabajador = pick(trabajadores);

        // Tipo de informe: 50/50
        const esTecnico = Math.random() < 0.5;
        const tipo_informe = esTecnico ? 'Técnico' : 'Mantenimiento';

        // Fecha: entre hace 6 meses y hoy
        const diasAtras = randBetween(1, 180);
        const fechaInforme = new Date(today);
        fechaInforme.setDate(today.getDate() - diasAtras);
        const hora = randBetween(8, 17);
        const minuto = pick([0, 15, 30, 45]);
        fechaInforme.setHours(hora, minuto, 0, 0);

        // Descripción y observaciones según tipo
        const descripcion = esTecnico
          ? pick(descripcionesTecnico)
          : pick(descripcionesMantenimiento);

        const observacion = esTecnico
          ? pick(observacionesTecnico)
          : pick(observacionesMantenimiento);

        informesToCreate.push({
          trabajador_id:       trabajador.trabajador_id,
          cliente_id:          cliente.cliente_id,
          ascensor_id:         equipo.ascensor_id,
          asignacion_id:       null, // no vinculado a asignación por ahora
          tipo_informe,
          descripcion_trabajo: descripcion,
          observaciones:       observacion,
          ubicacion_envio:     `Lima, ${cliente.distrito || 'Lima'}`,
          fecha_informe:       localISO(fechaInforme),
          hora_informe:        `${pad(hora)}:${pad(minuto)}:00`,
          firma_tecnico:       `${trabajador.nombre} ${trabajador.apellido}`,
          firma_cliente:       null, // No todas tienen firma del cliente
          url_documento:       null, // PDF se genera on-demand
        });

        if (esTecnico) totalTecnico++;
        else totalMantenimiento++;
      }
    }

    await Informe.bulkCreate(informesToCreate);

    console.log(`✅ ¡Se han insertado ${informesToCreate.length} informes con éxito!\n`);
    console.log(`📊 Resumen:`);
    console.log(`   Informes Técnicos:        ${totalTecnico}`);
    console.log(`   Informes Mantenimiento:   ${totalMantenimiento}`);
    console.log(`   Total:                    ${informesToCreate.length}`);

    // Distribución temporal
    const porMes = {};
    informesToCreate.forEach(inf => {
      const mes = inf.fecha_informe.substring(0, 7); // YYYY-MM
      porMes[mes] = (porMes[mes] || 0) + 1;
    });
    console.log(`\n📅 Distribución por mes:`);
    Object.entries(porMes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([mes, count]) => console.log(`   ${mes}: ${count}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error insertando informes:', err);
    process.exit(1);
  }
};

generateInformes();
