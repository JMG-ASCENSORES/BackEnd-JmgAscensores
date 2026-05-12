const { TablaDistritoLima } = require('../../models');

/**
 * Servicio de tiempos de traslado entre distritos de Lima.
 * Carga la tabla TablaDistritosLima en memoria al inicializar y expone
 * un método getTiempo(origen, destino) con los siguientes valores:
 *   - Mismo distrito: 15 minutos
 *   - Par en tabla:    tiempo_min de la BD
 *   - Par no en tabla: 90 minutos (fallback conservador)
 */
class DistrictTimesService {
  constructor() {
    /** @type {Map<string, number>} clave "${origen}::${destino}" → minutos */
    this._cache = new Map();
    this._loaded = false;
  }

  /**
   * Carga todos los pares activos de TablaDistritosLima en memoria.
   * Debe llamarse una vez al iniciar la aplicación.
   */
  async init() {
    const rows = await TablaDistritoLima.findAll({ where: { activo: true } });
    for (const row of rows) {
      const key = `${row.distrito_origen}::${row.distrito_destino}`;
      this._cache.set(key, row.tiempo_min);
    }
    this._loaded = true;
    console.log(`[DistrictTimes] ${this._cache.size} pares de distritos cargados en memoria.`);
  }

  /**
   * Retorna el tiempo estimado de traslado (minutos) entre dos distritos.
   * @param {string} origen - nombre del distrito de origen
   * @param {string} destino - nombre del distrito de destino
   * @returns {number} minutos estimados de traslado
   */
  getTiempo(origen, destino) {
    if (!origen || !destino) return 90;

    const origenNorm = origen.trim();
    const destinoNorm = destino.trim();

    // Mismo distrito: 15 minutos (traslado interno)
    if (origenNorm === destinoNorm) return 15;

    // Buscar en caché
    const key = `${origenNorm}::${destinoNorm}`;
    if (this._cache.has(key)) return this._cache.get(key);

    // Fallback: 90 minutos
    return 90;
  }

  /**
   * Retorna true si los datos ya fueron cargados.
   */
  get isLoaded() {
    return this._loaded;
  }
}

module.exports = { DistrictTimesService };
