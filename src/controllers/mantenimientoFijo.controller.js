const { MantenimientoFijo, Programacion, OrdenTrabajo, Ascensor, Cliente, TareaMaestra, DetalleOrden } = require('../models');
const { successResponse, errorResponse } = require('../utils/response.util');
const { Op } = require('sequelize');

/**
 * Calcula las fechas para los próximos 12 meses basado en el día y frecuencia.
 */
const calcularProximasFechas = (diaMes, hora, frecuencia) => {
  const fechas = [];
  const hoy = new Date();
  let mesAumentar = 0;
  
  if (frecuencia === 'mensual') mesAumentar = 1;
  else if (frecuencia === 'bimestral') mesAumentar = 2;
  else if (frecuencia === 'trimestral') mesAumentar = 3;

  // Empezamos desde el mes actual o el siguiente si el día ya pasó
  let fechaBase = new Date(hoy.getFullYear(), hoy.getMonth(), diaMes);
  if (fechaBase < hoy) {
    fechaBase.setMonth(fechaBase.getMonth() + mesAumentar);
  }

  const [h, m] = hora.split(':');

  for (let i = 0; i < (12 / (mesAumentar || 1)); i++) {
    const fechaInstancia = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), diaMes);
    
    // Ajuste por meses con menos días (ej. 31 de febrero -> 28/29 de febrero)
    if (fechaInstancia.getDate() !== diaMes) {
      fechaInstancia.setDate(0); // Último día del mes anterior
    }
    
    fechaInstancia.setHours(h, m, 0, 0);
    fechas.push(new Date(fechaInstancia));
    
    fechaBase.setMonth(fechaBase.getMonth() + mesAumentar);
  }
  
  return fechas;
};

/**
 * Crea las programaciones y órdenes de trabajo para un mantenimiento fijo.
 */
const generarProgramaciones = async (mantenimientoFijo, transaction) => {
  const fechas = calcularProximasFechas(mantenimientoFijo.dia_mes, mantenimientoFijo.hora, mantenimientoFijo.frecuencia);
  
  const ascensor = await Ascensor.findByPk(mantenimientoFijo.ascensor_id, { include: [Cliente] });
  if (!ascensor) throw new Error('Equipo no encontrado');

  const titulo = `Mantenimiento Fijo - ${ascensor.numero_serie || ascensor.marca}`;

  for (const fecha of fechas) {
    const fechaFin = new Date(fecha);
    fechaFin.setHours(fechaFin.getHours() + 1); // Duración predeterminada: 1 hora

    const nuevaProgr = await Programacion.create({
      titulo,
      fecha_inicio: fecha,
      fecha_fin: fechaFin,
      trabajador_id: mantenimientoFijo.trabajador_id,
      cliente_id: ascensor.cliente_id,
      ascensor_id: ascensor.ascensor_id,
      tipo_trabajo: 'mantenimiento',
      mantenimiento_fijo_id: mantenimientoFijo.mantenimiento_fijo_id,
      estado: 'pendiente',
      color: '#003B73' // Color para mantenimientos fijos
    }, { transaction });

    // Crear Orden de Trabajo
    const nuevaOrden = await OrdenTrabajo.create({
      programacion_id: nuevaProgr.programacion_id,
      cliente_id: ascensor.cliente_id,
      ascensor_id: ascensor.ascensor_id,
      estado: 'en_progreso'
    }, { transaction });

    // Poblar checklist predeterminado
    const tareas = await TareaMaestra.findAll({ where: { activa: true, tipo_equipo: 'Ascensor' } });
    if (tareas.length > 0) {
      const detalles = tareas.map(t => ({
        orden_id: nuevaOrden.orden_id,
        tarea_maestra_id: t.tarea_maestra_id,
        realizado: false
      }));
      await DetalleOrden.bulkCreate(detalles, { transaction });
    }
  }
};

const getMantenimientosFijos = async (req, res, next) => {
  try {
    const { ascensor_id } = req.query;
    const where = {};
    if (ascensor_id) where.ascensor_id = ascensor_id;

    const lista = await MantenimientoFijo.findAll({ 
      where,
      include: [
        { model: Ascensor, attributes: ['ascensor_id', 'numero_serie', 'marca', 'modelo'] }
      ]
    });
    return res.status(200).json(lista);
  } catch (error) {
    next(error);
  }
};

