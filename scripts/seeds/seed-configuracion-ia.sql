-- Seed: ConfiguracionIA initial values

INSERT INTO "ConfiguracionIA" (tipo_trabajo, duracion_min, tecnicos_requeridos, prioridad, fecha_actualizacion) VALUES
  ('emergencia', 90, 1, 1, NOW()),
  ('reparacion', 120, 1, 2, NOW()),
  ('inspeccion', 45, 1, 3, NOW()),
  ('mantenimiento', 60, 1, 4, NOW());
