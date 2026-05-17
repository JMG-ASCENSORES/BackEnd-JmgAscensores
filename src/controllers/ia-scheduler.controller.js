const { DemandService } = require('../services/ia-scheduler/demand.service');
const { WorkerService } = require('../services/ia-scheduler/worker.service');
const { MotorService } = require('../services/ia-scheduler/motor.service');
const { LLMService } = require('../services/ia-scheduler/llm.service');
const { SchedulerService } = require('../services/ia-scheduler/scheduler.service');
const { DistrictTimesService } = require('../services/ia-scheduler/district-times.service');
const { ConfiguracionIA, Trabajador, Programacion, RutaDiaria, DetalleRuta, sequelize } = require('../models');

// ─── Inicialización lazy — servicios se cargan al primer uso ──────────────────
let _districtTimes = null;
let _demandService = null;
let _workerService = null;
let _motorService = null;
let _llmService = null;

async function _getDistrictTimes() {
  if (!_districtTimes) {
    _districtTimes = new DistrictTimesService();
    await _districtTimes.init();
  }
  return _districtTimes;
}

function _getServices(districtTimes, motorConfig = {}) {
  if (!_demandService) _demandService = new DemandService();
  if (!_workerService) _workerService = new WorkerService();
  if (!_motorService) _motorService = new MotorService(districtTimes, motorConfig);
  if (!_llmService) _llmService = new LLMService();
  return { demandService: _demandService, workerService: _workerService, motorService: _motorService, llmService: _llmService };
}

// ─── GET /api/ia-scheduler/demand ──────────────────────────────────────────────

const getDemand = async (req, res, next) => {
  try {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaDefault = manana.toISOString().split('T')[0];

    const fecha = req.query.fecha || fechaDefault;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }

    const districtTimes = await _getDistrictTimes();
    const { demandService } = _getServices(districtTimes);
    const trabajos = await demandService.obtenerContextoMantenimientos(fecha);

    const por_tipo = { mantenimiento: 0, reparacion: 0, inspeccion: 0, emergencia: 0 };
    for (const t of trabajos) {
      if (por_tipo[t.tipo_trabajo] !== undefined) por_tipo[t.tipo_trabajo]++;
    }

    return res.status(200).json({ fecha, total: trabajos.length, por_tipo, trabajos });
  } catch (error) {
    console.error('[IA-Scheduler] Error en getDemand:', error.message);
    return res.status(500).json({ error: 'Error al obtener contexto de mantenimientos: ' + error.message });
  }
};

// ─── GET /api/ia-scheduler/tecnicos ────────────────────────────────────────────

