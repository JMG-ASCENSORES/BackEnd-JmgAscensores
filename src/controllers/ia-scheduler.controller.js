const { DemandService } = require('../services/ia-scheduler/demand.service');
const { WorkerService } = require('../services/ia-scheduler/worker.service');
const { MotorService } = require('../services/ia-scheduler/motor.service');
const { DistrictTimesService } = require('../services/ia-scheduler/district-times.service');
const { ConfiguracionIA, Trabajador } = require('../models');

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

    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }

    const districtTimes = await _getDistrictTimes();
    const { demandService } = _getServices(districtTimes);
    const pool = await demandService.obtenerPool(fecha);

    const porTipo = { mantenimiento: 0, reparacion: 0, inspeccion: 0, emergencia: 0 };
    for (const w of pool) {
      if (porTipo.hasOwnProperty(w.tipo_trabajo)) {
        porTipo[w.tipo_trabajo]++;
      }
    }

    return res.status(200).json({
      fecha,
      total: pool.length,
      por_tipo: porTipo,
      trabajos: pool.map(w => ({
        mantenimiento_fijo_id: w.mantenimiento_fijo_id,
        programacion_id: w.programacion_id,
        fuente: w.fuente,
        cliente_id: w.cliente_id,
        nombre_cliente: w.nombre_cliente,
        distrito: w.distrito,
        tipo_trabajo: w.tipo_trabajo,
        hora_preferida: w.hora_preferida,
        tecnico_preferido_id: w.tecnico_preferido_id,
        ascensor_id: w.ascensor_id,
        tipo_equipo: w.tipo_equipo
      }))
    });
  } catch (error) {
    console.error('[IA-Scheduler] Error en getDemand:', error.message);
    return res.status(500).json({ error: 'Error al obtener demanda: ' + error.message });
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
    const { fecha, tecnico_ids, instruccion_admin } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }

    if (!Array.isArray(tecnico_ids) || tecnico_ids.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un tecnico_id.' });
    }

    const districtTimes = await _getDistrictTimes();

    // Bug 1 fix: leer ventana horaria desde ConfiguracionIA
    const configRows = await ConfiguracionIA.findAll({ where: { activo: true } });
    const primerConfig = configRows[0];
    const motorConfig = {
      hora_inicio_default: primerConfig ? String(primerConfig.hora_inicio_default).substring(0, 5) : '08:30',
      hora_fin_limite:     primerConfig ? String(primerConfig.hora_fin_limite).substring(0, 5)     : '18:30'
    };

    const { demandService, workerService, motorService } = _getServices(districtTimes, motorConfig);

    // 1. Pool de demanda
    const pool = await demandService.obtenerPool(fecha);
    if (pool.length === 0) {
      return res.status(400).json({ error: 'No hay trabajos pendientes para la fecha seleccionada.' });
    }

    // 2. Técnicos
    const tecnicos = await workerService.obtenerTecnicos(tecnico_ids, fecha);
    if (tecnicos.length === 0) {
      return res.status(400).json({ error: 'Los tecnico_ids proporcionados no existen o están inactivos.' });
    }

    // 3. Motor
    const propuestaMotor = motorService.generarPropuesta(pool, tecnicos, fecha);

    // Fase 1: devolver propuesta del motor directamente (sin LLM aún)
    return res.status(200).json(propuestaMotor);
  } catch (error) {
    console.error('[IA-Scheduler] Error en generar:', error.message);
    return res.status(500).json({ error: 'Error al generar propuesta: ' + error.message });
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

module.exports = {
  getDemand,
  getTecnicos,
  generar,
  getConfiguracion,
  updateConfiguracion
};
