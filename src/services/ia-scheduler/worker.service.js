const { Op } = require('sequelize');
const { Trabajador, Programacion } = require('../../models');

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

    // Obtener carga preexistente para cada técnico
    const tecnicoIds = tecnicos.map(t => t.trabajador_id);

    const cargas = await this._obtenerCargaPreexistente(tecnicoIds, fechaInicio, fechaFin);

    // Ensamblar resultado
    return tecnicos.map(t => ({
      trabajador_id: t.trabajador_id,
      nombre: t.nombre,
      apellido: t.apellido,
      especialidad: t.especialidad,
      carga_preexistente: cargas.get(t.trabajador_id) || {
        trabajos_confirmados: 0,
        minutos_comprometidos: 0,
        ultima_hora_fin: null
      }
    }));
  }

  /**
   * Calcula la carga preexistente para una lista de IDs de técnicos.
   * Usa una query por técnico para manejar los 4 posibles slots (trabajador_id, tecnico2/3/4).
   * @returns {Map<number, {trabajos_confirmados, minutos_comprometidos, ultima_hora_fin}>}
   */
  async _obtenerCargaPreexistente(ids, fechaInicio, fechaFin) {
    const cargas = new Map();

    // Una sola query con OR para los 4 slots
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
      ]
    });

    // Agrupar por técnico (cada programacion puede involucrar hasta 4 técnicos)
    for (const p of programaciones) {
      const tecnicosInvolucrados = [
        p.trabajador_id,
        p.tecnico2_id,
        p.tecnico3_id,
        p.tecnico4_id
      ].filter(id => id !== null && ids.includes(id));

      for (const tid of tecnicosInvolucrados) {
        if (!cargas.has(tid)) {
          cargas.set(tid, {
            trabajos_confirmados: 0,
            minutos_comprometidos: 0,
            ultima_hora_fin: null
          });
        }

        const carga = cargas.get(tid);
        carga.trabajos_confirmados++;

        // Calcular duración en minutos
        const inicio = new Date(p.fecha_inicio);
        const fin = new Date(p.fecha_fin);
        const duracion = Math.round((fin - inicio) / 60000); // ms → minutos
        carga.minutos_comprometidos += duracion;

        // Registrar la hora más tardía de finalización
        const horaFinStr = this._formatTime(fin);
        if (!carga.ultima_hora_fin || horaFinStr > carga.ultima_hora_fin) {
          carga.ultima_hora_fin = horaFinStr;
        }
      }
    }

    return cargas;
  }

  _formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

module.exports = { WorkerService };
