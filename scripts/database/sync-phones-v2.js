const { Cliente } = require('../../src/models');

async function syncAllPhones() {
    console.log('--- Iniciando limpieza integral de teléfonos en la Base de Datos ---');
    try {
        const clients = await Cliente.findAll();
        console.log(`Procesando ${clients.length} registros totales.`);
        
        let updateCount = 0;
        for (const c of clients) {
            if (c.tipo_cliente === 'persona') {
                // Para personas: el dato debe estar en 'telefono', 'contacto_telefono' debe ser null
                const phoneValue = c.telefono || c.contacto_telefono;
                if (c.contacto_telefono !== null || c.telefono !== phoneValue) {
                    c.telefono = phoneValue;
                    c.contacto_telefono = null;
                    await c.save();
                    updateCount++;
                }
            } else {
                // Para empresas: el dato debe estar en 'contacto_telefono', 'telefono' debe ser null
                const phoneValue = c.contacto_telefono || c.telefono;
                if (c.telefono !== null || c.contacto_telefono !== phoneValue) {
                    c.contacto_telefono = phoneValue;
                    c.telefono = null;
                    await c.save();
                    updateCount++;
                }
            }
        }

        console.log(`Limpieza completada. Se actualizaron/unificaron ${updateCount} registros.`);
        process.exit(0);
    } catch (error) {
        console.error('Error durante la sincronización integral:', error);
        process.exit(1);
    }
}

syncAllPhones();
