const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const generateReportPDF = async (report, res) => {
    try {
        // Asegurar que reportData sea un objeto plano
        const reportData = (typeof report.get === 'function') ? report.get({ plain: true }) : report;

        const templatePath = path.join(__dirname, '../templates/informe_template.html');
        let html = fs.readFileSync(templatePath, 'utf8');

        // Configuración de Colores y Títulos
        const isMaintenance = reportData.tipo_informe?.toLowerCase() === 'mantenimiento';
        const reportTitle = isMaintenance ? 'INFORME DE MANTENIMIENTO' : 'INFORME TÉCNICO';
        const titleColorClass = isMaintenance ? 'text-[#003B73]' : 'text-emerald-600';
        const borderColorClass = isMaintenance ? 'border-[#003B73]' : 'border-emerald-600';

        // Procesamiento del Logo a Base64
        let logoBase64 = '';
        const logoPath = path.join(__dirname, '../assets/jmg_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoData = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
        }

        // Datos del Cliente y Técnico
        const clientObj = reportData.Cliente || {};
        const techObj = reportData.Trabajador || {};
        const clientName = clientObj.nombre_comercial || `${clientObj.contacto_nombre || ''} ${clientObj.contacto_apellido || ''}`.trim() || 'Cliente General';
        const contactName = `${clientObj.contacto_nombre || ''} ${clientObj.contacto_apellido || ''}`.trim() || 'N/A';
        const clientAddress = clientObj.direccion || clientObj.ubicacion || 'No registrada';
        const techName = `${techObj.nombre || ''} ${techObj.apellido || ''}`.trim();
        const formattedDate = reportData.fecha_informe ? new Date(reportData.fecha_informe).toLocaleDateString('es-ES') : '';
        const reportIdPadded = (reportData.informe_id || 0).toString().padStart(6, '0');

        // Formatear firmas con prefijo si falta
        const ensureBase64Prefix = (str) => {
            if (!str) return '';
            if (str.startsWith('data:image')) return str;
            return `data:image/png;base64,${str}`;
        };

        const firmaTecnico = ensureBase64Prefix(reportData.FirmaTecnico?.base64_data);
        const firmaCliente = ensureBase64Prefix(reportData.FirmaCliente?.base64_data);

        // 1. Resolver los if/else primero (antes de inyectar variables)
        const processConditional = (htmlStr, condition, tagName) => {
            // Caso 1: {{#if tag}} ... {{else}} ... {{/if}}
            const regexWithElse = new RegExp(`{{#if ${tagName}}}([\\s\\S]*?){{else}}([\\s\\S]*?){{\\/if}}`, 'g');
            htmlStr = htmlStr.replace(regexWithElse, (match, ifBlock, elseBlock) => {
                return condition ? ifBlock : elseBlock;
            });
            
            // Caso 2: {{#if tag}} ... {{/if}} (sin else)
            const regexWithoutElse = new RegExp(`{{#if ${tagName}}}([\\s\\S]*?){{\\/if}}`, 'g');
            htmlStr = htmlStr.replace(regexWithoutElse, (match, ifBlock) => {
                return condition ? ifBlock : '';
            });
            
            return htmlStr;
        };

        html = processConditional(html, !!logoBase64, 'logoBase64');
        html = processConditional(html, !!(reportData.observaciones || reportData.observaciones_tecnico), 'techObservations');
        html = processConditional(html, !!firmaTecnico, 'firmaTecnico');
        html = processConditional(html, !!firmaCliente, 'firmaCliente');

        // 2. Reemplazo de Variables (Simple Interpolation)
        const replacements = {
            '{{logoBase64}}': logoBase64,
            '{{reportTitle}}': reportTitle,
            '{{titleColorClass}}': titleColorClass,
            '{{borderColorClass}}': borderColorClass,
            '{{reportId}}': reportIdPadded,
            '{{fechaEmision}}': formattedDate,
            '{{clientName}}': clientName,
            '{{contactName}}': contactName,
            '{{clientAddress}}': clientAddress,
            '{{techName}}': techName,
            '{{workDescription}}': reportData.descripcion_trabajo || 'Sin descripción detallada.',
            '{{techObservations}}': reportData.observaciones || reportData.observaciones_tecnico || '',
            '{{firmaTecnico}}': firmaTecnico,
            '{{firmaCliente}}': firmaCliente
        };

        for (const [key, value] of Object.entries(replacements)) {
            html = html.split(key).join(value || '');
        }

        // Iniciar Puppeteer
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
        
        await browser.close();
        res.end(pdfBuffer);
    } catch (error) {
        console.error('Error al generar PDF con Puppeteer:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error interno generando el PDF' });
        }
    }
};

module.exports = { generateReportPDF };