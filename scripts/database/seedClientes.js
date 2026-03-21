const { sequelize, Cliente, Ascensor, Programacion } = require('./src/models');

// ── Datos auxiliares para generación realista ───────────────────────────────

// Distritos de Lima con coordenadas base (centro aproximado)
const distritos = [
  { nombre: 'Miraflores',        lat: -12.1197, lng: -77.0360 },
  { nombre: 'San Isidro',        lat: -12.0977, lng: -77.0365 },
  { nombre: 'Surco',             lat: -12.1445, lng: -76.9900 },
  { nombre: 'San Borja',         lat: -12.1060, lng: -76.9985 },
  { nombre: 'La Molina',         lat: -12.0867, lng: -76.9320 },
  { nombre: 'Jesús María',       lat: -12.0700, lng: -77.0440 },
  { nombre: 'Lince',             lat: -12.0830, lng: -77.0350 },
  { nombre: 'Magdalena del Mar', lat: -12.0920, lng: -77.0720 },
  { nombre: 'Pueblo Libre',      lat: -12.0740, lng: -77.0620 },
  { nombre: 'Barranco',          lat: -12.1430, lng: -77.0220 },
  { nombre: 'Chorrillos',        lat: -12.1700, lng: -77.0150 },
  { nombre: 'San Miguel',        lat: -12.0770, lng: -77.0830 },
  { nombre: 'Cercado de Lima',   lat: -12.0460, lng: -77.0305 },
  { nombre: 'Breña',             lat: -12.0600, lng: -77.0510 },
  { nombre: 'Surquillo',         lat: -12.1120, lng: -77.0150 },
  { nombre: 'San Juan de Lurigancho', lat: -11.9830, lng: -76.9970 },
  { nombre: 'Los Olivos',        lat: -11.9580, lng: -77.0660 },
  { nombre: 'Independencia',     lat: -11.9890, lng: -77.0510 },
  { nombre: 'Comas',             lat: -11.9360, lng: -77.0490 },
  { nombre: 'Ate',               lat: -12.0250, lng: -76.9190 },
];

// Calles ficticias comunes en Lima
const calles = [
  'Av. Javier Prado', 'Av. Arequipa', 'Av. Larco', 'Av. Benavides',
  'Av. Primavera', 'Av. La Marina', 'Av. Angamos', 'Av. Brasil',
  'Av. Salaverry', 'Av. Aviación', 'Av. Camino Real', 'Jr. de la Unión',
  'Calle Schell', 'Calle Berlín', 'Calle Los Pinos', 'Calle Las Begonias',
  'Av. Del Ejército', 'Av. Petit Thouars', 'Calle Conquistadores', 'Av. Reducto',
  'Av. Alfredo Benavides', 'Av. Velasco Astete', 'Av. Manuel Olguín', 'Calle Monterrey',
  'Av. El Polo', 'Calle los Eucaliptos', 'Av. Flora Tristán', 'Av. La Fontana',
  'Jr. Cusco', 'Jr. Lampa', 'Av. Tacna', 'Calle Roma'
];

// Nombres de empresas ficticias
const prefijosEmpresa = [
  'Grupo', 'Inversiones', 'Corporación', 'Inmobiliaria', 'Constructora',
  'Edificaciones', 'Desarrollos', 'Gestión', 'Administradora', 'Consorcio'
];
const sufijosEmpresa = [
  'del Pacífico', 'Los Andes', 'San Martín', 'del Sur', 'Peruana',
  'Lima', 'Nacional', 'Continental', 'Central', 'Metropolitana',
  'Real', 'Premier', 'Capital', 'Global', 'Moderna'
];
const tiposEmpresa = [
  'S.A.C.', 'S.A.', 'S.R.L.', 'E.I.R.L.'
];

// Nombres de edificios / condominios
const nombresEdificio = [
  'Torre Platinum', 'Edificio Central Park', 'Residencial Los Álamos',
  'Condominio Vista Mar', 'Torre Business Center', 'Edificio San Felipe',
  'Residencial El Parque', 'Torre Ejecutiva', 'Condominio Las Palmeras',
  'Edificio Pacific Tower', 'Torre Monterrey', 'Residencial Los Olivos',
  'Condominio Aurora', 'Torre Primavera', 'Edificio Horizonte',
  'Torre Del Sol', 'Condominio Bello Horizonte', 'Residencial Jardines',
  'Torre Mirador', 'Edificio Corporativo Lima', 'Condominio Parque Real',
  'Torre Sky', 'Residencial Santa Cruz', 'Edificio Barlovento',
  'Torre Oasis', 'Condominio Las Terrazas', 'Residencial Buena Vista',
  'Torre Diamante', 'Edificio San Borja Plaza', 'Condominio El Boulevard'
];

