const { sequelize } = require('../config/database');
const seedDatabase = require('../seeders/initialData');
const { 
  Administrador, Trabajador, Cliente, Ascensor, Mantenimiento, 
  Tarea, Asignacion, Informe, Evidencia, RutaDiaria, 
  DetalleRuta, Notificacion, Auditoria, Sesion 
} = require('../models');

const initDB = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa.');

    console.log('💥 Eliminando y recreando tablas (force: true)...');
    await sequelize.sync({ force: true });
    console.log('✅ Tablas creadas correctamente.');

    console.log('🌱 Insertando datos de prueba (Seeders)...');
    await seedDatabase();
    console.log('✅ Datos insertados correctamente.');

    console.log('🚀 ¡Inicialización completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal durante la inicialización:', error);
    process.exit(1);
  }
};

initDB();
