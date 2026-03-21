const informesService = require('../services/informes.service');
const pdfService = require('../services/pdf.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createInforme = async (req, res, next) => {
  try {
    const informe = await informesService.createInforme(req.body);
    res.status(201).json(successResponse(informe, 'Informe creado exitosamente'));
  } catch (error) {
    if (error.message === 'INFORME_DUPLICADO') {
      return res.status(409).json(errorResponse('Ya existe un informe para este trabajo.', 'CONFLICT'));
    }
    next(error);
  }
};

const getInformes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const result = await informesService.getInformes(req.query || {}, { limit, offset });
    
    // Si findAndCountAll se usó correctamente
    if (result.count !== undefined) {
       const totalPages = Math.ceil(result.count / limit);
       res.status(200).json(successResponse({
         informes: result.rows,
         meta: { 
            total: result.count, 
            page, 
            limit, 
            totalPages,
            totalMaintenance: result.statsMantenimiento || 0,
            totalTechnical: result.statsTecnico || 0 
         }
       }, 'Lista de informes paginada'));
    } else {
       // Fallback por si acaso
       res.status(200).json(successResponse({
         informes: result,
         meta: { total: result.length, page: 1, limit: result.length, totalPages: 1 }
       }, 'Lista de informes'));
    }
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
    const typePrefix = informe.tipo_informe === 'Mantenimiento' ? 'MAN' : 'TEC';
    const reportNum = informe.informe_id.toString().padStart(6, '0');
    const clientNameRaw = informe.Cliente?.nombre_comercial || informe.Cliente?.contacto_nombre || 'Cliente';
    
    // Limpieza suave para el nombre del archivo (evitar caracteres prohibidos en sistemas de archivos)
    const clientNameClean = clientNameRaw.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim();

    const filename = `${typePrefix} - ${reportNum} - ${clientNameClean}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    await pdfService.generateReportPDF(informe, res);
    
    
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
  deleteInforme,
  getInformePdf
};
