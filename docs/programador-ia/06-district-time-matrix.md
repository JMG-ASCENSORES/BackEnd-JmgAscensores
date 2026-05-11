# Tabla de Tiempos entre Distritos de Lima

## Metodología

Los tiempos representan el **traslado en transporte público** (bus, combi, metro cuando aplica) incluyendo:
- Tiempo de espera del vehículo (promedio 5–10 min).
- Tiempo de caminata en origen y destino (5–15 min total).
- **Buffer de tráfico del 30%** sobre tiempo base, para reflejar la congestión habitual de Lima en horario laboral (8:30–18:30).

Son tiempos **simétricos por simplificación** (A→B = B→A). En realidad Lima tiene asimetrías (el sentido contrapeaking es más rápido), pero para v1 el tiempo simétrico conservador es suficiente.

Los tiempos están en **minutos**.

### Cuándo actualizar esta tabla

- Cuando se abra una nueva línea de metro/metropolitano relevante.
- Si el feedback del sistema muestra consistentemente que los tiempos reales son muy distintos.
- Cuando JMG expanda a distritos no listados.

Esta tabla vive en la base de datos (`TablaDistritosLima`, ver `09-database-migrations.md`) y se puede actualizar desde el panel de administración sin deploy.

---

## Distritos incluidos

Los 20 distritos donde JMG Ascensores opera o puede operar, ordenados por zona:

**Zona Centro**: Cercado de Lima, Breña, La Victoria, Lince
**Zona Financiera/Sur**: San Isidro, Miraflores, San Borja, Surquillo, Barranco
**Zona Sureste**: Surco (Santiago de Surco), La Molina, Chorrillos
**Zona Norte**: Los Olivos, San Martín de Porres, Independencia
**Zona Oeste**: San Miguel, Magdalena del Mar, Pueblo Libre, Callao
**Zona Este**: Ate, Santa Anita

---

## Tabla de tiempos (minutos, bus público + buffer tráfico)

> Leer como: fila = origen, columna = destino. La tabla es simétrica.

| Distrito | Cercado | Breña | La Victoria | Lince | San Isidro | Miraflores | San Borja | Surquillo | Barranco | Surco | La Molina | Chorrillos | Los Olivos | SMP | Independencia | San Miguel | Magdalena | Pueblo Libre | Callao | Ate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Cercado de Lima** | 0 | 20 | 25 | 30 | 40 | 50 | 45 | 45 | 60 | 65 | 80 | 70 | 75 | 65 | 55 | 50 | 45 | 40 | 60 | 65 |
| **Breña** | 20 | 0 | 30 | 30 | 40 | 50 | 45 | 45 | 60 | 65 | 85 | 70 | 65 | 55 | 50 | 40 | 35 | 30 | 50 | 70 |
| **La Victoria** | 25 | 30 | 0 | 25 | 35 | 40 | 35 | 35 | 55 | 60 | 70 | 65 | 80 | 70 | 65 | 60 | 55 | 50 | 70 | 50 |
| **Lince** | 30 | 30 | 25 | 0 | 20 | 30 | 25 | 25 | 50 | 55 | 70 | 60 | 75 | 65 | 65 | 50 | 45 | 40 | 65 | 60 |
| **San Isidro** | 40 | 40 | 35 | 20 | 0 | 20 | 20 | 25 | 40 | 45 | 65 | 55 | 80 | 70 | 75 | 40 | 35 | 35 | 60 | 70 |
| **Miraflores** | 50 | 50 | 40 | 30 | 20 | 0 | 20 | 15 | 25 | 35 | 55 | 40 | 90 | 80 | 85 | 45 | 40 | 40 | 70 | 75 |
| **San Borja** | 45 | 45 | 35 | 25 | 20 | 20 | 0 | 20 | 35 | 30 | 50 | 45 | 85 | 75 | 80 | 55 | 50 | 45 | 75 | 60 |
| **Surquillo** | 45 | 45 | 35 | 25 | 25 | 15 | 20 | 0 | 20 | 30 | 55 | 35 | 90 | 80 | 85 | 50 | 45 | 45 | 70 | 70 |
| **Barranco** | 60 | 60 | 55 | 50 | 40 | 25 | 35 | 20 | 0 | 25 | 55 | 20 | 100 | 90 | 95 | 65 | 60 | 60 | 85 | 80 |
| **Surco** | 65 | 65 | 60 | 55 | 45 | 35 | 30 | 30 | 25 | 0 | 35 | 30 | 95 | 85 | 90 | 65 | 60 | 60 | 85 | 65 |
| **La Molina** | 80 | 85 | 70 | 70 | 65 | 55 | 50 | 55 | 55 | 35 | 0 | 55 | 110 | 100 | 100 | 90 | 85 | 85 | 105 | 45 |
| **Chorrillos** | 70 | 70 | 65 | 60 | 55 | 40 | 45 | 35 | 20 | 30 | 55 | 0 | 100 | 90 | 95 | 70 | 65 | 65 | 90 | 85 |
| **Los Olivos** | 75 | 65 | 80 | 75 | 80 | 90 | 85 | 90 | 100 | 95 | 110 | 100 | 0 | 25 | 30 | 55 | 60 | 60 | 45 | 95 |
| **San Martín de Porres** | 65 | 55 | 70 | 65 | 70 | 80 | 75 | 80 | 90 | 85 | 100 | 90 | 25 | 0 | 30 | 45 | 50 | 50 | 35 | 85 |
| **Independencia** | 55 | 50 | 65 | 65 | 75 | 85 | 80 | 85 | 95 | 90 | 100 | 95 | 30 | 30 | 0 | 65 | 60 | 55 | 55 | 90 |
| **San Miguel** | 50 | 40 | 60 | 50 | 40 | 45 | 55 | 50 | 65 | 65 | 90 | 70 | 55 | 45 | 65 | 0 | 15 | 20 | 25 | 80 |
| **Magdalena del Mar** | 45 | 35 | 55 | 45 | 35 | 40 | 50 | 45 | 60 | 60 | 85 | 65 | 60 | 50 | 60 | 15 | 0 | 15 | 35 | 80 |
| **Pueblo Libre** | 40 | 30 | 50 | 40 | 35 | 40 | 45 | 45 | 60 | 60 | 85 | 65 | 60 | 50 | 55 | 20 | 15 | 0 | 40 | 75 |
| **Callao** | 60 | 50 | 70 | 65 | 60 | 70 | 75 | 70 | 85 | 85 | 105 | 90 | 45 | 35 | 55 | 25 | 35 | 40 | 0 | 95 |
| **Ate** | 65 | 70 | 50 | 60 | 70 | 75 | 60 | 70 | 80 | 65 | 45 | 85 | 95 | 85 | 90 | 80 | 80 | 75 | 95 | 0 |

