const { Cliente } = require('../models');

// Obtener todos los clientes
const getAllClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un cliente por ID
const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo cliente
const createCliente = async (req, res) => {
  try {
    const nuevoCliente = await Cliente.create(req.body);
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un cliente
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Cliente.update(req.body, {
      where: { cliente_id: id }
    });
    if (updated) {
      const updatedCliente = await Cliente.findByPk(id);
      return res.json(updatedCliente);
    }
    throw new Error('Cliente no encontrado');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un cliente
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Cliente.destroy({
      where: { cliente_id: id }
    });
    if (deleted) {
      return res.status(204).send();
    }
    throw new Error('Cliente no encontrado');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
};
