const { Administrador } = require('./src/models');
const { connectDB } = require('./src/config/database');
const { comparePassword } = require('./src/utils/password.util');
const fs = require('fs');

async function verifyPassword() {
  try {
    await connectDB();
    const dni = '12345678';
    const pass = '123456';
    
    let report = '--- PASSWORD CHECK START ---\n';
    const admin = await Administrador.findOne({ where: { dni } });
    if (!admin) {
      report += 'RESULT: User 12345678 not found in Administradores\n';
    } else {
      const isValid = await comparePassword(pass, admin.contrasena_hash);
      report += `RESULT: Password verification for 12345678 is ${isValid}\n`;
      report += `INFO: Hash in DB is ${admin.contrasena_hash}\n`;
    }
    report += '--- PASSWORD CHECK END ---\n';
    fs.writeFileSync('pass-report.txt', report);
    console.log('Report written to pass-report.txt');
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('pass-report.txt', 'ERROR: ' + err.message);
    process.exit(1);
  }
}

verifyPassword();
