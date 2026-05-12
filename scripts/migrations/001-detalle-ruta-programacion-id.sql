-- Migration 1: Add programacion_id and orden_parada to DetalleRuta
-- PostgreSQL syntax

ALTER TABLE "DetalleRuta"
  ADD COLUMN programacion_id INTEGER REFERENCES "Programaciones"(programacion_id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN orden_parada INTEGER;

CREATE INDEX idx_detalle_ruta_programacion ON "DetalleRuta" (programacion_id);
CREATE INDEX idx_detalle_ruta_orden ON "DetalleRuta" (ruta_id, orden_parada);
