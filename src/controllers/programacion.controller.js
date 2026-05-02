const { Op } = require('sequelize');
const { Programacion, Trabajador, Cliente, Ascensor, OrdenTrabajo, Informe } = require('../models');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Dado un objeto programacion, construye el array de trabajadores
 * consultando los 4 posibles técnicos (trabajador_id, tecnico2_id, tecnico3_id, tecnico4_id).
 */
const getTecnicosArray = (p) => {
  const trabajadores = [];
  if (p.Tecnico1) trabajadores.push(p.Tecnico1);
  if (p.Tecnico2) trabajadores.push(p.Tecnico2);
  if (p.Tecnico3) trabajadores.push(p.Tecnico3);
  if (p.Tecnico4) trabajadores.push(p.Tecnico4);
  return trabajadores;
};

/**
 * IDs actuales de técnicos en la programación
 */
const getTecnicoIds = (p) => [p.trabajador_id, p.tecnico2_id, p.tecnico3_id, p.tecnico4_id]
  .filter(id => id != null);

/**
 * Include para los 4 técnicos como aliases distintos
 */
const tecnicoIncludes = [
  { model: Trabajador, as: 'Tecnico1', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad', 'telefono'], required: false, foreignKey: 'trabajador_id' },
  { model: Trabajador, as: 'Tecnico2', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad', 'telefono'], required: false, foreignKey: 'tecnico2_id'  },
  { model: Trabajador, as: 'Tecnico3', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad', 'telefono'], required: false, foreignKey: 'tecnico3_id'  },
  { model: Trabajador, as: 'Tecnico4', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad', 'telefono'], required: false, foreignKey: 'tecnico4_id'  },
];

/**
 * Mapea programación al formato FullCalendar enviado al frontend
 */
const toEvento = (p) => {
  const trabajadores = getTecnicosArray(p);
  const ids = getTecnicoIds(p);

  return {
    id: p.programacion_id,
    title: p.titulo || `Programación #${p.programacion_id}`,
    start: p.fecha_inicio || new Date().toISOString(),
    end:   p.fecha_fin   || p.fecha_inicio || new Date().toISOString(),
    color: p.color || '#3788d8',
    extendedProps: {
      // Campos de técnicos
      trabajador_id:  p.trabajador_id,
      tecnico2_id:    p.tecnico2_id,
      tecnico3_id:    p.tecnico3_id,
      tecnico4_id:    p.tecnico4_id,
      trabajador_ids: ids,        // array de IDs para el frontend
      trabajadores,               // objetos completos para mostrar nombres
      trabajador:     p.Tecnico1 || null,
      // Otros campos
      cliente_id:     p.cliente_id,
      ascensor_id:    p.ascensor_id,
      tipo_trabajo:   p.tipo_trabajo,
      estado:         p.estado,
      descripcion:    p.descripcion,
      cliente:        p.Cliente  || null,
      ascensor:       p.Ascensor || null,
      orden_id:       p.OrdenTrabajo?.orden_id || null,
      informe_id:     p.OrdenTrabajo?.Informe?.informe_id || null
    }
  };
};

// ─── GET /api/programaciones ───────────────────────────────────────────────────
const getProgramaciones = async (req, res, next) => {
  try {
    const { cliente_id, ascensor_id, start, end, trabajador_id, detailed } = req.query;
    const whereClause = {};
    
    if (cliente_id)  whereClause.cliente_id  = cliente_id;
    if (ascensor_id) whereClause.ascensor_id = ascensor_id;
    
    // Si queremos filtrar por un técnico específico, tiene que estar en alguno de los 4 slots
    if (trabajador_id) {
        whereClause[Op.or] = [
            { trabajador_id: trabajador_id },
            { tecnico2_id: trabajador_id },
            { tecnico3_id: trabajador_id },
            { tecnico4_id: trabajador_id }
        ];
    }
    
    // Filtro por fechas
    if (start && end) {
      whereClause.fecha_inicio = {
        [Op.between]: [start, end]
      };
    } else if (start) {
      whereClause.fecha_inicio = { [Op.gte]: start };
    } else if (end) {
      whereClause.fecha_inicio = { [Op.lte]: end };
    }

    const queryOptions = {
      where: whereClause,
      order: [
        ['fecha_inicio', 'ASC'],
        ['programacion_id', 'ASC']
      ]
    };

    // Aplicar Eager Loading o Lazy Loading según optimización solicitada:
    if (detailed === 'true') {
      queryOptions.include = [
        ...tecnicoIncludes,
        { model: Cliente,  attributes: ['cliente_id', 'contacto_nombre', 'contacto_apellido', 'nombre_comercial', 'tipo_cliente', 'telefono', 'contacto_telefono', 'latitud', 'longitud', 'ubicacion'], required: false },
        { model: Ascensor, attributes: ['ascensor_id', 'tipo_equipo', 'marca', 'modelo', 'numero_serie'], required: false },
        { 
          model: OrdenTrabajo, 
          attributes: ['orden_id', 'estado'], 
          required: false,
          include: [{ model: Informe, attributes: ['informe_id'], required: false }]
        }
      ];
    } else {
       // Solo traemos columnas base, optimizando hasta 90%
       queryOptions.attributes = ['programacion_id', 'titulo', 'fecha_inicio', 'fecha_fin', 'color', 'estado', 'tipo_trabajo', 'cliente_id', 'ascensor_id'];
    }

    const eventos = await Programacion.findAll(queryOptions);

    return res.status(200).json(eventos.map(toEvento));
  } catch (error) {
    console.error('Error en getProgramaciones:', error);
    next(error);
  }
};

// ─── GET /api/programaciones/:id ──────────────────────────────────────────────
const getProgramacionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const evento = await Programacion.findByPk(id, {
      include: [
        ...tecnicoIncludes,
        { model: Cliente,  required: false },
        { model: Ascensor, required: false },
        { 
          model: OrdenTrabajo, 
          required: false,
          include: [{ model: Informe, attributes: ['informe_id'], required: false }]
        }
      ]
    });

    if (!evento) {
      return res.status(404).json(errorResponse('Programación no encontrada', 'NOT_FOUND'));
    }

    return res.status(200).json(successResponse(toEvento(evento), 'Programación obtenida exitosamente'));
  } catch (error) {
    console.error('Error en getProgramacionById:', error);
    next(error);
  }
};

/**
 * Extrae los 4 IDs de técnicos desde trabajador_ids[] del request
 */
const parseTecnicoIds = (trabajador_ids) => {
  const ids = Array.isArray(trabajador_ids)
    ? trabajador_ids.map(Number).filter(n => n > 0).slice(0, 4)
    : [];
  return {
    trabajador_id: ids[0] ?? null,
    tecnico2_id:   ids[1] ?? null,
    tecnico3_id:   ids[2] ?? null,
    tecnico4_id:   ids[3] ?? null,
  };
};

/**
 * Verifica si hay superposición de horarios para los técnicos involucrados
 */
const getConflictosCount = async (start, end, tecnicoIdsObj, excludeId = null) => {
  const ids = [tecnicoIdsObj.trabajador_id, tecnicoIdsObj.tecnico2_id, tecnicoIdsObj.tecnico3_id, tecnicoIdsObj.tecnico4_id].filter(Boolean);
  if (ids.length === 0) return 0;

  const whereClause = {
    [Op.or]: [
      { trabajador_id: { [Op.in]: ids } },
      { tecnico2_id: { [Op.in]: ids } },
      { tecnico3_id: { [Op.in]: ids } },
      { tecnico4_id: { [Op.in]: ids } }
    ],
    fecha_inicio: { [Op.lt]: end },
    fecha_fin: { [Op.gt]: start },
    estado: { [Op.ne]: 'cancelado' } // Si está cancelado, el tiempo está libre
  };

  if (excludeId) {
    whereClause.programacion_id = { [Op.ne]: excludeId };
  }

  return await Programacion.count({ where: whereClause });
};

// ─── POST /api/programaciones ──────────────────────────────────────────────────
const createProgramacion = async (req, res, next) => {
  try {
    const { titulo, start, end, trabajador_ids, cliente_id, ascensor_id, tipo_trabajo, color, descripcion } = req.body;

    // Validación temporal estricta
    if (new Date(start) >= new Date(end)) {
      return res.status(400).json(errorResponse('La hora de fin debe ser posterior a la hora de inicio.', 'BAD_REQUEST'));
    }

    const tecnicoIds = parseTecnicoIds(trabajador_ids);

    // Validación de conflictos (anti-solapamiento)
    const conflictos = await getConflictosCount(start, end, tecnicoIds);
    if (conflictos > 0) {
      return res.status(409).json(errorResponse('Conflicto detectado: Uno o más técnicos seleccionados ya tienen trabajos programados en este horario.', 'CONFLICT'));
    }

    const nueva = await Programacion.create({
      titulo:        titulo,
      fecha_inicio:  start,
      fecha_fin:     end,
      ...tecnicoIds,
      cliente_id:    cliente_id  || null,
      ascensor_id:   ascensor_id || null,
      tipo_trabajo:  tipo_trabajo || 'mantenimiento',
      color:         color || '#3788d8',
      descripcion,
      estado: 'pendiente'
    });

    // Crear la Orden de Trabajo automáticamente vinculada a esta programación
    const nuevaOrden = await OrdenTrabajo.create({
        programacion_id: nueva.programacion_id,
        cliente_id: nueva.cliente_id,
        ascensor_id: nueva.ascensor_id,
        estado: 'en_progreso'
    });

    // Si es mantenimiento, poblar el checklist predeterminado
    if ((tipo_trabajo || 'mantenimiento').toLowerCase() === 'mantenimiento') {
        const { TareaMaestra, DetalleOrden } = require('../models');
        const tareas = await TareaMaestra.findAll({ where: { activa: true, tipo_equipo: 'Ascensor' } });
        
        if (tareas.length > 0) {
            const detalles = tareas.map(t => ({
                orden_id: nuevaOrden.orden_id,
                tarea_maestra_id: t.tarea_maestra_id,
                realizado: false
            }));
            await DetalleOrden.bulkCreate(detalles);
        }
    }

    // Recargar con includes para devolver datos completos
    const conTecnicos = await Programacion.findByPk(nueva.programacion_id, {
      include: [
        ...tecnicoIncludes,
        { model: Cliente,  required: false },
        { model: Ascensor, required: false }
      ]
    });

    return res.status(201).json(successResponse(toEvento(conTecnicos), 'Programación creada exitosamente'));
  } catch (error) {
    console.error('Error en createProgramacion:', error);
    next(error);
  }
};

// ─── PUT /api/programaciones/:id ──────────────────────────────────────────────
const updateProgramacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start, end, titulo, color, estado, descripcion, trabajador_ids, cliente_id, ascensor_id, tipo_trabajo } = req.body;

    const programacion = await Programacion.findByPk(id);
    if (!programacion) {
      return res.status(404).json(errorResponse('Programación no encontrada', 'NOT_FOUND'));
    }

    // Preparar fechas definitivas para validación temporal
    const finalStart = start || programacion.fecha_inicio;
    const finalEnd = end || programacion.fecha_fin;

    if (new Date(finalStart) >= new Date(finalEnd)) {
      return res.status(400).json(errorResponse('La hora de fin debe ser posterior a la hora de inicio.', 'BAD_REQUEST'));
    }

    // Verificar conflictos si las fechas cambiaron o los técnicos cambiaron
    // Por seguridad, armamos los técnicos propuestos a evaluar
    let propTecIds = { 
      trabajador_id: programacion.trabajador_id,
      tecnico2_id:   programacion.tecnico2_id,
      tecnico3_id:   programacion.tecnico3_id,
      tecnico4_id:   programacion.tecnico4_id
    };
    if (Array.isArray(trabajador_ids)) {
      propTecIds = parseTecnicoIds(trabajador_ids);
    }
    
    // Validar siempre conflictos exceptuando a sí mismo
    const conflictos = await getConflictosCount(finalStart, finalEnd, propTecIds, id);
    if (conflictos > 0) {
      return res.status(409).json(errorResponse('Conflicto detectado: Uno o más técnicos seleccionados ya tienen trabajos programados en este horario.', 'CONFLICT'));
    }

    // Actualizar campos simples
    if (start)       programacion.fecha_inicio = start;
    if (end)         programacion.fecha_fin     = end;
    if (titulo)      programacion.titulo        = titulo;
    if (color)       programacion.color         = color;
    if (estado)      programacion.estado        = estado;
    if (descripcion !== undefined) programacion.descripcion  = descripcion;
    if (tipo_trabajo) programacion.tipo_trabajo = tipo_trabajo;
    if (cliente_id  !== undefined) programacion.cliente_id  = cliente_id  || null;
    if (ascensor_id !== undefined) programacion.ascensor_id = ascensor_id || null;

    // Actualizar técnicos
    if (Array.isArray(trabajador_ids)) {
      const t = parseTecnicoIds(trabajador_ids);
      programacion.trabajador_id = t.trabajador_id;
      programacion.tecnico2_id   = t.tecnico2_id;
      programacion.tecnico3_id   = t.tecnico3_id;
      programacion.tecnico4_id   = t.tecnico4_id;
    }

    await programacion.save();

    // Recargar con includes
    const conTecnicos = await Programacion.findByPk(id, {
      include: [
        ...tecnicoIncludes,
        { model: Cliente,  required: false },
        { model: Ascensor, required: false }
      ]
    });

    return res.status(200).json(successResponse(toEvento(conTecnicos), 'Programación actualizada exitosamente'));
  } catch (error) {
    console.error('Error en updateProgramacion:', error);
    next(error);
  }
};

