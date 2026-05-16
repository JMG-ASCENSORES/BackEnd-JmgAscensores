# Contratos de API — Programador IA

Todos los endpoints viven bajo el prefijo `/api/ia-scheduler`. Están protegidos por el middleware de autenticación existente + guard de rol administrador.

Archivo de rutas: `/BackEnd-JmgAscensores/src/routes/ia-scheduler.routes.js`
Controlador: `/BackEnd-JmgAscensores/src/controllers/ia-scheduler.controller.js`

---

## Middleware de autorización

Todos los endpoints de este módulo incluyen:
```javascript
router.use(authenticate);        // JWT válido
router.use(authorize('ADMIN'));  // solo administrador (rol exacto 'ADMIN' en el token)
```

---

## Endpoints

### 1. `GET /api/ia-scheduler/demand`

Retorna los MantenimientosFijos vencidos para la fecha objetivo. Sirve como contexto informativo para que el admin sepa qué mantenimientos están pendientes antes de usar el formulario. **No es el input del motor.**

**Query params**:
- `fecha` (opcional, YYYY-MM-DD, default = mañana)

**Response 200**:
```json
{
  "fecha": "2026-05-12",
  "total": 3,
  "por_tipo": {
    "mantenimiento": 3,
    "reparacion": 0,
    "inspeccion": 0,
    "emergencia": 0
  },
  "trabajos": [
    {
      "mantenimiento_fijo_id": 12,
      "ascensor_id": 8,
      "fuente": "mantenimiento_fijo",
      "cliente_id": 45,
      "nombre_cliente": "Edificio Torres del Sol",
      "distrito": "Miraflores",
      "tipo_trabajo": "mantenimiento",
      "hora_preferida": "09:00",
      "tipo_equipo": "hidráulico"
    }
  ]
}
```

> Este endpoint permite que el frontend muestre un badge "X mantenimientos vencen mañana" y una lista de sugerencias. El admin puede hacer click en uno para prellenar el formulario.

---

### 2. `GET /api/ia-scheduler/tecnicos`

Retorna los técnicos disponibles con su carga actual para la fecha.

**Query params**:
- `fecha` (opcional, YYYY-MM-DD, default = mañana)

**Response 200**:
```json
{
  "fecha": "2026-05-12",
  "tecnicos": [
    {
      "trabajador_id": 3,
      "nombre": "Carlos",
      "apellido": "Ríos",
      "especialidad": "Técnico de Mantenimiento",
      "carga_preexistente": {
        "trabajos_confirmados": 2,
        "minutos_comprometidos": 120,
        "ultima_hora_fin": "11:00"
      }
    },
    {
      "trabajador_id": 5,
      "nombre": "Pedro",
      "apellido": "Lima",
      "especialidad": "Supervisor Técnico",
      "carga_preexistente": {
        "trabajos_confirmados": 0,
        "minutos_comprometidos": 0,
        "ultima_hora_fin": null
      }
    }
  ]
}
```

---

### 3. `POST /api/ia-scheduler/generar`

Endpoint principal. Recibe la definición de un trabajo ad-hoc y devuelve la sugerencia de técnico óptimo con su slot calculado, más alternativas.

**Body**:
```json
{
  "fecha": "2026-05-12",
  "trabajo": {
    "cliente_id": 45,
    "ascensor_id": 8,
    "tipo_trabajo": "mantenimiento",
    "hora_preferida": "09:00"
  },
  "tecnico_ids": [3, 5, 7],
  "instruccion_admin": null
}
```

- `trabajo.hora_preferida`: opcional. Si el cliente tiene una ventana preferida, el motor intenta respetarla.
- `tecnico_ids`: lista de técnicos a evaluar. Si está vacía, se evalúan todos los técnicos activos.
- `instruccion_admin`: instrucción libre para el LLM. Puede ser null.

**Response 200** (sugerencia lista):
```json
{
  "fecha": "2026-05-12",
  "generado_en": "2026-05-12T10:05:33Z",
  "origen": "llm",
  "llm_model": "claude-haiku-4-5-20251001",
  "advertencias": [],

  "trabajo": {
    "cliente_id": 45,
    "ascensor_id": 8,
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
    "justificacion": "Carlos tiene un trabajo en San Isidro que termina a las 08:45. Miraflores está a 15 min de traslado, por lo que puede llegar a las 09:00 respetando la hora preferida del cliente. Es el técnico con mayor disponibilidad en zona sur."
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
      "justificacion": "Pedro no tiene trabajos ese día. Puede empezar a las 08:30, aunque no respeta exactamente la hora preferida del cliente."
    }
  ],

  "sin_elegible": false,
  "razon_sin_elegible": null,
  "notas_llm": null
}
```

**Response 200 (fallback motor)**:
Igual, pero `"origen": "motor_fallback"` y `justificacion: null` en todos los técnicos.

**Response 400** — trabajo inválido:
```json
{ "error": "El ascensor_id 99 no existe o no está activo." }
```

**Response 400** — sin técnico elegible:
```json
{
  "error": "Ningún técnico seleccionado tiene la especialidad requerida para 'reparacion'.",
  "sin_elegible": true
}
```

**Response 400** — sin técnicos con disponibilidad:
```json
{ "error": "Todos los técnicos seleccionados tienen la jornada completa para esa fecha." }
```

---

### 4. `POST /api/ia-scheduler/ajustar`

Aplica una instrucción del admin sobre la sugerencia actual mediante el LLM. Se llama desde el chat posterior a la generación.

**Body**:
```json
{
  "sugerencia_actual": { ... },
  "instruccion": "No me des a Carlos, está saturado hoy"
}
```

