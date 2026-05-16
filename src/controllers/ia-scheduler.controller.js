const { DemandService } = require('../services/ia-scheduler/demand.service');
const { WorkerService } = require('../services/ia-scheduler/worker.service');
const { MotorService } = require('../services/ia-scheduler/motor.service');
const { DistrictTimesService } = require('../services/ia-scheduler/district-times.service');
const { ConfiguracionIA, Trabajador, Programacion } = require('../models');

// ─── Inicialización lazy — servicios se cargan al primer uso ──────────────────
let _districtTimes = null;
let _demandService = null;
let _workerService = null;
let _motorService = null;

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
  return { demandService: _demandService, workerService: _workerService, motorService: _motorService };
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

    return res.status(200).json({ fecha, total: trabajos.length, trabajos });
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
    if (!trabajoInput || !trabajoInput.cliente_id || !trabajoInput.ascensor_id || !trabajoInput.tipo_trabajo) {
      return res.status(400).json({ error: 'Body inválido: trabajo.cliente_id, trabajo.ascensor_id y trabajo.tipo_trabajo son obligatorios.' });
    }
    if (!Array.isArray(tecnico_ids) || tecnico_ids.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un tecnico_id.' });
    }

    const districtTimes = await _getDistrictTimes();

    const configRows = await ConfiguracionIA.findAll({ where: { activo: true } });
    const primerConfig = configRows[0];
    const motorConfig = {
      hora_inicio_default: primerConfig ? String(primerConfig.hora_inicio_default).substring(0, 5) : '08:30',
      hora_fin_limite:     primerConfig ? String(primerConfig.hora_fin_limite).substring(0, 5)     : '18:30'
    };

    const { demandService, workerService, motorService } = _getServices(districtTimes, motorConfig);

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

    return res.status(200).json({
      fecha,
      generado_en:       new Date().toISOString(),
      origen:            'motor',
      trabajo:           workItem,
      sugerencia:        resultado.sugerencia,
      alternativas:      resultado.alternativas,
      sin_elegible:      resultado.sin_elegible,
      razon_sin_elegible: resultado.razon_sin_elegible,
      notas_llm:         null,
      advertencias:      null,
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en generar:', error.message);
    return res.status(500).json({ error: 'Error al generar sugerencia: ' + error.message });
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
  try {
    const { fecha, trabajo, tecnico_id, mantenimiento_fijo_id } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    if (!trabajo || !trabajo.cliente_id || !trabajo.ascensor_id || !trabajo.tipo_trabajo || !trabajo.hora_inicio || !trabajo.hora_fin) {
      return res.status(400).json({ error: 'Body inválido: trabajo.cliente_id, ascensor_id, tipo_trabajo, hora_inicio y hora_fin son obligatorios.' });
    }
    if (!tecnico_id) {
      return res.status(400).json({ error: 'tecnico_id es obligatorio.' });
    }

    const tipo = trabajo.tipo_trabajo;
    const titulo = `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}` +
      (trabajo.nombre_cliente ? ` - ${trabajo.nombre_cliente}` : '');

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
    });

    return res.status(200).json({ ok: true, programacion_id: nueva.programacion_id });
  } catch (error) {
    console.error('[IA-Scheduler] Error en confirmar:', error.message);
    return res.status(500).json({ error: 'Error al confirmar: ' + error.message });
  }
};

module.exports = {
  getDemand,
  getTecnicos,
  generar,
  confirmar,
  getConfiguracion,
  updateConfiguracion
};
