# Integración LLM (Claude API) — Programador IA

## Modelo y proveedor

- **Proveedor**: Anthropic (Claude API — `@anthropic-ai/sdk`)
- **Modelo v1**: `claude-haiku-4-5-20251001` — costo bajo, latencia baja (~2-3s), buena calidad para validación estructurada con formato JSON.
- **Upgrade si calidad no alcanza**: `claude-sonnet-4-6` — mayor razonamiento, costo ~5x mayor, latencia ~5-8s.
- **Prompt caching**: habilitado en el system prompt (reduce costo ~80-90% en llamadas repetidas del mismo día/sesión).

El servicio vive en `/BackEnd-JmgAscensores/src/services/ia-scheduler/llm.service.js`.

---

## Rol del LLM en el nuevo diseño

El LLM recibe la evaluación del motor (lista de técnicos rankeados con sus slots calculados) y:

1. **Valida** que ninguna sugerencia viole restricciones duras (elegibilidad, horarios).
2. **Agrega justificaciones** por técnico — explica por qué es buena o mala opción.
3. **Puede reordenar** las alternativas si detecta algo que el motor no consideró (ej. un equipo complejo que requiere experiencia específica, un distrito de tráfico alto a cierta hora).
4. **Agrega notas** si hay algo inusual (técnico con carga muy alta, hora preferida no respetable, etc.).

El LLM **no recalcula horarios** — los slots los calculó el motor determinísticamente. El LLM solo valida y enriquece con contexto de negocio.

---

## System Prompt (cacheado)

```
Sos un asistente de programación de trabajos para JMG Ascensores, empresa de 
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
- "notas_llm" puede ser null o string
```

---

## User Message (variable por llamada)

```json
{
  "fecha": "2026-05-12",
  "instruccion_admin": null,
  "evaluacion_motor": {
    "trabajo": {
      "cliente_id": 45,
      "nombre_cliente": "Edificio Torres del Sol",
      "distrito": "Miraflores",
      "tipo_equipo": "hidráulico",
      "tipo_trabajo": "mantenimiento",
      "duracion_min": 60,
      "hora_preferida": "09:00"
    },
    "sugerencia": {
      "trabajador_id": 3,
      "nombre": "Carlos",
      "apellido": "Ríos",
      "especialidad": "Técnico de Mantenimiento",
      "hora_inicio": "09:00",
      "hora_fin": "10:00",
      "traslado_min": 15,
      "carga_previa_horas": 1.0,
      "justificacion": null
    },
    "alternativas": [
      {
        "trabajador_id": 5,
        "nombre": "Pedro",
        "apellido": "Lima",
        "especialidad": "Supervisor Técnico",
        "hora_inicio": "08:30",
        "hora_fin": "09:30",
        "traslado_min": 0,
        "carga_previa_horas": 0,
        "justificacion": null
      }
    ],
    "sin_elegible": false
  },
  "schema": {
    "descripcion": "Mismo schema que evaluacion_motor. origen debe ser 'llm'. Completar justificacion en sugerencia y alternativas.",
    "campos_requeridos": ["fecha", "generado_en", "origen", "trabajo", "sugerencia", "alternativas", "sin_elegible", "notas_llm"]
  }
}
```

---

## Llamada a la API (código del servicio)

```javascript
const Anthropic = require('@anthropic-ai/sdk');

class LLMService {
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async validarYJustificar(evaluacionMotor, instruccionAdmin = null) {
    const userMessage = JSON.stringify({
      fecha:             evaluacionMotor.fecha,
      instruccion_admin: instruccionAdmin,
      evaluacion_motor:  evaluacionMotor,
      schema: {
        descripcion: 'Mismo schema que evaluacion_motor. origen = "llm". Completar justificacion.',
        campos_requeridos: ['fecha','generado_en','origen','trabajo','sugerencia','alternativas','sin_elegible','notas_llm']
      }
    });

    const response = await this.client.messages.create({
      model: process.env.IA_SCHEDULER_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: userMessage }]
    });

    const rawText = response.content[0].text.trim();
    return this.parsearRespuesta(rawText, evaluacionMotor);
  }

  parsearRespuesta(rawText, evaluacionMotorFallback) {
    try {
      const parsed = JSON.parse(rawText);
      parsed.origen = 'llm';
      return { ok: true, evaluacion: parsed };
    } catch (err) {
      console.error('[LLM] Error parseando respuesta JSON:', err.message);
      return {
        ok: false,
        evaluacion: { ...evaluacionMotorFallback, origen: 'motor_fallback' },
        error: 'LLM devolvió respuesta no parseable'
      };
    }
  }

  // Ajuste por instrucción del admin desde el chat
  async ajustarConInstruccion(sugerenciaActual, instruccionAdmin) {
    return this.validarYJustificar(sugerenciaActual, instruccionAdmin);
  }
}
```