**Response 200**: mismo schema que `/generar`. `origen: 'llm'`.

**Nota**: el backend no persiste la sugerencia actual — el frontend la envía completa en cada llamada. Esto evita estado server-side entre requests.

---

### 5. `POST /api/ia-scheduler/confirmar`

Persiste la programación confirmada en la base de datos. Crea una única `Programacion` con el técnico ya asignado.

**Body**:
```json
{
  "fecha": "2026-05-12",
  "trabajo": {
    "cliente_id": 45,
    "ascensor_id": 8,
    "tipo_trabajo": "mantenimiento",
    "hora_inicio": "09:00",
    "hora_fin": "10:00",
    "justificacion": "Carlos tiene un trabajo en San Isidro que termina a las 08:45..."
  },
  "tecnico_id": 3,
  "mantenimiento_fijo_id": 12
}
```

- `mantenimiento_fijo_id`: opcional. Si el trabajo proviene de un MantenimientoFijo, incluirlo para mantener la FK.

**Lógica interna**:

```javascript
async confirmar({ fecha, trabajo, tecnico_id, mantenimiento_fijo_id }) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Crear la Programacion
    const programacion = await Programacion.create({
      titulo:               `${trabajo.tipo_trabajo} - ${trabajo.nombre_cliente}`,
      fecha_inicio:         `${fecha}T${trabajo.hora_inicio}:00-05:00`,
      fecha_fin:            `${fecha}T${trabajo.hora_fin}:00-05:00`,
      trabajador_id:        tecnico_id,
      cliente_id:           trabajo.cliente_id,
      ascensor_id:          trabajo.ascensor_id,
      tipo_trabajo:         trabajo.tipo_trabajo,
      estado:               'pendiente',
      mantenimiento_fijo_id: mantenimiento_fijo_id ?? null,
      descripcion:          trabajo.justificacion ?? null,
    }, { transaction });

    // 2. Crear o actualizar RutaDiaria del técnico para ese día
    const [ruta] = await RutaDiaria.findOrCreate({
      where: { trabajador_id: tecnico_id, fecha_ruta: fecha },
      defaults: {
        numero_paradas: 1,
        hora_inicio:    trabajo.hora_inicio,
        hora_fin:       trabajo.hora_fin,
        estado_ruta:    'planificada',
      },
      transaction
    });

    // Si la ruta ya existía, actualizar hora_fin si el nuevo trabajo es posterior
    if (ruta.hora_fin < trabajo.hora_fin) {
      await ruta.update({
        numero_paradas: ruta.numero_paradas + 1,
        hora_fin:       trabajo.hora_fin,
      }, { transaction });
    }

    // 3. Insertar DetalleRuta
    const ordenActual = await DetalleRuta.count({ where: { ruta_id: ruta.ruta_id }, transaction });
    await DetalleRuta.create({
      ruta_id:         ruta.ruta_id,
      programacion_id: programacion.programacion_id,
      cliente_id:      trabajo.cliente_id,
      ascensor_id:     trabajo.ascensor_id,
      orden_parada:    ordenActual + 1,
      hora_llegada:    trabajo.hora_inicio,
      hora_salida:     trabajo.hora_fin,
    }, { transaction });

    await transaction.commit();
    return { ok: true, programacion_id: programacion.programacion_id };

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
```

**Response 200**:
```json
{
  "ok": true,
  "programacion_id": 207
}
```

**Response 400** — datos inválidos:
```json
{ "error": "El técnico_id 3 no tiene la especialidad requerida para 'reparacion'." }
```

> Nota: no hay conflicto 409 en este endpoint porque no se está actualizando una Programacion existente — siempre se crea una nueva. El único conflicto posible es que el técnico tenga un solapamiento, que se valida antes de confirmar.

---

### 6. `GET /api/ia-scheduler/configuracion`

Retorna la configuración actual del módulo (duraciones, ventana horaria, etc.).

**Response 200**:
```json
{
  "config": [
    { "tipo_trabajo": "emergencia",    "duracion_min": 90,  "tecnicos_requeridos": 1, "prioridad": 1 },
    { "tipo_trabajo": "reparacion",    "duracion_min": 120, "tecnicos_requeridos": 1, "prioridad": 2 },
    { "tipo_trabajo": "inspeccion",    "duracion_min": 45,  "tecnicos_requeridos": 1, "prioridad": 3 },
    { "tipo_trabajo": "mantenimiento", "duracion_min": 60,  "tecnicos_requeridos": 1, "prioridad": 4 }
  ],
  "ventana_horaria": {
    "hora_inicio": "08:30",
    "hora_fin_limite": "18:30"
  }
}
```

---

### 7. `PUT /api/ia-scheduler/configuracion`

Actualiza la configuración. Solo admin.

**Body**:
```json
{
  "tipo_trabajo": "reparacion",
  "duracion_min": 150
}
```

**Response 200**:
```json
{ "ok": true, "actualizado": { "tipo_trabajo": "reparacion", "duracion_min": 150 } }
```

---

## Registro de requests en logs

Todos los requests a `/api/ia-scheduler/generar` y `/api/ia-scheduler/confirmar` deben loguear:
- `admin_id` que hizo el request.
- Fecha objetivo y trabajo solicitado (tipo_trabajo, distrito).
- `origen` de la sugerencia (motor / llm / motor_fallback).
- Técnico sugerido y técnico confirmado (pueden diferir si el admin elige una alternativa).
- Timestamp y duración total.
- Tokens usados (si llm_ok = true).

Esto permite auditar uso y costo de la IA a lo largo del tiempo.
