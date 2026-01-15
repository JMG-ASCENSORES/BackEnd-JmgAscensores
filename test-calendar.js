const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let cookies = null;

async function testCalendarAPI() {
  console.log('📅 Iniciando pruebas del Calendario...\n');

  try {
    // 1. Iniciar sesión para obtener cookies
    console.log('1️⃣ Iniciando sesión como Admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      dni: '12345678',
      contrasena: '123456'
    });
    
    // Extraer cookies para usarlas en las siguientes peticiones
    cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    const axiosConfig = {
      headers: { Cookie: cookieHeader },
      withCredentials: true
    };
    console.log('✅ Login exitoso');

    // 2. Crear un evento
    console.log('\n2️⃣ Creando evento de prueba...');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newEvent = {
      titulo: 'Mantenimiento Preventivo Torre A',
      start: now.toISOString(),
      end: tomorrow.toISOString(),
      descripcion: 'Revisión general de ascensores',
      color: '#28a745'
    };

    const createResponse = await axios.post(`${API_URL}/programaciones`, newEvent, axiosConfig);
    console.log('✅ Evento creado:', createResponse.data.data.titulo);
    const eventId = createResponse.data.data.programacion_id;

    // 3. Listar eventos (simulando FullCalendar rango)
    console.log('\n3️⃣ Obteniendo eventos del mes...');
    const startRange = new Date();
    startRange.setDate(startRange.getDate() - 5);
    const endRange = new Date();
    endRange.setDate(endRange.getDate() + 5);

    const listResponse = await axios.get(`${API_URL}/programaciones`, {
      ...axiosConfig,
      params: {
        start: startRange.toISOString(),
        end: endRange.toISOString()
      }
    });

    console.log(`✅ Eventos encontrados: ${listResponse.data.length}`);
    const foundEvent = listResponse.data.find(e => e.id === eventId);
    if (foundEvent) {
      console.log('   -> Evento creado encontrado en la lista correctamente');
    } else {
      console.error('   -> ❌ El evento creado no aparece en la lista');
    }

    // 4. Actualizar evento
    console.log('\n4️⃣ Actualizando evento...');
    const updateResponse = await axios.put(`${API_URL}/programaciones/${eventId}`, {
      titulo: 'Mantenimiento URGENTE Torre A',
      color: '#dc3545' // Cambiar a rojo
    }, axiosConfig);
    console.log('✅ Evento actualizado:', updateResponse.data.data.titulo);

    // 5. Eliminar evento
    console.log('\n5️⃣ Eliminando evento...');
    await axios.delete(`${API_URL}/programaciones/${eventId}`, axiosConfig);
    console.log('✅ Evento eliminado');

    console.log('\n✨ Todas las pruebas del calendario pasaron exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.code || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Detalles:', error);
    }
  }
}

testCalendarAPI();
