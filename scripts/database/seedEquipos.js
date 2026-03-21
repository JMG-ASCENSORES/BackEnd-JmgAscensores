const { sequelize, Cliente, Ascensor } = require('./src/models');

// ── Marcas y modelos REALES de ascensores ────────────────────────────────────
const ascensores = [
  { marca: 'Otis',           modelos: ['Gen2 Comfort', 'Gen2 Life', 'GeN2 Premier', 'SkyRise', 'Elevonic 411'] },
  { marca: 'Schindler',      modelos: ['3300', '5500', '7000', '3100', '5200'] },
  { marca: 'ThyssenKrupp',   modelos: ['Synergy 100', 'Synergy 200', 'Synergy 300', 'Evolution 200', 'Endura'] },
  { marca: 'KONE',           modelos: ['MonoSpace 500', 'MonoSpace 700', 'MiniSpace', 'EcoSpace', 'NanoSpace'] },
  { marca: 'Mitsubishi',     modelos: ['NEXIEZ-MR', 'NEXIEZ-MRL', 'NEXIEZ-S', 'Elenessa', 'AXIEZ'] },
  { marca: 'Hitachi',        modelos: ['Urban Ace', 'Standard HF', 'NX Series', 'GVF-II', 'HF-X'] },
  { marca: 'Fujitec',        modelos: ['GS21', 'Big Wing', 'Revo 500', 'GS8000', 'X-Otos'] },
  { marca: 'Hyundai',        modelos: ['YZER', 'WBST-II', 'Luxen', 'U-BIST', 'NK-Series'] },
  { marca: 'Orona',          modelos: ['3G 2010', 'Plat. R20', 'Vertical 1', 'EcoGreen', 'Space T1'] },
  { marca: 'Kleemann',       modelos: ['Atlas Gigas', 'Atlas Basic', 'MRL Blue', 'Atlas Mega', 'Voyager'] },
];

// ── Plataformas (más flexibles) ──────────────────────────────────────────────
const plataformas = [
  { marca: 'Savaria',        modelos: ['V-1504 Multilift', 'Telecab', 'Delta Inclined', 'Omega', 'Polaris'] },
  { marca: 'Bruno',          modelos: ['Elan SRE-3050', 'Elite SRE-2010', 'Chariot', 'Commercial VPL', 'Residential VPL'] },
  { marca: 'ThyssenKrupp',   modelos: ['Citia Home', 'Flow X', 'Levant', 'Supra', 'HomeGlide'] },
  { marca: 'Stannah',        modelos: ['Stratos 320', 'Solus 260', 'Sofia 420', 'Saxon 420', 'Siena 260'] },
  { marca: 'Garaventa',      modelos: ['Xpress II', 'Genesis Enclosure', 'Artira', 'Elvoron LU/LA', 'Genesis Opal'] },
  { marca: 'Kone',           modelos: ['MonoSpace Platform', 'Low Rise', 'HomeLift P', 'TransSys', 'E-Link'] },
  { marca: 'Cibes',          modelos: ['A4000', 'A5000', 'A7000', 'Air', 'Voyager V80'] },
  { marca: 'Aritco',         modelos: ['PublicLift Access', 'HomeLift Access', '4000', '6000', '7000'] },
];

// ── Montacargas (marcas reales) ──────────────────────────────────────────────
const montacargas = [
  { marca: 'Otis',           modelos: ['Freight Gen2', 'Service Elevator 411', 'Heavy Duty 5000', 'Cargo Plus'] },
  { marca: 'Schindler',      modelos: ['2600 Freight', '5500 Cargo', 'Freight 300', '6500 Industrial'] },
  { marca: 'KONE',           modelos: ['TranSys Freight', 'MaxiSpace Cargo', 'MonoSpace Freight', 'Heavy Cargo 700'] },
  { marca: 'Mitsubishi',     modelos: ['GP-210 Freight', 'Cargo NEXIEZ', 'Industrial MRL', 'Heavy GP-III'] },
  { marca: 'ThyssenKrupp',   modelos: ['Freight 300', 'Cargo Evolution', 'Industrial Endura', 'Heavy Synergy'] },
  { marca: 'Hyundai',        modelos: ['Freight YZER', 'Cargo Luxen', 'Industrial WBST', 'Heavy NK-F'] },
  { marca: 'Fujitec',        modelos: ['Big Wing Cargo', 'GS Freight', 'Industrial Revo', 'Heavy GS8000'] },
];

