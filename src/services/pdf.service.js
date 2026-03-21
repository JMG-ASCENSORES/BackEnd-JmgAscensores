const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const generateReportPDF = async (reportData, res) => {
    try {
        const templatePath = path.join(__dirname, '../templates/informe_template.html');
        let html = fs.readFileSync(templatePath, 'utf8');

        // Configuración de Colores y Títulos
        const isMaintenance = reportData.tipo_informe.toLowerCase() === 'mantenimiento';
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
        const formattedDate = new Date(reportData.fecha_informe).toLocaleDateString('es-ES');
        const reportIdPadded = reportData.informe_id.toString().padStart(6, '0');

        // Reemplazo de Variables (Simple Interpolation)
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
            '{{techObservations}}': reportData.observaciones_tecnico || ''
        };

        for (const [key, value] of Object.entries(replacements)) {
            // Usamos split y join en lugar de replaceAll para máxima compatibilidad node version
            html = html.split(key).join(value || '');
        }

        // Si no hay logo base64, limpia las etiquetas que se basan en él mediante un regex simple de condicionales
        if (!logoBase64) {
            html = html.replace('{{#if logoBase64}}', '').replace('{{else}}', '').replace('{{/if}}', '');
        } else {
             html = html.replace('{{#if logoBase64}}', '')
                        .replace(/{{else}}[\s\S]*?{{\/if}}/, ''); // Elimina el bloque else
        }

        if (!reportData.observaciones_tecnico) {
             html = html.replace(/{{#if techObservations}}[\s\S]*?{{\/if}}/, '');
        } else {
             html = html.replace('{{#if techObservations}}', '').replace('{{/if}}', '');
        }

        // Iniciar Puppeteer
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Esperamos a networkidle0 para garantizar que Tailwind CDN inyecte todos los estilos
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        
        await browser.close();
        
        // Enviar buffer PDF al cliente
        res.end(pdfBuffer);
    } catch (error) {
        console.error('Error al generar PDF con Puppeteer:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error interno generando el PDF' });
        }
    }
};

module.exports = { generateReportPDF };