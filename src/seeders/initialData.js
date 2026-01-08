const { Cliente, Ascensor, Trabajador, Administrador } = require('../models');

const seedDatabase = async () => {
  try {
    // Check if data already exists
    const clientCount = await Cliente.count();
    if (clientCount > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    console.log('Seeding database...');

    // 1. Create a sample Admin
    await Administrador.create({
      dni: '12345678',
      nombre: 'Admin',
      apellido: 'Principal',
      correo: 'admin@jmg.com',
      contrasena_hash: 'hashed_password_here', // In a real app, use bcrypt
    });

    // 2. Create a sample Trabajador
    await Trabajador.create({
      dni: '87654321',
      nombre: 'Juan',
      apellido: 'Perez',
      correo: 'juan.perez@jmg.com',
      contrasena_hash: 'hashed_password_here',
      especialidad: 'Mantenimiento preventivo',
    });

    // 3. Create a sample Cliente
    const cliente = await Cliente.create({
      razon_social: 'Edificio Los Alamos',
      tipo_cliente: 'edificio',
      ubicacion: 'Av. Las Gardenias 456, Lima',
      correo_contacto: 'contacto@losalamos.com',
      telefono: '999888777'
    });

    // 4. Create a sample Ascensor for that client
    await Ascensor.create({
      cliente_id: cliente.cliente_id,
      tipo_equipo: 'ascensor',
      marca: 'Schindler',
      modelo: 'S3300',
      numero_serie: 'SN-12345',
      estado: 'activo'
    });

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seedDatabase;
