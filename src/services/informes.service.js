const { Informe, OrdenTrabajo, Programacion, Firma } = require('../models');

const createInforme = async (data) => {
  //console.log('[createInforme] Datos recibidos - firma_tecnico_id:', data.firma_tecnico_id, '| firma_cliente_id:', data.firma_cliente_id, '| firma_tecnico (tiene data):', !!data.firma_tecnico);
  
  if (data.orden_id) {
    const existing = await Informe.findOne({ where: { orden_id: data.orden_id } });
    if (existing) {
      throw new Error('INFORME_DUPLICADO');
    }
  }

  // Lógica para crear/actualizar firmas a partir del base64
  if (data.firma_tecnico && !data.firma_tecnico_id) {
    const { Trabajador } = require('../models');
    const worker = await Trabajador.findByPk(data.trabajador_id);
    if (worker && worker.firma_defecto_id) {
      await Firma.update({ base64_data: data.firma_tecnico }, { where: { firma_id: worker.firma_defecto_id } });
      data.firma_tecnico_id = worker.firma_defecto_id;
    } else {
      const firmaT = await Firma.create({ base64_data: data.firma_tecnico });
      data.firma_tecnico_id = firmaT.firma_id;
    }
    delete data.firma_tecnico;
  }
  
  if (data.firma_cliente && !data.firma_cliente_id) {
    // Buscar si ya existe una firma previa para este ascensor
    const op = require('sequelize').Op;
    const lastReport = await Informe.findOne({
      where: { ascensor_id: data.ascensor_id, firma_cliente_id: { [op.ne]: null } },
      order: [['fecha_informe', 'DESC'], ['informe_id', 'DESC']]
    });

    if (lastReport && lastReport.firma_cliente_id) {
      await Firma.update({ base64_data: data.firma_cliente }, { where: { firma_id: lastReport.firma_cliente_id } });
      data.firma_cliente_id = lastReport.firma_cliente_id;
    } else {
      const firmaC = await Firma.create({ base64_data: data.firma_cliente });
      data.firma_cliente_id = firmaC.firma_id;
    }
    delete data.firma_cliente;
  }

  const informe = await Informe.create(data);

  if (data.orden_id) {
    const orden = await OrdenTrabajo.findByPk(data.orden_id);
    if (orden) {
      await orden.update({ estado: 'completado' });
      await Programacion.update(
        { estado: 'completado' },
        { where: { programacion_id: orden.programacion_id } }
      );
    }
  }

  return informe;
};

const getInformes = async (filters = {}, pagination = {}) => {
  const where = {};
  if (filters.tipo_informe) where.tipo_informe = filters.tipo_informe;
  if (filters.cliente_id) where.cliente_id = filters.cliente_id;
  if (filters.trabajador_id) where.trabajador_id = filters.trabajador_id;
  
  // Soporte a rango de fechas
  if (filters.fecha_inicio || filters.fecha_fin) {
    const { Op } = require('sequelize');
    where.fecha_informe = {};
    if (filters.fecha_inicio) where.fecha_informe[Op.gte] = new Date(filters.fecha_inicio);
    if (filters.fecha_fin) where.fecha_informe[Op.lte] = new Date(filters.fecha_fin);
  }

  // Búsqueda por descripción o ID
  if (filters.search) {
     const { Op } = require('sequelize');
     where[Op.or] = [
       { descripcion_trabajo: { [Op.iLike]: `%${filters.search}%` } }
     ];
     // Si es numérico, buscar por ID
     if (!isNaN(filters.search)) {
         where[Op.or].push({ informe_id: parseInt(filters.search, 10) });
     }
  }

  const queryOptions = {
    where,
    include: ['Cliente', 'Trabajador'],
    order: [['fecha_creacion', 'DESC']]
  };

  if (pagination.limit) {
    queryOptions.limit = pagination.limit;
    if (pagination.offset !== undefined) queryOptions.offset = pagination.offset;
  }

  const result = await Informe.findAndCountAll(queryOptions);
  
  // Agregar conteos globales para las tarjetas del frontend basados en los filtros actuales
  const statsMantenimiento = await Informe.count({ where: { ...where, tipo_informe: 'Mantenimiento' } });
  const statsTecnico = await Informe.count({ where: { ...where, tipo_informe: 'Técnico' } });

  return { ...result, statsMantenimiento, statsTecnico };
};

const getInformeById = async (id) => {
  const informe = await Informe.findByPk(id, {
    include: ['Cliente', 'Trabajador', 'FirmaTecnico', 'FirmaCliente']
  });
  if (!informe) throw new Error('INFORME_NOT_FOUND');
  return informe;
};

const updateInforme = async (id, data) => {
  const informe = await Informe.findByPk(id);
  if (!informe) throw new Error('INFORME_NOT_FOUND');
  
  // Lógica para crear/actualizar firmas a partir del base64 en updates
  if (data.firma_tecnico && !data.firma_tecnico_id) {
    if (informe.firma_tecnico_id) {
      await Firma.update({ base64_data: data.firma_tecnico }, { where: { firma_id: informe.firma_tecnico_id } });
      data.firma_tecnico_id = informe.firma_tecnico_id;
    } else {
      const firmaT = await Firma.create({ base64_data: data.firma_tecnico });
      data.firma_tecnico_id = firmaT.firma_id;
    }
    delete data.firma_tecnico;
  }
  
  if (data.firma_cliente && !data.firma_cliente_id) {
    if (informe.firma_cliente_id) {
      await Firma.update({ base64_data: data.firma_cliente }, { where: { firma_id: informe.firma_cliente_id } });
      data.firma_cliente_id = informe.firma_cliente_id;
    } else {
      const firmaC = await Firma.create({ base64_data: data.firma_cliente });
      data.firma_cliente_id = firmaC.firma_id;
    }
    delete data.firma_cliente;
  }
  
  await informe.update(data);
  return informe;
};

const deleteInforme = async (id) => {
  const informe = await Informe.findByPk(id);
  if (!informe) throw new Error('INFORME_NOT_FOUND');
  // Hard delete or update status based on requirements
  await informe.destroy(); 
  return true;
};

module.exports = {
  createInforme,
  getInformes,
  getInformeById,
  updateInforme,
  deleteInforme
};
