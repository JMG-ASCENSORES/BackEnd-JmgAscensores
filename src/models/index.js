const { sequelize } = require('../config/database');

const Administrador = require('./Administrador');
const Trabajador = require('./Trabajador');
const Cliente = require('./Cliente');
const Ascensor = require('./Ascensor');
const Mantenimiento = require('./Mantenimiento');
const Tarea = require('./Tarea');
const Asignacion = require('./Asignacion');
const Informe = require('./Informe');
const Evidencia = require('./Evidencia');
const RutaDiaria = require('./RutaDiaria');
const DetalleRuta = require('./DetalleRuta');
const Notificacion = require('./Notificacion');
const Auditoria = require('./Auditoria');
const Sesion = require('./Sesion');
const HistorialEstadoMantenimiento = require('./HistorialEstadoMantenimiento');
const Configuracion = require('./Configuracion');
const Programacion = require('./Programacion');

// ============================================
// ASSOCIATIONS
// ============================================

// 1. Clientes <-> Ascensores
Cliente.hasMany(Ascensor, { foreignKey: 'cliente_id' });
Ascensor.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// 2. Clientes <-> Mantenimientos
Cliente.hasMany(Mantenimiento, { foreignKey: 'cliente_id' });
Mantenimiento.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// 3. Ascensores <-> Mantenimientos
Ascensor.hasMany(Mantenimiento, { foreignKey: 'ascensor_id' });
Mantenimiento.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });

// 4. Mantenimientos <-> Tareas
Mantenimiento.hasMany(Tarea, { foreignKey: 'mantenimiento_id' });
Tarea.belongsTo(Mantenimiento, { foreignKey: 'mantenimiento_id' });

// 5. Asignaciones Relationships
// Trabajador <-> Asignacion
Trabajador.hasMany(Asignacion, { foreignKey: 'trabajador_id' });
Asignacion.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

// Admin <-> Asignacion
Administrador.hasMany(Asignacion, { foreignKey: 'admin_id' });
Asignacion.belongsTo(Administrador, { foreignKey: 'admin_id' });

// Cliente <-> Asignacion
Cliente.hasMany(Asignacion, { foreignKey: 'cliente_id' });
Asignacion.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// 6. Informes Relationships
// Asignacion <-> Informe
Asignacion.hasMany(Informe, { foreignKey: 'asignacion_id' });
Informe.belongsTo(Asignacion, { foreignKey: 'asignacion_id' });

// Trabajador <-> Informe
Trabajador.hasMany(Informe, { foreignKey: 'trabajador_id' });
Informe.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });

// Cliente <-> Informe
Cliente.hasMany(Informe, { foreignKey: 'cliente_id' });
Informe.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// Ascensor <-> Informe
Ascensor.hasMany(Informe, { foreignKey: 'ascensor_id' });
Informe.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });

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

// 13. Historial Mantenimiento
Mantenimiento.hasMany(HistorialEstadoMantenimiento, { foreignKey: 'mantenimiento_id' });
HistorialEstadoMantenimiento.belongsTo(Mantenimiento, { foreignKey: 'mantenimiento_id' });

Administrador.hasMany(HistorialEstadoMantenimiento, { foreignKey: 'cambio_realizado_por' });
HistorialEstadoMantenimiento.belongsTo(Administrador, { foreignKey: 'cambio_realizado_por' });

// 14. Programaciones
Programacion.belongsTo(Trabajador, { foreignKey: 'trabajador_id' });
Trabajador.hasMany(Programacion, { foreignKey: 'trabajador_id' });

Programacion.belongsTo(Cliente, { foreignKey: 'cliente_id' });
Cliente.hasMany(Programacion, { foreignKey: 'cliente_id' });

module.exports = {
  sequelize,
  Administrador,
  Trabajador,
  Cliente,
  Ascensor,
  Mantenimiento,
  Tarea,
  Asignacion,
  Informe,
  Evidencia,
  RutaDiaria,
  DetalleRuta,
  Notificacion,
  Auditoria,
  Sesion,
  HistorialEstadoMantenimiento,
  Configuracion,
  Programacion
};
