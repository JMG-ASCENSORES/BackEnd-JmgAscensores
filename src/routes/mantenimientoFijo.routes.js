const express = require('express');
const router = express.Router();
const { 
  getMantenimientosFijos, 
  createMantenimientoFijo, 
  updateMantenimientoFijo, 
  deleteMantenimientoFijo 
} = require('../controllers/mantenimientoFijo.controller');

// GET /api/mantenimientos-fijos
router.get('/', getMantenimientosFijos);

// POST /api/mantenimientos-fijos
router.post('/', createMantenimientoFijo);

// PUT /api/mantenimientos-fijos/:id
router.put('/:id', updateMantenimientoFijo);

// DELETE /api/mantenimientos-fijos/:id
router.delete('/:id', deleteMantenimientoFijo);

module.exports = router;
