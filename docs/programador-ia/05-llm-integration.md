# Integración LLM (Claude API) — Programador IA

## Modelo y proveedor

- **Proveedor**: Anthropic (Claude API — `@anthropic-ai/sdk`)
- **Modelo v1**: `claude-haiku-4-5-20251001` — costo bajo, latencia baja (~2-3s), buena calidad para validación estructurada con formato JSON.
- **Upgrade si calidad no alcanza**: `claude-sonnet-4-6` — mayor razonamiento, costo ~5x mayor, latencia ~5-8s.
- **Prompt caching**: habilitado en el system prompt (reduce costo ~80-90% en llamadas repetidas del mismo día/sesión).

El servicio vive en `/BackEnd-JmgAscensores/src/services/ia-scheduler/llm.service.js`.

---

## System Prompt (cacheado)

Este prompt va como `cache_control: { type: 'ephemeral' }` en el primer bloque del messages array. Se reutiliza entre llamadas del mismo proceso (TTL de caché: 5 minutos Anthropic).

```
Sos un asistente de planificación de rutas de trabajo para JMG Ascensores, empresa de 
mantenimiento de ascensores en Lima, Perú. Tu rol es revisar y mejorar propuestas de 
programación generadas por un motor determinista.

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

1. Ningún trabajo puede tener hora_fin posterior a 18:30 salvo que instruccion_admin lo 
   indique explícitamente.
2. Un técnico no puede tener dos trabajos solapados en el tiempo.
3. No podés asignar un trabajo a un técnico cuya especialidad no esté en la matriz de 
   elegibilidad.
4. La secuencia de trabajos de cada técnico debe ser logística (respetar tiempos de 
   traslado entre distritos).
5. Emergencias tienen prioridad absoluta — siempre deben ser las primeras paradas del 
   técnico asignado, o asignadas al técnico con más disponibilidad.

## Tu tarea

Recibís una propuesta generada por el motor (campo "propuesta_motor") y opcionalmente 
una instrucción del administrador (campo "instruccion_admin").

Debés:
1. Verificar que la propuesta respeta todas las restricciones duras. Si hay violaciones, 
   corregirlas.
2. Identificar mejoras obvias: por ejemplo, si dos trabajos en el mismo distrito están 
   asignados a técnicos distintos y uno de ellos tiene margen, reasignar para reducir 
   traslados.
3. Aplicar la instrucción del admin si existe (sin violar restricciones duras).
4. Agregar una justificación corta (1-2 oraciones) a cada trabajo en el campo 
   "justificacion". Explicá el porqué de la asignación o el orden, no el qué.
5. Si hay trabajos en el campo "overflow" o "sin_elegible", comentalos en el campo 
   "notas_overflow" con una sugerencia concreta al admin.

## Formato de respuesta

Devolvés ÚNICAMENTE JSON válido. Sin texto antes ni después del JSON. Sin markdown. 
El schema es exactamente el mismo que el de la propuesta_motor (ver campo "schema") 
pero con "origen" = "llm" y los campos "justificacion" completados.

Si no tenés cambios que hacer, devolvés la propuesta tal como la recibiste con 
origen="llm" y las justificaciones.
```

---

## User Message (variable por llamada)

```json
{
  "fecha": "2026-05-12",
  "instruccion_admin": "priorizá la emergencia de Miraflores y no le des más de 4 trabajos a Carlos",
  "propuesta_motor": { ... },
  "schema": {
    "descripcion": "Mismo schema que propuesta_motor. origen debe ser 'llm'.",
    "campos_requeridos": ["fecha", "generado_en", "origen", "tecnicos", "overflow", "sin_elegible", "notas_overflow"]
  }
}
```

`instruccion_admin` puede ser `null` si el admin no escribió nada y solo hizo click en "Generar propuesta".

---

## Llamada a la API (código del servicio)

```javascript
const Anthropic = require('@anthropic-ai/sdk');

class LLMService {
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.systemPromptCached = null; // cache local del texto del system prompt
  }

  async ajustarPropuesta(propuestaMotor, instruccionAdmin = null) {
    const userMessage = JSON.stringify({
      fecha:            propuestaMotor.fecha,
      instruccion_admin: instruccionAdmin,
      propuesta_motor:  propuestaMotor,
      schema: {
        descripcion: 'Mismo schema que propuesta_motor. origen debe ser "llm".',
        campos_requeridos: ['fecha','generado_en','origen','tecnicos','overflow','sin_elegible','notas_overflow']
      }
    });

    const response = await this.client.messages.create({
      model: process.env.IA_SCHEDULER_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,           // constante importada del mismo módulo
          cache_control: { type: 'ephemeral' }  // prompt caching
        }
      ],
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const rawText = response.content[0].text.trim();
    return this.parsearRespuesta(rawText, propuestaMotor);
  }

  parsearRespuesta(rawText, propuestaMotorFallback) {
    try {
      const parsed = JSON.parse(rawText);
      parsed.origen = 'llm'; // forzar aunque el LLM lo olvide
      return { ok: true, propuesta: parsed };
    } catch (err) {
      console.error('[LLM] Error parseando respuesta JSON:', err.message);
      console.error('[LLM] Raw response:', rawText.slice(0, 500));
      // Fallback: devolver la propuesta del motor con bandera de advertencia
      return {
        ok: false,
        propuesta: { ...propuestaMotorFallback, origen: 'motor_fallback' },
        error: 'LLM devolvió respuesta no parseable'
      };
    }
  }
}
```

---

## Variables de entorno necesarias

