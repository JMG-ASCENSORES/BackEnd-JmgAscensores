const { Client } = require("pg");
const fs = require("fs");

const sourceConfig = {
  connectionString:
    "postgresql://jmg_ascensores2_user:lAEalnt9nszSbdHM0jVtaC4P3nNbz7dG@dpg-d6125bali9vc73fmed6g-a.oregon-postgres.render.com/jmg_ascensores2",
  ssl: { rejectUnauthorized: false },
};

const tables = [
  "Administradores",
  "Trabajadores",
  "Clientes",
  "Ascensores",
  "Mantenimientos",
  "Tareas",
  "Asignaciones",
  "Informes",
  "Evidencias",
  "RutasDiarias",
  "DetalleRuta",
  "Notificaciones",
  "Auditoria",
  "Sesiones",
  "HistorialEstadoMantenimiento",
  "Configuracion",
  "Programaciones",
];

async function backup() {
  const client = new Client(sourceConfig);
  try {
    console.log("🔄 Conectando a jmg_ascensores2...");
    await client.connect();
    console.log("✅ Conectado exitosamente a jmg_ascensores2");

    if (!fs.existsSync("backups_new")) fs.mkdirSync("backups_new");

    for (const table of tables) {
      try {
        console.log(`📦 Extrayendo ${table}...`);
        const res = await client.query(`SELECT * FROM "${table}"`);
        fs.writeFileSync(
          `backups_new/${table}.json`,
          JSON.stringify(res.rows, null, 2),
        );
        console.log(
          `   ✅ ${res.rows.length} registros (guardado en backups_new/${table}.json)`,
        );
      } catch (err) {
        console.log(`   ⚠️ No se pudo extraer ${table}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ Error de conexión:", err);
  } finally {
    await client.end();
  }
}

backup();
