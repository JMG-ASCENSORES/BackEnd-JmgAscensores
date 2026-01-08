const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       required:
 *         - razon_social
 *         - ubicacion
 *       properties:
 *         cliente_id:
 *           type: integer
 *           description: Auto-generated ID
 *         razon_social:
 *           type: string
 *           description: Business name
 *         ubicacion:
 *           type: string
 *           description: Location address
 *         tipo_cliente:
 *           type: string
 *           enum: [empresa, edificio, otro]
 *       example:
 *         razon_social: Edificio Miraflores
 *         ubicacion: Av. Larco 123
 *         tipo_cliente: edificio
 */

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Returns the list of all clients
 *     tags: [Clientes]
 *     responses:
 *       200:
 *         description: The list of clients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cliente'
 */
router.get('/', clienteController.getAllClientes);

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Get a client by ID
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The client ID
 *     responses:
 *       200:
 *         description: The client description
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Client not found
 */
router.get('/:id', clienteController.getClienteById);

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Create a new client
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       201:
 *         description: The client was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       500:
 *         description: Some server error
 */
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);


module.exports = router;
