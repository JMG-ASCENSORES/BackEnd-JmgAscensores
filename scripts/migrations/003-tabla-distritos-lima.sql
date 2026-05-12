-- Migration 3: Create TablaDistritosLima table
-- PostgreSQL syntax

CREATE TABLE "TablaDistritosLima" (
  id SERIAL PRIMARY KEY,
  distrito_origen VARCHAR(100) NOT NULL,
  distrito_destino VARCHAR(100) NOT NULL,
  tiempo_min INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (distrito_origen, distrito_destino)
);
