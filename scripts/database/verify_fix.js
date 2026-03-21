const axios = require('axios');

async function verifyFix() {
  const baseUrl = 'http://[::1]:3000/api';
  
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      dni: '12345678',
      contrasena: 'admin123'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('Login successful.');

    // 2. Try to create report without orden_id
    console.log('Creating report without orden_id...');
    const reportData = {
      descripcion_trabajo: 'Verificación de fix para orden_id opcional.',
      tipo_informe: 'Técnico',
      fecha_informe: new Date().toISOString().split('T')[0],
      hora_informe: '12:00',
      cliente_id: 1,
      ascensor_id: 1,
      trabajador_id: 1 // Using the same ID just for testing
    };

    const reportRes = await axios.post(`${baseUrl}/informes`, reportData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Success!', reportRes.data);
  } catch (error) {
    console.error('Failed:', error.response ? error.response.data : error.message);
  }
}

verifyFix();
