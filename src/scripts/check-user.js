require('dotenv').config();
const { Administrador, Trabajador, Cliente } = require('../models');

async function checkUser() {
  try {
    let u = await Administrador.findOne({ where: { dni: '12345678' } });
    console.log('Admin:', u ? u.toJSON() : 'Not found');
    
    u = await Trabajador.findOne({ where: { dni: '12345678' } });
    console.log('Trabajador:', u ? u.toJSON() : 'Not found');
    
    u = await Cliente.findOne({ where: { dni: '12345678' } });
    console.log('Cliente:', u ? u.toJSON() : 'Not found');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUser();
