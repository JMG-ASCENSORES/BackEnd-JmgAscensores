-- Migration 2: Create ConfiguracionIA table
-- PostgreSQL syntax

CREATE TABLE "ConfiguracionIA" (
  config_id SERIAL PRIMARY KEY,
  tipo_trabajo VARCHAR(50) NOT NULL UNIQUE,
  duracion_min INTEGER NOT NULL,
  tecnicos_requeridos INTEGER NOT NULL DEFAULT 1,
  prioridad INTEGER NOT NULL,
  hora_inicio_default TIME NOT NULL DEFAULT '08:30:00',
  hora_fin_limite TIME NOT NULL DEFAULT '18:30:00',
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
