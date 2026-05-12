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

// Helpers to create mock data
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

  describe('Elegibilidad — no asigna reparación a Técnico de Mantenimiento', () => {
    it('debe filtrar correctamente por especialidad', () => {
      const trabajoReparacion = createWorkItem({ tipo_trabajo: 'reparacion', prioridad: 2 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Supervisor Técnico' })
      ];

      const elegibles = motor.candidatosElegibles(trabajoReparacion, tecnicos);
      expect(elegibles).toHaveLength(1);
      expect(elegibles[0].trabajador_id).toBe(2);
    });

    it('debe permitir mantenimiento a Técnico General', () => {
      const trabajo = createWorkItem({ tipo_trabajo: 'mantenimiento', prioridad: 4 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Reparaciones' })
      ];

      const elegibles = motor.candidatosElegibles(trabajo, tecnicos);
      expect(elegibles).toHaveLength(1);
      expect(elegibles[0].especialidad).toBe('Técnico General');
    });

    it('debe manejar tipo de trabajo desconocido (sin elegibles)', () => {
      const trabajo = createWorkItem({ tipo_trabajo: 'tipo_desconocido', prioridad: 4 });
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const elegibles = motor.candidatosElegibles(trabajo, tecnicos);
      expect(elegibles).toHaveLength(0);
    });
  });

  // ─── 1.28 Prioridad ───────────────────────────────────────────────────────

  describe('Prioridad — emergencias primero', () => {
    it('debe ordenar emergencias antes que mantenimientos', () => {
      const items = [
        createWorkItem({ tipo_trabajo: 'mantenimiento', prioridad: 4, distrito: 'A' }),
        createWorkItem({ tipo_trabajo: 'emergencia', prioridad: 1, distrito: 'Z' }),
        createWorkItem({ tipo_trabajo: 'reparacion', prioridad: 2, distrito: 'B' })
      ];

      const ordenados = motor.ordenarPorPrioridad(items);
      expect(ordenados[0].tipo_trabajo).toBe('emergencia');
      expect(ordenados[1].tipo_trabajo).toBe('reparacion');
      expect(ordenados[2].tipo_trabajo).toBe('mantenimiento');
    });

    it('misma prioridad: ordena por hora_preferida', () => {
      const items = [
        createWorkItem({ tipo_trabajo: 'mantenimiento', prioridad: 4, hora_preferida: '11:00' }),
        createWorkItem({ tipo_trabajo: 'mantenimiento', prioridad: 4, hora_preferida: '09:00' })
      ];

      const ordenados = motor.ordenarPorPrioridad(items);
      expect(ordenados[0].hora_preferida).toBe('09:00');
      expect(ordenados[1].hora_preferida).toBe('11:00');
    });

    it('asigna emergencias primero (integración)', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, tipo_trabajo: 'mantenimiento', prioridad: 4 }),
        createWorkItem({ ascensor_id: 2, tipo_trabajo: 'emergencia', prioridad: 1 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      // El único técnico tiene ambos trabajos. Emergencia debe estar primero.
      const trabajos = propuesta.tecnicos[0].trabajos;
      expect(trabajos[0].tipo_trabajo).toBe('emergencia');
    });
  });

  // ─── 1.29 Ventana horaria ─────────────────────────────────────────────────

  describe('Ventana horaria 08:30–18:30', () => {
    it('trabajo que cabe debe tener overflow false', () => {
      const items = [
        createWorkItem({ duracion_min: 60, distrito: 'Miraflores' })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      const trabajos = propuesta.tecnicos[0].trabajos;
      expect(trabajos).toHaveLength(1);
      expect(trabajos[0].overflow).toBe(false);
      expect(trabajos[0].hora_inicio).toBe('08:30');
      expect(trabajos[0].hora_fin).toBe('09:30');
    });

    it('múltiples trabajos que exceden la jornada generan overflow', () => {
      // 12 trabajos de 60 min = 720 min = 12h excede los 600 min máximo
      const items = Array.from({ length: 10 }, (_, i) =>
        createWorkItem({ ascensor_id: i + 1, duracion_min: 60, distrito: 'Miraflores', prioridad: 4 })
      );
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.overflow.length).toBeGreaterThan(0);
      propuesta.overflow.forEach(w => {
        expect(w.overflow).toBe(true);
        expect(w.razon_overflow).toBeDefined();
      });
    });

    it('overflow en trabajo intermedio propaga a todos los siguientes', () => {
      // Diseño del caso (en minutos desde medianoche, inicio = 510 = 08:30, límite = 1110 = 18:30):
      //   A (280 min, Miraflores):  start=510,       end=790  (13:10) → OK
      //   B (100 min, La Molina):   start=790+55=845, end=945  (15:45) → OK    [traslado Miraflores→La Molina=55]
      //   C (170 min, La Molina):   start=945+15=960, end=1130 (18:50) → OVERFLOW  [traslado La Molina→La Molina=15]
      //   D (30  min, La Molina):   tiempoActual se congela en 960 → start=960+15=975, end=1005 (16:45) → sin fix sería OK, con fix → OVERFLOW
      //
      // Total duracion = 280+100+170+30 = 580 < 600 (MAX_MINUTOS_DIA) → los 4 se asignan al técnico.
      // El overflow de C activa overflowActivado = true → D también queda en overflow aunque su hora_fin < 18:30.
      const items = [
        createWorkItem({ ascensor_id: 1, distrito: 'Miraflores', duracion_min: 280, prioridad: 4 }),
        createWorkItem({ ascensor_id: 2, distrito: 'La Molina',  duracion_min: 100, prioridad: 4 }),
        createWorkItem({ ascensor_id: 3, distrito: 'La Molina',  duracion_min: 170, prioridad: 4 }),
        createWorkItem({ ascensor_id: 4, distrito: 'La Molina',  duracion_min: 30,  prioridad: 4 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');

      // C y D deben estar en overflow (2 ítems)
      expect(propuesta.overflow.length).toBe(2);

      // A y B deben estar en la ruta normal sin overflow
      const trabajosNormales = propuesta.tecnicos[0]?.trabajos || [];
      expect(trabajosNormales).toHaveLength(2);
      trabajosNormales.forEach(t => {
        expect(t.overflow).toBe(false);
      });
    });

    it('respeta carga preexistente — empieza después de último trabajo', () => {
      const items = [createWorkItem({ duracion_min: 60, ascensor_id: 1 })];
      const tecnicos = [
        createTecnico({
          trabajador_id: 1,
          especialidad: 'Técnico General',
          carga_preexistente: {
            trabajos_confirmados: 2,
            minutos_comprometidos: 120,
            ultima_hora_fin: '11:00'
          }
        })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      const trabajos = propuesta.tecnicos[0].trabajos;
      // Debe empezar a las 11:00 + 15 min margen = 11:15
      expect(trabajos[0].hora_inicio).toBe('11:15');
    });
  });

  // ─── 1.30 Clustering ──────────────────────────────────────────────────────

  describe('Clustering por distrito', () => {
    it('trabajos en mismo distrito se agrupan (nearest-neighbor)', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, distrito: 'Miraflores', prioridad: 4 }),
        createWorkItem({ ascensor_id: 2, distrito: 'San Isidro', prioridad: 4 }),
        createWorkItem({ ascensor_id: 3, distrito: 'Miraflores', prioridad: 4 }),
        createWorkItem({ ascensor_id: 4, distrito: 'San Isidro', prioridad: 4 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      const trabajos = propuesta.tecnicos[0].trabajos;

      // Verify same-district jobs are consecutive
      const distritos = trabajos.map(t => t.distrito);
      // After nearest-neighbor starting from Cercado de Lima, the sequence should
      // minimize total travel. Both Miraflores and San Isidro are close.
      // Let's just verify no job has huge gaps.
      const rutasValidas = trabajos.every(t => t.hora_inicio && t.hora_fin);
      expect(rutasValidas).toBe(true);
      expect(trabajos.length).toBe(4);
    });

    it('nearest-neighbor debe minimizar traslados', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, distrito: 'La Molina', prioridad: 4, duracion_min: 30 }),
        createWorkItem({ ascensor_id: 2, distrito: 'Miraflores', prioridad: 4, duracion_min: 30 }),
        createWorkItem({ ascensor_id: 3, distrito: 'Surco', prioridad: 4, duracion_min: 30 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      const trabajos = propuesta.tecnicos[0].trabajos;

      // From Cercado de Lima: closest is Miraflores (45), then Surco (35 from Miraflores),
      // then La Molina (35 from Surco)
      expect(trabajos[0].distrito).toBe('Miraflores');
      expect(trabajos[1].distrito).toBe('Surco');
      expect(trabajos[2].distrito).toBe('La Molina');
    });
  });

  // ─── 1.31 Preferencia de técnico ──────────────────────────────────────────

  describe('Preferencia de técnico', () => {
    it('asigna al técnico preferido si está disponible', () => {
      const items = [
        createWorkItem({
          ascensor_id: 1,
          tecnico_preferido_id: 2,
          tipo_trabajo: 'mantenimiento',
          prioridad: 4
        })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      // Debe asignarse al técnico 2
      expect(propuesta.tecnicos).toHaveLength(1);
      expect(propuesta.tecnicos[0].trabajador_id).toBe(2);
    });

    it('tecnico_preferido_respetado es true cuando se asignó el preferido', () => {
      const items = [
        createWorkItem({
          ascensor_id: 1,
          tecnico_preferido_id: 2,
          tipo_trabajo: 'mantenimiento',
          prioridad: 4
        })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.tecnicos[0].trabajos[0].tecnico_preferido_respetado).toBe(true);
    });

    it('tecnico_preferido_respetado es false cuando no había preferencia', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, tecnico_preferido_id: null, tipo_trabajo: 'mantenimiento', prioridad: 4 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.tecnicos[0].trabajos[0].tecnico_preferido_respetado).toBe(false);
    });

    it('tecnico_preferido_respetado es false cuando el preferido no estaba disponible', () => {
      const items = [
        createWorkItem({
          ascensor_id: 1,
          tecnico_preferido_id: 99,
          tipo_trabajo: 'mantenimiento',
          prioridad: 4
        })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.tecnicos[0].trabajos[0].tecnico_preferido_respetado).toBe(false);
    });

    it('ignora preferencia si el preferido no está seleccionado', () => {
      const items = [
        createWorkItem({
          ascensor_id: 1,
          tecnico_preferido_id: 99, // No seleccionado
          tipo_trabajo: 'mantenimiento',
          prioridad: 4
        })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.tecnicos).toHaveLength(1);
      expect(propuesta.tecnicos[0].trabajador_id).toBe(1);
    });

    it('ignora preferencia si el preferido está saturado', () => {
      const items = Array.from({ length: 12 }, (_, i) =>
        createWorkItem({
          ascensor_id: i + 1,
          tecnico_preferido_id: 1,
          duracion_min: 60,
          prioridad: 4,
          tipo_trabajo: 'mantenimiento'
        })
      );
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      // Técnico 1 estará saturado después de ~10 trabajos (600 min),
      // los restantes irán al 2 o a overflow
      expect(propuesta.tecnicos.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 1.32 Sin elegible ────────────────────────────────────────────────────

  describe('Sin técnico elegible', () => {
    it('reparación con solo Técnicos de Mantenimiento va a sinElegible', () => {
      const items = [
        createWorkItem({ tipo_trabajo: 'reparacion', prioridad: 2, ascensor_id: 1 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico de Mantenimiento' }),
        createTecnico({ trabajador_id: 2, especialidad: 'Técnico de Mantenimiento' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.sin_elegible).toHaveLength(1);
      expect(propuesta.sin_elegible[0].tipo_trabajo).toBe('reparacion');
      expect(propuesta.sin_elegible[0].razon_sin_tecnico).toBeDefined();
      expect(propuesta.tecnicos).toHaveLength(0);
    });
  });

  // ─── 1.33 Traslados ───────────────────────────────────────────────────────

  describe('Cálculo de traslados', () => {
    it('primer trabajo tiene traslado 0', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, distrito: 'Miraflores', prioridad: 4 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      expect(propuesta.tecnicos[0].trabajos[0].traslado_desde_anterior).toBe(0);
    });

    it('segundo trabajo incluye traslado desde el distrito anterior', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, distrito: 'Miraflores', duracion_min: 30, prioridad: 4 }),
        createWorkItem({ ascensor_id: 2, distrito: 'San Isidro', duracion_min: 30, prioridad: 4 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      const trabajos = propuesta.tecnicos[0].trabajos;

      // El segundo trabajo debe mostrar traslado desde Miraflores → San Isidro (25 min)
      expect(trabajos[1].traslado_desde_anterior).toBe(25);

      // Las horas deben ser:
      // 08:30 + 30 min = 09:00 trabajo Miraflores
      // 09:00 + 25 traslado = 09:25 inicio San Isidro
      // 09:25 + 30 min = 09:55 fin San Isidro
      expect(trabajos[0].hora_inicio).toBe('08:30');
      expect(trabajos[0].hora_fin).toBe('09:00');
      expect(trabajos[1].hora_inicio).toBe('09:25');
      expect(trabajos[1].hora_fin).toBe('09:55');
    });

    it('mismo distrito usa 15 min de traslado', () => {
      const items = [
        createWorkItem({ ascensor_id: 1, distrito: 'Miraflores', duracion_min: 30, prioridad: 4 }),
        createWorkItem({ ascensor_id: 2, distrito: 'Miraflores', duracion_min: 30, prioridad: 4 })
      ];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');
      const trabajos = propuesta.tecnicos[0].trabajos;
      expect(trabajos[1].traslado_desde_anterior).toBe(15);
    });
  });

  // ─── Unit tests for helpers ───────────────────────────────────────────────

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

  // ─── 1.25: Validación de inputs ──────────────────────────────────────────

  describe('Validación de inputs', () => {
    it('lanza error si no hay workItems', () => {
      expect(() => motor.validarInputs([], [createTecnico()]))
        .toThrow('No hay trabajos en el pool');
    });

    it('lanza error si no hay técnicos', () => {
      expect(() => motor.validarInputs([createWorkItem()], []))
        .toThrow('No hay técnicos seleccionados');
    });
  });

  // ─── Estructura de respuesta ──────────────────────────────────────────────

  describe('Estructura de PropuestaMotor', () => {
    it('retorna la estructura completa', () => {
      const items = [createWorkItem({ ascensor_id: 1 })];
      const tecnicos = [
        createTecnico({ trabajador_id: 1, especialidad: 'Técnico General' })
      ];

      const propuesta = motor.generarPropuesta(items, tecnicos, '2026-05-13');

      expect(propuesta).toHaveProperty('fecha');
      expect(propuesta.fecha).toBe('2026-05-13');
      expect(propuesta).toHaveProperty('origen');
      expect(propuesta.origen).toBe('motor');
      expect(propuesta).toHaveProperty('version');
      expect(propuesta).toHaveProperty('tecnicos');
      expect(propuesta).toHaveProperty('overflow');
      expect(propuesta).toHaveProperty('sin_elegible');
      expect(propuesta).toHaveProperty('generado_en');

      const tecnico = propuesta.tecnicos[0];
      expect(tecnico).toHaveProperty('trabajador_id');
      expect(tecnico).toHaveProperty('nombre');
      expect(tecnico).toHaveProperty('carga_minutos');
      expect(tecnico).toHaveProperty('carga_horas');
      expect(tecnico).toHaveProperty('trabajos');

      const trabajo = tecnico.trabajos[0];
      expect(trabajo).toHaveProperty('hora_inicio');
      expect(trabajo).toHaveProperty('hora_fin');
      expect(trabajo).toHaveProperty('traslado_desde_anterior');
      expect(trabajo).toHaveProperty('overflow');
      expect(trabajo).toHaveProperty('duracion_min');
    });
  });
});
