const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generateReportPDF = (reportData, res) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Paleta de colores
    const primaryColor = '#003B73'; 
    const accentColor = reportData.tipo_informe === 'Mantenimiento' ? '#003B73' : '#10B981';
    const textColor = '#333333';
    const lightGray = '#F5F5F5';

    // --- ENCABEZADO ---
    doc.rect(0, 0, 612, 120).fill(primaryColor); 

    const logoPath = path.join(__dirname, '../assets/jmg_logo.png');
    
    if (fs.existsSync(logoPath)) {
        // Colocamos el logo. Al ya tener el nombre, no imprimimos "JMG ASCENSORES" en texto.
        doc.image(logoPath, 50, 30, { width: 140 }); 
    } else {
        // Backup en texto solo si el archivo de imagen falla
        doc
            .fillColor('#FFFFFF')
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('JMG ASCENSORES', 50, 50);
    }

    // Datos de la empresa alineados a la derecha
    doc
        .fillColor('#FFFFFF')
        .font('Helvetica')
        .fontSize(10)
        .text('RUC: 20421037648', 400, 45, { align: 'right' })
        .text('Villa el Salvador - Lima, Perú', 400, 60, { align: 'right' })
        .text('jmgascensores@gmail.com', 400, 75, { align: 'right' });

    // --- TÍTULO DEL INFORME ---
    const reportTitle = reportData.tipo_informe === 'Mantenimiento' ? 'INFORME DE MANTENIMIENTO' : 'INFORME TÉCNICO';
    
    doc.moveDown(5);
    doc
        .fillColor(accentColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(reportTitle, 50, 150, { align: 'center' });

    // Línea decorativa bajo el título
    doc
        .moveTo(200, 172)
        .lineTo(412, 172)
        .strokeColor(accentColor)
        .lineWidth(1)
        .stroke();

    doc
        .fillColor(textColor)
        .fontSize(10)
        .font('Helvetica')
        .text(`N° Informe: ${reportData.informe_id.toString().padStart(6, '0')}`, 50, 185, { align: 'center' })
        .text(`Fecha de Emisión: ${new Date(reportData.fecha_informe).toLocaleDateString('es-ES')}`, 50, 200, { align: 'center' });

    // --- SECCIÓN: INFORMACIÓN DEL CLIENTE ---
    doc.moveDown(2);
    const customerBoxTop = 230;
    
    doc.rect(50, customerBoxTop, 500, 20).fill(lightGray);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('DATOS DEL CLIENTE', 60, customerBoxTop + 5);

    doc.fillColor(textColor).font('Helvetica').fontSize(10);
    const col1 = 60, col2 = 160;
    let currentY = customerBoxTop + 30;

    const drawRow = (label, value) => {
        doc.font('Helvetica-Bold').text(label, col1, currentY);
        doc.font('Helvetica').text(value || 'N/A', col2, currentY);
        currentY += 18;
    };

    const clientName = reportData.Cliente?.nombre_comercial 
                    || `${reportData.Cliente?.contacto_nombre || ''} ${reportData.Cliente?.contacto_apellido || ''}`.trim() 
                    || 'Cliente General';

    const contactName = `${reportData.Cliente?.contacto_nombre || ''} ${reportData.Cliente?.contacto_apellido || ''}`.trim() || 'N/A';

    drawRow('Cliente:', clientName);
    drawRow('Dirección:', reportData.Cliente?.direccion || reportData.Cliente?.ubicacion || 'No registrada');
    drawRow('Contacto:', contactName);
    drawRow('Técnico:', `${reportData.Trabajador?.nombre || ''} ${reportData.Trabajador?.apellido || ''}`);

    // --- SECCIÓN: DETALLES DEL TRABAJO ---
    currentY += 10;
    doc.rect(50, currentY, 500, 20).fill(lightGray);
    doc.fillColor(primaryColor).font('Helvetica-Bold').text('DESCRIPCIÓN DEL TRABAJO REALIZADO', 60, currentY + 5);
    
    currentY += 30;
    doc.fillColor(textColor).font('Helvetica').fontSize(10);
    doc.text(reportData.descripcion_trabajo || 'Sin descripción detallada.', 50, currentY, {
        width: 500,
        align: 'justify',
        lineGap: 4
    });

    // --- OBSERVACIONES ---
    if (reportData.observaciones_tecnico) {
        doc.moveDown(2);
        doc.fillColor('#D32F2F').font('Helvetica-Bold').text('OBSERVACIONES:');
        doc.fillColor(textColor).font('Helvetica').text(reportData.observaciones_tecnico, { width: 500 });
    }

    // --- FIRMAS ---
    const footerY = 720;
    doc.strokeColor('#CCCCCC').lineWidth(1);
    
    doc.moveTo(70, footerY).lineTo(230, footerY).stroke();
    doc.moveTo(370, footerY).lineTo(530, footerY).stroke();

    doc
        .fontSize(9)
        .text('Firma del Técnico', 70, footerY + 10, { width: 160, align: 'center' })
        .text('Firma del Cliente', 370, footerY + 10, { width: 160, align: 'center' });

    doc.end();
};

module.exports = { generateReportPDF };