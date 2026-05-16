# Frontend — Componente Programador IA

## Ubicación y ruta

- **Ruta Angular**: `/admin/ai-assistant` (ruta existente sin cambiar)
- **Componente raíz**: `src/app/features/admin/ai-assistant/ai-assistant.component.ts`
- **Servicio Angular**: `src/app/core/services/ia-scheduler.service.ts`

---

## Estados del componente (Signal-based)

```typescript
type SchedulerState =
  | 'idle'           // formulario vacío, sin sugerencia
  | 'loading'        // evaluando técnicos (motor + LLM en curso)
  | 'sugerencia_lista' // sugerencia generada, esperando revisión del admin
  | 'adjusting'      // LLM procesando instrucción del chat
  | 'confirming'     // persistiendo en BD
  | 'confirmado';    // confirmación exitosa

// Signals del componente
state             = signal<SchedulerState>('idle');
selectedDate      = signal<string>(tomorrow());        // 'YYYY-MM-DD'
selectedClienteId = signal<number | null>(null);
selectedAscensorId = signal<number | null>(null);
selectedTipo      = signal<TipoTrabajo | null>(null);
horaPreferida     = signal<string | null>(null);
sugerenciaActual  = signal<SugerenciaResponse | null>(null);
demandaContexto   = signal<DemandInfo | null>(null);   // mantenimientos vencidos (info solo)
tecnicosInfo      = signal<TecnicoConCarga[]>([]);
chatMessages      = signal<ChatMessage[]>([]);
errorMessage      = signal<string | null>(null);
```

---

## Layout general

