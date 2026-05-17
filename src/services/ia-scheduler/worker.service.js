const { Op } = require('sequelize');
const { Trabajador, Programacion, Cliente } = require('../../models');

/**
 * Servicio de técnicos: obtiene la lista de técnicos activos con su
 * carga preexistente (Programaciones confirmadas) para una fecha objetivo.
 */
class WorkerService {
  /**
   * Obtiene los técnicos activos especificados por ID, incluyendo su carga preexistente.
   * @param {number[]} ids — IDs de trabajadores a consultar
   * @param {string} fechaObjetivo — 'YYYY-MM-DD'
   * @returns {Promise<Tecnico[]>}
   */
  async obtenerTecnicos(ids, fechaObjetivo) {
    const fechaInicio = new Date(fechaObjetivo + 'T00:00:00-05:00');
    const fechaFin = new Date(fechaObjetivo + 'T23:59:59-05:00');

    // Obtener datos base de los técnicos
    const tecnicos = await Trabajador.findAll({
      where: {
        trabajador_id: { [Op.in]: ids },
        estado_activo: true
      },
      attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad']
    });

    if (tecnicos.length === 0) return [];

    // Obtener datos del día para cada técnico
    const tecnicoIds = tecnicos.map(t => t.trabajador_id);

    const { cargaMap, trabajosMap } = await this._obtenerDatosDelDia(tecnicoIds, fechaInicio, fechaFin);

    // Ensamblar resultado
    return tecnicos.map(t => ({
      trabajador_id: t.trabajador_id,
      nombre: t.nombre,
      apellido: t.apellido,
      especialidad: t.especialidad,
      carga_preexistente: cargaMap.get(t.trabajador_id) || {
        trabajos_confirmados: 0,
        minutos_comprometidos: 0,
        ultima_hora_fin: null
      },
      trabajos_del_dia: trabajosMap.get(t.trabajador_id) || []
    }));
  }

  /**
   * Obtiene todas las programaciones del día para los técnicos dados.
   * Retorna carga preexistente (resumen) y trabajos_del_dia (lista ordenada por hora).
   * @returns {{ cargaMap: Map, trabajosMap: Map }}
   */
  async _obtenerDatosDelDia(ids, fechaInicio, fechaFin) {
    const cargaMap = new Map();
    const trabajosMap = new Map();

    const programaciones = await Programacion.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { trabajador_id: { [Op.in]: ids } },
              { tecnico2_id: { [Op.in]: ids } },
              { tecnico3_id: { [Op.in]: ids } },
              { tecnico4_id: { [Op.in]: ids } }
            ]
          },
          {
            fecha_inicio: {
              [Op.gte]: fechaInicio,
              [Op.lte]: fechaFin
            }
          },
          {
            estado: { [Op.notIn]: ['cancelado'] }
          }
        ]
      },
      attributes: [
        'trabajador_id', 'tecnico2_id', 'tecnico3_id', 'tecnico4_id',
        'fecha_inicio', 'fecha_fin'
      ],
      include: [
        {
          model: Cliente,
          attributes: ['distrito'],
          required: false
        }
      ]
    });

    for (const p of programaciones) {
      const tecnicosInvolucrados = [
        p.trabajador_id,
        p.tecnico2_id,
        p.tecnico3_id,
        p.tecnico4_id
      ].filter(id => id !== null && ids.includes(id));

      const inicio = new Date(p.fecha_inicio);
      const fin = new Date(p.fecha_fin);
      const duracion = Math.round((fin - inicio) / 60000);
      const horaInicioStr = this._formatTime(inicio);
      const horaFinStr = this._formatTime(fin);
      const distrito = p.Cliente?.distrito || null;

      for (const tid of tecnicosInvolucrados) {
        // Carga preexistente
        if (!cargaMap.has(tid)) {
          cargaMap.set(tid, { trabajos_confirmados: 0, minutos_comprometidos: 0, ultima_hora_fin: null });
        }
        const carga = cargaMap.get(tid);
        carga.trabajos_confirmados++;
        carga.minutos_comprometidos += duracion;
        if (!carga.ultima_hora_fin || horaFinStr > carga.ultima_hora_fin) {
          carga.ultima_hora_fin = horaFinStr;
        }

        // Trabajos del día (para cálculo de slots)
        if (!trabajosMap.has(tid)) trabajosMap.set(tid, []);
        trabajosMap.get(tid).push({ hora_inicio: horaInicioStr, hora_fin: horaFinStr, distrito });
      }
    }

    // Ordenar trabajos por hora de inicio
    for (const [, trabajos] of trabajosMap) {
      trabajos.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    }

    return { cargaMap, trabajosMap };
  }

  _formatTime(date) {
    // 'sv-SE' produce 'YYYY-MM-DD HH:MM:SS' — consistente independientemente de la zona del servidor
    return date.toLocaleString('sv-SE', { timeZone: 'America/Lima' }).split(' ')[1].substring(0, 5);
  }
}

module.exports = { WorkerService };