// Nombres y apellidos peruanos
const nombres = [
  'Carlos', 'María', 'José', 'Ana', 'Luis', 'Rosa', 'Juan', 'Patricia',
  'Miguel', 'Carmen', 'Jorge', 'Luz', 'Fernando', 'Elena', 'Ricardo',
  'Claudia', 'Roberto', 'Silvia', 'Eduardo', 'Gabriela', 'Pedro', 'Isabel',
  'Diego', 'Mónica', 'Andrés', 'Teresa', 'Daniel', 'Lucía', 'Alberto', 'Pilar',
  'Raúl', 'Alejandra', 'Marco', 'Susana', 'Víctor', 'Cecilia', 'Óscar', 'Norma',
  'César', 'Gloria'
];
const apellidos = [
  'García', 'Rodríguez', 'Martínez', 'López', 'Gonzales', 'Flores', 'Torres',
  'Ramírez', 'Cruz', 'Chávez', 'Mendoza', 'Díaz', 'Vargas', 'Castillo',
  'Reyes', 'Herrera', 'Sánchez', 'Rojas', 'Morales', 'Medina', 'Gutiérrez',
  'Paredes', 'Quispe', 'Huamán', 'Espinoza', 'Vásquez', 'Córdova', 'Salazar',
  'Ramos', 'Fernández', 'Delgado', 'Ortiz', 'Carrasco', 'Silva', 'Peña'
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Genera un DNI peruano de 8 dígitos, único. */
const generatedDnis = new Set();
const genDni = () => {
  let dni;
  do { dni = String(randBetween(10000000, 99999999)); } while (generatedDnis.has(dni));
  generatedDnis.add(dni);
  return dni;
};

/** Genera un RUC peruano (20XXXXXXXXX). */
const generatedRucs = new Set();
const genRuc = () => {
  let ruc;
  do { ruc = '20' + String(randBetween(100000000, 999999999)); } while (generatedRucs.has(ruc));
  generatedRucs.add(ruc);
  return ruc;
};

/** Añade variación a coordenadas para que no sean exactamente iguales. */
const jitter = (base, range = 0.012) => +(base + (Math.random() - 0.5) * range * 2).toFixed(6);

/** Genera un número de teléfono peruano. */
const genTelefono = () => `9${randBetween(10000000, 99999999)}`;

/** Genera un correo basado en nombre. */
const genCorreo = (nombre, apellido) => {
  const dominios = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'empresa.pe'];
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const a = apellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${n}.${a}${randBetween(1, 99)}@${pick(dominios)}`;
};

// ── Generación ───────────────────────────────────────────────────────────────

const generateClientes = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // ── Limpiar tablas dependientes (orden importante por FK) ──
    const deletedProg = await Programacion.destroy({ where: {} });
    console.log(`🗑️  Eliminadas ${deletedProg} programaciones.`);

    const deletedAsc = await Ascensor.destroy({ where: {} });
    console.log(`🗑️  Eliminados ${deletedAsc} ascensores.`);

    const deletedCli = await Cliente.destroy({ where: {} });
    console.log(`🗑️  Eliminados ${deletedCli} clientes.`);

    console.log('\n📋 Generando 100 clientes en distritos de Lima...\n');

    const clientesToCreate = [];

    for (let i = 0; i < 100; i++) {
      const distrito = pick(distritos);
      const esEmpresa = Math.random() < 0.6; // 60% empresas, 40% personas naturales

      const contactoNombre   = pick(nombres);
      const contactoApellido = pick(apellidos);
      const calle  = pick(calles);
      const numero = randBetween(100, 3500);

      let tipo_cliente, ruc, nombre_comercial, ubicacion;

      if (esEmpresa) {
        tipo_cliente = 'empresa';
        ruc = genRuc();
        const edificio = pick(nombresEdificio);
        nombre_comercial = `${pick(prefijosEmpresa)} ${pick(sufijosEmpresa)} ${pick(tiposEmpresa)}`;
        ubicacion = `${edificio}, ${calle} ${numero}, ${distrito.nombre}, Lima`;
      } else {
        tipo_cliente = 'persona';
        ruc = null;
        nombre_comercial = null;
        ubicacion = `${calle} ${numero}, ${distrito.nombre}, Lima`;
      }

      clientesToCreate.push({
        tipo_cliente,
        dni: genDni(),
        contra: 'hashed_placeholder', // No usado en login de clients, solo campo legacy
        ruc,
        nombre_comercial,
        ubicacion,
        latitud:  jitter(distrito.lat),
        longitud: jitter(distrito.lng),
        ciudad:   'Lima',
        distrito: distrito.nombre,
        telefono: genTelefono(),
        contacto_correo:   genCorreo(contactoNombre, contactoApellido),
        contacto_nombre:   contactoNombre,
        contacto_apellido: contactoApellido,
        contacto_telefono: genTelefono(),
        estado_activo: Math.random() < 0.92 // 92% activos
      });
    }

    await Cliente.bulkCreate(clientesToCreate);
    console.log(`✅ ¡Se han insertado ${clientesToCreate.length} clientes con éxito!\n`);

    // Resumen por distrito
    const resumen = {};
    clientesToCreate.forEach(c => {
      resumen[c.distrito] = (resumen[c.distrito] || 0) + 1;
    });
    console.log('📊 Distribución por distrito:');
    Object.entries(resumen)
      .sort((a, b) => b[1] - a[1])
      .forEach(([distrito, count]) => console.log(`   ${distrito}: ${count}`));

    console.log(`\n📊 Tipo: ${clientesToCreate.filter(c => c.tipo_cliente === 'empresa').length} empresas, ${clientesToCreate.filter(c => c.tipo_cliente === 'persona').length} personas naturales`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error insertando clientes:', err);
    process.exit(1);
  }
};

generateClientes();
