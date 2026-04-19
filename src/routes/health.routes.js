const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the status of the server and database connection.
 *     responses:
 *       200:
 *         description: Server is healthy
 */
router.get('/', async (req, res) => {
  const { sequelize } = require('../config/database');
  
  let dbStatus = 'unknown';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    status: 'online',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