```env
# /BackEnd-JmgAscensores/.env
ANTHROPIC_API_KEY=sk-ant-...
IA_SCHEDULER_MODEL=claude-haiku-4-5-20251001   # cambiar a claude-sonnet-4-6 si se necesita más calidad
```

---

## Manejo de errores del LLM

| Escenario | Comportamiento |
|---|---|
| Error de red / timeout (>10s) | Devolver `propuesta_motor` con `origen: 'motor_fallback'`. Frontend muestra banner. |
| Rate limit de Anthropic | Reintentar 1 vez con 2s de delay. Si falla, fallback al motor. |
| Respuesta no es JSON válido | `parsearRespuesta` captura, log del error, fallback al motor. |
| LLM viola restricción dura (ej. asigna especialidad inválida) | Validación post-LLM en el backend detecta y revierte ese cambio específico. |
| `ANTHROPIC_API_KEY` no configurada | Error 500 al inicio del request. Log claro. El endpoint responde con mensaje de config faltante. |

### Validación post-LLM (guard de restricciones duras)

Después de recibir la respuesta del LLM, el backend la pasa por `validarPropuesta()`:

```javascript
function validarPropuesta(propuesta, trabajadoresMap) {
  const errores = [];
  
  for (const tecnico of propuesta.tecnicos) {
    const especialidad = trabajadoresMap[tecnico.trabajador_id]?.especialidad;
    
    for (const trabajo of tecnico.trabajos) {
      // Verificar elegibilidad
      const permitidos = ELEGIBILIDAD[trabajo.tipo_trabajo] || [];
      if (!permitidos.includes(especialidad)) {
        errores.push({
          tipo: 'elegibilidad_invalida',
          trabajo_id: trabajo.programacion_id || trabajo.mantenimiento_fijo_id,
          descripcion: `${especialidad} no puede hacer ${trabajo.tipo_trabajo}`
        });
      }
      
      // Verificar horario dentro de ventana
      if (toMinutos(trabajo.hora_fin) > toMinutos('18:30')) {
        errores.push({
          tipo: 'horario_fuera_ventana',
          trabajo_id: trabajo.programacion_id,
          descripcion: `${trabajo.hora_fin} supera 18:30`
        });
      }
    }
    
    // Verificar solapamientos
    const trabajosOrdenados = [...tecnico.trabajos].sort((a,b) => 
      toMinutos(a.hora_inicio) - toMinutos(b.hora_inicio)
    );
    for (let i = 1; i < trabajosOrdenados.length; i++) {
      const anterior = trabajosOrdenados[i-1];
      const actual   = trabajosOrdenados[i];
      if (toMinutos(anterior.hora_fin) > toMinutos(actual.hora_inicio)) {
        errores.push({
          tipo: 'solapamiento',
          descripcion: `Solapamiento entre ${anterior.nombre_cliente} y ${actual.nombre_cliente}`
        });
      }
    }
  }
  
  return errores;
}
```

Si hay errores de elegibilidad o solapamiento, el backend los corrige automáticamente (revierte al valor del motor) y agrega los errores al campo `advertencias` de la respuesta, para que el admin sepa que el LLM tuvo que ser corregido.

---

## Modo chat (ajustes posteriores)

Después de recibir la propuesta, el admin puede escribir en el chat para pedir ajustes. Esto es una segunda llamada al LLM:

```javascript
async ajustarConInstruccion(propuestaActual, instruccionAdmin) {
  // Es exactamente igual a ajustarPropuesta(), pero:
  // - propuesta_motor = la propuesta actual (no la del motor)
  // - instruccion_admin = el texto que escribió el admin en el chat
  // El LLM recibe la propuesta "como está" y aplica el ajuste pedido.
  return this.ajustarPropuesta(propuestaActual, instruccionAdmin);
}
```

**Importante**: cada llamada del chat regenera la propuesta completa, no aplica diffs. El frontend reemplaza la propuesta mostrada con la nueva. El historial del chat es solo UX (no se pasa al LLM como conversación acumulada — cada llamada es stateless).

---

## Estimación de costos por llamada

Con `claude-haiku-4-5-20251001`:
- System prompt: ~800 tokens (cacheado → costo = 10% del normal después de la primera)
- User message (propuesta de 5 técnicos × 8 trabajos): ~1.500 tokens
- Respuesta (propuesta ajustada + justificaciones): ~2.000 tokens

Costo estimado por generación:
- Primera del día: ~$0.003 USD
- Siguientes (cache warm): ~$0.001 USD

Con `claude-sonnet-4-6`: ~5x más caro, ~$0.015 primera / $0.005 siguientes.

Para el volumen de JMG (estimado 3-10 generaciones/día): **$0.01–$0.15 USD/día**.

---

## Contexto completo que recibe el LLM

El LLM no accede a la base de datos. Recibe solo lo que el backend le pasa:

| Dato | Viene de |
|---|---|
| Roles y especialidades | System prompt (estático) |
| Reglas de negocio | System prompt (estático) |
| Trabajos asignados + horarios | `propuesta_motor.tecnicos[].trabajos[]` |
| Nombre del cliente, distrito | Incluido en cada trabajo |
| Tipo de trabajo | Incluido en cada trabajo |
| Instrucción del admin | `instruccion_admin` del user message |
| Overflow no resuelto | `propuesta_motor.overflow[]` |

Lo que el LLM **NO recibe** (para mantener el contexto pequeño):
- Histórico de programaciones anteriores.
- Datos de todos los clientes/ascensores del sistema.
- Credenciales ni datos sensibles.
- La tabla de tiempos entre distritos (eso lo manejó el motor).