const getTecnicos = async (req, res, next) => {
  try {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaDefault = manana.toISOString().split('T')[0];

    const fecha = req.query.fecha || fechaDefault;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }

    // Para este endpoint listamos TODOS los técnicos activos (sin filtrar por IDs)
    const tecnicosActivos = await Trabajador.findAll({
      where: { estado_activo: true },
      attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad']
    });

    if (tecnicosActivos.length === 0) {
      return res.status(200).json({ fecha, tecnicos: [] });
    }

    const districtTimes = await _getDistrictTimes();
    const { workerService } = _getServices(districtTimes);
    const ids = tecnicosActivos.map(t => t.trabajador_id);
    const tecnicosConCarga = await workerService.obtenerTecnicos(ids, fecha);

    return res.status(200).json({
      fecha,
      tecnicos: tecnicosConCarga.map(t => ({
        trabajador_id: t.trabajador_id,
        nombre: t.nombre,
        apellido: t.apellido,
        especialidad: t.especialidad,
        carga_preexistente: t.carga_preexistente
      }))
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en getTecnicos:', error.message);
    return res.status(500).json({ error: 'Error al obtener técnicos: ' + error.message });
  }
};

// ─── POST /api/ia-scheduler/generar ────────────────────────────────────────────

const generar = async (req, res, next) => {
  try {
    const { fecha, trabajo: trabajoInput, tecnico_ids } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    const TIPOS_VALIDOS = ['mantenimiento', 'reparacion', 'inspeccion', 'emergencia'];
    if (!trabajoInput || !trabajoInput.cliente_id || !trabajoInput.ascensor_id || !trabajoInput.tipo_trabajo) {
      return res.status(400).json({ error: 'Body inválido: trabajo.cliente_id, trabajo.ascensor_id y trabajo.tipo_trabajo son obligatorios.' });
    }
    if (!TIPOS_VALIDOS.includes(trabajoInput.tipo_trabajo)) {
      return res.status(400).json({ error: `tipo_trabajo inválido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}` });
    }
    if (tecnico_ids !== undefined && !Array.isArray(tecnico_ids)) {
      return res.status(400).json({ error: 'tecnico_ids debe ser un array.' });
    }

    let ids = Array.isArray(tecnico_ids) && tecnico_ids.length > 0 ? tecnico_ids : null;
    if (!ids) {
      const activos = await Trabajador.findAll({
        where: { estado_activo: true },
        attributes: ['trabajador_id']
      });
      ids = activos.map(t => t.trabajador_id);
      if (ids.length === 0) {
        return res.status(400).json({ error: 'No hay técnicos activos en el sistema.' });
      }
    }
    if (ids.length > 10) {
      return res.status(400).json({ error: `Se permite un máximo de 10 técnicos por evaluación. Recibidos: ${ids.length}. Especificá un subconjunto.` });
    }
    if (trabajoInput.hora_preferida && !/^\d{2}:\d{2}$/.test(trabajoInput.hora_preferida)) {
      return res.status(400).json({ error: 'Formato de hora_preferida inválido. Use HH:MM.' });
    }

    const districtTimes = await _getDistrictTimes();

    const configRows = await ConfiguracionIA.findAll({ where: { activo: true } });
    const primerConfig = configRows[0];
    const motorConfig = {
      hora_inicio_default: primerConfig ? String(primerConfig.hora_inicio_default).substring(0, 5) : '08:30',
      hora_fin_limite:     primerConfig ? String(primerConfig.hora_fin_limite).substring(0, 5)     : '18:30'
    };

    const { demandService, workerService, motorService, llmService } = _getServices(districtTimes, motorConfig);

    // 1. Enriquecer el trabajo con datos del equipo/cliente/config
    let workItem;
    try {
      workItem = await demandService.enriquecerTrabajo(trabajoInput);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // 2. Técnicos con agenda del día incluida
    const tecnicos = await workerService.obtenerTecnicos(tecnico_ids, fecha);
    if (tecnicos.length === 0) {
      return res.status(400).json({ error: 'Los tecnico_ids proporcionados no existen o están inactivos.' });
    }

    // 3. Motor: evaluar todos los técnicos para este trabajo
    const resultado = motorService.evaluarTecnicos(workItem, tecnicos);

    const evaluacionMotor = {
      fecha,
      generado_en: new Date().toISOString(),
      origen: 'motor',
      trabajo: workItem,
      sugerencia: resultado.sugerencia,
      alternativas: resultado.alternativas,
      sin_elegible: resultado.sin_elegible,
      razon_sin_elegible: resultado.razon_sin_elegible,
      notas_llm: null,
      advertencias: null,
    };

    // 4. LLM: validación, justificaciones y reordenamiento
    let evaluacionFinal;
    try {
      const { ok, evaluacion } = await llmService.validarYJustificar(
        evaluacionMotor,
        req.body.instruccion_admin || null
      );
      evaluacionFinal = evaluacion;
      // Si el LLM falló y hay sugerencia del motor, preservamos las notas_llm y advertencias originales
      if (!ok && evaluacionFinal.origen === 'motor_fallback') {
        evaluacionFinal.notas_llm = `LLM no disponible: ${evaluacion.error || 'error desconocido'}`;
      }
    } catch (llmError) {
      // Si el LLM lanza una excepción inesperada, usamos el motor directamente
      console.error('[IA-Scheduler] LLM falló inesperadamente:', llmError.message);
      evaluacionFinal = {
        ...evaluacionMotor,
        notas_llm: `LLM error: ${llmError.message}`,
      };
    }

    return res.status(200).json({
      ...evaluacionFinal,
      llm_model: process.env.IA_SCHEDULER_MODEL || 'claude-haiku-4-5-20251001',
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en generar:', error.message);
    return res.status(500).json({ error: 'Error al generar sugerencia: ' + error.message });
  }
};

// ─── POST /api/ia-scheduler/ajustar ────────────────────────────────────────────

const ajustar = async (req, res, next) => {
  try {
    const { evaluacion_actual, instruccion_admin } = req.body;

    if (!evaluacion_actual || !instruccion_admin) {
      return res.status(400).json({
        error: 'Body inválido: evaluacion_actual e instruccion_admin son obligatorios.',
      });
    }

    const districtTimes = await _getDistrictTimes();
    const { llmService } = _getServices(districtTimes);

    const { ok, evaluacion, error } = await llmService.ajustarConInstruccion(
      evaluacion_actual,
      instruccion_admin
    );

    if (!ok) {
      return res.status(200).json({
        ...evaluacion,
        llm_model: process.env.IA_SCHEDULER_MODEL || 'claude-haiku-4-5-20251001',
        advertencia: `LLM no disponible, usando fallback del motor: ${error}`,
      });
    }

    return res.status(200).json({
      ...evaluacion,
      llm_model: process.env.IA_SCHEDULER_MODEL || 'claude-haiku-4-5-20251001',
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en ajustar:', error.message);
    return res.status(500).json({ error: 'Error al ajustar sugerencia: ' + error.message });
  }
};

// ─── GET /api/ia-scheduler/configuracion ───────────────────────────────────────

const getConfiguracion = async (req, res, next) => {
  try {
    const config = await ConfiguracionIA.findAll({ where: { activo: true } });

    const configResponse = config.map(c => ({
      tipo_trabajo: c.tipo_trabajo,
      duracion_min: c.duracion_min,
      tecnicos_requeridos: c.tecnicos_requeridos,
      prioridad: c.prioridad
    }));

    // Ventana horaria — tomar del primer registro (todos comparten la misma ventana)
    const primerConfig = config[0];

    return res.status(200).json({
      config: configResponse,
      ventana_horaria: {
        hora_inicio: primerConfig ? String(primerConfig.hora_inicio_default).substring(0, 5) : '08:30',
        hora_fin_limite: primerConfig ? String(primerConfig.hora_fin_limite).substring(0, 5) : '18:30'
      }
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en getConfiguracion:', error.message);
    return res.status(500).json({ error: 'Error al obtener configuración: ' + error.message });
  }
};

// ─── PUT /api/ia-scheduler/configuracion ───────────────────────────────────────

const updateConfiguracion = async (req, res, next) => {
  try {
    const { tipo_trabajo, duracion_min, tecnicos_requeridos, prioridad } = req.body;

    if (!tipo_trabajo) {
      return res.status(400).json({ error: 'El campo tipo_trabajo es obligatorio.' });
    }

    const tiposValidos = ['mantenimiento', 'reparacion', 'inspeccion', 'emergencia'];
    if (!tiposValidos.includes(tipo_trabajo)) {
      return res.status(400).json({ error: `tipo_trabajo inválido. Valores permitidos: ${tiposValidos.join(', ')}` });
    }

    const config = await ConfiguracionIA.findOne({
      where: { tipo_trabajo, activo: true }
    });

    if (!config) {
      return res.status(404).json({ error: `No se encontró configuración activa para tipo_trabajo '${tipo_trabajo}'.` });
    }

    const updates = {};
    if (duracion_min !== undefined) updates.duracion_min = duracion_min;
    if (tecnicos_requeridos !== undefined) updates.tecnicos_requeridos = tecnicos_requeridos;
    if (prioridad !== undefined) updates.prioridad = prioridad;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    await config.update(updates);
    await config.reload();

    // Invalidar motorService lazy para que la próxima generación lea la nueva config
    _motorService = null;

    return res.status(200).json({
      ok: true,
      actualizado: {
        tipo_trabajo: config.tipo_trabajo,
        duracion_min: config.duracion_min,
        tecnicos_requeridos: config.tecnicos_requeridos,
        prioridad: config.prioridad
      }
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en updateConfiguracion:', error.message);
    return res.status(500).json({ error: 'Error al actualizar configuración: ' + error.message });
  }
};

// ─── POST /api/ia-scheduler/confirmar ──────────────────────────────────────────

const confirmar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { fecha, trabajo, tecnico_id, mantenimiento_fijo_id } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    if (!trabajo || !trabajo.cliente_id || !trabajo.ascensor_id || !trabajo.tipo_trabajo || !trabajo.hora_inicio || !trabajo.hora_fin) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Body inválido: trabajo.cliente_id, ascensor_id, tipo_trabajo, hora_inicio y hora_fin son obligatorios.' });
    }
    if (!tecnico_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'tecnico_id es obligatorio.' });
    }

    const tipo = trabajo.tipo_trabajo;
    const titulo = `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}` +
      (trabajo.nombre_cliente ? ` - ${trabajo.nombre_cliente}` : '');

    // 1. Crear la Programacion
    const nueva = await Programacion.create({
      titulo,
      fecha_inicio:          `${fecha}T${trabajo.hora_inicio}:00-05:00`,
      fecha_fin:             `${fecha}T${trabajo.hora_fin}:00-05:00`,
      trabajador_id:         tecnico_id,
      cliente_id:            trabajo.cliente_id,
      ascensor_id:           trabajo.ascensor_id,
      tipo_trabajo:          trabajo.tipo_trabajo,
      estado:                'pendiente',
      mantenimiento_fijo_id: mantenimiento_fijo_id || null,
      descripcion:           trabajo.justificacion || null,
    }, { transaction });

    // 2. Crear o actualizar RutaDiaria del técnico para ese día
    const [ruta, created] = await RutaDiaria.findOrCreate({
      where: { trabajador_id: tecnico_id, fecha_ruta: fecha },
      defaults: {
        numero_paradas: 1,
        hora_inicio:    trabajo.hora_inicio,
        hora_fin:       trabajo.hora_fin,
        estado_ruta:    'planificada',
      },
      transaction
    });

    if (!created) {
      const updates = { numero_paradas: (ruta.numero_paradas || 0) + 1 };
      const horaInicioRuta = ruta.hora_inicio ? String(ruta.hora_inicio).substring(0, 5) : null;
      if (!horaInicioRuta || trabajo.hora_inicio < horaInicioRuta) updates.hora_inicio = trabajo.hora_inicio;
      const horaFinRuta = ruta.hora_fin ? String(ruta.hora_fin).substring(0, 5) : null;
      if (!horaFinRuta || trabajo.hora_fin > horaFinRuta) updates.hora_fin = trabajo.hora_fin;
      await ruta.update(updates, { transaction });
    }

    // 3. Insertar DetalleRuta al final de la secuencia existente
    const ordenActual = await DetalleRuta.count({ where: { ruta_id: ruta.ruta_id }, transaction });
    await DetalleRuta.create({
      ruta_id:         ruta.ruta_id,
      programacion_id: nueva.programacion_id,
      cliente_id:      trabajo.cliente_id,
      ascensor_id:     trabajo.ascensor_id,
      orden_parada:    ordenActual + 1,
      hora_llegada:    trabajo.hora_inicio,
      hora_salida:     trabajo.hora_fin,
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({ ok: true, programacion_id: nueva.programacion_id });

  } catch (error) {
    await transaction.rollback();
    console.error('[IA-Scheduler] Error en confirmar:', error.message);
    return res.status(500).json({ error: 'Error al confirmar: ' + error.message });
  }
};

module.exports = {
  getDemand,
  getTecnicos,
  generar,
  ajustar,
  confirmar,
  getConfiguracion,
  updateConfiguracion
};
