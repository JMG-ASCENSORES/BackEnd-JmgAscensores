const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testCookies() {
  console.log('🧪 Iniciando prueba de cookies...\n');

  try {
    // 1. Login
    console.log('1️⃣ Probando login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      dni: '12345678',
      contrasena: '123456'
    }, {
      withCredentials: true // Importante para recibir cookies
    });

    console.log('✅ Login exitoso');
    console.log('📦 Respuesta:', JSON.stringify(loginResponse.data, null, 2));
    
    // Verificar cookies
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      console.log('\n🍪 Cookies recibidas:');
      cookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0];
        const isHttpOnly = cookie.includes('HttpOnly');
        const maxAge = cookie.match(/Max-Age=(\d+)/);
        
        console.log(`  - ${cookieName}`);
        console.log(`    HttpOnly: ${isHttpOnly ? '✅' : '❌'}`);
        if (maxAge) {
          const hours = Math.floor(maxAge[1] / 3600);
          console.log(`    Expira en: ${hours} hora(s)`);
        }
      });
    } else {
      console.log('❌ No se recibieron cookies');
    }

    // 2. Probar ruta protegida (si tienes una)
    console.log('\n2️⃣ Probando ruta protegida con cookies...');
    try {
      const protectedResponse = await axios.get(`${API_URL}/usuarios`, {
        withCredentials: true // Las cookies se envían automáticamente
      });
      console.log('✅ Ruta protegida accesible con cookies');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ No se pudo acceder a ruta protegida (las cookies no se enviaron correctamente)');
      } else {
        console.log('⚠️ Error al probar ruta protegida:', error.message);
      }
    }

    // 3. Logout
    console.log('\n3️⃣ Probando logout...');
    const logoutResponse = await axios.post(`${API_URL}/auth/logout`, {}, {
      withCredentials: true
    });
    console.log('✅ Logout exitoso');

    console.log('\n✨ Todas las pruebas completadas');

  } catch (error) {
    console.error('❌ Error durante las pruebas:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testCookies();
