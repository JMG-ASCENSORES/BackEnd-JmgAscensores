const Anthropic = require('@anthropic-ai/sdk');

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sos un asistente de programación de trabajos para JMG Ascensores, empresa de 
mantenimiento de ascensores en Lima, Perú. Tu rol es revisar y enriquecer evaluaciones 
de técnicos generadas por un motor determinista para un trabajo específico.

## Roles de técnicos

- Técnico General: mantenimientos rutinarios, apoyo en inspecciones. No habilitado para 
  reparaciones complejas.
- Técnico de Mantenimiento: especialista en mantenimientos preventivos periódicos. 
  Principal perfil para la carga diaria de mantenimientos.
- Supervisor Técnico: habilitado para todos los tipos de trabajo. Realiza inspecciones 
  formales y supervisa equipos en trabajos complejos.
- Técnico de Reparaciones: único perfil habilitado por defecto para reparaciones y 
  emergencias técnicas graves.

## Matriz de elegibilidad (restricción dura — nunca la violes)

- mantenimiento → Técnico General, Técnico de Mantenimiento, Supervisor Técnico
- reparacion    → Técnico de Reparaciones, Supervisor Técnico
- inspeccion    → Supervisor Técnico, Técnico General
- emergencia    → todos

## Reglas de negocio (restricciones duras)

1. Ningún slot propuesto puede tener hora_fin posterior a 18:30.
2. Los slots calculados por el motor no se pueden modificar (fueron calculados 
   determinísticamente). Solo podés reordenar las alternativas o excluir alguna si 
   detectás una violación.
3. No podés asignar un trabajo a un técnico cuya especialidad no esté en la matriz.

## Tu tarea

Recibís la evaluación del motor (campo "evaluacion_motor") con un trabajo a programar 
y una lista de técnicos candidatos con sus slots calculados.

Debés:
1. Verificar que todos los slots respetan las restricciones duras.
2. Agregar una justificación breve (1-2 oraciones) para la sugerencia principal y cada 
   alternativa. Explicá el porqué de la idoneidad: zona geográfica, carga del día, 
   experiencia con ese tipo de equipo si es relevante.
3. Si corresponde: reordenar las alternativas si detectás que el orden del motor no es 
   óptimo por razones de negocio no capturadas en los datos.
4. Si hay instrucción del admin (campo "instruccion_admin"), aplicarla sin violar 
   restricciones duras.
5. Agregar un campo "notas_llm" con observaciones generales si hay algo inusual.

## Formato de respuesta

