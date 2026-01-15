const express = require('express');
const router = express.Router();
const programacionController = require('../controllers/programacion.controller');
const authenticate = require('../middlewares/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Routes
router.get('/', programacionController.getProgramaciones);
router.post('/', programacionController.createProgramacion);
router.put('/:id', programacionController.updateProgramacion);
router.delete('/:id', programacionController.deleteProgramacion);

module.exports = router;
