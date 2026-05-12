const { DemandService } = require('../services/ia-scheduler/demand.service');
const { WorkerService } = require('../services/ia-scheduler/worker.service');
const { MotorService } = require('../services/ia-scheduler/motor.service');
const { DistrictTimesService } = require('../services/ia-scheduler/district-times.service');
const { sequelize } = require('../config/database');
const { ConfiguracionIA, Trabajador, Programacion, RutaDiaria, DetalleRuta } = require('../models');

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

// ─── POST /api/ia-scheduler/confirmar ──────────────────────────────────────────

const confirmar = async (req, res, next) => {
  try {
    const { fecha, propuesta } = req.body;

    if (!fecha || !propuesta || !propuesta.tecnicos) {
      return res.status(400).json({ error: 'Body inválido: fecha y propuesta son obligatorios.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }

    // Abrir transacción
    const transaction = await sequelize.transaction();
    let programacionesCreadas = 0;
    let programacionesActualizadas = 0;

    try {
      for (const tecnico of propuesta.tecnicos) {
        // 3.3-3.4: Por cada trabajo, INSERT o UPDATE Programacion
        for (const trabajo of tecnico.trabajos) {
          let programacionId;

          if (trabajo.programacion_id === null) {
            // Viene de MantenimientoFijo → crear Programacion nueva
            const nueva = await Programacion.create({
              titulo:                `Mantenimiento - ${trabajo.nombre_cliente}`,
              fecha_inicio:          `${fecha}T${trabajo.hora_inicio}:00-05:00`,
              fecha_fin:             `${fecha}T${trabajo.hora_fin}:00-05:00`,
              trabajador_id:         tecnico.trabajador_id,
              cliente_id:            trabajo.cliente_id,
              ascensor_id:           trabajo.ascensor_id,
              tipo_trabajo:          trabajo.tipo_trabajo,
              estado:                'pendiente',
              mantenimiento_fijo_id: trabajo.mantenimiento_fijo_id,
              descripcion:           trabajo.justificacion || null
            }, { transaction });
            programacionId = nueva.programacion_id;
            programacionesCreadas++;
          } else {
            // Programacion existente → optimistic locking + UPDATE
            const existente = await Programacion.findByPk(trabajo.programacion_id, { transaction });

            if (!existente) {
              throw { status: 404, message: `La Programacion ${trabajo.programacion_id} no existe.` };
            }

            // 3.10: Optimistic locking — detectar cualquier modificación via timestamp
            const tsExistente = existente.fecha_actualizacion?.getTime();
            const tsRecibido = trabajo.fecha_actualizacion
              ? new Date(trabajo.fecha_actualizacion).getTime()
              : null;
            if (tsRecibido === null || tsExistente !== tsRecibido) {
              throw {
                status: 409,
                message: `La Programacion ${trabajo.programacion_id} fue modificada mientras revisabas la propuesta. Regenerá la propuesta.`
              };
            }

            await Programacion.update({
              trabajador_id: tecnico.trabajador_id,
              fecha_inicio:  `${fecha}T${trabajo.hora_inicio}:00-05:00`,
              fecha_fin:     `${fecha}T${trabajo.hora_fin}:00-05:00`,
              descripcion:   trabajo.justificacion || null
            }, {
              where: { programacion_id: trabajo.programacion_id },
              transaction
            });
            programacionId = trabajo.programacion_id;
            programacionesActualizadas++;
          }

          // Guardar programacion_id resuelto para DetalleRuta
          trabajo._programacion_id_resuelto = programacionId;
        }

        // 3.5: UPSERT RutaDiaria por técnico
        const [ruta, created] = await RutaDiaria.findOrCreate({
          where: {
            trabajador_id: tecnico.trabajador_id,
            fecha_ruta: fecha
          },
          defaults: {
            numero_paradas: tecnico.trabajos.length,
            hora_inicio: tecnico.trabajos[0]?.hora_inicio || null,
            hora_fin: tecnico.trabajos[tecnico.trabajos.length - 1]?.hora_fin || null,
            estado_ruta: 'planificada'
          },
          transaction
        });

        // Si ya existía, actualizar
        if (!created) {
          await ruta.update({
            numero_paradas: tecnico.trabajos.length,
            hora_inicio: tecnico.trabajos[0]?.hora_inicio || null,
            hora_fin: tecnico.trabajos[tecnico.trabajos.length - 1]?.hora_fin || null,
            estado_ruta: 'planificada'
          }, { transaction });
        }

        // 3.6-3.7: DELETE old DetalleRuta + INSERT new ones
        await DetalleRuta.destroy({
          where: { ruta_id: ruta.ruta_id },
          transaction
        });

        for (let i = 0; i < tecnico.trabajos.length; i++) {
          const trabajo = tecnico.trabajos[i];
          await DetalleRuta.create({
            ruta_id:          ruta.ruta_id,
            programacion_id:  trabajo._programacion_id_resuelto,
            orden_parada:     i + 1,
            hora_llegada:     trabajo.hora_inicio,
            hora_salida:      trabajo.hora_fin,
            cliente_id:       trabajo.cliente_id   || null,
            ascensor_id:      trabajo.ascensor_id  || null
          }, { transaction });
        }
      }

      // 3.8: Commit
      await transaction.commit();

      return res.status(200).json({
        ok: true,
        programaciones_creadas: programacionesCreadas,
        programaciones_actualizadas: programacionesActualizadas,
        rutas_generadas: propuesta.tecnicos.length
      });
    } catch (err) {
      // 3.9: Rollback
      await transaction.rollback();

      // Si es un error con status personalizado (409, 404), devolverlo
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }

      throw err;
    }
  } catch (error) {
    console.error('[IA-Scheduler] Error en confirmar:', error.message);
    return res.status(500).json({ error: 'Error al confirmar propuesta: ' + error.message });
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
