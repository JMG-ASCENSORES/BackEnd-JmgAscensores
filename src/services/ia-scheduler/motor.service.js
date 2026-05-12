// ─── Constantes ────────────────────────────────────────────────────────────────

const ELEGIBILIDAD = {
  mantenimiento: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico'],
  reparacion: ['Técnico de Reparaciones', 'Supervisor Técnico'],
  inspeccion: ['Supervisor Técnico', 'Técnico General'],
  emergencia: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico', 'Técnico de Reparaciones']
};

const MAX_MINUTOS_DIA = 10 * 60; // 10 horas absolutas
const DISTRITO_INICIO_DEFAULT = 'Cercado de Lima';
const TIEMPO_MISMO_DISTRITO = 15;
const TIEMPO_FALLBACK = 90;
const MARGEN_ENTRE_TRABAJOS = 0; // sin margen extra en v1

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convierte un string 'HH:MM' a minutos desde medianoche.
 */
function toMinutos(timeStr) {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return 0;
  const h = parseInt(trimmed.substring(0, colonIdx), 10);
  const m = parseInt(trimmed.substring(colonIdx + 1), 10);
  return h * 60 + m;
}

/**
 * Convierte minutos desde medianoche a string 'HH:MM'.
 */
function toTimeStr(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─── MotorService ──────────────────────────────────────────────────────────────

class MotorService {
  /**
   * @param {DistrictTimesService} districtTimesService
   * @param {object} [config] — opcional, valores por defecto de ConfiguracionIA
   */
  constructor(districtTimesService, config = {}) {
    this.districtTimes = districtTimesService;
    this.config = config;
  }

  // ─── Paso 1: Validar inputs ──────────────────────────────────────────────

  /**
   * @param {WorkItem[]} workItems
   * @param {Tecnico[]} tecnicos
   * @throws {Error} si no hay trabajos o no hay técnicos
   */
  validarInputs(workItems, tecnicos) {
    if (!workItems || workItems.length === 0) {
      throw new Error('No hay trabajos en el pool para la fecha seleccionada.');
    }
    if (!tecnicos || tecnicos.length === 0) {
      throw new Error('No hay técnicos seleccionados.');
    }
    const sinDistrito = workItems.filter(w => !w.distrito);
    if (sinDistrito.length > 0) {
      console.warn(`[Motor] ${sinDistrito.length} trabajos sin distrito — se usará fallback de ${TIEMPO_FALLBACK} min.`);
    }
  }

  // ─── Paso 2: Ordenar por prioridad ───────────────────────────────────────

  /**
   * Ordena los workItems: prioridad ascendente → hora preferida → distrito.
   * @param {WorkItem[]} workItems
   * @returns {WorkItem[]} copia ordenada
   */
  ordenarPorPrioridad(workItems) {
    return [...workItems].sort((a, b) => {
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;

      const aHora = a.hora_inicio_fija || a.hora_preferida || '99:99';
      const bHora = b.hora_inicio_fija || b.hora_preferida || '99:99';
      if (aHora !== bHora) return aHora.localeCompare(bHora);

      return (a.distrito || '').localeCompare(b.distrito || '');
    });
  }

  // ─── Paso 3: Elegibilidad y asignación ───────────────────────────────────

  /**
   * Filtra los técnicos que pueden realizar el tipo de trabajo del workItem.
   * @param {WorkItem} workItem
   * @param {Tecnico[]} tecnicos
   * @returns {Tecnico[]}
   */
  candidatosElegibles(workItem, tecnicos) {
    const especialidadesPermitidas = ELEGIBILIDAD[workItem.tipo_trabajo] || [];
    return tecnicos.filter(t => especialidadesPermitidas.includes(t.especialidad));
  }

  /**
   * Retorna la carga actual de un técnico (minutos ya asignados en esta ronda).
   * @param {Tecnico} tecnico
   * @param {Map<number, WorkItem[]>} asignaciones
   * @returns {number}
   */
  getCargaMinutos(tecnico, asignaciones) {
    const trabajosAsignados = asignaciones.get(tecnico.trabajador_id) || [];
    const cargaBase = tecnico.carga_preexistente?.minutos_comprometidos || 0;
    const cargaAsignada = trabajosAsignados.reduce((sum, w) => sum + (w.duracion_min || 0), 0);
    return cargaBase + cargaAsignada;
  }

  /**
   * Cuenta cuántos trabajos en el mismo distrito ya tiene asignados el técnico.
   * @param {Tecnico} tecnico
   * @param {string} distrito
   * @param {Map<number, WorkItem[]>} asignaciones
   * @returns {number}
   */
  countEnDistrito(tecnico, distrito, asignaciones) {
    const trabajosAsignados = asignaciones.get(tecnico.trabajador_id) || [];
    return trabajosAsignados.filter(w => w.distrito === distrito).length;
  }

  /**
   * Elige el mejor técnico para un workItem entre los candidatos.
   * Respeta preferencia de técnico si tiene capacidad. Si no, greedy.
   * @param {WorkItem} workItem
   * @param {Tecnico[]} candidatos
   * @param {Map<number, WorkItem[]>} asignaciones
   * @returns {Tecnico|null}
   */
  elegirTecnico(workItem, candidatos, asignaciones) {
    // Preferencia por técnico del plan fijo (soft constraint)
    if (workItem.tecnico_preferido_id) {
      const preferido = candidatos.find(t => t.trabajador_id === workItem.tecnico_preferido_id);
      if (preferido && this.getCargaMinutos(preferido, asignaciones) < MAX_MINUTOS_DIA) {
        return preferido;
      }
    }

    // Greedy: menor carga, desempate por más trabajos en el mismo distrito
    const conCapacidad = candidatos.filter(t => this.getCargaMinutos(t, asignaciones) < MAX_MINUTOS_DIA);
    if (conCapacidad.length === 0) return null;

    return conCapacidad.sort((a, b) => {
      const cargaA = this.getCargaMinutos(a, asignaciones);
      const cargaB = this.getCargaMinutos(b, asignaciones);
      if (cargaA !== cargaB) return cargaA - cargaB;

      const distA = this.countEnDistrito(a, workItem.distrito, asignaciones);
      const distB = this.countEnDistrito(b, workItem.distrito, asignaciones);
      return distB - distA; // más es mejor (clustering)
    })[0] || null;
  }

  /**
   * Asigna cada workItem a un técnico (o a sinElegible).
   * @param {WorkItem[]} workItems — ya ordenados por prioridad
   * @param {Tecnico[]} tecnicos
   * @returns {{ asignaciones: Map<number, WorkItem[]>, sinElegible: WorkItem[] }}
   */
  asignarTecnicos(workItems, tecnicos) {
    const asignaciones = new Map();
    const sinElegible = [];

    for (const workItem of workItems) {
      const candidatos = this.candidatosElegibles(workItem, tecnicos);

      if (candidatos.length === 0) {
        sinElegible.push({ ...workItem, razon_sin_tecnico: `Ningún técnico seleccionado es elegible para ${workItem.tipo_trabajo}.` });
        continue;
      }

      const elegido = this.elegirTecnico(workItem, candidatos, asignaciones);
      if (!elegido) {
        sinElegible.push({ ...workItem, razon_sin_tecnico: 'Todos los técnicos elegibles están saturados.' });
        continue;
      }

      // Marcar si se respetó la preferencia de técnico (Bug 2 fix)
      const preferidoRespetado = workItem.tecnico_preferido_id
        ? elegido.trabajador_id === workItem.tecnico_preferido_id
        : false;

      const lista = asignaciones.get(elegido.trabajador_id) || [];
      lista.push({ ...workItem, tecnico_preferido_respetado: preferidoRespetado });
      asignaciones.set(elegido.trabajador_id, lista);
    }

    return { asignaciones, sinElegible };
  }

  // ─── Paso 4: Secuenciar paradas ──────────────────────────────────────────

  /**
   * Nearest-neighbor greedy desde un punto de partida.
   * @param {WorkItem[]} trabajos
   * @returns {WorkItem[]}
   */
  nearestNeighbor(trabajos) {
    if (trabajos.length === 0) return [];

    const pendientes = [...trabajos];
    const resultado = [];
    let distritoActual = DISTRITO_INICIO_DEFAULT;

    while (pendientes.length > 0) {
      let minTiempo = Infinity;
      let elegidoIdx = 0;

      pendientes.forEach((trabajo, idx) => {
        const tiempo = this.districtTimes.getTiempo(distritoActual, trabajo.distrito);
        if (tiempo < minTiempo) {
          minTiempo = tiempo;
          elegidoIdx = idx;
        }
      });

      resultado.push(pendientes[elegidoIdx]);
      distritoActual = pendientes[elegidoIdx].distrito || DISTRITO_INICIO_DEFAULT;
      pendientes.splice(elegidoIdx, 1);
    }

    return resultado;
  }

  /**
   * Secuencia los trabajos de un técnico: fijos (slot exacto) intercalados
   * con libres (nearest-neighbor).
   * @param {WorkItem[]} trabajosDelTecnico
   * @returns {WorkItem[]}
   */
  secuenciarParadas(trabajosDelTecnico) {
    if (trabajosDelTecnico.length <= 1) return trabajosDelTecnico;

    const fijos = trabajosDelTecnico.filter(w => w.hora_inicio_fija !== null && w.hora_inicio_fija !== undefined);
    const libres = trabajosDelTecnico.filter(w => w.hora_inicio_fija === null || w.hora_inicio_fija === undefined);

    const secuenciaLibres = this.nearestNeighbor(libres);

    return this.intercalarFijos(secuenciaLibres, fijos);
  }

  /**
   * Intercala trabajos con hora fija en la secuencia según su slot temporal.
   * @param {WorkItem[]} libres — ya ordenados por nearest-neighbor
   * @param {WorkItem[]} fijos — trabajos con hora_inicio_fija
   * @returns {WorkItem[]}
   */
  intercalarFijos(libres, fijos) {
    if (fijos.length === 0) return libres;

    const fijosOrdenados = [...fijos].sort((a, b) => {
      return toMinutos(a.hora_inicio_fija) - toMinutos(b.hora_inicio_fija);
    });

    const resultado = [];
    let idxFijo = 0;
    let idxLibre = 0;

    while (idxFijo < fijosOrdenados.length && idxLibre < libres.length) {
      if (toMinutos(fijosOrdenados[idxFijo].hora_inicio_fija) <= toMinutos(libres[idxLibre].hora_preferida || '99:99')) {
        resultado.push(fijosOrdenados[idxFijo]);
        idxFijo++;
      } else {
        resultado.push(libres[idxLibre]);
        idxLibre++;
      }
    }

    // Agregar los que quedan
    while (idxFijo < fijosOrdenados.length) resultado.push(fijosOrdenados[idxFijo++]);
    while (idxLibre < libres.length) resultado.push(libres[idxLibre++]);

    return resultado;
  }

  // ─── Paso 5: Calcular horarios ───────────────────────────────────────────

  /**
   * Calcula hora_inicio y hora_fin para cada parada en la secuencia del técnico.
   * @param {WorkItem[]} secuencia
   * @param {object} cargaPreexistente — { minutos_comprometidos, ultima_hora_fin }
   * @param {object} config — { hora_inicio_default, hora_fin_limite }
   * @returns {object[]} trabajos con hora_inicio, hora_fin, traslado_desde_anterior, overflow
   */
  calcularHorarios(secuencia, cargaPreexistente = {}, config = {}) {
    const HORA_INICIO_JORNADA = config.hora_inicio_default || '08:30';
    const HORA_FIN_LIMITE = config.hora_fin_limite || '18:30';

    let tiempoActual = toMinutos(HORA_INICIO_JORNADA);

    // Si el técnico ya tiene trabajos confirmados, empezar después del último + margen
    if (cargaPreexistente.ultima_hora_fin) {
      const ultimaFin = toMinutos(cargaPreexistente.ultima_hora_fin);
      tiempoActual = Math.max(tiempoActual, ultimaFin + 15); // 15 min de margen
    }

    const resultados = [];
    let overflowActivado = false; // Obs 2 fix: propagar overflow a trabajos subsiguientes

    for (let i = 0; i < secuencia.length; i++) {
      const trabajo = secuencia[i];

      let traslado = 0;

      // Si tiene hora fija, respetarla
      if (trabajo.hora_inicio_fija) {
        tiempoActual = Math.max(tiempoActual, toMinutos(trabajo.hora_inicio_fija));
      } else {
        // Agregar traslado desde la parada anterior
        if (i > 0) {
          const previo = secuencia[i - 1];
          traslado = this.districtTimes.getTiempo(
            previo.distrito || DISTRITO_INICIO_DEFAULT,
            trabajo.distrito || DISTRITO_INICIO_DEFAULT
          );
          tiempoActual += traslado;
        }
      }

      const horaInicioMin = tiempoActual;
      const horaFinMin = tiempoActual + trabajo.duracion_min;

      // Si un trabajo anterior ya desbordó, todos los siguientes también
      const overflow = overflowActivado || horaFinMin > toMinutos(HORA_FIN_LIMITE);
      if (overflow) overflowActivado = true;

      resultados.push({
        ...trabajo,
        hora_inicio: toTimeStr(horaInicioMin),
        hora_fin: toTimeStr(horaFinMin),
        traslado_desde_anterior: traslado,
        overflow
      });

      if (!overflow) {
        tiempoActual = horaFinMin + MARGEN_ENTRE_TRABAJOS;
      }
    }

    return resultados;
  }

  // ─── Paso 6: Procesar overflow ───────────────────────────────────────────

  /**
   * Separa los trabajos con overflow de cada técnico.
   * @param {object[]} tecnicosConParadas — array de { tecnico, trabajos }
   * @returns {{ tecnicosConParadas: object[], overflow: object[] }}
   */
  procesarOverflow(tecnicosConParadas) {
    const overflow = [];

    for (const entrada of tecnicosConParadas) {
      const tecnico = entrada.tecnico;
      const overflowItems = entrada.trabajos.filter(t => t.overflow);
      const normales = entrada.trabajos.filter(t => !t.overflow);

      entrada.trabajos = normales;

      for (const item of overflowItems) {
        overflow.push({
          ...item,
          trabajador_id_propuesto: tecnico.trabajador_id,
          razon_overflow: `No cabe en la jornada ${this.config.hora_inicio_default || '08:30'}–${this.config.hora_fin_limite || '18:30'} con los trabajos previos.`
        });
      }
    }

    return { tecnicosConParadas, overflow };
  }

  // ─── Paso 7: Orquestar ───────────────────────────────────────────────────

  /**
   * Genera una propuesta completa a partir del pool de trabajos y los técnicos.
   * @param {WorkItem[]} workItems
   * @param {Tecnico[]} tecnicos
   * @param {string} fechaObjetivo — 'YYYY-MM-DD'
   * @returns {PropuestaMotor}
   */
  generarPropuesta(workItems, tecnicos, fechaObjetivo) {
    // 1. Validar
    this.validarInputs(workItems, tecnicos);

    // 2. Ordenar
    const ordenados = this.ordenarPorPrioridad(workItems);

    // 3. Asignar técnicos
    const { asignaciones, sinElegible } = this.asignarTecnicos(ordenados, tecnicos);

    // 4-5-6. Para cada técnico: secuenciar, calcular horarios, detectar overflow
    const tecnicosConParadasRaw = [];
    for (const tecnico of tecnicos) {
      const trabajos = asignaciones.get(tecnico.trabajador_id) || [];
      if (trabajos.length === 0) continue;

      const secuencia = this.secuenciarParadas(trabajos);
      const conHorarios = this.calcularHorarios(secuencia, tecnico.carga_preexistente, this.config);

      tecnicosConParadasRaw.push({ tecnico, trabajos: conHorarios });
    }

    const { tecnicosConParadas, overflow } = this.procesarOverflow(tecnicosConParadasRaw);

    // Construir la estructura de respuesta
    const tecnicosResponse = tecnicosConParadas.map(({ tecnico, trabajos }) => {
      const cargaAsignada = trabajos.reduce((sum, t) => sum + (t.duracion_min || 0), 0);
      const cargaBase = tecnico.carga_preexistente?.minutos_comprometidos || 0;
      const cargaTotal = cargaBase + cargaAsignada;

      return {
        trabajador_id: tecnico.trabajador_id,
        nombre: tecnico.nombre,
        apellido: tecnico.apellido,
        especialidad: tecnico.especialidad,
        carga_minutos: cargaTotal,
        carga_horas: Math.round((cargaTotal / 60) * 10) / 10,
        trabajos: trabajos.map(w => this._toTrabajoEnRuta(w))
      };
    });

    return {
      fecha: fechaObjetivo,
      generado_en: new Date().toISOString(),
      origen: 'motor',
      version: '1.0',
      tecnicos: tecnicosResponse,
      overflow: overflow.map(w => this._toTrabajoEnRuta(w)),
      sin_elegible: sinElegible.map(w => ({
        ...w,
        justificacion: null,
        tecnico_preferido_respetado: false
      }))
    };
  }

  /**
   * Convierte un WorkItem con horarios al formato TrabajoEnRuta.
   * @param {object} w
   * @returns {object}
   */
  _toTrabajoEnRuta(w) {
    return {
      programacion_id: w.programacion_id ?? null,
      mantenimiento_fijo_id: w.mantenimiento_fijo_id ?? null,
      fuente: w.fuente || 'mantenimiento_fijo',
      cliente_id: w.cliente_id,
      nombre_cliente: w.nombre_cliente || w.nombre_comercial,
      distrito: w.distrito,
      ascensor_id: w.ascensor_id,
      tipo_equipo: w.tipo_equipo,
      tipo_trabajo: w.tipo_trabajo,
      duracion_min: w.duracion_min,
      hora_inicio: w.hora_inicio,
      hora_fin: w.hora_fin,
      traslado_desde_anterior: w.traslado_desde_anterior || 0,
      overflow: w.overflow || false,
      tecnico_preferido_respetado: w.tecnico_preferido_respetado || false,
      justificacion: w.justificacion || null,
      fecha_actualizacion: w.fecha_actualizacion ?? null,
      ...(w.trabajador_id_propuesto ? { trabajador_id_propuesto: w.trabajador_id_propuesto } : {}),
      ...(w.razon_overflow ? { razon_overflow: w.razon_overflow } : {}),
      ...(w.razon_sin_tecnico ? { razon_sin_tecnico: w.razon_sin_tecnico } : {})
    };
  }
}

module.exports = { MotorService, ELEGIBILIDAD, toMinutos, toTimeStr, MAX_MINUTOS_DIA };