---

## Cómo usa el motor esta tabla

```javascript
// Pseudocódigo — ver implementación en district-times.service.js
function getTiempoTraslado(distritoOrigen, distritoDestino) {
  if (distritoOrigen === distritoDestino) return 15; // mismo distrito: 15 min (caminata interna)
  const tiempo = tablaDistritosTiempos[distritoOrigen][distritoDestino];
  return tiempo ?? 90; // fallback: 90 min si el distrito no está en tabla
}
```

**Mismo distrito**: se asume 15 minutos para traslado interno (caminar entre puntos del mismo distrito). No es 0 porque hay distancias internas reales.

**Distrito no en tabla**: fallback conservador de 90 minutos. Esto hace que el motor prefiera no poner trabajos de distritos desconocidos juntos, forzando al admin a decidir.

---

## Clusters sugeridos para el motor (heurística de agrupación)

El motor usa estos clusters como punto de partida para asignar técnicos a zonas coherentes:

```javascript
const CLUSTERS_LIMA = {
  zona_financiera: ['San Isidro', 'Miraflores', 'San Borja', 'Surquillo', 'Lince'],
  zona_sur:        ['Barranco', 'Chorrillos', 'Surco', 'La Molina'],
  zona_centro:     ['Cercado de Lima', 'Breña', 'La Victoria', 'La Victoria'],
  zona_norte:      ['Los Olivos', 'San Martín de Porres', 'Independencia'],
  zona_oeste:      ['San Miguel', 'Magdalena del Mar', 'Pueblo Libre', 'Callao'],
  zona_este:       ['Ate', 'Santa Anita'],
};
```

El motor intenta que cada técnico trabaje dentro de 1 o 2 clusters por día. Si hay más trabajos que técnicos, agrupa clusters adyacentes (por tiempo de traslado).

---

## Notas sobre Lima

- **Av. Javier Prado / Av. La Molina**: conecta San Isidro → San Borja → La Molina en un eje, pero el tráfico varía mucho.
- **Panamericana Sur**: conecta Miraflores → Surco → Chorrillos, tiempo muy variable según hora.
- **Metropolitano**: reduce tiempo en rutas norte-sur (Independencia → Miraflores ~40 min), pero requiere caminata.
- **Zona norte** (Los Olivos, SMP, Independencia): significativamente más lejos de la zona sur. Evitar asignar un técnico que empiece en Miraflores y termine en Los Olivos.
- Los tiempos de la tabla ya contemplan estas condiciones en el buffer del 30%.
