const { Cliente } = require('../../src/models');
const { Op } = require('sequelize');

async function syncPhones() {
    console.log('--- Iniciando sincronización de teléfonos para Personas Naturales ---');
    try {
        const personas = await Cliente.findAll({
            where: {
                tipo_cliente: 'persona'
            }
        });

        console.log(`Encontradas ${personas.length} personas naturales.`);
        let count = 0;

        for (const p of personas) {
            // Si tiene contacto_telefono pero no telefono, lo movemos a telefono
            if (p.contacto_telefono && !p.telefono) {
                p.telefono = p.contacto_telefono;
                p.contacto_telefono = null;
                await p.save();
                count++;
            } 
            // Si tiene ambos, priorizamos el que tenga 9 dígitos o contacto_telefono por haber sido el último usado en el form
            else if (p.contacto_telefono && p.telefono && p.contacto_telefono !== p.telefono) {
                p.telefono = p.contacto_telefono;
                p.contacto_telefono = null;
                await p.save();
                count++;
            }
            // Si solo tiene telefono, asegurarse que contacto_telefono esté limpio para cumplir con "solo 1"
            else if (p.telefono && p.contacto_telefono) {
                p.contacto_telefono = null;
                await p.save();
            }
        }

        console.log(`Sincronización completada. Se actualizaron ${count} registros.`);
        process.exit(0);
    } catch (error) {
        console.error('Error durante la sincronización:', error);
        process.exit(1);
    }
}

syncPhones();
