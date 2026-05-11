# Frontend — Componente Programador IA

## Ubicación y ruta

- **Ruta Angular**: `/admin/programador-ia` (o `/admin/ai-assistant` si se mantiene la ruta existente)
- **Componente raíz**: `src/app/features/admin/ai-assistant/ai-scheduler.component.ts`
  - El archivo `ai-assistant.component.ts` se reemplaza completamente
- **Servicio Angular**: `src/app/core/services/ia-scheduler.service.ts`

---

## Estados del componente (Signal-based)

```typescript
type SchedulerState =
  | 'idle'           // pantalla inicial, sin propuesta
  | 'loading'        // generando propuesta (motor + LLM en curso)
  | 'propuesta_lista' // propuesta generada, esperando revisión del admin
  | 'adjusting'      // LLM procesando instrucción del chat
  | 'confirming'     // persistiendo en BD
  | 'confirmado';    // confirmación exitosa

// Signals del componente
state             = signal<SchedulerState>('idle');
selectedDate      = signal<string>(tomorrow());        // 'YYYY-MM-DD'
selectedTecnicos  = signal<number[]>([]);              // ids seleccionados
propuestaActual   = signal<Propuesta | null>(null);
demandaInfo       = signal<DemandInfo | null>(null);   // para el badge "X trabajos pendientes"
chatMessages      = signal<ChatMessage[]>([]);
errorMessage      = signal<string | null>(null);
```

---

## Layout general

```
┌─────────────────────────────────────────────────────────────┐
│  PROGRAMADOR IA                              [?] Ayuda       │
│                                                              │
│  Fecha: [2026-05-12 ▾]    8 trabajos pendientes             │
│                                                              │
│  Técnicos:                                                   │
│  [✓ Carlos Ríos]  [✓ Pedro Lima]  [  Ana García]           │
│  [✓ Juan Torres]  [  Rosa Méndez]                           │
│                                                              │
│  [    Generar propuesta    ]                                 │
├──────────────────────────────────────────────────────────────┤
│  [ÁREA DE PROPUESTA — aparece después de generar]            │
│                                                              │
│  Carlos Ríos — Técnico de Mantenimiento — 7.5h              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 08:30 ████ Miraflores (60min) ████░░░░░░░░░░░░░░░░░░  │ │  
│  │ 09:50 ████ San Isidro (60min) ████░░░░░░░░░░░░░░░░░░  │ │
│  │ 11:10 ████ San Borja  (120min)████████░░░░░░░░░░░░░░  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Pedro Lima — Supervisor Técnico — 5.0h                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 08:30 ████ Surco      (45min) ███░░░░░░░░░░░░░░░░░░░  │ │
│  │ ...                                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ⚠ Overflow (1 trabajo no asignado):                        │
│  • La Molina — reparación — ver sugerencia IA               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Chat de ajustes                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Mové el trabajo de Surquillo de Carlos a Pedro         │ │
│  └─────────────────────────────────────────────────[→]───┘ │
├──────────────────────────────────────────────────────────────┤
│                      [  Confirmar y aplicar  ]               │
└──────────────────────────────────────────────────────────────┘
```

---

## Sub-componentes

### `ai-scheduler-header`
Selector de fecha + badge de demanda + chips de técnicos + botón "Generar".

```typescript
@Component({
  selector: 'app-ai-scheduler-header',
  template: `
    <div class="flex flex-col gap-4 p-4 border-b border-gray-200">
      <!-- Fecha -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700">Fecha:</label>
        <input type="date" [value]="fecha()" (change)="onFechaChange($event)"
               [min]="tomorrow()" class="border rounded px-2 py-1 text-sm"/>
        @if (demanda()) {
          <span class="text-sm text-gray-500">
            {{ demanda()!.total }} trabajos pendientes
          </span>
        }
      </div>
      
      <!-- Técnicos chips -->
      <div class="flex flex-wrap gap-2">
        @for (tecnico of tecnicos(); track tecnico.trabajador_id) {
          <button
            (click)="toggleTecnico(tecnico.trabajador_id)"
            [class]="chipClass(tecnico.trabajador_id)">
            {{ tecnico.nombre }} {{ tecnico.apellido }}
            <span class="text-xs opacity-60">
              ({{ tecnico.carga_preexistente.trabajos_confirmados }} ya asignados)
            </span>
          </button>
        }
      </div>
      
      <!-- Botón generar -->
      <button (click)="onGenerar()" [disabled]="!puedeGenerar()"
              class="btn-primary self-start">
        @if (loading()) { <span class="animate-spin mr-2">⟳</span> Generando... }
        @else { Generar propuesta }
      </button>
    </div>
  `
})
```

