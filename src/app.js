const express = require('express');
const cors = require('cors');
const { connectDB, sequelize } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clienteRoutes = require('./routes/clienteRoutes');
app.use('/api/clientes', clienteRoutes);

// Swagger Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JMG Ascensores API' });
});

// Database Connection and Server Startup
const startServer = async () => {
  await connectDB();
  
  // Sync models (careful with { force: true } in production)
  await sequelize.sync(); 

  // Seed initial data
  const seedDatabase = require('./seeders/initialData');
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