```
┌─────────────────────────────────────────────────────────────┐
│  PROGRAMADOR IA                              [?] Ayuda       │
├──────────────────────────────────────────────────────────────┤
│  NUEVO TRABAJO                                               │
│                                                              │
│  Fecha:          [2026-05-12 ▾]                             │
│  Cliente:        [Seleccionar cliente ▾]                    │
│  Ascensor:       [Seleccionar equipo ▾]  (filtrado)         │
│  Tipo de trabajo:[▾ Mantenimiento]                          │
│  Hora preferida: [09:00]  (opcional)                        │
│                                                              │
│  [    Buscar técnico óptimo    ]                             │
├──────────────────────────────────────────────────────────────┤
│  📋 Mantenimientos vencidos mañana (3)                      │
│  • Edificio Torres del Sol — Miraflores — hidráulico [+]    │
│  • Clínica Santa María — San Isidro — eléctrico [+]         │
│  • Edificio El Golf — Surco — hidráulico [+]                │
│  (click [+] para prellenar el formulario)                    │
├──────────────────────────────────────────────────────────────┤
│  SUGERENCIA IA:                                              │
│                                                              │
│  ✓ Carlos Ríos — Técnico de Mantenimiento                   │
│    09:00 – 10:00  (60min + 15min traslado desde San Isidro) │
│    "Carlos tiene un trabajo en San Isidro que termina a      │
│     las 08:45. Miraflores está a 15 min, puede llegar a las │
│     09:00 respetando la hora preferida del cliente."         │
│                                                              │
│  Otras opciones:                                             │
│  ○ Pedro Lima (Supervisor) — 08:30–09:30 — libre todo el día│
│  ○ Ana García (Técnico Gral) — 14:00–15:00 — 3 trabajos     │
│                                                              │
│  [Confirmar con Carlos Ríos] [Elegir otra opción] [Cancelar]│
├──────────────────────────────────────────────────────────────┤
│  Chat de ajustes (opcional)                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ No me des a Carlos, está saturado hoy                  │ │
│  └─────────────────────────────────────────────────[→]───┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Sub-componentes

### `ai-scheduler-form`
Formulario de definición del trabajo. El campo `ascensor` se filtra por el cliente seleccionado.

```typescript
@Component({
  selector: 'app-ai-scheduler-form',
  template: `
    <div class="p-4 border-b border-gray-200 space-y-4">
      <h2 class="text-base font-semibold text-gray-800">Nuevo trabajo</h2>

      <!-- Fecha -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700 w-32">Fecha:</label>
        <input type="date" [value]="fecha()" (change)="onFechaChange($event)"
               [min]="tomorrow()" class="border rounded px-2 py-1 text-sm"/>
      </div>

      <!-- Cliente -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700 w-32">Cliente:</label>
        <select (change)="onClienteChange($event)" class="border rounded px-2 py-1 text-sm flex-1">
          <option value="">Seleccionar cliente</option>
          @for (c of clientes(); track c.cliente_id) {
            <option [value]="c.cliente_id">{{ c.nombre_comercial }}</option>
          }
        </select>
      </div>

      <!-- Ascensor (filtrado por cliente) -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700 w-32">Ascensor:</label>
        <select (change)="onAscensorChange($event)" [disabled]="!clienteId()"
                class="border rounded px-2 py-1 text-sm flex-1">
          <option value="">Seleccionar equipo</option>
          @for (a of ascensoresFiltrados(); track a.ascensor_id) {
            <option [value]="a.ascensor_id">{{ a.tipo_equipo }} — {{ a.marca }}</option>
          }
        </select>
      </div>

      <!-- Tipo de trabajo -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700 w-32">Tipo:</label>
        <select (change)="onTipoChange($event)" class="border rounded px-2 py-1 text-sm">
          <option value="mantenimiento">Mantenimiento</option>
          <option value="reparacion">Reparación</option>
          <option value="inspeccion">Inspección</option>
          <option value="emergencia">Emergencia</option>
        </select>
      </div>

      <!-- Hora preferida (opcional) -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700 w-32">Hora preferida:</label>
        <input type="time" [value]="horaPreferida()" (change)="onHoraChange($event)"
               class="border rounded px-2 py-1 text-sm"/>
        <span class="text-xs text-gray-400">(opcional)</span>
      </div>

      <!-- Botón generar -->
      <button (click)="onGenerar()" [disabled]="!puedeGenerar() || loading()"
              class="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600
                     hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors self-start">
        @if (loading()) {
          <span class="animate-spin mr-2">⟳</span> Buscando técnico...
        } @else {
          Buscar técnico óptimo
        }
      </button>
    </div>
  `
})
```

---

### `ai-scheduler-demand-context`
Lista informativa de MantenimientosFijos vencidos. Permite prellenar el formulario con un click.

```typescript
@Component({
  selector: 'app-ai-scheduler-demand-context',
  template: `
    @if (demanda() && demanda()!.total > 0) {
      <div class="px-4 py-3 border-b border-gray-200 bg-amber-50">
        <p class="text-sm font-medium text-amber-800 mb-2">
          📋 {{ demanda()!.total }} mantenimiento(s) vencen esta fecha
        </p>
        <div class="space-y-1">
          @for (item of demanda()!.trabajos; track item.mantenimiento_fijo_id) {
            <div class="flex items-center justify-between text-sm">
              <span class="text-amber-700">
                {{ item.nombre_cliente }} — {{ item.distrito }} — {{ item.tipo_equipo }}
              </span>
              <button (click)="onPrellenar(item)"
                      class="text-xs text-blue-600 underline hover:text-blue-800 ml-3">
                Programar este
              </button>
            </div>
          }
        </div>
      </div>
    }
  `
})
```

---

### `ai-scheduler-suggestion`
Muestra la sugerencia del LLM y las alternativas. El admin puede seleccionar cualquier opción.

```typescript
@Component({
  selector: 'app-ai-scheduler-suggestion',
  template: `
    <div class="p-4 space-y-4">
      <!-- Banner de origen -->
      @if (sugerencia()!.origen === 'motor_fallback') {
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-sm text-amber-700 font-medium">
            ⚠ Sugerencia generada sin validación IA — el servicio no está disponible.
          </p>
        </div>
      }

      <!-- Sin técnico elegible -->
      @if (sugerencia()!.sin_elegible) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="font-medium text-red-700">
            🚫 Ningún técnico seleccionado puede realizar este tipo de trabajo
          </p>
          @if (sugerencia()!.razon_sin_elegible) {
            <p class="text-sm text-red-600 mt-1">{{ sugerencia()!.razon_sin_elegible }}</p>
          }
        </div>
      }

      <!-- Sugerencia principal -->
      @if (sugerencia()!.sugerencia) {
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-green-600 font-bold text-lg">✓</span>
            <span class="font-semibold text-gray-900">
              {{ sugerencia()!.sugerencia!.nombre }} {{ sugerencia()!.sugerencia!.apellido }}
            </span>
            <span class="text-sm text-gray-500">— {{ sugerencia()!.sugerencia!.especialidad }}</span>
          </div>

          <div class="flex items-center gap-4 text-sm mb-3">
            <span class="font-mono font-medium text-gray-800">
              {{ sugerencia()!.sugerencia!.hora_inicio }} – {{ sugerencia()!.sugerencia!.hora_fin }}
            </span>
            <span class="text-gray-500">
              ({{ sugerencia()!.trabajo.duracion_min }}min
              @if (sugerencia()!.sugerencia!.traslado_min > 0) {
                + {{ sugerencia()!.sugerencia!.traslado_min }}min traslado
              })
            </span>
            <span class="text-gray-400">
              Carga previa: {{ sugerencia()!.sugerencia!.carga_previa_horas.toFixed(1) }}h
            </span>
          </div>

          @if (sugerencia()!.sugerencia!.justificacion) {
            <p class="text-sm text-gray-600 italic border-l-2 border-green-300 pl-3">
              "{{ sugerencia()!.sugerencia!.justificacion }}"
            </p>
          }

          <button
            (click)="onConfirmar(sugerencia()!.sugerencia!)"
            [disabled]="confirming()"
            class="mt-4 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-green-600
                   hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
            @if (confirming()) { Aplicando... }
            @else { Confirmar con {{ sugerencia()!.sugerencia!.nombre }} }
          </button>
        </div>
      }

      <!-- Alternativas -->
      @if (sugerencia()!.alternativas.length > 0) {
        <div>
          <p class="text-sm font-medium text-gray-700 mb-2">Otras opciones:</p>
          <div class="space-y-2">
            @for (alt of sugerencia()!.alternativas; track alt.trabajador_id) {
              <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span class="font-medium text-gray-800 text-sm">
                    {{ alt.nombre }} {{ alt.apellido }}
                  </span>
                  <span class="text-xs text-gray-500 ml-2">{{ alt.especialidad }}</span>
                  <div class="text-sm font-mono text-gray-600 mt-0.5">
                    {{ alt.hora_inicio }} – {{ alt.hora_fin }}
                    <span class="font-sans text-gray-400 ml-2">
                      ({{ alt.carga_previa_horas.toFixed(1) }}h previa)
                    </span>
                  </div>
                  @if (alt.justificacion) {
                    <p class="text-xs text-gray-400 italic mt-0.5 truncate max-w-xs">
                      {{ alt.justificacion }}
                    </p>
                  }
                </div>
                <button
                  (click)="onConfirmar(alt)"
                  class="ml-4 px-3 py-1.5 rounded text-xs font-medium text-blue-600
                         border border-blue-200 hover:bg-blue-50 transition-colors flex-shrink-0">
                  Elegir
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Botón descartar -->
      <div class="flex justify-start pt-2">
        <button (click)="onDescartar()"
                class="text-sm text-gray-500 underline hover:text-gray-700">
          Cancelar y volver al formulario
        </button>
      </div>
    </div>
  `
})
```

---

### `ai-scheduler-chat`
Panel de chat para ajustes posteriores a la sugerencia. Opcional, aparece después de `sugerencia_lista`.

```typescript
@Component({
  selector: 'app-ai-scheduler-chat',
  template: `
    <div class="border-t border-gray-200 p-4">
      <p class="text-xs text-gray-400 mb-2">
        Pedile ajustes a la IA en lenguaje natural:
      </p>
      <div class="max-h-40 overflow-y-auto space-y-2 mb-3">
        @for (msg of messages(); track $index) {
          <div [class]="msg.role === 'user' ? 'text-right' : 'text-left'">
            <span [class]="msg.role === 'user'
              ? 'inline-block bg-blue-500 text-white px-3 py-1 rounded-lg text-sm max-w-xs'
              : 'inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm max-w-xs'">
              {{ msg.content }}
            </span>
          </div>
        }
        @if (adjusting()) {
          <div class="text-left">
            <span class="inline-block bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-sm animate-pulse">
              Ajustando sugerencia...
            </span>
          </div>
        }
      </div>

      <div class="flex gap-2">
        <input
          [(ngModel)]="chatInput"
          (keydown.enter)="onEnviar()"
          placeholder="Ej: no me des a Carlos, está saturado hoy..."
          class="flex-1 border rounded px-3 py-2 text-sm"
          [disabled]="adjusting()"/>
        <button (click)="onEnviar()" [disabled]="adjusting() || !chatInput.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700
                       disabled:bg-gray-300 transition-colors">
          →
        </button>
      </div>
    </div>
  `
})
```

---

## Servicio Angular (`ia-scheduler.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class IaSchedulerService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/ia-scheduler`;

  getDemand(fecha: string): Observable<DemandResponse> {
    return this.http.get<DemandResponse>(`${this.base}/demand`, { params: { fecha } });
  }

  getTecnicos(fecha: string): Observable<TecnicosResponse> {
    return this.http.get<TecnicosResponse>(`${this.base}/tecnicos`, { params: { fecha } });
  }

  generar(body: GenerarRequest): Observable<SugerenciaResponse> {
    return this.http.post<SugerenciaResponse>(`${this.base}/generar`, body);
  }

  ajustar(body: AjustarRequest): Observable<SugerenciaResponse> {
    return this.http.post<SugerenciaResponse>(`${this.base}/ajustar`, body);
  }

  confirmar(body: ConfirmarRequest): Observable<ConfirmarResponse> {
    return this.http.post<ConfirmarResponse>(`${this.base}/confirmar`, body);
  }
}
```

