/**
 * Task 1.4 — Unit tests for DistrictTimesService.
 * Mocks TablaDistritoLima model — no DB connection needed.
 */
const { DistrictTimesService } = require('../district-times.service');

// Mock the model
jest.mock('../../../models', () => ({
  TablaDistritoLima: {
    findAll: jest.fn()
  }
}));

const { TablaDistritoLima } = require('../../../models');

describe('DistrictTimesService', () => {
  let service;

  beforeEach(() => {
    service = new DistrictTimesService();
    TablaDistritoLima.findAll.mockResolvedValue([
      { distrito_origen: 'Miraflores', distrito_destino: 'San Isidro', tiempo_min: 20, activo: true },
      { distrito_origen: 'San Isidro', distrito_destino: 'Miraflores', tiempo_min: 20, activo: true },
      { distrito_origen: 'Miraflores', distrito_destino: 'Surco', tiempo_min: 35, activo: true },
      { distrito_origen: 'La Molina', distrito_destino: 'Ate', tiempo_min: 45, activo: true }
    ]);
  });

  describe('init()', () => {
    it('carga los pares de distritos en memoria', async () => {
      await service.init();
      expect(service._cache.size).toBe(4);
      expect(service.isLoaded).toBe(true);
    });

    it('solo almacena pares activos (Sequelize ya filtra por where)', async () => {
      // En producción, Sequelize filtra con where: { activo: true }, por lo que
      // solo devuelve registros activos. El mock simula ese comportamiento.
      TablaDistritoLima.findAll.mockResolvedValue([
        { distrito_origen: 'A', distrito_destino: 'B', tiempo_min: 10, activo: true }
      ]);
      await service.init();
      expect(service._cache.size).toBe(1);
    });

    it('maneja tabla vacía', async () => {
      TablaDistritoLima.findAll.mockResolvedValue([]);
      await service.init();
      expect(service._cache.size).toBe(0);
      expect(service.isLoaded).toBe(true);
    });
  });

  describe('getTiempo(origen, destino)', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('retorna 15 para el mismo distrito', () => {
      expect(service.getTiempo('Miraflores', 'Miraflores')).toBe(15);
      expect(service.getTiempo('San Isidro', 'San Isidro')).toBe(15);
    });

    it('retorna 15 para mismo distrito con espacios extra', () => {
      expect(service.getTiempo('  Miraflores  ', 'Miraflores')).toBe(15);
    });

    it('retorna el tiempo exacto para un par existente', () => {
      expect(service.getTiempo('Miraflores', 'San Isidro')).toBe(20);
      expect(service.getTiempo('San Isidro', 'Miraflores')).toBe(20);
    });

    it('retorna 90 para un par inexistente (fallback)', () => {
      expect(service.getTiempo('Miraflores', 'Callao')).toBe(90);
      expect(service.getTiempo('Ate', 'Miraflores')).toBe(90);
    });

    it('retorna 90 si origen o destino son nulos', () => {
      expect(service.getTiempo(null, 'Miraflores')).toBe(90);
      expect(service.getTiempo('Miraflores', null)).toBe(90);
      expect(service.getTiempo(null, null)).toBe(90);
    });

    it('retorna 90 si origen o destino son undefined o vacíos', () => {
      expect(service.getTiempo(undefined, 'Miraflores')).toBe(90);
      expect(service.getTiempo('Miraflores', '')).toBe(90);
    });

    it('es case-sensitive y hace trim', () => {
      expect(service.getTiempo(' Miraflores ', ' San Isidro ')).toBe(20);
    });
  });

  describe('isLoaded', () => {
    it('es false antes de init', () => {
      const s = new DistrictTimesService();
      expect(s.isLoaded).toBe(false);
    });

    it('es true después de init', async () => {
      const s = new DistrictTimesService();
      TablaDistritoLima.findAll.mockResolvedValue([]);
      await s.init();
      expect(s.isLoaded).toBe(true);
    });
  });
});
