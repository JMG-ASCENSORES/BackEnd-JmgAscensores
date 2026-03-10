const { sequelize, Programacion, Trabajador, Cliente, Ascensor } = require('./src/models');

const generateRandomSchedule = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión a la base de datos establecida.');

        const trabajadores = await Trabajador.findAll({ attributes: ['trabajador_id'] });
        const clientes = await Cliente.findAll({ attributes: ['cliente_id'], include: [Ascensor] });
        
        if (!trabajadores.length || !clientes.length) {
            console.log('No hay suficientes trabajadores o clientes en la base de datos para generar programaciones.');
            process.exit(1);
        }

        const tiposTrabajo = ['mantenimiento', 'reparacion', 'inspeccion', 'emergencia'];
        const colores = {
            'mantenimiento': '#3788d8', // Azul
            'reparacion': '#f97316', // Naranja
            'inspeccion': '#22c55e', // Verde
            'emergencia': '#ef4444' // Rojo
        };

        const titulosBase = [
            'Revisión mensual preventiva',
            'Sustitución de botoneras',
            'Calibración de frenos',
            'Inspección anual certificada',
            'Emergencia por atrapamiento',
            'Cambio de poleas',
            'Lubricación de guías',
            'Revisión de cableado eléctrico',
            'Mantenimiento general programado',
            'Ajuste de puertas automáticas'
        ];

        const programacionesToCreate = [];
        
        // Generate for the period of today - 10 days up to today + 40 days
        const currentDate = new Date();
        
        console.log('Generando data dummy de programaciones...');

        for (let idx = 0; idx < 120; idx++) {
            // Pick random client and one of their elevators if they have one
            const randomClient = clientes[Math.floor(Math.random() * clientes.length)];
            let randomAscensorId = null;
            if (randomClient.Ascensors && randomClient.Ascensors.length > 0) {
                const randomAscensor = randomClient.Ascensors[Math.floor(Math.random() * randomClient.Ascensors.length)];
                randomAscensorId = randomAscensor.ascensor_id;
            }

            // Pick 1 to 4 random unique technicians
            const numTechs = Math.floor(Math.random() * 3) + 1; // 1 to 3 techs mostly
            const techsForJob = [];
            const shuffledTechs = trabajadores.sort(() => 0.5 - Math.random());
            for (let i = 0; i < numTechs; i++) {
                if(shuffledTechs[i]) {
                    techsForJob.push(shuffledTechs[i].trabajador_id);
                }
            }

            // Random Day between today-10 and today+40
            const dayOffset = Math.floor(Math.random() * 50) - 10; 
            const eventDate = new Date(currentDate);
            eventDate.setDate(currentDate.getDate() + dayOffset);

            // Random Start Hour between 08:00 and 16:00
            const startHour = Math.floor(Math.random() * 9) + 8;
            eventDate.setHours(startHour, 0, 0, 0);

            // Random End Hour (1 to 4 hours later)
            const duration = Math.floor(Math.random() * 4) + 1;
            const endDate = new Date(eventDate);
            endDate.setHours(startHour + duration, 0, 0, 0);

            const ISOStart = eventDate.toISOString().split('.')[0]; // remove ms
            const ISOEnd = endDate.toISOString().split('.')[0];

            const tipo = tiposTrabajo[Math.floor(Math.random() * tiposTrabajo.length)];
            const titulo = titulosBase[Math.floor(Math.random() * titulosBase.length)];

            programacionesToCreate.push({
                titulo: titulo,
                fecha_inicio: ISOStart,
                fecha_fin: ISOEnd,
                tipo_trabajo: tipo,
                color: colores[tipo],
                descripcion: 'Revisar según el historial técnico. Traer herramientas de precisión. Reportarse con conserjería al llegar.',
                estado: dayOffset < 0 ? 'completado' : 'pendiente',
                cliente_id: randomClient.cliente_id,
                ascensor_id: randomAscensorId,
                trabajador_id: techsForJob[0] || null,
                tecnico2_id: techsForJob[1] || null,
                tecnico3_id: techsForJob[2] || null,
                tecnico4_id: techsForJob[3] || null
            });
        }

        await Programacion.bulkCreate(programacionesToCreate);
        console.log(`✅ ¡Se han insertado ${programacionesToCreate.length} programaciones con éxito!`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error general insertando data: ', err);
        process.exit(1);
    }
}

generateRandomSchedule();