// ── Observaciones realistas ──────────────────────────────────────────────────
const observaciones = [
  'Equipo en buen estado general. Último mantenimiento sin novedades.',
  'Se detectó desgaste leve en las guías. Programar revisión en próximo mantenimiento.',
  'Lubricación de puertas realizada. Funcionamiento óptimo.',
  'Requiere cambio de botonera en planta baja. Piezas pendientes de pedido.',
  'Motor principal revisado. Sin anomalías detectadas.',
  'Ruido intermitente al cerrar puertas del piso 3. En observación.',
  'Cableado eléctrico renovado en última intervención.',
  'Sensor de puerta del piso 2 presenta fallas esporádicas.',
  'Equipo operativo al 100%. Sin observaciones pendientes.',
  'Se recomienda modernización del sistema de control en el próximo año.',
  'Frenos calibrados. Velocidad nominal verificada correctamente.',
  'Pantalla de cabina reemplazada. Display funcionando correctamente.',
  'Sistema de intercomunicación testeado. Operativo.',
  'Iluminación LED de cabina instalada en última visita.',
  'Piso de cabina presenta desgaste. Sugerir reemplazo al cliente.',
  'Equipo nuevo. Instalación completada hace menos de 6 meses.',
  'Requiere actualización de firmware del controlador.',
  'Ventilación de cabina revisada y limpiada.',
  null, // algunos sin observaciones
  null,
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generatedSeries = new Set();
const genSerie = (marca) => {
  const prefix = marca.substring(0, 3).toUpperCase();
  let serie;
  do {
    serie = `${prefix}-${randBetween(2018, 2026)}-${String(randBetween(1000, 99999)).padStart(5, '0')}`;
  } while (generatedSeries.has(serie));
  generatedSeries.add(serie);
  return serie;
};

const genFechaMantenimiento = () => {
  // Fecha entre hace 1 día y hace 6 meses
  const d = new Date();
  d.setDate(d.getDate() - randBetween(1, 180));
  return d.toISOString().split('T')[0];
};

// ── Generación ───────────────────────────────────────────────────────────────
const generateEquipos = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // Limpiar equipos existentes
    const deletedEquipos = await Ascensor.destroy({ where: {} });
    console.log(`🗑️  Eliminados ${deletedEquipos} equipos existentes.`);

    // Obtener todos los clientes
    const clientes = await Cliente.findAll({ attributes: ['cliente_id', 'tipo_cliente'] });
    if (!clientes.length) {
      console.log('❌ No hay clientes en la base de datos. Ejecuta primero seedClientes.js');
      process.exit(1);
    }

    console.log(`\n📋 Generando equipos para ${clientes.length} clientes...\n`);

    const equiposToCreate = [];
    let totalAscensores = 0;
    let totalMontacargas = 0;
    let totalPlataformas = 0;

    for (const cliente of clientes) {
      const esEmpresa = cliente.tipo_cliente === 'empresa';

      // Empresas: 1 a 5 equipos | Personas: 1 (raramente 2)
      const numEquipos = esEmpresa
        ? randBetween(1, 5)
        : (Math.random() < 0.85 ? 1 : 2);

      for (let j = 0; j < numEquipos; j++) {
        // Distribución coherente por tipo de cliente:
        // Empresas:  55% ascensores, 25% montacargas, 20% plataformas
        // Personas:  75% ascensores,  5% montacargas, 20% plataformas
        const rand = Math.random();
        let tipoEquipo, catalogo, capacidad, pisos;

        if (esEmpresa) {
          if (rand < 0.55) {
            tipoEquipo = 'Ascensor';
            catalogo = pick(ascensores);
          } else if (rand < 0.80) {
            tipoEquipo = 'Montacarga';
            catalogo = pick(montacargas);
          } else {
            tipoEquipo = 'Plataforma';
            catalogo = pick(plataformas);
          }
        } else {
          if (rand < 0.75) {
            tipoEquipo = 'Ascensor';
            catalogo = pick(ascensores);
          } else if (rand < 0.80) {
            tipoEquipo = 'Montacarga';
            catalogo = pick(montacargas);
          } else {
            tipoEquipo = 'Plataforma';
            catalogo = pick(plataformas);
          }
        }

        const modelo = pick(catalogo.modelos);

        // Capacidad según tipo
        if (tipoEquipo === 'Ascensor') {
          const personas = pick([6, 8, 10, 13, 15, 20]);
          const kg = personas * 75;
          capacidad = `${personas} personas / ${kg} kg`;
          pisos = randBetween(2, 25);
        } else if (tipoEquipo === 'Montacarga') {
          const kg = pick([1000, 1500, 2000, 2500, 3000, 4000, 5000]);
          capacidad = `${kg} kg`;
          pisos = randBetween(1, 6);
        } else {
          const kg = pick([250, 300, 350, 400, 500]);
          capacidad = `${kg} kg`;
          pisos = randBetween(1, 4);
        }

        // Estado
        const estados = ['operativo', 'operativo', 'operativo', 'operativo',
                         'en_mantenimiento', 'fuera_de_servicio', 'operativo'];
        const estado  = pick(estados);

        equiposToCreate.push({
          cliente_id:   cliente.cliente_id,
          tipo_equipo:  tipoEquipo,
          marca:        catalogo.marca,
          modelo:       modelo,
          numero_serie: genSerie(catalogo.marca),
          capacidad,
          piso_cantidad: pisos,
          fecha_ultimo_mantenimiento: genFechaMantenimiento(),
          estado,
          observaciones: pick(observaciones),
        });

        if (tipoEquipo === 'Ascensor') totalAscensores++;
        else if (tipoEquipo === 'Montacarga') totalMontacargas++;
        else totalPlataformas++;
      }
    }

    await Ascensor.bulkCreate(equiposToCreate);

    console.log(`✅ ¡Se han insertado ${equiposToCreate.length} equipos con éxito!\n`);
    console.log(`📊 Resumen:`);
    console.log(`   Ascensores:    ${totalAscensores}`);
    console.log(`   Montacargas:   ${totalMontacargas}`);
    console.log(`   Plataformas:   ${totalPlataformas}`);
    console.log(`   Total:         ${equiposToCreate.length}`);

    // Distribución por marca
    const porMarca = {};
    equiposToCreate.forEach(e => {
      porMarca[e.marca] = (porMarca[e.marca] || 0) + 1;
    });
    console.log(`\n📊 Distribución por marca:`);
    Object.entries(porMarca)
      .sort((a, b) => b[1] - a[1])
      .forEach(([marca, count]) => console.log(`   ${marca}: ${count}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error insertando equipos:', err);
    process.exit(1);
  }
};

generateEquipos();
