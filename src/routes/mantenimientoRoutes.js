const express = require('express');
const router = express.Router();
const mantenimientosController = require('../controllers/mantenimientos.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createMantenimientoSchema, updateMantenimientoSchema } = require('../validators/mantenimientos.validator');

// Protected routes (Require Auth)
router.use(authenticate);

router.post('/', validate(createMantenimientoSchema), mantenimientosController.createMantenimiento);
router.get('/', mantenimientosController.getMantenimientos);
router.get('/:id', mantenimientosController.getMantenimientoById);
router.put('/:id', validate(updateMantenimientoSchema), mantenimientosController.updateMantenimiento);
router.delete('/:id', mantenimientosController.deleteMantenimiento);

module.exports = router;
