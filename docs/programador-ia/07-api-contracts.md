# Contratos de API — Programador IA

Todos los endpoints viven bajo el prefijo `/api/ia-scheduler`. Están protegidos por el middleware de autenticación existente + guard de rol administrador.

Archivo de rutas: `/BackEnd-JmgAscensores/src/routes/ia-scheduler.routes.js`
Controlador: `/BackEnd-JmgAscensores/src/controllers/ia-scheduler.controller.js`

---

## Middleware de autorización

Todos los endpoints de este módulo deben incluir:
```javascript
router.use(authMiddleware);          // JWT válido
router.use(requireRole('admin'));    // solo administrador
```

---

## Endpoints

### 1. `GET /api/ia-scheduler/demand`

Retorna el pool de trabajos pendientes para la fecha objetivo. Sirve para que el frontend muestre "hay X trabajos para programar mañana" antes de generar la propuesta.

**Query params**:
- `fecha` (optional, YYYY-MM-DD, default = mañana)

**Response 200**:
```json
{
  "fecha": "2026-05-12",
  "total": 8,
  "por_tipo": {
    "mantenimiento": 5,
    "reparacion": 2,
    "inspeccion": 1,
    "emergencia": 0
  },
  "trabajos": [
    {
      "mantenimiento_fijo_id": 12,
      "programacion_id": null,
      "fuente": "mantenimiento_fijo",
      "cliente_id": 45,
      "nombre_cliente": "Edificio Torres del Sol",
      "distrito": "Miraflores",
      "tipo_trabajo": "mantenimiento",
      "hora_preferida": "09:00",
      "tecnico_preferido_id": 3,
      "ascensor_id": 8,
      "tipo_equipo": "hidráulico"
    },
    {
      "programacion_id": 201,
      "mantenimiento_fijo_id": null,
      "fuente": "programacion_pendiente",
      "cliente_id": 52,
      "nombre_cliente": "Clínica Santa María",
      "distrito": "San Isidro",
      "tipo_trabajo": "reparacion",
      "hora_preferida": null,
      "tecnico_preferido_id": null,
      "ascensor_id": 11,
      "tipo_equipo": "eléctrico tracción"
    }
  ]
}
```

---

### 2. `GET /api/ia-scheduler/tecnicos`

Retorna los técnicos disponibles para seleccionar, con su carga preexistente para la fecha.

**Query params**:
- `fecha` (optional, YYYY-MM-DD, default = mañana)

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

Endpoint principal. Ejecuta la cascada Motor → LLM y devuelve la propuesta final.

**Body**:
```json
{
  "fecha": "2026-05-12",
  "tecnico_ids": [3, 5, 7],
  "instruccion_admin": null
}
```

`instruccion_admin` puede ser null (generación sin preferencias) o string libre (ej. "priorizá emergencias").

**Response 200** (propuesta lista):
```json
{
  "fecha": "2026-05-12",
  "generado_en": "2026-05-12T10:05:33Z",
  "origen": "llm",
  "llm_model": "claude-haiku-4-5-20251001",
  "advertencias": [],
  "notas_overflow": "El trabajo de reparación en La Molina no cabe en la jornada de Carlos. Opciones: (1) asignarlo a otro técnico, (2) moverlo al día siguiente, (3) autorizar extensión de jornada.",
  
  "tecnicos": [
    {
      "trabajador_id": 3,
      "nombre": "Carlos",
      "apellido": "Ríos",
      "especialidad": "Técnico de Mantenimiento",
      "carga_horas": 7.5,
      "carga_minutos": 450,
      "trabajos": [
        {
          "programacion_id": null,
          "mantenimiento_fijo_id": 12,
          "fuente": "mantenimiento_fijo",
          "cliente_id": 45,
          "nombre_cliente": "Edificio Torres del Sol",
          "distrito": "Miraflores",
          "ascensor_id": 8,
          "tipo_equipo": "hidráulico",
          "tipo_trabajo": "mantenimiento",
          "duracion_min": 60,
          "hora_inicio": "08:30",
          "hora_fin": "09:30",
          "traslado_desde_anterior": 0,
          "tecnico_preferido_respetado": true,
          "overflow": false,
          "justificacion": "Primer trabajo del día, cliente preferido por plan fijo. Zona sur compatible con el resto de la ruta."
        }
      ]
    }
  ],
  
  "overflow": [
    {
      "programacion_id": 201,
      "nombre_cliente": "Centro Empresarial La Molina",
      "distrito": "La Molina",
      "tipo_trabajo": "reparacion",
      "duracion_min": 120,
      "trabajador_id_propuesto": 3,
      "razon_overflow": "No cabe en la jornada de Carlos después de sus 6 trabajos previos (fin estimado 19:30).",
      "overflow": true,
      "justificacion": null
    }
  ],
  
  "sin_elegible": []
}
```

**Response 200 (fallback motor)**:
Igual, pero `"origen": "motor_fallback"` y sin `justificacion` en los trabajos.

