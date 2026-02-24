const { sequelize } = require('../config/database');

/**
 * Script para insertar programaciones de ejemplo directamente en la base de datos
 */
async function insertarProgramaciones() {
  try {
    console.log('🔍 Consultando datos existentes...\n');

    // 1. Consultar trabajadores
    const [trabajadores] = await sequelize.query(`
      SELECT trabajador_id, nombre, apellido, especialidad 
      FROM "Trabajadores" 
      WHERE estado_activo = true 
      LIMIT 10
    `);
    
    console.log('👷 Trabajadores encontrados:', trabajadores.length);

    // 2. Consultar clientes
    const [clientes] = await sequelize.query(`
      SELECT cliente_id, contacto_nombre, contacto_apellido, ubicacion 
      FROM "Clientes" 
      LIMIT 10
    `);
    
    console.log('🏢 Clientes encontrados:', clientes.length);

    // 3. Consultar ascensores
    const [ascensores] = await sequelize.query(`
      SELECT ascensor_id, cliente_id, tipo_equipo, marca, modelo 
      FROM "Ascensores" 
      LIMIT 10
    `);
    
    console.log('🏗️ Ascensores encontrados:', ascensores.length);

    if (trabajadores.length === 0 || clientes.length === 0 || ascensores.length === 0) {
      console.log('\n⚠️  No hay suficientes datos para generar programaciones.');
      process.exit(1);
    }

    // 4. Insertar programaciones
    console.log('\n📝 Insertando programaciones en la base de datos...\n');

    const tipos = ['mantenimiento', 'reparacion', 'inspeccion', 'emergencia'];
    const colores = {
      mantenimiento: '#3788d8',
      reparacion: '#ffc107',
      inspeccion: '#28a745',
      emergencia: '#dc3545'
    };

    const fechas = [
      { dia: 15, hora_inicio: '08:00', hora_fin: '11:00' },
      { dia: 17, hora_inicio: '09:00', hora_fin: '12:00' },
      { dia: 18, hora_inicio: '14:00', hora_fin: '17:00' },
      { dia: 20, hora_inicio: '08:30', hora_fin: '10:30' },
      { dia: 21, hora_inicio: '10:00', hora_fin: '13:00' },
      { dia: 24, hora_inicio: '08:00', hora_fin: '12:00' },
      { dia: 25, hora_inicio: '15:00', hora_fin: '18:00' },
      { dia: 26, hora_inicio: '09:00', hora_fin: '11:00' },
      { dia: 27, hora_inicio: '13:00', hora_fin: '16:00' },
      { dia: 28, hora_inicio: '08:00', hora_fin: '10:00' }
    ];

    let insertados = 0;

    for (let i = 0; i < Math.min(10, fechas.length); i++) {
      const trabajador = trabajadores[i % trabajadores.length];
      const cliente = clientes[i % clientes.length];
      const ascensor = ascensores[i % ascensores.length];
      const tipo = tipos[i % tipos.length];
      const fecha = fechas[i];

      const nombreCliente = `${cliente.contacto_nombre} ${cliente.contacto_apellido}`.trim() || cliente.ubicacion;
      const titulo = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - ${nombreCliente}`;
      const fecha_inicio = `2026-02-${fecha.dia.toString().padStart(2, '0')} ${fecha.hora_inicio}:00`;
      const fecha_fin = `2026-02-${fecha.dia.toString().padStart(2, '0')} ${fecha.hora_fin}:00`;
      const descripcion = `Trabajo programado para ${ascensor.tipo_equipo} ${ascensor.marca} - Técnico: ${trabajador.nombre} ${trabajador.apellido}`;

      await sequelize.query(`
        INSERT INTO public."Programaciones" 
        (titulo, fecha_inicio, fecha_fin, trabajador_id, cliente_id, ascensor_id, tipo_trabajo, estado, color, descripcion, fecha_creacion, fecha_actualizacion)
        VALUES 
        (:titulo, :fecha_inicio, :fecha_fin, :trabajador_id, :cliente_id, :ascensor_id, :tipo_trabajo, 'pendiente', :color, :descripcion, NOW(), NOW())
      `, {
        replacements: {
          titulo,
          fecha_inicio,
          fecha_fin,
          trabajador_id: trabajador.trabajador_id,
          cliente_id: cliente.cliente_id,
          ascensor_id: ascensor.ascensor_id,
          tipo_trabajo: tipo,
          color: colores[tipo],
          descripcion
        }
      });

      insertados++;
      console.log(`✅ ${i + 1}. ${titulo}`);
    }

    console.log(`\n✅ ${insertados} programaciones insertadas exitosamente!`);
    console.log('\n📊 Verificando datos insertados...\n');

    // Verificar
    const [programaciones] = await sequelize.query(`
      SELECT p.programacion_id, p.titulo, p.fecha_inicio, p.tipo_trabajo, p.estado,
             t.nombre as trabajador_nombre, t.apellido as trabajador_apellido
      FROM "Programaciones" p
      LEFT JOIN "Trabajadores" t ON p.trabajador_id = t.trabajador_id
      ORDER BY p.fecha_inicio
      LIMIT 10
    `);

    console.table(programaciones);
    
    console.log('\n🎉 ¡Listo! Ahora puedes ver las programaciones en tu frontend.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run script
insertarProgramaciones();
