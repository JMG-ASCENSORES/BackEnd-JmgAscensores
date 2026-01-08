const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JMG Ascensores API',
      version: '1.0.0',
      description: 'API Documentation for JMG Ascensores Backend',
      contact: {
        name: 'Developer',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/app.js'], // Files containing annotations
};

const specs = swaggerJsdoc(options);

module.exports = specs;
