const authService = require('./src/services/auth.service');
const { connectDB } = require('./src/config/database');

async function simulateLogin() {
  try {
    await connectDB();
    const dni = '12345678';
    const pass = '123456';
    
    console.log(`Simulating login for DNI: ${dni}`);
    try {
      const result = await authService.login(dni, pass);
      console.log('Login Success:', JSON.stringify(result, null, 2));
    } catch (err) {
      console.log('Login Failed with error:', err.message);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

simulateLogin();