---

### `ai-scheduler-timeline`
Renderiza el timeline horizontal por técnico.

```typescript
@Component({
  selector: 'app-ai-scheduler-timeline',
  template: `
    <div class="p-4 space-y-6">
      @for (tecnico of propuesta()!.tecnicos; track tecnico.trabajador_id) {
        <div class="space-y-2">
          <!-- Header del técnico -->
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ tecnico.nombre }} {{ tecnico.apellido }}</span>
            <span class="text-sm text-gray-500">{{ tecnico.especialidad }}</span>
            <span class="text-sm font-medium text-blue-600">
              {{ tecnico.carga_horas }}h asignadas
            </span>
          </div>
          
          <!-- Barra de timeline (8:30 a 18:30 = 600 min = 100%) -->
          <div class="relative h-12 bg-gray-100 rounded overflow-hidden">
            @for (trabajo of tecnico.trabajos; track trabajo.programacion_id ?? trabajo.mantenimiento_fijo_id) {
              <div
                [style.left.%]="minutosToPercent(trabajo.hora_inicio)"
                [style.width.%]="minutosToPercent(trabajo.hora_fin) - minutosToPercent(trabajo.hora_inicio)"
                [class]="blockClass(trabajo.tipo_trabajo)"
                class="absolute h-full flex items-center px-1 overflow-hidden cursor-pointer"
                (click)="mostrarDetalle(trabajo)">
                <span class="text-xs text-white truncate">
                  {{ trabajo.hora_inicio }} {{ trabajo.nombre_cliente }}
                </span>
              </div>
            }
          </div>
          
          <!-- Lista de paradas (expandida) -->
          <div class="space-y-1">
            @for (trabajo of tecnico.trabajos; track $index) {
              <div class="flex items-start gap-3 text-sm p-2 rounded hover:bg-gray-50">
                <span class="w-10 text-gray-500 font-mono">{{ trabajo.hora_inicio }}</span>
                <span class="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                      [class]="dotClass(trabajo.tipo_trabajo)"></span>
                <div class="flex-1">
                  <span class="font-medium">{{ trabajo.nombre_cliente }}</span>
                  <span class="text-gray-400 ml-2">{{ trabajo.distrito }}</span>
                  <span class="text-gray-400 ml-2">{{ trabajo.duracion_min }}min</span>
                  @if (trabajo.traslado_desde_anterior > 0) {
                    <span class="text-gray-300 ml-2">
                      (+{{ trabajo.traslado_desde_anterior }}min traslado)
                    </span>
                  }
                  @if (trabajo.justificacion) {
                    <p class="text-gray-400 text-xs mt-0.5 italic">{{ trabajo.justificacion }}</p>
                  }
                </div>
                <span class="font-mono text-gray-400">{{ trabajo.hora_fin }}</span>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- Overflow -->
      @if (propuesta()!.overflow.length > 0) {
        <div class="border border-amber-200 bg-amber-50 rounded p-4">
          <p class="font-medium text-amber-800 mb-2">
            ⚠ {{ propuesta()!.overflow.length }} trabajo(s) no asignado(s)
          </p>
          @for (item of propuesta()!.overflow; track item.programacion_id) {
            <div class="text-sm text-amber-700">
              • {{ item.nombre_cliente }} ({{ item.distrito }}) — {{ item.tipo_trabajo }}
              — {{ item.razon_overflow }}
            </div>
          }
          @if (propuesta()!.notas_overflow) {
            <p class="text-sm text-amber-600 mt-2 italic">
              IA sugiere: {{ propuesta()!.notas_overflow }}
            </p>
          }
        </div>
      }
    </div>
  `
})
```

**Colores por tipo de trabajo** (clases Tailwind):
- `emergencia`: `bg-red-500`
- `reparacion`: `bg-orange-500`
- `inspeccion`: `bg-yellow-500`
- `mantenimiento`: `bg-blue-500`

**Cálculo de porcentaje** (para la barra de timeline):
```typescript
minutosToPercent(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const minutos = h * 60 + m;
  const INICIO = 8 * 60 + 30;  // 510 min
  const FIN    = 18 * 60 + 30; // 1110 min
  return ((minutos - INICIO) / (FIN - INICIO)) * 100;
}
```

---

### `ai-scheduler-chat`
Panel de chat para instrucciones de ajuste.

```typescript
@Component({
  selector: 'app-ai-scheduler-chat',
  template: `
    <div class="border-t border-gray-200 p-4">
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
              Ajustando propuesta...
            </span>
          </div>
        }
      </div>
      
      <div class="flex gap-2">
        <input #chatInput
               [(ngModel)]="chatInput"
               (keydown.enter)="onEnviar()"
               placeholder="Ej: priorizá la emergencia de Miraflores..."
               class="flex-1 border rounded px-3 py-2 text-sm"
               [disabled]="adjusting()"/>
        <button (click)="onEnviar()" [disabled]="adjusting() || !chatInput.trim()"
                class="btn-primary px-4">→</button>
      </div>
    </div>
  `
})
```