---

## Variables de entorno necesarias

```env
# /BackEnd-JmgAscensores/.env
ANTHROPIC_API_KEY=sk-ant-...
IA_SCHEDULER_MODEL=claude-haiku-4-5-20251001
IA_SCHEDULER_TIMEOUT_MS=10000
```

---

## Manejo de errores del LLM

| Escenario | Comportamiento |
|---|---|
| Error de red / timeout (>10s) | Devolver evaluación del motor con `origen: 'motor_fallback'`. Frontend muestra banner. |
| Rate limit de Anthropic | Reintentar 1 vez con 2s de delay. Si falla, fallback al motor. |
| Respuesta no es JSON válido | `parsearRespuesta` captura, log del error, fallback al motor. |
| LLM viola restricción dura (especialidad inválida) | Validación post-LLM detecta y revierte ese cambio específico. |
| `ANTHROPIC_API_KEY` no configurada | Error 500 al inicio del request. Log claro. |

### Validación post-LLM (guard de restricciones duras)

```javascript
function validarEvaluacion(evaluacion, trabajadoresMap) {
  const errores = [];
  const candidatos = [evaluacion.sugerencia, ...evaluacion.alternativas].filter(Boolean);

  for (const candidato of candidatos) {
    const especialidad = trabajadoresMap[candidato.trabajador_id]?.especialidad;
    const permitidos = ELEGIBILIDAD[evaluacion.trabajo.tipo_trabajo] || [];

    if (!permitidos.includes(especialidad)) {
      errores.push({
        tipo: 'elegibilidad_invalida',
        trabajador_id: candidato.trabajador_id,
        descripcion: `${especialidad} no puede hacer ${evaluacion.trabajo.tipo_trabajo}`
      });
    }

    if (toMinutos(candidato.hora_fin) > toMinutos('18:30')) {
      errores.push({
        tipo: 'horario_fuera_ventana',
        trabajador_id: candidato.trabajador_id,
        descripcion: `${candidato.hora_fin} supera 18:30`
      });
    }
  }

  return errores;
}
```

Si hay errores, el backend los corrige (excluye al candidato inválido del resultado) y agrega los errores al campo `advertencias` de la respuesta.

---

## Estimación de costos por llamada

Con `claude-haiku-4-5-20251001`:
- System prompt: ~700 tokens (cacheado → costo = 10% del normal después de la primera)
- User message (evaluación de 3-5 técnicos): ~500–800 tokens
- Respuesta (evaluación con justificaciones): ~600–900 tokens

Costo estimado por generación:
- Primera del día: ~$0.001 USD
- Siguientes (cache warm): ~$0.0005 USD

Con `claude-sonnet-4-6`: ~5x más caro.

Para el volumen de JMG (estimado 5-20 generaciones/día): **$0.005–$0.02 USD/día**.

---

## Contexto que recibe el LLM

| Dato | Viene de |
|---|---|
| Roles y especialidades | System prompt (estático) |
| Reglas de negocio | System prompt (estático) |
| Datos del trabajo (cliente, distrito, equipo, tipo) | `evaluacion_motor.trabajo` |
| Técnicos candidatos + slots calculados | `evaluacion_motor.sugerencia` + `alternativas` |
| Instrucción del admin | `instruccion_admin` (puede ser null) |

Lo que el LLM **NO recibe**:
- Histórico de programaciones anteriores.
- Datos de todos los clientes/ascensores del sistema.
- La tabla de tiempos entre distritos (eso lo manejó el motor).
- Credenciales ni datos sensibles.