// ─── DELETE /api/programaciones/:id ───────────────────────────────────────────
const deleteProgramacion = async (req, res, next) => {
  try {
    const deleted = await Programacion.destroy({ where: { programacion_id: req.params.id } });
    if (!deleted) {
      return res.status(404).json(errorResponse('Programación no encontrada', 'NOT_FOUND'));
    }
    return res.status(200).json(successResponse(null, 'Programación eliminada exitosamente'));
  } catch (error) {
    console.error('Error en deleteProgramacion:', error);
    next(error);
  }
};

// ─── PATCH /api/programaciones/:id/estado ─────────────────────────────────────
const patchEstado = async (req, res, next) => {
  try {
    const prog = await Programacion.findByPk(req.params.id);
    if (!prog) {
      return res.status(404).json(errorResponse('Programación no encontrada', 'NOT_FOUND'));
    }
    await prog.update({ estado: req.body.estado });
    return res.status(200).json(successResponse(
      { programacion_id: prog.programacion_id, estado: prog.estado },
      `Estado de programación actualizado a '${req.body.estado}'`
    ));
  } catch (error) {
    console.error('Error en patchEstado:', error);
    next(error);
  }
};

module.exports = { getProgramaciones, getProgramacionById, createProgramacion, updateProgramacion, patchEstado, deleteProgramacion };
