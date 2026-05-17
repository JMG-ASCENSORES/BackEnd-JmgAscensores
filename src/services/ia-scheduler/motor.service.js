// ─── Constantes ────────────────────────────────────────────────────────────────

const ELEGIBILIDAD = {
  mantenimiento: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico'],
  reparacion: ['Técnico de Reparaciones', 'Supervisor Técnico'],
  inspeccion: ['Supervisor Técnico', 'Técnico General'],
  emergencia: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico', 'Técnico de Reparaciones']
};

const DISTRITO_INICIO_DEFAULT = 'Cercado de Lima';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toMinutos(timeStr) {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return 0;
  const h = parseInt(trimmed.substring(0, colonIdx), 10);
  const m = parseInt(trimmed.substring(colonIdx + 1), 10);
  return h * 60 + m;
}

function toTimeStr(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─── MotorService ──────────────────────────────────────────────────────────────

class MotorService {
  /**
   * @param {DistrictTimesService} districtTimesService
   * @param {object} [config] — valores de ConfiguracionIA: hora_inicio_default, hora_fin_limite
   */
  constructor(districtTimesService, config = {}) {
    this.districtTimes = districtTimesService;
    this.config = config;
  }

  /**
   * Filtra técnicos que pueden realizar el tipo de trabajo indicado.
   */
  candidatosElegibles(workItem, tecnicos) {
    const especialidadesPermitidas = ELEGIBILIDAD[workItem.tipo_trabajo] || [];
    return tecnicos.filter(t => especialidadesPermitidas.includes(t.especialidad));
  }

  /**
   * Busca el mejor slot disponible en la agenda del técnico para el workItem.
   * @param {WorkItemEnriquecido} workItem
   * @param {Tecnico} tecnico — debe tener trabajos_del_dia: [{ hora_inicio, hora_fin, distrito }]
   * @returns {{ hora_inicio, hora_fin, traslado_min } | null}
   */
  calcularSlot(workItem, tecnico) {
    const HORA_INICIO = toMinutos(this.config.hora_inicio_default || '08:30');
    const HORA_FIN    = toMinutos(this.config.hora_fin_limite    || '18:30');
    const duracion    = workItem.duracion_min || 60;
    const horaPreferida = workItem.hora_preferida ? toMinutos(workItem.hora_preferida) : null;

    const trabajosDia = [...(tecnico.trabajos_del_dia || [])].sort(
      (a, b) => toMinutos(a.hora_inicio) - toMinutos(b.hora_inicio)
    );

    const gaps = [];

    if (trabajosDia.length === 0) {
      const traslado = this.districtTimes.getTiempo(DISTRITO_INICIO_DEFAULT, workItem.distrito);
      const inicioPosible = HORA_INICIO + traslado;
      if (HORA_FIN - inicioPosible >= duracion) {
        gaps.push({ inicio_min: inicioPosible, fin_max: HORA_FIN, traslado_min: traslado });
      }
    } else {
      // Antes del primer trabajo
      const primero = trabajosDia[0];
      const trasladoDesdeBase = this.districtTimes.getTiempo(DISTRITO_INICIO_DEFAULT, workItem.distrito);
      const trasladoAFirst    = this.districtTimes.getTiempo(workItem.distrito, primero.distrito || DISTRITO_INICIO_DEFAULT);
      const inicioP = HORA_INICIO + trasladoDesdeBase;
      const finMaxP  = toMinutos(primero.hora_inicio) - trasladoAFirst;
      if (finMaxP - inicioP >= duracion) {
        gaps.push({ inicio_min: inicioP, fin_max: finMaxP, traslado_min: trasladoDesdeBase });
      }

      // Entre trabajos y después del último
      for (let i = 0; i < trabajosDia.length; i++) {
        const prev = trabajosDia[i];
        const next = trabajosDia[i + 1];
        const trasladoDesde = this.districtTimes.getTiempo(prev.distrito || DISTRITO_INICIO_DEFAULT, workItem.distrito);
        const inicioMin = toMinutos(prev.hora_fin) + trasladoDesde;

        let finMax;
        if (next) {
          const trasladoANext = this.districtTimes.getTiempo(workItem.distrito, next.distrito || DISTRITO_INICIO_DEFAULT);
          finMax = toMinutos(next.hora_inicio) - trasladoANext;
        } else {
          finMax = HORA_FIN;
        }

        if (finMax - inicioMin >= duracion) {
          gaps.push({ inicio_min: inicioMin, fin_max: finMax, traslado_min: trasladoDesde });
        }
      }
    }

    if (gaps.length === 0) return null;

    let mejor = null;
    let mejorScore = Infinity;

    for (const gap of gaps) {
      let inicioSlot = gap.inicio_min;
      let preferenciaCabe = false;

      if (horaPreferida !== null) {
        const conPreferencia = Math.max(gap.inicio_min, horaPreferida);
        if (conPreferencia + duracion <= gap.fin_max) {
          inicioSlot = conPreferencia;
          preferenciaCabe = true;
        }
      } else {
        preferenciaCabe = true;
      }

      const cabeBonus = preferenciaCabe ? 0 : 1000000;
      const preferenciaScore = horaPreferida !== null ? Math.abs(inicioSlot - horaPreferida) : 0;
      const score = cabeBonus + preferenciaScore + inicioSlot / 1440;

      if (score < mejorScore) {
        mejorScore = score;
        mejor = { inicio: inicioSlot, traslado_min: gap.traslado_min };
      }
    }

    if (!mejor) return null;

    return {
      hora_inicio:  toTimeStr(mejor.inicio),
      hora_fin:     toTimeStr(mejor.inicio + duracion),
      traslado_min: mejor.traslado_min,
    };
  }

  /**
   * Evalúa todos los técnicos elegibles para un trabajo individual.
   * Retorna sugerencia principal + alternativas ordenadas por idoneidad.
   * @param {WorkItemEnriquecido} workItem
   * @param {Tecnico[]} tecnicos
   * @returns {{ sugerencia, alternativas, sin_elegible, razon_sin_elegible }}
   */
  evaluarTecnicos(workItem, tecnicos) {
    const elegibles = this.candidatosElegibles(workItem, tecnicos);

    if (elegibles.length === 0) {
      return {
        sugerencia: null,
        alternativas: [],
        sin_elegible: true,
        razon_sin_elegible: `Ningún técnico activo es elegible para tipo_trabajo '${workItem.tipo_trabajo}'.`,
      };
    }

    const candidatos = [];
    for (const tecnico of elegibles) {
      const slot = this.calcularSlot(workItem, tecnico);
      if (!slot) continue;

      const cargaMin = tecnico.carga_preexistente?.minutos_comprometidos || 0;
      candidatos.push({
        trabajador_id:      tecnico.trabajador_id,
        nombre:             tecnico.nombre,
        apellido:           tecnico.apellido,
        especialidad:       tecnico.especialidad,
        hora_inicio:        slot.hora_inicio,
        hora_fin:           slot.hora_fin,
        traslado_min:       slot.traslado_min,
        carga_previa_horas: Math.round((cargaMin / 60) * 10) / 10,
        justificacion:      null,
        _score: this._scoreSlot(slot, cargaMin, workItem),
      });
    }

    if (candidatos.length === 0) {
      return {
        sugerencia: null,
        alternativas: [],
        sin_elegible: true,
        razon_sin_elegible: 'No hay hueco disponible en la agenda de ningún técnico elegible para esa fecha.',
      };
    }

    candidatos.sort((a, b) => a._score - b._score);
    const [principal, ...alternativasRaw] = candidatos;
    const alternativas = alternativasRaw.map(({ _score, ...rest }) => rest);
    const { _score: _, ...sugerencia } = principal;

    return { sugerencia, alternativas, sin_elegible: false, razon_sin_elegible: null };
  }

  _scoreSlot(slot, cargaMin, workItem) {
    const horaPreferida = workItem.hora_preferida ? toMinutos(workItem.hora_preferida) : null;
    const inicioSlot = toMinutos(slot.hora_inicio);
    const penalizacionHora = horaPreferida !== null ? Math.abs(inicioSlot - horaPreferida) : 0;
    return penalizacionHora * 10 + slot.traslado_min + cargaMin / 60 + inicioSlot / 1440;
  }
}

module.exports = { MotorService, ELEGIBILIDAD, toMinutos, toTimeStr };
