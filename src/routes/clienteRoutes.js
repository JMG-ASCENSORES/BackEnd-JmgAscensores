const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createClientSchema, updateClientSchema } = require('../validators/clientes.validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       required:
 *         - tipo_cliente
 *         - ubicacion
 *       properties:
 *         cliente_id:
 *           type: integer
 *           description: ID autogenerado del cliente
 *         codigo:
 *           type: string
 *           description: Código único del cliente
 *         tipo_cliente:
 *           type: string
 *           description: Tipo de cliente (edificio, empresa, residencial)
 *         ubicacion:
 *           type: string
 *           description: Dirección del cliente
 *         telefono:
 *           type: string
 *           description: Teléfono de contacto
 *         contacto_nombre:
 *           type: string
 *           description: Nombre del contacto principal
 */

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Obtener todos los clientes
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cliente'
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 */

// Protected routes (Require Auth)
router.use(authenticate);

router.post('/', validate(createClientSchema), clientesController.createClient);
router.get('/', clientesController.getClients);
router.get('/:id', clientesController.getClientById);
router.put('/:id', validate(updateClientSchema), clientesController.updateClient);
router.delete('/:id', clientesController.deleteClient);
router.get('/:id/ascensores', clientesController.getClientAscensores);

module.exports = router;
