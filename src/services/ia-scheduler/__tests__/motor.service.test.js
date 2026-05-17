const { MotorService, ELEGIBILIDAD, toMinutos, toTimeStr } = require('../motor.service');

// Mock DistrictTimesService
function createMockDistrictTimes() {
  const map = new Map();
  map.set('Miraflores::San Isidro', 25);
  map.set('San Isidro::Miraflores', 25);
  map.set('Miraflores::Surco', 35);
  map.set('Surco::Miraflores', 35);
  map.set('San Isidro::Surco', 30);
  map.set('Surco::San Isidro', 30);
  map.set('Cercado de Lima::Miraflores', 45);
  map.set('Cercado de Lima::San Isidro', 40);
  map.set('Cercado de Lima::Surco', 50);
  map.set('Cercado de Lima::La Molina', 55);
  map.set('Miraflores::La Molina', 55);
  map.set('La Molina::Miraflores', 55);
  map.set('Surco::La Molina', 35);
  map.set('La Molina::Surco', 35);
  map.set('Miraflores::Miraflores', 15);
  return {
    getTiempo: (origen, destino) => {
      const key = `${origen}::${destino}`;
      if (map.has(key)) return map.get(key);
      if (origen === destino) return 15;
      return 90;
    }
  };
}

function createWorkItem(overrides = {}) {
  return {
    programacion_id: null,
    mantenimiento_fijo_id: null,
    cliente_id: 1,
    nombre_cliente: 'Test Cliente',
    distrito: 'Miraflores',
    ascensor_id: 1,
    tipo_equipo: 'hidráulico',
    tipo_trabajo: 'mantenimiento',
    duracion_min: 60,
    tecnicos_requeridos: 1,
    prioridad: 4,
    hora_preferida: null,
    hora_inicio_fija: null,
    hora_fin_fija: null,
    tecnico_preferido_id: null,
    fuente: 'mantenimiento_fijo',
    overflow: false,
    ...overrides
  };
}

function createTecnico(overrides = {}) {
  return {
    trabajador_id: 1,
    nombre: 'Carlos',
    apellido: 'Ríos',
    especialidad: 'Técnico de Mantenimiento',
    carga_preexistente: {
      trabajos_confirmados: 0,
      minutos_comprometidos: 0,
      ultima_hora_fin: null
    },
    trabajos_del_dia: [],
    ...overrides
  };
}