const createMantenimientoFijo = async (req, res, next) => {
  const t = await MantenimientoFijo.sequelize.transaction();
  try {
    const { ascensor_id, trabajador_id, dia_mes, hora, frecuencia } = req.body;

    // Verificar si ya existe uno para este equipo
    const existe = await MantenimientoFijo.findOne({ where: { ascensor_id } });
    if (existe) {
      await t.rollback();
      return res.status(409).json(errorResponse('Este equipo ya tiene un mantenimiento fijo programado.', 'CONFLICT'));
    }

    const nuevo = await MantenimientoFijo.create({
      ascensor_id,
      trabajador_id,
      dia_mes,
      hora,
      frecuencia
    }, { transaction: t });

    await generarProgramaciones(nuevo, t);

    await t.commit();
    return res.status(201).json(successResponse(nuevo, 'Mantenimiento fijo creado y programaciones generadas con éxito.'));
  } catch (error) {
    if (t) await t.rollback();
    next(error);
  }
};

const updateMantenimientoFijo = async (req, res, next) => {
  const t = await MantenimientoFijo.sequelize.transaction();
  try {
    const { id } = req.params;
    const { trabajador_id, dia_mes, hora, frecuencia, activo } = req.body;

    const mFijo = await MantenimientoFijo.findByPk(id);
    if (!mFijo) {
      await t.rollback();
      return res.status(404).json(errorResponse('Mantenimiento fijo no encontrado', 'NOT_FOUND'));
    }

    // Si cambian datos de programación, debemos actualizar las futuras programaciones pendientes
    const cambioProgramacion = (dia_mes && dia_mes !== mFijo.dia_mes) || (hora && hora !== mFijo.hora) || (frecuencia && frecuencia !== mFijo.frecuencia);

    await mFijo.update({ trabajador_id, dia_mes, hora, frecuencia, activo }, { transaction: t });

    if (cambioProgramacion) {
      // Eliminar programaciones futuras pendientes
      // Solo las que no han sido iniciadas o completadas
      await Programacion.destroy({
        where: {
          mantenimiento_fijo_id: mFijo.mantenimiento_fijo_id,
          estado: 'pendiente'
        },
        transaction: t
      });

      // Regenerar
      await generarProgramaciones(mFijo, t);
    } else if (trabajador_id !== undefined && trabajador_id !== mFijo.trabajador_id) {
        // Solo actualizar el técnico en las pendientes
        await Programacion.update(
            { trabajador_id: trabajador_id },
            { 
              where: { 
                mantenimiento_fijo_id: mFijo.mantenimiento_fijo_id,
                estado: 'pendiente'
              },
              transaction: t
            }
        );
    }

    await t.commit();
    return res.status(200).json(successResponse(mFijo, 'Mantenimiento fijo actualizado con éxito.'));
  } catch (error) {
    if (t) await t.rollback();
    next(error);
  }
};

const deleteMantenimientoFijo = async (req, res, next) => {
  const t = await MantenimientoFijo.sequelize.transaction();
  try {
    const { id } = req.params;
    const mFijo = await MantenimientoFijo.findByPk(id);
    if (!mFijo) {
      await t.rollback();
      return res.status(404).json(errorResponse('Mantenimiento fijo no encontrado', 'NOT_FOUND'));
    }

    // Eliminar programaciones futuras pendientes
    await Programacion.destroy({
      where: {
        mantenimiento_fijo_id: mFijo.mantenimiento_fijo_id,
        estado: 'pendiente'
      },
      transaction: t
    });

    await mFijo.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json(successResponse(null, 'Mantenimiento fijo y sus programaciones pendientes eliminadas con éxito.'));
  } catch (error) {
    if (t) await t.rollback();
    next(error);
  }
};

module.exports = {
  getMantenimientosFijos,
  createMantenimientoFijo,
  updateMantenimientoFijo,
  deleteMantenimientoFijo
};
