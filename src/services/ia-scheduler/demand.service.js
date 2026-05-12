const { Op } = require('sequelize');
const { MantenimientoFijo, Ascensor, Cliente, Programacion, ConfiguracionIA } = require('../../models');

/**
 * Servicio de demanda: construye el pool de trabajos pendientes para una fecha objetivo
 * combinando dos fuentes:
 *   A) MantenimientosFijos que vencen en la fecha
 *   B) Programaciones pendientes sin técnico asignado para la fecha
 */
class DemandService {
  // ─── Fuente A: MantenimientosFijos ──────────────────────────────────────────

  /**
   * Calcula el inicio del período de frecuencia hacia atrás desde fechaObjetivo.
   */
  getPeriodoInicio(frecuencia, fechaObjetivo) {
    const fecha = new Date(fechaObjetivo + 'T00:00:00-05:00');
    switch (frecuencia) {
      case 'mensual':    fecha.setDate(fecha.getDate() - 25); break;
      case 'bimestral':  fecha.setDate(fecha.getDate() - 55); break;
      case 'trimestral': fecha.setDate(fecha.getDate() - 85); break;
      default:           fecha.setDate(fecha.getDate() - 25); break;
    }
    return fecha;
  }

  /**
   * Obtiene MantenimientosFijos que vencen en la fechaObjetivo.
   * Filtra aquellos que ya tienen una Programacion en el período de su frecuencia.
   */
  async obtenerFuenteA(fechaObjetivo) {
    const dia = new Date(fechaObjetivo + 'T00:00:00-05:00').getDate();

    const mantenimientos = await MantenimientoFijo.findAll({
      where: { activo: true, dia_mes: dia },
      include: [
        {
          model: Ascensor,
          attributes: ['ascensor_id', 'tipo_equipo', 'marca', 'modelo'],
          include: [{
            model: Cliente,
            attributes: ['cliente_id', 'nombre_comercial', 'distrito', 'latitud', 'longitud', 'ubicacion'],
            where: { estado_activo: true }
          }]
        },
        // Nota: trabajador_id es campo directo de MantenimientoFijo, no se necesita include
      ]
    });

    if (mantenimientos.length === 0) return [];

    // Batch query: obtener todas las Programaciones relevantes en los últimos 85 días
    const maxPeriodoInicio = new Date(fechaObjetivo + 'T00:00:00-05:00');
    maxPeriodoInicio.setDate(maxPeriodoInicio.getDate() - 85);

    const ascensorIds = [...new Set(mantenimientos.map(m => m.ascensor_id))];
    const mfIds = mantenimientos.map(m => m.mantenimiento_fijo_id);

    const existingProgramaciones = await Programacion.findAll({
      where: {
        ascensor_id: { [Op.in]: ascensorIds },
        mantenimiento_fijo_id: { [Op.in]: mfIds },
        estado: { [Op.notIn]: ['cancelado'] },
        fecha_inicio: {
          [Op.gte]: maxPeriodoInicio,
          [Op.lt]: new Date(fechaObjetivo + 'T23:59:59-05:00')
        }
      },
      attributes: ['ascensor_id', 'mantenimiento_fijo_id', 'fecha_inicio']
    });

    // Construir mapa rápido: ascensor_id -> { mf_id -> la fecha más reciente }
    const existingMap = new Map();
    for (const p of existingProgramaciones) {
      const key = p.ascensor_id;
      if (!existingMap.has(key)) existingMap.set(key, new Map());
      existingMap.get(key).set(p.mantenimiento_fijo_id, new Date(p.fecha_inicio));
    }

    const result = [];
    for (const mf of mantenimientos) {
      const ascensorMap = existingMap.get(mf.ascensor_id);
      const ultimaProgramacion = ascensorMap ? ascensorMap.get(mf.mantenimiento_fijo_id) : undefined;

      const periodoInicio = this.getPeriodoInicio(mf.frecuencia, fechaObjetivo);
      if (ultimaProgramacion && ultimaProgramacion >= periodoInicio) {
        continue; // Ya cubierto
      }

      const cliente = mf.Ascensor?.Cliente;
      if (!cliente) continue;

      result.push({
        mantenimiento_fijo_id: mf.mantenimiento_fijo_id,
        ascensor_id: mf.ascensor_id,
        tecnico_preferido_id: mf.trabajador_id || null,
        hora_preferida: mf.hora ? String(mf.hora).substring(0, 5) : null,
        frecuencia: mf.frecuencia,
        tipo_equipo: mf.Ascensor?.tipo_equipo || null,
        marca: mf.Ascensor?.marca || null,
        cliente_id: cliente.cliente_id,
        nombre_cliente: cliente.nombre_comercial,
        distrito: cliente.distrito,
        latitud: cliente.latitud,
        longitud: cliente.longitud,
        ubicacion: cliente.ubicacion,
        tipo_trabajo: 'mantenimiento',
        programacion_id: null,
        fuente: 'mantenimiento_fijo',
        hora_inicio_fija: null,
        hora_fin_fija: null
      });
    }

    return result;
  }

