const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  Cliente, 
  Ascensor, 
  Trabajador, 
  Programacion
} = require('../models');

const seedBulkData = async () => {
  try {
    console.log('--- Iniciando Bulk Seeding de Data ---');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Nombres aleatorios
    const nombres = ['Juan', 'Pedro', 'Maria', 'Jose', 'Luis', 'Carlos', 'Ana', 'Lucia', 'Miguel', 'Jorge', 'Elena', 'Carmen', 'Raul', 'Fernando', 'Rosa'];
    const apellidos = ['Perez', 'Gomez', 'Rodriguez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Dias', 'Torres', 'Ramirez', 'Romero', 'Herrera'];
    
    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomDNI = () => Math.floor(10000000 + Math.random() * 90000000).toString();
    const randomRUC = () => '20' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const randomPhone = () => '9' + Math.floor(10000000 + Math.random() * 90000000).toString();

    // 1. Crear 15 Trabajadores más
    const tecnicosData = [];
    for(let i=0; i<15; i++) {
      tecnicosData.push({
        dni: randomDNI(),
        nombre: randomItem(nombres),
        apellido: randomItem(apellidos),
        edad: 25 + Math.floor(Math.random() * 25),
        correo: `tecnico${i}@jmg.com`,
        telefono: randomPhone(),
        contrasena_hash: hashedPassword,
        especialidad: Math.random() > 0.5 ? 'Técnico de Mantenimiento' : 'Técnico de Reparaciones',
        estado_activo: true
      });
    }
    const trabajadores = await Trabajador.bulkCreate(tecnicosData, { returning: true });
    console.log(`✅ ${trabajadores.length} Trabajadores creados`);

    // 2. Crear 20 Clientes más
    const clientesData = [];
    for(let i=0; i<20; i++) {
      clientesData.push({
        tipo_cliente: Math.random() > 0.5 ? 'Residencial' : 'Comercial',
        dni: randomRUC(),
        ruc: randomRUC(),
        nombre_comercial: `Edificio ${randomItem(apellidos)} ${i}`,
        ubicacion: `Av. Falsa ${100 + i}, Lima`,
        latitud: -12.0 + (Math.random() * -0.2),
        longitud: -77.0 + (Math.random() * -0.2),
        ciudad: 'Lima',
        distrito: 'Distrito ' + i,
        telefono: randomPhone(),
        contacto_nombre: randomItem(nombres),
        contacto_apellido: randomItem(apellidos),
        contacto_correo: `cliente${i}@edificio.com`,
        contra: hashedPassword
      });
    }
    const clientes = await Cliente.bulkCreate(clientesData, { returning: true });
    console.log(`✅ ${clientes.length} Clientes creados`);

    // 3. Crear 40 Ascensores (2 por cliente)
    const ascensoresData = [];
    for(let c of clientes) {
      ascensoresData.push({
        cliente_id: c.cliente_id,
        tipo_equipo: 'Ascensor',
        marca: randomItem(['Otis', 'Schindler', 'Thyssenkrupp', 'Kone', 'Mitsubishi']),
        modelo: 'Mod-' + Math.floor(Math.random() * 9999),
        numero_serie: 'SN-' + Math.floor(Math.random() * 999999),
        capacidad_kg: 450 + Math.floor(Math.random() * 600),
        capacidad_personas: 6 + Math.floor(Math.random() * 8),
        piso_cantidad: 5 + Math.floor(Math.random() * 20),
        fecha_ultimo_mantenimiento: '2024-02-01',
        estado: Math.random() > 0.8 ? 'En Mantenimiento' : 'Operativo'
      });
      ascensoresData.push({
        cliente_id: c.cliente_id,
        tipo_equipo: 'Ascensor',
        marca: randomItem(['Otis', 'Schindler', 'Thyssenkrupp', 'Kone', 'Mitsubishi']),
        modelo: 'Mod-' + Math.floor(Math.random() * 9999),
        numero_serie: 'SN-' + Math.floor(Math.random() * 999999),
        capacidad_kg: 450 + Math.floor(Math.random() * 600),
        capacidad_personas: 6 + Math.floor(Math.random() * 8),
        piso_cantidad: 5 + Math.floor(Math.random() * 20),
        fecha_ultimo_mantenimiento: '2024-02-01',
        estado: Math.random() > 0.8 ? 'En Mantenimiento' : 'Operativo'
      });
    }
    const ascensores = await Ascensor.bulkCreate(ascensoresData, { returning: true });
    console.log(`✅ ${ascensores.length} Ascensores creados`);

    // 4. Crear 60 Programaciones aleatorias
    const programacionesData = [];
    const tipos = ['mantenimiento', 'mantenimiento', 'mantenimiento', 'reparacion', 'inspeccion'];
    
    // Todos los trabajadores actuales
    const todosTrabajadores = await Trabajador.findAll();
    
    for(let i=0; i<60; i++) {
        const ascensor = randomItem(ascensores);
        const trabajador = randomItem(todosTrabajadores);
        const tipo = randomItem(tipos);
        
        let d = new Date();
        d.setDate(d.getDate() + (Math.floor(Math.random() * 30) - 15)); // +/- 15 dias
        
        const fechaStr = d.toISOString().split('T')[0];
        
        programacionesData.push({
            trabajador_id: trabajador.trabajador_id,
            cliente_id: ascensor.cliente_id,
            ascensor_id: ascensor.ascensor_id,
            fecha_inicio: fechaStr + ' 09:00:00',
            fecha_fin: fechaStr + ' 12:00:00',
            hora_inicio: '09:00:00',
            hora_fin: '12:00:00',
            titulo: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} Programado`,
            estado: d < new Date() ? 'completado' : 'pendiente',
            color: '#3788d8',
            descripcion: 'Trabajo generado automaticamente',
            tipo_trabajo: tipo
        });
    }
    
    const programaciones = await Programacion.bulkCreate(programacionesData, { returning: true });
    console.log(`✅ ${programaciones.length} Programaciones creadas`);

    console.log('--- Bulk Seeding Finalizado ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en el Seeding Bulk:', err);
    process.exit(1);
  }
};

seedBulkData();
