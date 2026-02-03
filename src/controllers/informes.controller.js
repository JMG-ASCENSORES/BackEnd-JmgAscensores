const informesService = require('../services/informes.service');
const pdfService = require('../services/pdf.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createInforme = async (req, res, next) => {
  try {
    const informe = await informesService.createInforme(req.body);
    res.status(201).json(successResponse(informe, 'Informe creado exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getInformes = async (req, res, next) => {
  try {
    const informes = await informesService.getInformes();
    res.status(200).json(successResponse(informes, 'Lista de informes'));
  } catch (error) {
    next(error);
  }
};

const getInformeById = async (req, res, next) => {
  try {
    const informe = await informesService.getInformeById(req.params.id);
    res.status(200).json(successResponse(informe, 'Detalle del informe'));
  } catch (error) {
    if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateInforme = async (req, res, next) => {
  try {
    const informe = await informesService.updateInforme(req.params.id, req.body);
    res.status(200).json(successResponse(informe, 'Informe actualizado exitosamente'));
  } catch (error) {
    if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteInforme = async (req, res, next) => {
  try {
    await informesService.deleteInforme(req.params.id);
    res.status(200).json(successResponse(null, 'Informe eliminado exitosamente'));
  } catch (error) {
    if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const getInformePdf = async (req, res, next) => {
  try {
    const informe = await informesService.getInformeById(req.params.id);
    
    // Set headers for PDF response
    // Set headers for PDF response
    const cleanString = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');

    const clientName = cleanString(informe.Cliente?.nombre_comercial || informe.Cliente?.contacto_nombre || 'Cliente');
    const tipo = cleanString(informe.tipo_informe);
    const filename = `${informe.informe_id}_${tipo}_${clientName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    pdfService.generateReportPDF(informe, res);
    
  } catch (error) {
     if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createInforme,
  getInformes,
  getInformeById,
  updateInforme,
  updateInforme,
  deleteInforme,
  getInformePdf
};