---

### `ai-scheduler-footer`
Botones de confirmación y descarte.

```typescript
@Component({
  template: `
    <div class="sticky bottom-0 border-t border-gray-200 bg-white p-4 flex gap-3 justify-end">
      <button (click)="onDescartar()" class="btn-secondary">
        Descartar propuesta
      </button>
      <button (click)="onConfirmar()" [disabled]="confirming()"
              class="btn-primary bg-green-600 hover:bg-green-700">
        @if (confirming()) { Aplicando... }
        @else { Confirmar y crear programaciones }
      </button>
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
  private base = '/api/ia-scheduler';

  getDemand(fecha: string) {
    return this.http.get<DemandResponse>(`${this.base}/demand`, { params: { fecha } });
  }

  getTecnicos(fecha: string) {
    return this.http.get<TecnicosResponse>(`${this.base}/tecnicos`, { params: { fecha } });
  }

  generar(body: GenerarRequest) {
    return this.http.post<Propuesta>(`${this.base}/generar`, body);
  }

  ajustar(body: AjustarRequest) {
    return this.http.post<Propuesta>(`${this.base}/ajustar`, body);
  }

  confirmar(body: ConfirmarRequest) {
    return this.http.post<ConfirmarResponse>(`${this.base}/confirmar`, body);
  }
}
```

---

## Flujo de interacción completo

```
1. Admin abre /admin/programador-ia
   └── ngOnInit: getDemand(mañana) + getTecnicos(mañana)
   └── Muestra badge "X trabajos" y lista de técnicos con chips

2. Admin selecciona técnicos (chips toggle)

3. Admin hace click en "Generar propuesta"
   └── state = 'loading'
   └── POST /generar { fecha, tecnico_ids, instruccion_admin: null }
   └── Spinner + "Generando propuesta con IA..."
   └── Response → propuestaActual.set(data)
   └── state = 'propuesta_lista'
   └── Muestra timeline + chat

4. Admin revisa la propuesta
   └── Puede expandir/contraer paradas por técnico
   └── Puede hacer click en una parada para ver detalle + justificación

5a. Admin acepta la propuesta sin cambios
    └── Click "Confirmar y crear programaciones"
    └── state = 'confirming'
    └── POST /confirmar { fecha, propuesta: propuestaActual() }
    └── Response → state = 'confirmado'
    └── Toast "X programaciones creadas" → redirigir al calendario

5b. Admin ajusta por chat
    └── Escribe instrucción → click → chatMessages.update()
    └── state = 'adjusting'
    └── POST /ajustar { propuesta_actual: propuestaActual(), instruccion }
    └── Response → propuestaActual.set(data) → state = 'propuesta_lista'
    └── Timeline actualizado con los cambios

5c. Admin descarta
    └── Click "Descartar" → confirm dialog → propuestaActual.set(null)
    └── state = 'idle'
```

---

## Banners de estado

| Condición | Banner |
|---|---|
| `origen === 'motor_fallback'` | 🟡 "Propuesta generada sin validación IA — el servicio no está disponible." |
| `advertencias.length > 0` | 🟡 "La IA hizo correcciones automáticas. Ver detalles." |
| `overflow.length > 0` | 🟠 "X trabajos no pudieron ser asignados. Ver overflow." |
| `sin_elegible.length > 0` | 🔴 "X trabajos no tienen técnico elegible disponible." |
| Confirmación exitosa | 🟢 "X programaciones creadas y Y actualizadas." |

---

## Consideraciones de accesibilidad y UX

- El botón "Confirmar" debe tener un confirm dialog adicional: "¿Confirmar X programaciones para [fecha]? Esta acción no se puede deshacer desde este módulo."
- En mobile (< 768px), el timeline se muestra como lista vertical (no barra horizontal).
- El spinner de "Generando..." debe mostrar el tiempo transcurrido en segundos para que el admin sepa que no se colgó.
- Si el admin selecciona 0 técnicos, el botón "Generar" está deshabilitado con tooltip "Seleccioná al menos un técnico".
