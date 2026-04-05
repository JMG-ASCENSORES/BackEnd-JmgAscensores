const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'jmg_ascensores',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: (() => {
      const isSSL = process.env.DB_SSL === 'true';
      const isLocal = process.env.DB_HOST === 'localhost';
      
      return isSSL && !isLocal ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        connect_timeout: 10000 // 10 seconds timeout for initial connection
      } : {};
    })()
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, connectDB };