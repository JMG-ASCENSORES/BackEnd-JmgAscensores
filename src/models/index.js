const { sequelize } = require('../config/database');

const Administrador = require('./Administrador');
const Trabajador = require('./Trabajador');
const Cliente = require('./Cliente');
const Ascensor = require('./Ascensor');

const Informe = require('./Informe');
const Evidencia = require('./Evidencia');
const RutaDiaria = require('./RutaDiaria');
const DetalleRuta = require('./DetalleRuta');
const Notificacion = require('./Notificacion');
const Auditoria = require('./Auditoria');
const Sesion = require('./Sesion');
const Configuracion = require('./Configuracion');
const Programacion = require('./Programacion');

// Nuevos modelos
const TareaMaestra = require('./TareaMaestra');
const OrdenTrabajo = require('./OrdenTrabajo');
const DetalleOrden = require('./DetalleOrden');
const Firma = require('./Firma');

// ============================================
// ASSOCIATIONS
// ============================================

// 1. Clientes <-> Ascensores
Cliente.hasMany(Ascensor, { foreignKey: 'cliente_id' });
Ascensor.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// 2. Clientes <-> (Sin Mantenimientos - usar Programaciones)

// 6. OrdenTrabajo Relationships
// Programacion <-> OrdenTrabajo
Programacion.hasOne(OrdenTrabajo, { foreignKey: 'programacion_id' });
OrdenTrabajo.belongsTo(Programacion, { foreignKey: 'programacion_id' });

// OrdenTrabajo <-> Cliente
Cliente.hasMany(OrdenTrabajo, { foreignKey: 'cliente_id' });
OrdenTrabajo.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// OrdenTrabajo <-> Ascensor
Ascensor.hasMany(OrdenTrabajo, { foreignKey: 'ascensor_id' });
OrdenTrabajo.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });

// OrdenTrabajo <-> DetalleOrden
OrdenTrabajo.hasMany(DetalleOrden, { foreignKey: 'orden_id', as: 'detalles' });
DetalleOrden.belongsTo(OrdenTrabajo, { foreignKey: 'orden_id' });

// TareaMaestra <-> DetalleOrden
TareaMaestra.hasMany(DetalleOrden, { foreignKey: 'tarea_maestra_id' });
DetalleOrden.belongsTo(TareaMaestra, { foreignKey: 'tarea_maestra_id' });

// OrdenTrabajo <-> Informe
OrdenTrabajo.hasOne(Informe, { foreignKey: 'orden_id' });
Informe.belongsTo(OrdenTrabajo, { foreignKey: 'orden_id' });

// Trabajador <-> Informe
Trabajador.hasMany(Informe, { foreignKey: 'trabajador_id' });
Informe.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

// Cliente <-> Informe
Cliente.hasMany(Informe, { foreignKey: 'cliente_id' });
Informe.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// Ascensor <-> Informe
Ascensor.hasMany(Informe, { foreignKey: 'ascensor_id' });
Informe.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });

// Firma <-> Informe
Firma.hasMany(Informe, { foreignKey: 'firma_tecnico_id', as: 'InformesTecnico' });
Informe.belongsTo(Firma, { foreignKey: 'firma_tecnico_id', as: 'FirmaTecnico' });

Firma.hasMany(Informe, { foreignKey: 'firma_cliente_id', as: 'InformesCliente' });
Informe.belongsTo(Firma, { foreignKey: 'firma_cliente_id', as: 'FirmaCliente' });

// Firma <-> Trabajador
Firma.hasMany(Trabajador, { foreignKey: 'firma_defecto_id', as: 'TrabajadoresConFirma' });
Trabajador.belongsTo(Firma, { foreignKey: 'firma_defecto_id', as: 'FirmaPredeterminada' });

// 7. Evidencias
Informe.hasMany(Evidencia, { foreignKey: 'informe_id' });
Evidencia.belongsTo(Informe, { foreignKey: 'informe_id' });

// 8. Rutas Diarias
Trabajador.hasMany(RutaDiaria, { foreignKey: 'trabajador_id' });
RutaDiaria.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

// 9. Detalle Ruta
RutaDiaria.hasMany(DetalleRuta, { foreignKey: 'ruta_id' });
DetalleRuta.belongsTo(RutaDiaria, { foreignKey: 'ruta_id' });

Cliente.hasMany(DetalleRuta, { foreignKey: 'cliente_id' });
DetalleRuta.belongsTo(Cliente, { foreignKey: 'cliente_id' });

Ascensor.hasMany(DetalleRuta, { foreignKey: 'ascensor_id' });
DetalleRuta.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });

// 10. Notificaciones
Trabajador.hasMany(Notificacion, { foreignKey: 'trabajador_id' });
Notificacion.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

Cliente.hasMany(Notificacion, { foreignKey: 'cliente_id' });
Notificacion.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// 11. Auditoria
Administrador.hasMany(Auditoria, { foreignKey: 'admin_id' });
Auditoria.belongsTo(Administrador, { foreignKey: 'admin_id' });

Trabajador.hasMany(Auditoria, { foreignKey: 'trabajador_id' });
Auditoria.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

// 12. Sesiones
Administrador.hasMany(Sesion, { foreignKey: 'admin_id' });
Sesion.belongsTo(Administrador, { foreignKey: 'admin_id' });

Trabajador.hasMany(Sesion, { foreignKey: 'trabajador_id' });
Sesion.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

// 14. Programaciones — 4 técnicos (columns: trabajador_id, tecnico2_id, tecnico3_id, tecnico4_id)
Programacion.belongsTo(Trabajador, { foreignKey: 'trabajador_id', as: 'Tecnico1' });
Programacion.belongsTo(Trabajador, { foreignKey: 'tecnico2_id',   as: 'Tecnico2' });
Programacion.belongsTo(Trabajador, { foreignKey: 'tecnico3_id',   as: 'Tecnico3' });
Programacion.belongsTo(Trabajador, { foreignKey: 'tecnico4_id',   as: 'Tecnico4' });
Trabajador.hasMany(Programacion, { foreignKey: 'trabajador_id', as: 'ProgramacionesPrimarias' });

Programacion.belongsTo(Cliente, { foreignKey: 'cliente_id' });
Cliente.hasMany(Programacion, { foreignKey: 'cliente_id' });

Programacion.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });
Ascensor.hasMany(Programacion, { foreignKey: 'ascensor_id' });

module.exports = {
  sequelize,
  Administrador,
  Trabajador,
  Cliente,
  Ascensor,
  Informe,
  Evidencia,
  RutaDiaria,
  DetalleRuta,
  Notificacion,
  Auditoria,
  Sesion,
  Configuracion,
  Programacion,
  TareaMaestra,
  OrdenTrabajo,
  DetalleOrden,
  Firma
};