describe('MotorService', () => {
  let motor;
  let districtTimes;

  beforeEach(() => {
    districtTimes = createMockDistrictTimes();
    motor = new MotorService(districtTimes, {
      hora_inicio_default: '08:30',
      hora_fin_limite: '18:30'
    });
  });

  // ─── 1.27 Elegibilidad ────────────────────────────────────────────────────

  describe('Elegibilidad — candidatosElegibles', () => {
    it('no asigna reparación a Técnico de Mantenimiento', () => {
      const trabajoReparacion = createWorkItem({ tipo_trabajo: 'reparacion', prioridad: 2 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Supervisor Técnico' })
      ];

      const elegibles = motor.candidatosElegibles(trabajoReparacion, tecnicos);
      expect(elegibles).toHaveLength(1);
      expect(elegibles[0].trabajador_id).toBe(2);
    });

    it('permite mantenimiento a Técnico General', () => {
      const trabajo = createWorkItem({ tipo_trabajo: 'mantenimiento', prioridad: 4 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Reparaciones' })
      ];

      const elegibles = motor.candidatosElegibles(trabajo, tecnicos);
      expect(elegibles).toHaveLength(1);
      expect(elegibles[0].especialidad).toBe('Técnico General');
    });

    it('tipo de trabajo desconocido → sin elegibles', () => {
      const trabajo = createWorkItem({ tipo_trabajo: 'tipo_desconocido', prioridad: 4 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const elegibles = motor.candidatosElegibles(trabajo, tecnicos);
      expect(elegibles).toHaveLength(0);
    });
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  describe('Helpers', () => {
    it('toMinutos convierte correctamente', () => {
      expect(toMinutos('08:30')).toBe(510);
      expect(toMinutos('18:30')).toBe(1110);
      expect(toMinutos('00:00')).toBe(0);
    });

    it('toTimeStr convierte correctamente', () => {
      expect(toTimeStr(510)).toBe('08:30');
      expect(toTimeStr(1110)).toBe('18:30');
      expect(toTimeStr(0)).toBe('00:00');
    });
  });

  // ─── calcularSlot ─────────────────────────────────────────────────────────

  describe('calcularSlot — búsqueda de huecos en agenda del técnico', () => {
    it('1. técnico libre → slot a las 08:30 + traslado desde Cercado de Lima', () => {
      const workItem = createWorkItem({ distrito: 'Miraflores', duracion_min: 60 });
      const tecnico = createTecnico({ trabajos_del_dia: [] });

      const slot = motor.calcularSlot(workItem, tecnico);

      expect(slot).not.toBeNull();
      // Cercado de Lima → Miraflores = 45 min. Inicio = 08:30 (510) + 45 = 09:15 (555)
      expect(slot.hora_inicio).toBe('09:15');
      expect(slot.hora_fin).toBe('10:15');
      expect(slot.traslado_min).toBe(45);
    });

    it('2. técnico con trabajos previos → slot entre trabajos existentes', () => {
      const workItem = createWorkItem({ distrito: 'Miraflores', duracion_min: 60 });
      const tecnico = createTecnico({
        trabajos_del_dia: [
          { hora_inicio: '09:00', hora_fin: '10:30', distrito: 'San Isidro' },
          { hora_inicio: '13:00', hora_fin: '14:00', distrito: 'Surco' }
        ]
      });

      const slot = motor.calcularSlot(workItem, tecnico);

      expect(slot).not.toBeNull();
      // San Isidro(10:30) + traslado(25→Miraflores) = 10:55 inicio
      expect(slot.hora_inicio).toBe('10:55');
      expect(slot.hora_fin).toBe('11:55');
      expect(slot.traslado_min).toBe(25);
    });

    it('3. respeta hora_preferida cuando cabe en el hueco disponible', () => {
      const workItem = createWorkItem({
        distrito: 'San Isidro',
        duracion_min: 90,
        hora_preferida: '11:00'
      });
      const tecnico = createTecnico({ trabajos_del_dia: [] });

      const slot = motor.calcularSlot(workItem, tecnico);

      expect(slot).not.toBeNull();
      // El técnico llega a San Isidro a las 09:10, pero la preferencia es 11:00 → respetada
      expect(slot.hora_inicio).toBe('11:00');
      expect(slot.hora_fin).toBe('12:30');
      expect(slot.traslado_min).toBe(40);
    });

    it('4. hora_preferida no alcanzable → usa el slot más temprano', () => {
      const workItem = createWorkItem({
        distrito: 'La Molina',
        duracion_min: 60,
        hora_preferida: '08:00'
      });
      const tecnico = createTecnico({ trabajos_del_dia: [] });

      const slot = motor.calcularSlot(workItem, tecnico);

      expect(slot).not.toBeNull();
      // Cercado de Lima → La Molina = 55 min → no puede llegar antes de 09:25
      expect(slot.hora_inicio).toBe('09:25');
      expect(slot.hora_fin).toBe('10:25');
      expect(slot.traslado_min).toBe(55);
      expect(slot.hora_inicio).not.toBe('08:00');
    });

    it('5. día completo sin hueco → retorna null', () => {
      const workItem = createWorkItem({ distrito: 'San Isidro', duracion_min: 30 });
      const tecnico = createTecnico({
        trabajos_del_dia: [
          { hora_inicio: '08:30', hora_fin: '18:00', distrito: 'Miraflores' }
        ]
      });

      const slot = motor.calcularSlot(workItem, tecnico);

      // Después de Miraflores(18:00) + traslado(25→San Isidro) = 18:25,
      // solo quedan 5 min hasta las 18:30 → no cabe un trabajo de 30 min
      expect(slot).toBeNull();
    });

    it('6. traslado consume todo el hueco → retorna null', () => {
      const workItem = createWorkItem({ distrito: 'La Molina', duracion_min: 60 });
      const tecnico = createTecnico({
        trabajos_del_dia: [
          { hora_inicio: '08:30', hora_fin: '10:00', distrito: 'Miraflores' },
          { hora_inicio: '11:00', hora_fin: '18:30', distrito: 'Surco' }
        ]
      });

      const slot = motor.calcularSlot(workItem, tecnico);

      // Entre Miraflores(10:00) y Surco(11:00):
      //   Miraflores→La Molina = 55 min → inicio posible = 10:55
      //   La Molina→Surco = 35 min → hay que salir antes de 10:25 → no entra
      expect(slot).toBeNull();
    });

    it('7. múltiples huecos disponibles → elige el más temprano viable', () => {
      const workItem = createWorkItem({ distrito: 'Miraflores', duracion_min: 30 });
      const tecnico = createTecnico({
        trabajos_del_dia: [
          { hora_inicio: '10:00', hora_fin: '11:00', distrito: 'San Isidro' },
          { hora_inicio: '15:00', hora_fin: '16:00', distrito: 'La Molina' }
        ]
      });

      const slot = motor.calcularSlot(workItem, tecnico);

      expect(slot).not.toBeNull();
      // Hueco entre trabajos: San Isidro(11:00) + 25 traslado → 11:25 inicio
      expect(slot.hora_inicio).toBe('11:25');
      expect(slot.hora_fin).toBe('11:55');
      expect(slot.traslado_min).toBe(25);
    });

    it('8. slot después del último trabajo del día', () => {
      const workItem = createWorkItem({ distrito: 'San Isidro', duracion_min: 45 });
      const tecnico = createTecnico({
        trabajos_del_dia: [
          { hora_inicio: '08:30', hora_fin: '10:30', distrito: 'Miraflores' }
        ]
      });

      const slot = motor.calcularSlot(workItem, tecnico);

      expect(slot).not.toBeNull();
      // Después de Miraflores(10:30) + traslado(25→San Isidro) = 10:55
      expect(slot.hora_inicio).toBe('10:55');
      expect(slot.hora_fin).toBe('11:40');
      expect(slot.traslado_min).toBe(25);
    });
  });

  // ─── evaluarTecnicos ──────────────────────────────────────────────────────

  describe('evaluarTecnicos — evaluación individual para un trabajo', () => {
    it('9. un solo técnico elegible → es la sugerencia sin alternativas', () => {
      const workItem = createWorkItem({ tipo_trabajo: 'mantenimiento', prioridad: 4 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const resultado = motor.evaluarTecnicos(workItem, tecnicos);

      expect(resultado.sin_elegible).toBe(false);
      expect(resultado.sugerencia).not.toBeNull();
      expect(resultado.sugerencia.trabajador_id).toBe(1);
      expect(resultado.alternativas).toHaveLength(0);
      expect(resultado.sugerencia._score).toBeUndefined();
    });

    it('10. múltiples técnicos → el mejor es sugerencia, los demás alternativas ordenadas', () => {
      const workItem = createWorkItem({ distrito: 'Miraflores', duracion_min: 60, tipo_trabajo: 'mantenimiento', prioridad: 4 });
      const tecnicos = [
        createTecnico({
          trabajador_id: 1,
          especialidad: 'Técnico General',
          carga_preexistente: { trabajos_confirmados: 0, minutos_comprometidos: 0, ultima_hora_fin: null }
        }),
        createTecnico({
          trabajador_id: 2,
          especialidad: 'Técnico General',
          carga_preexistente: { trabajos_confirmados: 5, minutos_comprometidos: 300, ultima_hora_fin: '12:00' }
        })
      ];

      const resultado = motor.evaluarTecnicos(workItem, tecnicos);

      expect(resultado.sin_elegible).toBe(false);
      expect(resultado.sugerencia.trabajador_id).toBe(1);
      expect(resultado.alternativas).toHaveLength(1);
      expect(resultado.alternativas[0].trabajador_id).toBe(2);
      expect(resultado.alternativas[0]._score).toBeUndefined();
      expect(resultado.alternativas[0].carga_previa_horas).toBe(5.0);
    });

    it('11. ningún técnico elegible por especialidad → sin_elegible=true', () => {
      const workItem = createWorkItem({ tipo_trabajo: 'reparacion', prioridad: 2 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Mantenimiento' })
      ];

      const resultado = motor.evaluarTecnicos(workItem, tecnicos);

      expect(resultado.sin_elegible).toBe(true);
      expect(resultado.sugerencia).toBeNull();
      expect(resultado.alternativas).toHaveLength(0);
      expect(resultado.razon_sin_elegible).toContain('tipo_trabajo');
      expect(resultado.razon_sin_elegible).toContain('reparacion');
    });

    it('12. todos los técnicos elegibles tienen el día completo → sin_elegible=true', () => {
      const workItem = createWorkItem({
        distrito: 'San Isidro',
        duracion_min: 60,
        tipo_trabajo: 'mantenimiento',
        prioridad: 4
      });
      const tecnicos = [
        createTecnico({
          trabajador_id: 1,
          especialidad: 'Técnico General',
          trabajos_del_dia: [{ hora_inicio: '08:30', hora_fin: '18:30', distrito: 'Miraflores' }]
        }),
        createTecnico({
          trabajador_id: 2,
          especialidad: 'Técnico General',
          trabajos_del_dia: [{ hora_inicio: '08:30', hora_fin: '18:30', distrito: 'Surco' }]
        })
      ];

      const resultado = motor.evaluarTecnicos(workItem, tecnicos);

      expect(resultado.sin_elegible).toBe(true);
      expect(resultado.sugerencia).toBeNull();
      expect(resultado.alternativas).toHaveLength(0);
      expect(resultado.razon_sin_elegible).toContain('agenda');
      expect(resultado.razon_sin_elegible).toContain('técnico');
    });
  });
});
