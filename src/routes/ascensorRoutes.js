const express = require('express');
const router = express.Router();
const ascensoresController = require('../controllers/ascensores.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createAscensorSchema, updateAscensorSchema } = require('../validators/ascensores.validator');

// Protected routes (Require Auth)
router.use(authenticate);

router.post('/', validate(createAscensorSchema), ascensoresController.createAscensor);
router.get('/', ascensoresController.getAscensores);
router.get('/:id', ascensoresController.getAscensorById);
router.put('/:id', validate(updateAscensorSchema), ascensoresController.updateAscensor);
router.delete('/:id', ascensoresController.deleteAscensor);

module.exports = router;
