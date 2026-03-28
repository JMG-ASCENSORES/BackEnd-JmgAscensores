const { sequelize, Programacion, Trabajador, Cliente, Ascensor } = require('../../src/models');

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

        // ── Limpiar programaciones existentes ──
        //const deleted = await Programacion.destroy({ where: {} });
        //console.log(`🗑️  Se eliminaron ${deleted} programaciones existentes.`);

        const programacionesToCreate = [];
        
        // ── Rango: 1 de junio 2026 → 31 de diciembre 2026 ──
        const rangeStart = new Date(2026, 1, 1);  // Año, mes (0-indexed), día (Inicial)
        const rangeEnd   = new Date(2026, 12, 31);  // Año, mes (0-indexed), día (Final)
        const totalDays  = Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24));
        const today      = new Date();

        console.log(`Generando data dummy de programaciones (${rangeStart.toLocaleDateString()} → ${rangeEnd.toLocaleDateString()})...`);

        for (let idx = 0; idx < 200; idx++) {
            // Pick random client and one of their elevators if they have one
            const randomClient = clientes[Math.floor(Math.random() * clientes.length)];
            let randomAscensorId = null;
            if (randomClient.Ascensors && randomClient.Ascensors.length > 0) {
                const randomAscensor = randomClient.Ascensors[Math.floor(Math.random() * randomClient.Ascensors.length)];
                randomAscensorId = randomAscensor.ascensor_id;
            }

            // Pick 1 to 3 random unique technicians
            const numTechs = Math.floor(Math.random() * 3) + 1;
            const techsForJob = [];
            const shuffledTechs = [...trabajadores].sort(() => 0.5 - Math.random());
            for (let i = 0; i < numTechs; i++) {
                if(shuffledTechs[i]) {
                    techsForJob.push(shuffledTechs[i].trabajador_id);
                }
            }

            // Random day within the march–july range
            const dayOffset = Math.floor(Math.random() * totalDays);
            const eventDate = new Date(rangeStart);
            eventDate.setDate(rangeStart.getDate() + dayOffset);

            // Random Start Hour between 08:00 and 17:00 (jornada laboral)
            const startHour = Math.floor(Math.random() * 9) + 8;  // 8..16
            const startMin  = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
            eventDate.setHours(startHour, startMin, 0, 0);

            // Random duration (1 to 4 hours), capped so end ≤ 17:00
            const maxDuration = Math.min(4, 17 - startHour);
            const duration = Math.max(1, Math.floor(Math.random() * maxDuration) + 1);
            const endDate = new Date(eventDate);
            endDate.setHours(startHour + duration, startMin, 0, 0);

            // Format as LOCAL ISO string (YYYY-MM-DDTHH:mm:00) to avoid UTC offset
            // shifting the date to the next day — matches the format the frontend produces.
            const pad = (n) => String(n).padStart(2, '0');
            const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

            const ISOStart = localISO(eventDate);
            const ISOEnd   = localISO(endDate);

            const tipo   = tiposTrabajo[Math.floor(Math.random() * tiposTrabajo.length)];
            const titulo = titulosBase[Math.floor(Math.random() * titulosBase.length)];

            // Estado basado en si la fecha ya pasó o no
            let estado;
            if (eventDate < today) {
                estado = Math.random() < 0.85 ? 'completado' : 'en_progreso';
            } else {
                estado = 'pendiente';
            }

            programacionesToCreate.push({
                titulo: titulo,
                fecha_inicio: ISOStart,
                fecha_fin: ISOEnd,
                tipo_trabajo: tipo,
                color: colores[tipo],
                descripcion: 'Revisar según el historial técnico. Traer herramientas de precisión. Reportarse con conserjería al llegar.',
                estado: estado,
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