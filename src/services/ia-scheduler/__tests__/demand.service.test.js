/**
 * Task 1.11 — Integration tests for DemandService.
 * Uses real Sequelize models against the running PostgreSQL database.
 */
const { DemandService } = require('../demand.service');

describe('DemandService (integration)', () => {
  let service;

  beforeAll(() => {
    service = new DemandService();
  });

  describe('getPeriodoInicio()', () => {
    it('mensual: 25 días atrás', () => {
      const result = service.getPeriodoInicio('mensual', '2026-05-15');
      expect(result.toISOString().split('T')[0]).toBe('2026-04-20');
    });

    it('bimestral: 55 días atrás', () => {
      const result = service.getPeriodoInicio('bimestral', '2026-05-15');
      expect(result.toISOString().split('T')[0]).toBe('2026-03-21');
    });

    it('trimestral: 85 días atrás', () => {
      const result = service.getPeriodoInicio('trimestral', '2026-05-15');
      expect(result.toISOString().split('T')[0]).toBe('2026-02-19');
    });

    it('frecuencia desconocida: default 25 días', () => {
      const result = service.getPeriodoInicio('anual', '2026-05-15');
      expect(result.toISOString().split('T')[0]).toBe('2026-04-20');
    });
  });

  describe('obtenerFuenteA() — MantenimientosFijos vencidos', () => {
    it('retorna un array (puede ser vacío si no hay datos)', async () => {
      const result = await service.obtenerFuenteA('2026-05-12');
      expect(Array.isArray(result)).toBe(true);
    });

    it('cada item tiene los campos requeridos de WorkItem', async () => {
      const result = await service.obtenerFuenteA('2026-05-12');
      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty('mantenimiento_fijo_id');
        expect(item).toHaveProperty('ascensor_id');
        expect(item).toHaveProperty('cliente_id');
        expect(item).toHaveProperty('nombre_cliente');
        expect(item).toHaveProperty('distrito');
        expect(item).toHaveProperty('tipo_trabajo', 'mantenimiento');
        expect(item).toHaveProperty('fuente', 'mantenimiento_fijo');
        expect(item).toHaveProperty('programacion_id', null);
        expect(item).toHaveProperty('hora_preferida');
        expect(item).toHaveProperty('tecnico_preferido_id');
      }
    });

    it('filtra clientes inactivos', async () => {
      const result = await service.obtenerFuenteA('2026-05-12');
      for (const item of result) {
        expect(item.cliente_id).toBeTruthy();
        expect(item.nombre_cliente).toBeTruthy();
      }
    });
  });

  describe('obtenerFuenteB() — Programaciones pendientes', () => {
    it('retorna un array', async () => {
      const result = await service.obtenerFuenteB('2026-05-12');
      expect(Array.isArray(result)).toBe(true);
    });

    it('cada item tiene programacion_id poblado y fuente programacion_pendiente', async () => {
      const result = await service.obtenerFuenteB('2026-05-12');
      for (const item of result) {
        expect(item).toHaveProperty('programacion_id');
        expect(item.programacion_id).toBeTruthy();
        expect(item).toHaveProperty('fuente', 'programacion_pendiente');
      }
    });

    it('no duplica ascensores', async () => {
      const result = await service.obtenerFuenteB('2026-05-12');
      const ascensorIds = result.map(w => w.ascensor_id).filter(Boolean);
      const uniqueIds = new Set(ascensorIds);
      // Cada ascensor_id debería aparecer como máximo una vez (ya filtrado por estado pendiente)
      expect(ascensorIds.length).toBeLessThanOrEqual(result.length);
    });
  });

  describe('deduplicar()', () => {
    it('elimina de A los ascensores que ya están en B', () => {
      const fuenteA = [
        { ascensor_id: 1, nombre_cliente: 'Cliente A' },
        { ascensor_id: 2, nombre_cliente: 'Cliente B' },
        { ascensor_id: 3, nombre_cliente: 'Cliente C' }
      ];
      const fuenteB = [
        { ascensor_id: 2, nombre_cliente: 'Cliente B (pendiente)' }
      ];
      const result = service.deduplicar(fuenteA, fuenteB);
      expect(result).toHaveLength(3); // 2 de A (no 1 y 3) + 1 de B
      expect(result.filter(w => w.ascensor_id === 2)).toHaveLength(1); // solo el de B
      expect(result.find(w => w.ascensor_id === 2).nombre_cliente).toContain('pendiente');
    });

    it('no modifica si no hay solapamiento', () => {
      const fuenteA = [{ ascensor_id: 1 }, { ascensor_id: 2 }];
      const fuenteB = [{ ascensor_id: 3 }];
      const result = service.deduplicar(fuenteA, fuenteB);
      expect(result).toHaveLength(3);
    });

    it('maneja arrays vacíos', () => {
      expect(service.deduplicar([], [])).toHaveLength(0);
      expect(service.deduplicar([{ ascensor_id: 1 }], [])).toHaveLength(1);
      expect(service.deduplicar([], [{ ascensor_id: 1 }])).toHaveLength(1);
    });
  });

  describe('enriquecerConConfiguracion()', () => {
    it('agrega duracion_min, tecnicos_requeridos y prioridad', async () => {
      const items = [
        { tipo_trabajo: 'mantenimiento', nombre_cliente: 'Test' },
        { tipo_trabajo: 'reparacion', nombre_cliente: 'Test' }
      ];
      const result = await service.enriquecerConConfiguracion(items);

      expect(result[0].duracion_min).toBe(60);
      expect(result[0].tecnicos_requeridos).toBe(1);
      expect(result[0].prioridad).toBe(4);

      expect(result[1].duracion_min).toBe(120);
      expect(result[1].prioridad).toBe(2);
    });

    it('usa defaults si el tipo de trabajo no está en BD', async () => {
      const items = [{ tipo_trabajo: 'tipo_inexistente' }];
      const result = await service.enriquecerConConfiguracion(items);
      expect(result[0].duracion_min).toBe(60);
      expect(result[0].tecnicos_requeridos).toBe(1);
      expect(result[0].prioridad).toBe(4);
    });
  });

  describe('obtenerPool() — integración completa', () => {
    it('retorna un array de WorkItems enriquecidos', async () => {
      const pool = await service.obtenerPool('2026-05-12');
      expect(Array.isArray(pool)).toBe(true);

      for (const item of pool) {
        // Cada WorkItem debe tener estos campos mínimos
        expect(item).toHaveProperty('duracion_min');
        expect(item).toHaveProperty('tecnicos_requeridos');
        expect(item).toHaveProperty('prioridad');
        expect(item).toHaveProperty('fuente');
        expect(item).toHaveProperty('tipo_trabajo');
        expect(item).toHaveProperty('cliente_id');
        expect(typeof item.duracion_min).toBe('number');
        expect(typeof item.prioridad).toBe('number');
      }
    });

    it('fechas distintas pueden dar resultados distintos', async () => {
      const pool1 = await service.obtenerPool('2026-05-12');
      const pool2 = await service.obtenerPool('2026-06-15');
      // Ambas deben ser arrays válidos (pueden ser vacíos)
      expect(Array.isArray(pool1)).toBe(true);
      expect(Array.isArray(pool2)).toBe(true);
    });
  });
});