---

## Flujo de interacción completo

```
1. Admin abre /admin/ai-assistant
   └── ngOnInit: getDemand(mañana) + getTecnicos(mañana)
   └── Muestra formulario vacío + lista de mantenimientos vencidos (contexto)

2. Admin llena el formulario
   └── Selecciona cliente → se filtran los ascensores del cliente
   └── Selecciona ascensor → se habilita tipo de trabajo
   └── Selecciona tipo (mantenimiento / reparacion / inspeccion / emergencia)
   └── Opcionalmente: ingresa hora preferida del cliente

   Alternativa: click en [+] en la lista de mantenimientos vencidos
   └── Prelllena cliente_id, ascensor_id, tipo_trabajo='mantenimiento', hora_preferida
   └── Admin solo confirma y hace click en "Buscar técnico óptimo"

3. Admin hace click en "Buscar técnico óptimo"
   └── state = 'loading'
   └── POST /generar { fecha, trabajo: {...}, tecnico_ids: [] }
   └── Spinner + "Buscando técnico óptimo..."
   └── Response → sugerenciaActual.set(data)
   └── state = 'sugerencia_lista'
   └── Muestra panel de sugerencia + alternativas

4. Admin revisa la sugerencia
   └── Ve el técnico sugerido con su slot calculado y justificación del LLM
   └── Ve alternativas ordenadas con sus slots
   └── Puede usar el chat para pedir ajustes (Paso 5b)

5a. Admin confirma la sugerencia (o elige una alternativa)
    └── Click "Confirmar con [nombre]"
    └── state = 'confirming'
    └── POST /confirmar { fecha, trabajo: {...con hora_inicio/fin...}, tecnico_id }
    └── Response → state = 'confirmado'
    └── Toast "Programación creada para [nombre] — [hora_inicio]–[hora_fin]"
    └── Limpiar formulario para el siguiente trabajo

5b. Admin ajusta por chat
    └── Escribe instrucción → click →
    └── state = 'adjusting'
    └── POST /ajustar { sugerencia_actual: sugerenciaActual(), instruccion }
    └── Response → sugerenciaActual.set(data) → state = 'sugerencia_lista'
    └── Panel de sugerencia actualizado

5c. Admin descarta
    └── Click "Cancelar y volver al formulario" → sugerenciaActual.set(null)
    └── state = 'idle'
    └── Formulario vuelve a ser editable
```

