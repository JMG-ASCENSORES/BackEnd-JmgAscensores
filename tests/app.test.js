const request = require('supertest');
const app = require('../src/app');

describe('API Health Check and Base Routes', () => {
  
  test('GET / should return welcome message and status 200', async () => {
    const response = await request(app).get('/');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Welcome to JMG Ascensores API');
    expect(response.body).toHaveProperty('version');
  });

  test('GET /api/non-existent-route should return 404', async () => {
    const response = await request(app).get('/api/non-existent-route');
    
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'NOT_FOUND');
  });

});
