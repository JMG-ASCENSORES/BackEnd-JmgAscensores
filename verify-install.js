try {
  require('cookie-parser');
  console.log('✅ cookie-parser está instalado correctamente.');
} catch (e) {
  console.error('❌ ERROR: cookie-parser NO se encuentra.');
  console.error(e.message);
  process.exit(1);
}