---

## Prellenado desde MantenimientosFijos

Cuando el admin hace click en [+] junto a un mantenimiento vencido, el formulario se prellena:

```typescript
onPrellenar(item: MantenimientoItem): void {
  this.selectedClienteId.set(item.cliente_id);
  this.selectedAscensorId.set(item.ascensor_id);
  this.selectedTipo.set('mantenimiento');
  this.horaPreferida.set(item.hora_preferida);
  this.mantenimientoFijoIdContexto.set(item.mantenimiento_fijo_id);
  // El formulario muestra los valores prellenados
  // El admin puede ajustar y hacer click en "Buscar técnico óptimo"
}
```

Al confirmar un trabajo originado en un MantenimientoFijo, se incluye `mantenimiento_fijo_id` en el body del `/confirmar` para mantener la trazabilidad.

---

## Banners de estado

| Condición | Banner |
|---|---|
| `origen === 'motor_fallback'` | 🟡 "Sugerencia generada sin validación IA — el servicio no está disponible." |
| `advertencias.length > 0` | 🟡 "La IA hizo correcciones automáticas. Ver detalles." |
| `sin_elegible === true` | 🔴 "Ningún técnico seleccionado puede realizar este tipo de trabajo." |
| Confirmación exitosa | 🟢 "Programación creada — Carlos Ríos, 09:00–10:00." |

---

## Consideraciones de UX

- El botón "Confirmar" muestra el nombre del técnico seleccionado, no solo "Confirmar".
- El selector de ascensor está deshabilitado hasta que se elija un cliente (evita listas enormes).
- En mobile (< 768px), las alternativas se muestran como acordeón colapsable.
- Si el admin selecciona "hora preferida" y el técnico sugerido no puede llegar a tiempo, el LLM lo explica en la justificación.
- Después de confirmar, el formulario se limpia automáticamente para que el admin pueda programar el siguiente trabajo sin recargar la página.