  // ─── Fuente B: Programaciones pendientes ─────────────────────────────────────

  /**
   * Obtiene Programaciones pendientes sin técnico para la fecha objetivo.
   */
  async obtenerFuenteB(fechaObjetivo) {
    const fechaInicio = new Date(fechaObjetivo + 'T00:00:00-05:00');
    const fechaFin = new Date(fechaObjetivo + 'T23:59:59-05:00');

    const programaciones = await Programacion.findAll({
      where: {
        estado: 'pendiente',
        trabajador_id: null,
        fecha_inicio: {
          [Op.gte]: fechaInicio,
          [Op.lte]: fechaFin
        }
      },
      include: [
        {
          model: Cliente,
          attributes: ['cliente_id', 'nombre_comercial', 'distrito', 'latitud', 'longitud', 'ubicacion']
        },
        {
          model: Ascensor,
          attributes: ['ascensor_id', 'tipo_equipo', 'marca'],
          required: false
        }
      ]
    });

    return programaciones.map(p => ({
      programacion_id: p.programacion_id,
      mantenimiento_fijo_id: p.mantenimiento_fijo_id || null,
      ascensor_id: p.ascensor_id,
      tecnico_preferido_id: null,
      hora_preferida: null,
      hora_inicio_fija: p.fecha_inicio ? this._formatTime(new Date(p.fecha_inicio)) : null,
      hora_fin_fija: p.fecha_fin ? this._formatTime(new Date(p.fecha_fin)) : null,
      tipo_equipo: p.Ascensor?.tipo_equipo || null,
      marca: p.Ascensor?.marca || null,
      cliente_id: p.Cliente?.cliente_id,
      nombre_cliente: p.Cliente?.nombre_comercial,
      distrito: p.Cliente?.distrito,
      latitud: p.Cliente?.latitud,
      longitud: p.Cliente?.longitud,
      ubicacion: p.Cliente?.ubicacion,
      tipo_trabajo: p.tipo_trabajo,
      fuente: 'programacion_pendiente'
    }));
  }

  // ─── Deduplicación ────────────────────────────────────────────────────────

  /**
   * Excluye de A los ascensores ya presentes en B.
   */
  deduplicar(fuenteA, fuenteB) {
    const ascensoresEnB = new Set(fuenteB.map(w => w.ascensor_id));
    const fuenteAFiltrada = fuenteA.filter(w => !ascensoresEnB.has(w.ascensor_id));
    return [...fuenteAFiltrada, ...fuenteB];
  }

  // ─── Enriquecimiento con configuración ────────────────────────────────────

  /**
   * Agrega duracion_min, tecnicos_requeridos y prioridad desde ConfiguracionIA.
   */
  async enriquecerConConfiguracion(items) {
    const config = await ConfiguracionIA.findAll({ where: { activo: true } });
    const configMap = {};
    for (const c of config) {
      configMap[c.tipo_trabajo] = c;
    }

    return items.map(item => ({
      ...item,
      duracion_min: configMap[item.tipo_trabajo]?.duracion_min ?? 60,
      tecnicos_requeridos: configMap[item.tipo_trabajo]?.tecnicos_requeridos ?? 1,
      prioridad: configMap[item.tipo_trabajo]?.prioridad ?? 4
    }));
  }

  // ─── Orquestador ──────────────────────────────────────────────────────────

  /**
   * Construye el pool completo de trabajos para la fecha objetivo.
   */
  async obtenerPool(fechaObjetivo) {
    const [fuenteA, fuenteB] = await Promise.all([
      this.obtenerFuenteA(fechaObjetivo),
      this.obtenerFuenteB(fechaObjetivo)
    ]);

    const deduplicado = this.deduplicar(fuenteA, fuenteB);
    const enriquecido = await this.enriquecerConConfiguracion(deduplicado);

    return enriquecido;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

module.exports = { DemandService };
