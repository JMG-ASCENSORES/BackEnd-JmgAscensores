const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function debugError() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      dni: '12345678',
      contrasena: '123456'
    });
    const cookies = loginResponse.headers['set-cookie'];
    const headers = { 
      Cookie: cookies.map(c => c.split(';')[0]).join('; '),
      'Content-Type': 'application/json'
    };

    console.log('Testing GET /programaciones...');
    // Request that causes error
    await axios.get(`${API_URL}/programaciones`, {
      params: {
        start: '2020-01-01',
        end: '2030-01-01'
      },
      headers: headers,
      withCredentials: true
    });
    
    console.log('✅ Success (Unexpected)');
  } catch (error) {
    if (error.response) {
      console.log('❌ Error Response Data:');
      console.log(JSON.stringify(error.response.data, null, 2)); // Pretty print full error
    } else {
      console.log('Error:', error.message);
    }
  }
}

debugError();
