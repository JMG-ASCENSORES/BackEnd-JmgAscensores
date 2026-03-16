require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { connectDB, sequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(uploadsDir));

// Import routes
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuarios.routes');
const clienteRoutes = require('./routes/clienteRoutes');
const ascensorRoutes = require('./routes/ascensorRoutes');

const tareaMaestraRoutes = require('./routes/tareaMaestraRoutes');
const ordenTrabajoRoutes = require('./routes/ordenTrabajoRoutes');
const informeRoutes = require('./routes/informeRoutes');
const evidenciaRoutes = require('./routes/evidenciaRoutes');
const rutaRoutes = require('./routes/rutaRoutes');
const programacionRoutes = require('./routes/programacion.routes');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ascensores', ascensorRoutes);

app.use('/api/tareas-maestras', tareaMaestraRoutes);
app.use('/api/ordenes-trabajo', ordenTrabajoRoutes);
app.use('/api/informes', informeRoutes);
app.use('/api/evidencias', evidenciaRoutes);
app.use('/api/rutas', rutaRoutes);
app.use('/api/programaciones', programacionRoutes);


// Swagger Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Test Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to JMG Ascensores API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      usuarios: '/api/usuarios',
      clientes: '/api/clientes',
      docs: '/api-docs'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    error: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
const errorHandler = require('./middlewares/errorHandler.middleware');
app.use(errorHandler);

// Database Connection and Server Startup
const startServer = async () => {
  try {
    await connectDB();
    
    // Sync models — alter:true adds missing columns without dropping data
    await sequelize.sync({ force: false, alter: true }); 

    // Seed initial data (Manual run recommended via init-db script)
    // const seedDatabase = require('./seeders/initialData');
    // await seedDatabase();

    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🌍 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:4200'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