**Response 400**:
```json
{ "error": "No hay trabajos pendientes para la fecha seleccionada." }
```

**Response 400**:
```json
{ "error": "Los tecnico_ids 99 no existen o están inactivos." }
```

---

### 4. `POST /api/ia-scheduler/ajustar`

Aplica una instrucción del admin sobre la propuesta actual mediante el LLM. Se llama desde el chat.

**Body**:
```json
{
  "propuesta_actual": { ... },  // la propuesta que está viendo el admin (JSON completo)
  "instruccion": "Mové el trabajo de Surquillo de Carlos a Pedro"
}
```

**Response 200**: mismo schema que `/generar`. `origen: 'llm'`.

**Nota**: el backend no persiste la propuesta actual — el frontend la envía completa en cada llamada. Esto evita estado server-side entre requests.

---

### 5. `POST /api/ia-scheduler/confirmar`

Persiste la propuesta confirmada en la base de datos. Operación en transacción atómica.

**Body**:
```json
{
  "fecha": "2026-05-12",
  "propuesta": { ... }  // la propuesta completa tal como la ve el admin
}
```

**Lógica interna**:

```javascript
async confirmar(propuesta) {
  const transaction = await sequelize.transaction();
  try {
    for (const tecnico of propuesta.tecnicos) {
      // 1. Por cada trabajo: crear o actualizar Programacion
      for (const trabajo of tecnico.trabajos) {
        let programacionId;
        
        if (trabajo.programacion_id === null) {
          // Viene de MantenimientoFijo: crear Programacion nueva
          const nuevaP = await Programacion.create({
            titulo:               `Mantenimiento - ${trabajo.nombre_cliente}`,
            fecha_inicio:         `${propuesta.fecha}T${trabajo.hora_inicio}:00`,
            fecha_fin:            `${propuesta.fecha}T${trabajo.hora_fin}:00`,
            trabajador_id:        tecnico.trabajador_id,
            cliente_id:           trabajo.cliente_id,
            ascensor_id:          trabajo.ascensor_id,
            tipo_trabajo:         trabajo.tipo_trabajo,
            estado:               'pendiente',
            mantenimiento_fijo_id: trabajo.mantenimiento_fijo_id,
            descripcion:          trabajo.justificacion,
          }, { transaction });
          programacionId = nuevaP.programacion_id;
        } else {
          // Ya existe: asignar técnico y actualizar horario
          await Programacion.update({
            trabajador_id: tecnico.trabajador_id,
            fecha_inicio:  `${propuesta.fecha}T${trabajo.hora_inicio}:00`,
            fecha_fin:     `${propuesta.fecha}T${trabajo.hora_fin}:00`,
            descripcion:   trabajo.justificacion,
          }, {
            where: { programacion_id: trabajo.programacion_id },
            transaction
          });
          programacionId = trabajo.programacion_id;
        }
        
        // Guardar el programacion_id resuelto para DetalleRuta
        trabajo._programacion_id_resuelto = programacionId;
      }
      
      // 2. Crear o actualizar RutaDiaria del técnico para ese día
      const [ruta] = await RutaDiaria.upsert({
        trabajador_id:   tecnico.trabajador_id,
        fecha_ruta:      propuesta.fecha,
        numero_paradas:  tecnico.trabajos.length,
        hora_inicio:     tecnico.trabajos[0]?.hora_inicio,
        hora_fin:        tecnico.trabajos[tecnico.trabajos.length - 1]?.hora_fin,
        estado_ruta:     'planificada',
      }, { transaction });
      
      // 3. Eliminar DetalleRuta anterior del técnico para ese día (si existe)
      await DetalleRuta.destroy({
        where: { ruta_id: ruta.ruta_id },
        transaction
      });
      
      // 4. Insertar nuevos DetalleRuta
      for (let i = 0; i < tecnico.trabajos.length; i++) {
        const trabajo = tecnico.trabajos[i];
        await DetalleRuta.create({
          ruta_id:          ruta.ruta_id,
          programacion_id:  trabajo._programacion_id_resuelto,
          orden_parada:     i + 1,
          hora_llegada:     trabajo.hora_inicio,
          hora_salida:      trabajo.hora_fin,
        }, { transaction });
      }
    }
    
    await transaction.commit();
    return { ok: true, programaciones_creadas: creadas, programaciones_actualizadas: actualizadas };
    
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
  "programaciones_creadas": 5,
  "programaciones_actualizadas": 2,
  "rutas_generadas": 3
}
```

**Response 409 (conflicto)**:
```json
{
  "error": "La Programacion 201 fue modificada por otro usuario mientras revisabas la propuesta. Regenerá la propuesta."
}
```

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
- Fecha objetivo.
- Técnicos seleccionados.
- `origen` de la propuesta (motor / llm / motor_fallback).
- Timestamp y duración total.
- Tokens usados (si llm_ok = true).

Esto permite auditar uso y costo de la IA a lo largo del tiempo.
