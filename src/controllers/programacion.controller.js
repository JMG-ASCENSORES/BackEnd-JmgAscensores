const { Op } = require('sequelize');
const { Programacion, Trabajador, Cliente, Ascensor } = require('../models');
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
  { model: Trabajador, as: 'Tecnico1', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad'], required: false, foreignKey: 'trabajador_id' },
  { model: Trabajador, as: 'Tecnico2', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad'], required: false, foreignKey: 'tecnico2_id'  },
  { model: Trabajador, as: 'Tecnico3', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad'], required: false, foreignKey: 'tecnico3_id'  },
  { model: Trabajador, as: 'Tecnico4', attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad'], required: false, foreignKey: 'tecnico4_id'  },
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
      ascensor:       p.Ascensor || null
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
      order: [['programacion_id', 'ASC']]
    };

    // Aplicar Eager Loading o Lazy Loading según optimización solicitada:
    if (detailed === 'true') {
      queryOptions.include = [
        ...tecnicoIncludes,
        { model: Cliente,  attributes: ['cliente_id', 'contacto_nombre', 'contacto_apellido', 'nombre_comercial'], required: false },
        { model: Ascensor, attributes: ['ascensor_id', 'tipo_equipo', 'marca', 'modelo', 'numero_serie'], required: false }
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
        { model: Ascensor, required: false }
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

// ─── POST /api/programaciones ──────────────────────────────────────────────────
const createProgramacion = async (req, res, next) => {
  try {
    const { titulo, start, end, trabajador_ids, cliente_id, ascensor_id, tipo_trabajo, color, descripcion } = req.body;
    const tecnicoIds = parseTecnicoIds(trabajador_ids);

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

module.exports = { getProgramaciones, getProgramacionById, createProgramacion, updateProgramacion, deleteProgramacion };
