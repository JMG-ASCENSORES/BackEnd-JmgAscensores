const app = require('./app');
const { connectDB, sequelize } = require('./config/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Sync models — only if DB_SYNC=true is set
    if (process.env.DB_SYNC === 'true') {
      console.log('🔄 Synchronizing database models (alter: true)...');
      await sequelize.sync({ force: false, alter: true });
      console.log('✅ Database synchronized.');
    } else {
      console.log('ℹ️ Skipping database synchronization (DB_SYNC != true)');
    }

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
