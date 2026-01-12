const { Administrador, Trabajador, Cliente } = require('./src/models');
const { connectDB } = require('./src/config/database');

async function checkUsers() {
  try {
    await connectDB();
    const adminCount = await Administrador.count();
    const trabajadorCount = await Trabajador.count();
    const clienteCount = await Cliente.count();
    
    console.log('--- Database User Sync Check ---');
    console.log(`Administradores: ${adminCount}`);
    console.log(`Trabajadores: ${trabajadorCount}`);
    console.log(`Clientes: ${clienteCount}`);
    
    if (adminCount > 0) {
      const admin = await Administrador.findOne({ where: { dni: '12345678' } });
      console.log(`Admin test (12345678) exists: ${!!admin}`);
      if (admin) {
        console.log(`Admin active: ${admin.activo}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
