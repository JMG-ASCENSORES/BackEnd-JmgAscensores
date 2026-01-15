const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testCookies() {
  console.log('Probando login con cookies...');

  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      dni: '12345678',
      contrasena: '123456'
    });

    console.log('\nRespuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));

    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      console.log('\nCookies recibidas:');
      cookies.forEach(cookie => {
        console.log('- ' + cookie.substring(0, 100) + '...');
      });
      console.log('\n✅ Las cookies están funcionando correctamente!');
    } else {
      console.log('\n❌ No se recibieron cookies');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testCookies();
