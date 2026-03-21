const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  Administrador,
  Cliente, 
  Ascensor, 
  Trabajador, 
  TareaMaestra, 
  Programacion, 
  OrdenTrabajo, 
  Informe,
  Sesion
} = require('../models');

const seedData = async () => {
  try {
    console.log('--- Iniciando Seeding de Data Realista con Encriptación ---');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Limpiar data previa
    await Sesion.destroy({ where: {} });
    await Informe.destroy({ where: {}, truncate: { cascade: true } });
    await OrdenTrabajo.destroy({ where: {}, truncate: { cascade: true } });
    await Programacion.destroy({ where: {}, truncate: { cascade: true } });
    await Ascensor.destroy({ where: {}, truncate: { cascade: true } });
    await Cliente.destroy({ where: {}, truncate: { cascade: true } });
    await Trabajador.destroy({ where: {}, truncate: { cascade: true } });
    await Administrador.destroy({ where: {}, truncate: { cascade: true } });
    await TareaMaestra.destroy({ where: {}, truncate: { cascade: true } });
    
    console.log('🗑️ Tablas limpiadas');

    // 2. Crear Administrador
    await Administrador.create({
      dni: '12345678',
      nombre: 'Admin',
      apellido: 'Principal',
      correo: 'admin@jmg.com',
      contrasena_hash: hashedPassword,
      activo: true
    });
    console.log('✅ Administrador creado (DNI: 12345678, Clave: admin123)');

    // 3. Crear Trabajadores (Técnicos)
    const tecnicosData = [
      {
        dni: '70214589',
        nombre: 'Carlos',
        apellido: 'Mendoza',
        edad: 34,
        correo: 'carlos.mendoza@jmg.com',
        telefono: '987654321',
        contrasena_hash: hashedPassword,
        especialidad: 'Mantenimiento Preventivo',
        estado_activo: true
      },
      {
        dni: '45871236',
        nombre: 'Luis',
        apellido: 'Quispe',
        edad: 28,
        correo: 'luis.quispe@jmg.com',
        telefono: '912345678',
        contrasena_hash: hashedPassword,
        especialidad: 'Reparaciones Electrónicas',
        estado_activo: true
      }
    ];
    const tecnicos = await Trabajador.bulkCreate(tecnicosData, { returning: true });
    console.log('✅ Técnicos creados');

    // 4. Crear Clientes
    const clientesData = [
      {
        tipo_cliente: 'Residencial',
        dni: '10702145891',
        ruc: '20601234567',
        nombre_comercial: 'Edificio Residencial Las Magnolias',
        ubicacion: 'Av. Larco 1234, Miraflores',
        latitud: -12.1221,
        longitud: -77.0298,
        ciudad: 'Lima',
        distrito: 'Miraflores',
        telefono: '014445566',
        contacto_nombre: 'Maria',
        contacto_apellido: 'Delgado',
        contacto_correo: 'administracion@magnolias.com',
        contra: hashedPassword
      },
      {
        tipo_cliente: 'Comercial',
        dni: '10458712362',
        ruc: '20104587123',
        nombre_comercial: 'Centro Comercial Plaza San Miguel',
        ubicacion: 'Av. La Marina 2000, San Miguel',
        latitud: -12.0765,
        longitud: -77.0854,
        ciudad: 'Lima',
        distrito: 'San Miguel',
        telefono: '016110000',
        contacto_nombre: 'Ricardo',
        contacto_apellido: 'Torres',
        contacto_correo: 'rtorres@plazasanmiguel.pe',
        contra: hashedPassword
      }
    ];
    const clientes = await Cliente.bulkCreate(clientesData, { returning: true });
    console.log('✅ Clientes creados');

    // 5. Crear Ascensores
    const ascensores = await Ascensor.bulkCreate([
      {
        cliente_id: clientes[0].cliente_id,
        tipo_equipo: 'Ascensor',
        marca: 'Otis',
        modelo: 'Gen2',
        numero_serie: 'OTIS-MAG-001',
        capacidad_kg: 630,
        capacidad_personas: 8,
        piso_cantidad: 12,
        fecha_ultimo_mantenimiento: '2024-02-15',
        estado: 'Operativo'
      },
      {
        cliente_id: clientes[0].cliente_id,
        tipo_equipo: 'Ascensor',
        marca: 'Otis',
        modelo: 'Gen2',
        numero_serie: 'OTIS-MAG-002',
        capacidad_kg: 450,
        capacidad_personas: 6,
        piso_cantidad: 12,
        fecha_ultimo_mantenimiento: '2024-02-10',
        estado: 'En Mantenimiento'
      },
      {
        cliente_id: clientes[1].cliente_id,
        tipo_equipo: 'Montacarga',
        marca: 'Schindler',
        modelo: '5500',
        numero_serie: 'SCH-PSM-010',
        capacidad_kg: 2000,
        capacidad_personas: 20,
        piso_cantidad: 4,
        fecha_ultimo_mantenimiento: '2024-01-20',
        estado: 'Operativo'
      }
    ], { returning: true });
    console.log('✅ Ascensores creados');

    // 6. Crear Tareas Maestras
    await TareaMaestra.bulkCreate([
      { tipo_equipo: 'Ascensor', descripcion_tarea: 'Limpieza de rieles y lubricación', categoria: 'Foso' },
      { tipo_equipo: 'Ascensor', descripcion_tarea: 'Ajuste de frenos y nivelación', categoria: 'Sala de Máquinas' }
    ]);
    console.log('✅ Tareas Maestras creadas');

    // 7. Crear Programación e Informe Histórico
    const haceSemana = new Date();
    haceSemana.setDate(haceSemana.getDate() - 7);

    const prog = await Programacion.create({
      trabajador_id: tecnicos[0].trabajador_id,
      cliente_id: clientes[0].cliente_id,
      ascensor_id: ascensores[0].ascensor_id,
      fecha_inicio: haceSemana,
      fecha_fin: haceSemana,
      hora_inicio: '09:00:00',
      hora_fin: '11:00:00',
      titulo: 'Mantenimiento Preventivo',
      estado: 'completado'
    });

    const orden = await OrdenTrabajo.create({
      programacion_id: prog.programacion_id,
      cliente_id: clientes[0].cliente_id,
      ascensor_id: ascensores[0].ascensor_id,
      hora_inicio: '09:15:00',
      hora_fin: '10:45:00',
      estado: 'completado',
      observaciones_generales: 'Trabajo exitoso'
    });

    await Informe.create({
      orden_id: orden.orden_id,
      trabajador_id: tecnicos[0].trabajador_id,
      cliente_id: clientes[0].cliente_id,
      ascensor_id: ascensores[0].ascensor_id,
      tipo_informe: 'preventivo',
      descripcion_trabajo: 'Mantenimiento completo',
      fecha_informe: haceSemana.toISOString().split('T')[0],
      hora_informe: '11:00:00'
    });
    console.log('✅ Data histórica creada');

    console.log('--- Seeding Finalizado ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en el Seeding:', err);
    process.exit(1);
  }
};

seedData();
