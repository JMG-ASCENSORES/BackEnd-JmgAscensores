/**
 * Task 1.14 — Integration tests for WorkerService.
 * Uses real Sequelize models against the running PostgreSQL database.
 */
const { WorkerService } = require('../worker.service');

describe('WorkerService (integration)', () => {
  let service;

  beforeAll(() => {
    service = new WorkerService();
  });

  describe('obtenerTecnicos()', () => {
    it('retorna un array vacío si los IDs no existen', async () => {
      const result = await service.obtenerTecnicos([99999, 99998], '2026-05-12');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('retorna un array vacío si no se pasan IDs', async () => {
      const result = await service.obtenerTecnicos([], '2026-05-12');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('cada técnico retornado tiene la estructura esperada', async () => {
      // Buscar todos los técnicos activos
      const { Trabajador } = require('../../../models');
      const activos = await Trabajador.findAll({
        where: { estado_activo: true },
        limit: 5,
        attributes: ['trabajador_id']
      });

      if (activos.length === 0) {
        console.log('No hay técnicos activos en la BD — test omitido');
        return;
      }

      const ids = activos.map(t => t.trabajador_id);
      const result = await service.obtenerTecnicos(ids, '2026-05-12');

      expect(result.length).toBeGreaterThan(0);

      for (const t of result) {
        expect(t).toHaveProperty('trabajador_id');
        expect(t).toHaveProperty('nombre');
        expect(t).toHaveProperty('apellido');
        expect(t).toHaveProperty('especialidad');
        expect(t).toHaveProperty('carga_preexistente');
        expect(t.carga_preexistente).toHaveProperty('trabajos_confirmados');
        expect(t.carga_preexistente).toHaveProperty('minutos_comprometidos');
        expect(t.carga_preexistente).toHaveProperty('ultima_hora_fin');
        expect(typeof t.carga_preexistente.trabajos_confirmados).toBe('number');
        expect(typeof t.carga_preexistente.minutos_comprometidos).toBe('number');
        expect(t).toHaveProperty('trabajos_del_dia');
        expect(Array.isArray(t.trabajos_del_dia)).toBe(true);
        for (const job of t.trabajos_del_dia) {
          expect(job).toHaveProperty('hora_inicio');
          expect(job).toHaveProperty('hora_fin');
          expect(job).toHaveProperty('distrito');
        }
      }
    });

    it('respeta el filtro de técnicos inactivos', async () => {
      // Solo deben retornarse los IDs que están activos
      const { Trabajador } = require('../../../models');
      const inactivos = await Trabajador.findAll({
        where: { estado_activo: false },
        limit: 3,
        attributes: ['trabajador_id']
      });

      if (inactivos.length === 0) {
        console.log('No hay técnicos inactivos en la BD — test parcial');
        return;
      }

      const idsInactivos = inactivos.map(t => t.trabajador_id);
      const result = await service.obtenerTecnicos(idsInactivos, '2026-05-12');
      expect(result).toHaveLength(0);
    });
  });

  describe('_obtenerDatosDelDia()', () => {
    it('retorna Map vacíos para IDs sin programaciones', async () => {
      const fechaInicio = new Date('2026-05-12T00:00:00-05:00');
      const fechaFin = new Date('2026-05-12T23:59:59-05:00');
      const { cargaMap, trabajosMap } = await service._obtenerDatosDelDia([], fechaInicio, fechaFin);
      expect(cargaMap).toBeInstanceOf(Map);
      expect(cargaMap.size).toBe(0);
      expect(trabajosMap).toBeInstanceOf(Map);
      expect(trabajosMap.size).toBe(0);
    });
  });

  describe('_formatTime()', () => {
    it('formatea correctamente', () => {
      const fecha = new Date('2026-05-12T14:30:00-05:00');
      expect(service._formatTime(fecha)).toBe('14:30');
    });

    it('maneja medianoche', () => {
      const fecha = new Date('2026-05-12T00:00:00-05:00');
      expect(service._formatTime(fecha)).toBe('00:00');
    });
  });
});
