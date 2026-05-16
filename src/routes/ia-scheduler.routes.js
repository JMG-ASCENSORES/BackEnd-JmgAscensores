const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const controller = require('../controllers/ia-scheduler.controller');

// Todos los endpoints requieren autenticación + rol ADMIN
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/demand', controller.getDemand);
router.get('/tecnicos', controller.getTecnicos);
router.post('/generar', controller.generar);
router.post('/confirmar', controller.confirmar);
router.get('/configuracion', controller.getConfiguracion);
router.put('/configuracion', controller.updateConfiguracion);

module.exports = router;
