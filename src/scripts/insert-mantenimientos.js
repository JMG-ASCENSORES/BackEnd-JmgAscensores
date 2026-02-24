const { sequelize } = require('../config/database');

/**
 * Script para insertar mantenimientos de ejemplo
 * usando datos reales de clientes, trabajadores y ascensores
 */
async function insertMantenimientos() {
  try {
    console.log('🔍 Consultando datos existentes...\n');

    // 1. Consultar trabajadores
    const [trabajadores] = await sequelize.query(`
      SELECT trabajador_id, nombre, apellido, especialidad 
      FROM "Trabajadores" 
      WHERE estado_activo = true 
      LIMIT 10
    `);
    
    // 2. Consultar clientes
    const [clientes] = await sequelize.query(`
      SELECT cliente_id, contacto_nombre, contacto_apellido, ubicacion 
      FROM "Clientes" 
      LIMIT 10
    `);

    // 3. Consultar ascensores
    const [ascensores] = await sequelize.query(`
      SELECT ascensor_id, cliente_id, tipo_equipo, marca, modelo 
      FROM "Ascensores" 
      LIMIT 10
    `);

    if (trabajadores.length === 0 || clientes.length === 0 || ascensores.length === 0) {
      console.log('\n⚠️  No hay suficientes datos. Se necesitan trabajadores, clientes y ascensores.');
      process.exit(1);
    }

    console.log(`\n📝 Generando mantenimientos con:`);
    console.log(`- ${trabajadores.length} trabajadores`);
    console.log(`- ${clientes.length} clientes`);
    console.log(`- ${ascensores.length} ascensores`);

    const tipos = ['mantenimiento', 'reparacion', 'inspeccion', 'emergencia'];
    const colores = {
      mantenimiento: '#3788d8', // Azul
      reparacion: '#ffc107',    // Amarillo
      inspeccion: '#28a745',    // Verde
      emergencia: '#dc3545'     // Rojo
    };

    // Fechas para febrero y marzo 2026
    const fechas = [
      { dia: 15, hora: '08:00', duracion: 3 },
      { dia: 16, hora: '14:00', duracion: 2 },
      { dia: 18, hora: '09:00', duracion: 4 },
      { dia: 20, hora: '10:00', duracion: 3 },
      { dia: 22, hora: '08:30', duracion: 2 },
      { dia: 24, hora: '15:00', duracion: 3 },
      { dia: 25, hora: '11:00', duracion: 2 },
      { dia: 27, hora: '09:30', duracion: 4 },
      { dia: 28, hora: '13:00', duracion: 3 },
      { dia: 1, mes: '03', hora: '10:00', duracion: 2 } // 1 de Marzo
    ];

    let insertados = 0;

    for (let i = 0; i < Math.min(10, fechas.length); i++) {
      const trabajador = trabajadores[i % trabajadores.length];
      const cliente = clientes[i % clientes.length];
      const ascensor = ascensores[i % ascensores.length];
      const tipo = tipos[i % tipos.length];
      const fechaInfo = fechas[i];
      const mes = fechaInfo.mes || '02';

      const nombreCliente = `${cliente.contacto_nombre} ${cliente.contacto_apellido}`.trim() || 'Cliente General';
      const titulo = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - ${nombreCliente}`;
      
      const fechaProgramada = `2026-${mes}-${fechaInfo.dia.toString().padStart(2, '0')}`;
      const fechaInicio = `${fechaProgramada} ${fechaInfo.hora}:00`;
      
      // Calcular hora fin
      const horaInicioParts = fechaInfo.hora.split(':');
      let horaFinH = parseInt(horaInicioParts[0]) + fechaInfo.duracion;
      const horaFin = `${horaFinH.toString().padStart(2, '0')}:${horaInicioParts[1]}:00`;
      const fechaFin = `${fechaProgramada} ${horaFin}`;
      
      const descripcion = `Mantenimiento asignado a ${trabajador.nombre} para equipo ${ascensor.marca}`;

      await sequelize.query(`
        INSERT INTO "Mantenimientos" 
        (
          cliente_id, ascensor_id, trabajador_id, 
          titulo, tipo_trabajo, estado, color,
          fecha_programada, fecha_inicio, fecha_fin, 
          hora_estimada_inicio, hora_estimada_fin,
          descripcion, observaciones, 
          fecha_creacion, fecha_actualizacion
        )
        VALUES 
        (
          :cliente_id, :ascensor_id, :trabajador_id,
          :titulo, :tipo_trabajo, 'pendiente', :color,
          :fecha_programada, :fecha_inicio, :fecha_fin,
          :hora_estimada_inicio, :hora_estimada_fin,
          :descripcion, :observaciones,
          NOW(), NOW()
        )
      `, {
        replacements: {
          cliente_id: cliente.cliente_id,
          ascensor_id: ascensor.ascensor_id,
          trabajador_id: trabajador.trabajador_id,
          titulo,
          tipo_trabajo: tipo,
          color: colores[tipo],
          fecha_programada: fechaProgramada,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          hora_estimada_inicio: `${fechaInfo.hora}:00`,
          hora_estimada_fin: horaFin,
          descripcion,
          observaciones: 'Generado automáticamente'
        }
      });
      
      insertados++;
      console.log(`✅ Creado: ${titulo} (${fechaInicio})`);
    }

    console.log(`\n🎉 Exitosamente insertados ${insertados} mantenimientos.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al insertar datos:', error);
    process.exit(1);
  }
}

insertMantenimientos();
