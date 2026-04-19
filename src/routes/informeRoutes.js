const express = require('express');
const router = express.Router();
const informesController = require('../controllers/informes.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createInformeSchema, updateInformeSchema, patchInformeSchema } = require('../validators/informes.validator');

router.use(authenticate);

/**
 * @name Informes
 */

/**
 * @name GET /api/informes
 */
router.post('/', validate(createInformeSchema), informesController.createInforme);
router.get('/', informesController.getInformes);

/**
 * @name GET /api/informes/{id}
 */
router.get('/:id/pdf', informesController.getInformePdf);
router.get('/:id', informesController.getInformeById);
router.put('/:id', validate(updateInformeSchema), informesController.updateInforme);
router.patch('/:id', validate(patchInformeSchema), informesController.updateInforme);
router.delete('/:id', informesController.deleteInforme);

module.exports = router;