Devolvés ÚNICAMENTE JSON válido. Sin texto antes ni después. Sin markdown.
El schema es exactamente el mismo que el de evaluacion_motor pero con:
- "origen" = "llm"
- "justificacion" completada en sugerencia y cada alternativa
- "notas_llm" puede ser null o string`;

// ─── Matriz de elegibilidad ─────────────────────────────────────────────────────

const ELEGIBILIDAD = {
  mantenimiento: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico'],
  reparacion: ['Técnico de Reparaciones', 'Supervisor Técnico'],
  inspeccion: ['Supervisor Técnico', 'Técnico General'],
  emergencia: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico', 'Técnico de Reparaciones'],
};

// ─── LLMService ─────────────────────────────────────────────────────────────────

class LLMService {
  constructor() {
    const apiKey = process.env.API_KEY_CLAUDE;
    if (!apiKey) {
      console.warn('[LLM] API_KEY_CLAUDE no configurada. El servicio funcionará en modo fallback.');
      this.client = null;
    } else {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Envía la evaluación del motor al LLM para validación y justificaciones.
   * Si el cliente no está disponible o la API falla, retorna fallback del motor.
   *
   * @param {object} evaluacionMotor — resultado completo del motor
   * @param {string|null} instruccionAdmin — instrucción opcional del admin
   * @returns {Promise<{ ok: boolean, evaluacion: object, error?: string }>}
   */
  async validarYJustificar(evaluacionMotor, instruccionAdmin = null) {
    if (!this.client) {
      return {
        ok: false,
        evaluacion: { ...evaluacionMotor, origen: 'motor_fallback' },
        error: 'API key no configurada',
      };
    }

    const userMessage = JSON.stringify({
      fecha: evaluacionMotor.fecha,
      instruccion_admin: instruccionAdmin,
      evaluacion_motor: evaluacionMotor,
      schema: {
        descripcion: 'Mismo schema. origen=llm. Completar justificacion.',
        campos_requeridos: [
          'fecha', 'generado_en', 'origen', 'trabajo',
          'sugerencia', 'alternativas', 'sin_elegible', 'notas_llm',
        ],
      },
    });

    const timeoutMs = parseInt(process.env.IA_SCHEDULER_TIMEOUT_MS, 10) || 15000;
    let timeout;

    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await this.client.messages.create(
        {
          model: process.env.IA_SCHEDULER_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userMessage }],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const rawText = response.content[0].text.trim();
      return this.parsearRespuesta(rawText, evaluacionMotor);
    } catch (err) {
      clearTimeout(timeout);
      console.error('[LLM] Error:', err.message);
      return {
        ok: false,
        evaluacion: { ...evaluacionMotor, origen: 'motor_fallback' },
        error: err.message,
      };
    }
  }

  /**
   * Parsea la respuesta JSON del LLM.
   * Si falla, retorna el fallback del motor.
   *
   * @param {string} rawText — texto crudo de la respuesta del LLM
   * @param {object} fallback — evaluación del motor para usar como fallback
   * @returns {{ ok: boolean, evaluacion: object, error?: string }}
   */
  parsearRespuesta(rawText, fallback) {
    try {
      const parsed = JSON.parse(rawText);
      parsed.origen = 'llm';
      return { ok: true, evaluacion: this.validarPropuesta(parsed) };
    } catch (err) {
      console.error('[LLM] JSON parse error:', err.message);
      return {
        ok: false,
        evaluacion: { ...fallback, origen: 'motor_fallback' },
        error: 'Respuesta no parseable',
      };
    }
  }

  /**
   * Valida que el LLM no haya violado la matriz de elegibilidad.
   * Si detecta un técnico no elegible, lo corrige con un guard.
   *
   * @param {object} evaluacion — objeto parseado del LLM
   * @returns {object} — evaluación validada (corregida si es necesario)
   */
  validarPropuesta(evaluacion) {
    const tipo = evaluacion.trabajo?.tipo_trabajo;
    const permitidos = ELEGIBILIDAD[tipo] || [];

    // Validar sugerencia
    if (evaluacion.sugerencia && !permitidos.includes(evaluacion.sugerencia.especialidad)) {
      evaluacion.advertencias = evaluacion.advertencias || [];
      evaluacion.advertencias.push('LLM sugirió técnico no elegible — corregido por guard');

      // Buscar la primera alternativa elegible para promoverla a sugerencia
      const elegibleAlt = (evaluacion.alternativas || []).find(
        (a) => permitidos.includes(a.especialidad)
      );
      if (elegibleAlt) {
        evaluacion.sugerencia = elegibleAlt;
        evaluacion.alternativas = (evaluacion.alternativas || []).filter(
          (a) => a !== elegibleAlt
        );
      }
    }

    // Validar alternativas: eliminar las no elegibles
    if (evaluacion.alternativas) {
      evaluacion.alternativas = evaluacion.alternativas.filter(
        (a) => permitidos.includes(a.especialidad)
      );
    }

    return evaluacion;
  }

  /**
   * Re-evalúa con una instrucción del admin.
   * Simplemente reenvía al LLM con la nueva instrucción.
   *
   * @param {object} sugerenciaActual — evaluación existente
   * @param {string} instruccionAdmin — instrucción del admin
   * @returns {Promise<{ ok: boolean, evaluacion: object, error?: string }>}
   */
  async ajustarConInstruccion(sugerenciaActual, instruccionAdmin) {
    return this.validarYJustificar(sugerenciaActual, instruccionAdmin);
  }
}

module.exports = { LLMService, ELEGIBILIDAD, SYSTEM_PROMPT };
