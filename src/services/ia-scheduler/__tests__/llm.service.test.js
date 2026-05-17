const { LLMService, ELEGIBILIDAD } = require('../llm.service');

describe('LLMService', () => {
  // ─── Constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('sin API key → client es null', () => {
      const originalKey = process.env.API_KEY_CLAUDE;
      delete process.env.API_KEY_CLAUDE;

      const service = new LLMService();
      expect(service.client).toBeNull();

      // Restaurar
      if (originalKey !== undefined) {
        process.env.API_KEY_CLAUDE = originalKey;
      }
    });

    it('con API key → client es instancia de Anthropic', () => {
      // Si no hay API key en el entorno, simulamos una
      const originalKey = process.env.API_KEY_CLAUDE;
      process.env.API_KEY_CLAUDE = 'sk-ant-test-dummy-key-for-unit-tests';

      const service = new LLMService();
      expect(service.client).not.toBeNull();
      // Verificar que tiene los métodos esperados del SDK de Anthropic
      expect(service.client.messages).toBeDefined();
      expect(typeof service.client.messages.create).toBe('function');

      if (originalKey !== undefined) {
        process.env.API_KEY_CLAUDE = originalKey;
      } else {
        delete process.env.API_KEY_CLAUDE;
      }
    });
  });

  // ─── parsearRespuesta ───────────────────────────────────────────────────────

  describe('parsearRespuesta', () => {
    let service;

    beforeEach(() => {
      const originalKey = process.env.API_KEY_CLAUDE;
      process.env.API_KEY_CLAUDE = 'sk-test-dummy-key';
      service = new LLMService();
      if (originalKey !== undefined) {
        process.env.API_KEY_CLAUDE = originalKey;
      } else {
        delete process.env.API_KEY_CLAUDE;
      }
    });

    const createFallbackEvaluacion = () => ({
      fecha: '2026-05-17',
      generado_en: new Date().toISOString(),
      origen: 'motor',
      trabajo: {
        cliente_id: 1,
        ascensor_id: 1,
        tipo_trabajo: 'mantenimiento',
      },
      sugerencia: {
        trabajador_id: 1,
        nombre: 'Carlos',
        apellido: 'Ríos',
        especialidad: 'Técnico de Mantenimiento',
        hora_inicio: '09:15',
        hora_fin: '10:15',
        traslado_min: 45,
        carga_previa_horas: 0,
        justificacion: null,
      },
      alternativas: [],
      sin_elegible: false,
      razon_sin_elegible: null,
    });

    it('JSON válido → retorna ok:true, origen="llm"', () => {
      const fallback = createFallbackEvaluacion();
      const validJson = JSON.stringify({
        ...fallback,
        origen: 'llm',
        sugerencia: {
          ...fallback.sugerencia,
          justificacion: 'Técnico disponible y con baja carga.',
        },
      });

      const result = service.parsearRespuesta(validJson, fallback);

      expect(result.ok).toBe(true);
      expect(result.evaluacion.origen).toBe('llm');
      expect(result.evaluacion.sugerencia.justificacion).toBe(
        'Técnico disponible y con baja carga.'
      );
    });

    it('JSON inválido → retorna ok:false, origen="motor_fallback"', () => {
      const fallback = createFallbackEvaluacion();
      const invalidJson = 'esto no es JSON, es texto plano';

      const result = service.parsearRespuesta(invalidJson, fallback);

      expect(result.ok).toBe(false);
      expect(result.evaluacion.origen).toBe('motor_fallback');
      expect(result.error).toBe('Respuesta no parseable');
    });

    it('JSON envuelto en markdown → strips las fences y parsea correctamente', () => {
      const fallback = createFallbackEvaluacion();
      const jsonWithMarkdown = '```json\n{"origen":"llm","sugerencia":null,"alternativas":[]}\n```';

      const result = service.parsearRespuesta(jsonWithMarkdown, fallback);

      expect(result.ok).toBe(true);
      expect(result.evaluacion.origen).toBe('llm');
    });
  });

  // ─── validarPropuesta ───────────────────────────────────────────────────────

  describe('validarPropuesta', () => {
    let service;

    beforeEach(() => {
      const originalKey = process.env.API_KEY_CLAUDE;
      process.env.API_KEY_CLAUDE = 'sk-test-dummy-key';
      service = new LLMService();
      if (originalKey !== undefined) {
        process.env.API_KEY_CLAUDE = originalKey;
      } else {
        delete process.env.API_KEY_CLAUDE;
      }
    });

    const createEvaluacion = (overrides = {}) => ({
      fecha: '2026-05-17',
      generado_en: new Date().toISOString(),
      origen: 'llm',
      trabajo: {
        cliente_id: 1,
        ascensor_id: 1,
        tipo_trabajo: 'mantenimiento',
      },
      sugerencia: {
        trabajador_id: 1,
        nombre: 'Carlos',
        apellido: 'Ríos',
        especialidad: 'Técnico de Mantenimiento',
        hora_inicio: '09:15',
        hora_fin: '10:15',
        traslado_min: 45,
        carga_previa_horas: 0,
        justificacion: 'Buena disponibilidad en zona cercana.',
      },
      alternativas: [],
      sin_elegible: false,
      razon_sin_elegible: null,
      notas_llm: null,
      ...overrides,
    });

    it('sugerencia elegible → pasa sin cambios', () => {
      const evaluacion = createEvaluacion({
        sugerencia: {
          trabajador_id: 1,
          especialidad: 'Técnico de Mantenimiento',
          justificacion: 'Baja carga.',
        },
      });

      const result = service.validarPropuesta(evaluacion);

      expect(result.sugerencia.trabajador_id).toBe(1);
      expect(result.sugerencia.especialidad).toBe('Técnico de Mantenimiento');
      expect(result.advertencias).toBeUndefined();
    });

    it('sugerencia NO elegible con alternativa elegible → corrige y agrega advertencia', () => {
      const evaluacion = createEvaluacion({
        sugerencia: {
          trabajador_id: 2,
          especialidad: 'Técnico de Reparaciones', // no elegible para mantenimiento
          justificacion: null,
        },
        alternativas: [
          {
            trabajador_id: 1,
            especialidad: 'Técnico de Mantenimiento', // sí elegible
            justificacion: null,
          },
        ],
      });

      const result = service.validarPropuesta(evaluacion);

      // La alternativa elegible fue promovida a sugerencia
      expect(result.sugerencia.trabajador_id).toBe(1);
      expect(result.sugerencia.especialidad).toBe('Técnico de Mantenimiento');
      // Ya no debe haber alternativas (la promovida se eliminó)
      expect(result.alternativas).toHaveLength(0);
      // Debe tener advertencia
      expect(result.advertencias).toBeDefined();
      expect(result.advertencias.length).toBeGreaterThanOrEqual(1);
      expect(result.advertencias[0]).toContain('corregido por guard');
    });

    it('alternativas no elegibles → son eliminadas', () => {
      const evaluacion = createEvaluacion({
        alternativas: [
          {
            trabajador_id: 3,
            especialidad: 'Técnico de Reparaciones',
            justificacion: null,
          },
          {
            trabajador_id: 4,
            especialidad: 'Técnico General',
            justificacion: null,
          },
        ],
      });

      const result = service.validarPropuesta(evaluacion);

      // Solo Técnico General es elegible para mantenimiento
      expect(result.alternativas).toHaveLength(1);
      expect(result.alternativas[0].especialidad).toBe('Técnico General');
    });

    it('tipo de trabajo desconocido → no hay permitidos, todo se filtra', () => {
      const evaluacion = createEvaluacion({
        trabajo: { tipo_trabajo: 'tipo_inventado' },
        sugerencia: {
          trabajador_id: 1,
          especialidad: 'Supervisor Técnico',
          justificacion: null,
        },
        alternativas: [
          { trabajador_id: 2, especialidad: 'Técnico General', justificacion: null },
        ],
      });

      const result = service.validarPropuesta(evaluacion);

      // Sin permitidos definidos para este tipo, no se valida la sugerencia
      // (no se pueden determinar qué especialidades son válidas)
      // Pero las alternativas SÍ se filtran porque permitidos está vacío
      // Nota: la sugerencia no se filtra porque permitidos.length === 0, así que
      // el guard de sugerencia no se activa (ninguna especialidad "no está en la lista vacía")
      expect(result.sugerencia.trabajador_id).toBe(1);
      // Las alternativas son filtradas con la lista vacía → ninguna sobrevive
      expect(result.alternativas).toHaveLength(0);
    });

    it('sugerencia no elegible y sin alternativas elegibles → sugerencia queda igual, advertencia agregada', () => {
      const evaluacion = createEvaluacion({
        sugerencia: {
          trabajador_id: 2,
          especialidad: 'Técnico de Reparaciones',
          justificacion: null,
        },
        alternativas: [
          {
            trabajador_id: 3,
            especialidad: 'Técnico de Reparaciones',
            justificacion: null,
          },
        ],
      });

      const result = service.validarPropuesta(evaluacion);

      // Sugerencia no cambió porque no hay alternativa elegible
      expect(result.sugerencia.trabajador_id).toBe(2);
      expect(result.sugerencia.especialidad).toBe('Técnico de Reparaciones');
      // Pero sí hay advertencia
      expect(result.advertencias).toBeDefined();
      expect(result.advertencias[0]).toContain('corregido por guard');
      // Las alternativas no elegibles se eliminan
      expect(result.alternativas).toHaveLength(0);
    });
  });

  // ─── validarYJustificar sin API key ─────────────────────────────────────────

  describe('validarYJustificar — modo fallback', () => {
    it('sin API key → retorna fallback del motor', async () => {
      const originalKey = process.env.API_KEY_CLAUDE;
      delete process.env.API_KEY_CLAUDE;

      const service = new LLMService();

      const evaluacionMotor = {
        fecha: '2026-05-17',
        generado_en: new Date().toISOString(),
        origen: 'motor',
        trabajo: { cliente_id: 1, ascensor_id: 1, tipo_trabajo: 'mantenimiento' },
        sugerencia: null,
        alternativas: [],
        sin_elegible: true,
        razon_sin_elegible: 'Sin técnicos',
      };

      const result = await service.validarYJustificar(evaluacionMotor);

      expect(result.ok).toBe(false);
      expect(result.evaluacion.origen).toBe('motor_fallback');
      expect(result.error).toBe('API key no configurada');

      // Restaurar
      if (originalKey !== undefined) {
        process.env.API_KEY_CLAUDE = originalKey;
      }
    });
  });
});
