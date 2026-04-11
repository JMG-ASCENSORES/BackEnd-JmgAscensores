const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ── Color palette (matches original HTML template) ──────────────
const COLORS = {
  primary:     '#003B73',
  primaryDark: '#002a54',
  green:       '#059669',
  white:       '#FFFFFF',
  textDark:    '#1e293b',
  textMuted:   '#64748b',
  textLight:   '#94a3b8',
  textDesc:    '#334155',
  bgLight:     '#f1f5f9',
  border:      '#e2e8f0',
  borderLight: '#f1f5f9',
  obsBackground: '#fff7ed',
  obsBorder:   '#f97316',
  obsText:     '#7c2d12',
  checkGreen:  '#16a34a',
  checkRed:    '#dc2626',
  checkBgGreen:'#f0fdf4',
  checkBgRed:  '#fff5f5',
  checkCatBg:  '#1e3a5f',
};

// ── Helper: hex to RGB array ────────────────────────────────────
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
};

// ── Helper: draw a filled rectangle ─────────────────────────────
const drawRect = (doc, x, y, w, h, color) => {
  doc.save().rect(x, y, w, h).fill(color).restore();
};

// ── Helper: draw bordered rectangle ─────────────────────────────
const drawBorderedRect = (doc, x, y, w, h, borderColor, borderWidth = 0.5) => {
  doc.save().rect(x, y, w, h).lineWidth(borderWidth).strokeColor(borderColor).stroke().restore();
};

// ── Helper: truncate text with ellipsis if needed ───────────────
const safeText = (val) => (val || '').toString();

const generateReportPDF = async (report, res) => {
  try {
    // Asegurar que reportData sea un objeto plano
    const reportData = (typeof report.get === 'function') ? report.get({ plain: true }) : report;

    const isMaintenance = reportData.tipo_informe?.toLowerCase() === 'mantenimiento';
    const isTechnical = !isMaintenance;

    // ── Data extraction (same logic as before) ──────────────────
    const clientObj = reportData.Cliente || {};
    const techObj   = reportData.Trabajador || {};
    const clientName   = clientObj.nombre_comercial || `${clientObj.contacto_nombre || ''} ${clientObj.contacto_apellido || ''}`.trim() || 'Cliente General';
    const contactName  = `${clientObj.contacto_nombre || ''} ${clientObj.contacto_apellido || ''}`.trim() || 'N/A';
    const clientAddress = clientObj.direccion || clientObj.ubicacion || 'No registrada';
    const techName     = `${techObj.nombre || ''} ${techObj.apellido || ''}`.trim();

    // Formateo de fecha 100% manual para evitar desfases UTC
    let formattedDate = '';
    if (reportData.fecha_informe) {
      const dateStr = String(reportData.fecha_informe).split('T')[0];
      const [year, month, day] = dateStr.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    const reportIdPadded = (reportData.informe_id || 0).toString().padStart(6, '0');
    const observations = reportData.observaciones || reportData.observaciones_tecnico || '';
    const workDescription = reportData.descripcion_trabajo || 'Sin descripcion detallada.';

    // Firmas base64
    const ensureBase64 = (str) => {
      if (!str) return null;
      if (str.startsWith('data:image')) return str;
      return `data:image/png;base64,${str}`;
    };
    const firmaTecnicoB64 = ensureBase64(reportData.FirmaTecnico?.base64_data);
    const firmaClienteB64 = ensureBase64(reportData.FirmaCliente?.base64_data);

    // Logo
    const logoPath = path.join(__dirname, '../assets/jmg_logo.png');
    const hasLogo = fs.existsSync(logoPath);

    // ── Page setup ──────────────────────────────────────────────
    const PAGE_W = 595.28; // A4 width in points
    const PAGE_H = 841.89; // A4 height in points
    const M = 28;          // ~10mm margin in points
    const CW = PAGE_W - M * 2; // content width

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: M, bottom: M, left: M, right: M },
      bufferPages: true,
      info: {
        Title: `Informe ${reportIdPadded} - ${clientName}`,
        Author: 'JMG Ascensores',
        Subject: isMaintenance ? 'Informe de Mantenimiento' : 'Informe Tecnico',
      }
    });

    // Pipe directly to response
    doc.pipe(res);

    let y = M; // current Y position

    // ════════════════════════════════════════════════════════════
    // ① HEADER CORPORATIVO
    // ════════════════════════════════════════════════════════════
    const HEADER_H = 48;
    const rightBlockW = 170;

    // Background
    drawRect(doc, M, y, CW, HEADER_H, COLORS.primary);
    // Right darker block
    drawRect(doc, M + CW - rightBlockW, y, rightBlockW, HEADER_H, COLORS.primaryDark);

    // Logo or brand text
    if (hasLogo) {
      try {
        doc.image(logoPath, M + 10, y + 6, { height: 36 });
      } catch (e) {
        doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.white)
           .text('JMG ASCENSORES', M + 10, y + 12);
      }
    } else {
      doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.white)
         .text('JMG ASCENSORES', M + 10, y + 10);
      doc.font('Helvetica').fontSize(6).fillColor(COLORS.white)
         .text('MANTENIMIENTO & ASCENSORES', M + 10, y + 28);
    }

    // Right info
    const rX = M + CW - rightBlockW + 8;
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.white);
    doc.text('RUC: 20421037648',             rX, y + 8,  { width: rightBlockW - 16, align: 'right' });
    doc.text('Villa el Salvador - Lima, Peru', rX, y + 18, { width: rightBlockW - 16, align: 'right' });
    doc.text('jmgascensores@gmail.com',       rX, y + 28, { width: rightBlockW - 16, align: 'right' });
    doc.text('Tel: +51 999 999 999',           rX, y + 38, { width: rightBlockW - 16, align: 'right' });

    y += HEADER_H + 5;

    // ════════════════════════════════════════════════════════════
    // ② TITLE BAR
    // ════════════════════════════════════════════════════════════
    const TITLE_H = 24;
    drawRect(doc, M, y, CW, TITLE_H, COLORS.bgLight);
    drawBorderedRect(doc, M, y, CW, TITLE_H, COLORS.border);

    const titleText = isMaintenance
      ? 'INFORME DE MANTENIMIENTO PREVENTIVO'
      : 'INFORME TECNICO DE SERVICIO';
    const titleColor = isMaintenance ? COLORS.primary : COLORS.green;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(titleColor)
       .text(titleText, M + 10, y + 7);

    // Meta info (right side)
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
       .text(`N° Informe: `, M + CW - 140, y + 5, { continued: true, width: 130, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(COLORS.textDark).text(reportIdPadded);
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted)
       .text(`Fecha: `, M + CW - 140, y + 14, { continued: true, width: 130, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(COLORS.textDark).text(formattedDate);

    y += TITLE_H + 5;

    // ════════════════════════════════════════════════════════════
    // ③ CLIENT + TECHNICIAN SECTION
    // ════════════════════════════════════════════════════════════
    const clientW = CW * 0.62;
    const techW   = CW - clientW - 5;
    const SECTION_HEADER_H = 16;
    const INFO_BODY_H = 56;

    // --- Client section ---
    drawRect(doc, M, y, clientW, SECTION_HEADER_H, COLORS.primary);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
       .text('DATOS DEL CLIENTE', M + 8, y + 4);

    const clientBodyY = y + SECTION_HEADER_H;
    drawBorderedRect(doc, M, y, clientW, SECTION_HEADER_H + INFO_BODY_H, COLORS.border);

    // Client fields
    const labelStyle = () => doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.textLight);
    const valueStyle = () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.textDark);

    labelStyle().text('NOMBRE COMERCIAL', M + 8, clientBodyY + 5);
    valueStyle().text(safeText(clientName), M + 8, clientBodyY + 14, { width: clientW / 2 - 16 });

    labelStyle().text('CONTACTO', M + clientW / 2, clientBodyY + 5);
    valueStyle().text(safeText(contactName), M + clientW / 2, clientBodyY + 14, { width: clientW / 2 - 16 });

    labelStyle().text('DIRECCION / UBICACION', M + 8, clientBodyY + 30);
    valueStyle().text(safeText(clientAddress), M + 8, clientBodyY + 39, { width: clientW - 16 });

    // --- Technician section ---
    const techX = M + clientW + 5;
    drawRect(doc, techX, y, techW, SECTION_HEADER_H, COLORS.primary);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
       .text('PERSONAL ASIGNADO', techX + 8, y + 4);

    drawBorderedRect(doc, techX, y, techW, SECTION_HEADER_H + INFO_BODY_H, COLORS.border);

    labelStyle().text('TECNICO RESPONSABLE', techX + 8, clientBodyY + 5);
    valueStyle().text(safeText(techName), techX + 8, clientBodyY + 14, { width: techW - 16 });

    y += SECTION_HEADER_H + INFO_BODY_H + 5;

    // ════════════════════════════════════════════════════════════
    // ④ WORK DESCRIPTION / MAINTENANCE CHECKLIST
    // ════════════════════════════════════════════════════════════
    if (isTechnical) {
      // --- Technical: Work Description ---
      drawRect(doc, M, y, CW, SECTION_HEADER_H, COLORS.green);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
         .text('DESCRIPCION DEL TRABAJO REALIZADO', M + 8, y + 4);
      y += SECTION_HEADER_H;

      const descStartY = y;
      // Measure text height
      const descHeight = doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textDesc)
        .heightOfString(safeText(workDescription), { width: CW - 20 });
      const descBoxH = Math.max(descHeight + 14, 70);

      drawBorderedRect(doc, M, descStartY - SECTION_HEADER_H, CW, SECTION_HEADER_H + descBoxH, COLORS.border);

      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textDesc)
         .text(safeText(workDescription), M + 10, descStartY + 6, { width: CW - 20 });

      y = descStartY + descBoxH + 5;

    } else if (isMaintenance && reportData.OrdenTrabajo?.detalles) {
      // --- Maintenance: Checklist ---
      drawRect(doc, M, y, CW, SECTION_HEADER_H, COLORS.primary);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
         .text('DESCRIPCION DEL TRABAJO', M + 8, y + 4);
      y += SECTION_HEADER_H;

      const checklistStartY = y;
      const checklist = reportData.OrdenTrabajo.detalles;

      // Group tasks by category
      const groups = {};
      checklist.forEach(item => {
        const cat = item.TareaMaestra?.categoria || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
      });

      const cats = Object.entries(groups);
      const COL_W = (CW - 8) / 2;
      const totalTasks = checklist.length;
      let accumulated = 0;
      let splitIdx = 0;
      for (let i = 0; i < cats.length; i++) {
        accumulated += cats[i][1].length;
        if (accumulated >= Math.ceil(totalTasks / 2)) { splitIdx = i + 1; break; }
      }
      const leftCats  = cats.slice(0, splitIdx || Math.ceil(cats.length / 2));
      const rightCats = cats.slice(splitIdx || Math.ceil(cats.length / 2));

      // Render one column of categories
      const renderChecklistColumn = (columnCats, startX, startY) => {
        let cy = startY;
        columnCats.forEach(([cat, tasks]) => {
          // Category header
          drawRect(doc, startX, cy, COL_W, 13, COLORS.checkCatBg);
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.white)
             .text(cat.toUpperCase(), startX + 6, cy + 3, { width: COL_W - 12 });
          cy += 13;

          // Tasks
          tasks.forEach(task => {
            const done = task.realizado;
            const rowH = 14;
            const bgColor = done ? COLORS.checkBgGreen : COLORS.checkBgRed;

            drawRect(doc, startX, cy, COL_W, rowH, bgColor);
            // Bottom border
            doc.save().moveTo(startX, cy + rowH).lineTo(startX + COL_W, cy + rowH)
               .lineWidth(0.3).strokeColor(COLORS.borderLight).stroke().restore();

            // Check/X indicator circle
            const circleX = startX + 10;
            const circleY = cy + rowH / 2;
            const circleColor = done ? COLORS.checkGreen : COLORS.checkRed;
            doc.save().circle(circleX, circleY, 4).fill(circleColor).restore();

            // Checkmark or X
            doc.save().lineWidth(1.2).strokeColor(COLORS.white).lineCap('round');
            if (done) {
              doc.moveTo(circleX - 2, circleY).lineTo(circleX - 0.5, circleY + 1.5)
                 .lineTo(circleX + 2.5, circleY - 2).stroke();
            } else {
              doc.moveTo(circleX - 2, circleY - 2).lineTo(circleX + 2, circleY + 2).stroke();
              doc.moveTo(circleX + 2, circleY - 2).lineTo(circleX - 2, circleY + 2).stroke();
            }
            doc.restore();

            // Task description
            doc.font('Helvetica').fontSize(7).fillColor(COLORS.textDark)
               .text(safeText(task.TareaMaestra?.descripcion_tarea), startX + 20, cy + 3, {
                 width: COL_W - 28, height: rowH - 4
               });
            cy += rowH;
          });
          cy += 4; // gap between categories
        });
        return cy;
      };

      const leftEndY  = renderChecklistColumn(leftCats, M + 2, checklistStartY);
      const rightEndY = renderChecklistColumn(rightCats, M + 2 + COL_W + 4, checklistStartY);
      const checkEndY = Math.max(leftEndY, rightEndY);

      drawBorderedRect(doc, M, checklistStartY - SECTION_HEADER_H, CW, SECTION_HEADER_H + (checkEndY - checklistStartY) + 4, COLORS.border);

      y = checkEndY + 8;
    }

    // ════════════════════════════════════════════════════════════
    // ⑤ OBSERVACIONES
    // ════════════════════════════════════════════════════════════
    if (observations) {
      // Check if we need a new page
      if (y > PAGE_H - 180) {
        doc.addPage();
        y = M;
      }

      const obsTextHeight = doc.font('Helvetica').fontSize(8)
        .heightOfString(`Observaciones del Tecnico: ${observations}`, { width: CW - 24 });
      const obsH = Math.max(obsTextHeight + 12, 24);

      drawRect(doc, M, y, CW, obsH, COLORS.obsBackground);
      // Left orange border
      drawRect(doc, M, y, 3, obsH, COLORS.obsBorder);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.obsText)
         .text('Observaciones del Tecnico: ', M + 10, y + 6, { continued: true, width: CW - 24 });
      doc.font('Helvetica').text(safeText(observations));

      y += obsH + 5;
    }

    // ════════════════════════════════════════════════════════════
    // ⑥ FIRMAS
    // ════════════════════════════════════════════════════════════
    // Push signatures towards bottom if there's space
    const SIGNATURES_BLOCK_H = 70;
    if (y < PAGE_H - M - SIGNATURES_BLOCK_H - 30) {
      y = PAGE_H - M - SIGNATURES_BLOCK_H - 30;
    } else if (y > PAGE_H - M - SIGNATURES_BLOCK_H - 10) {
      doc.addPage();
      y = PAGE_H - M - SIGNATURES_BLOCK_H - 30;
    }

    const sigW = 120;
    const sigTechX = M + CW * 0.25 - sigW / 2;
    const sigCliX = M + CW * 0.75 - sigW / 2;

    // Render signature images
    const renderSignature = (b64, x, labelText) => {
      if (b64) {
        try {
          const raw = b64.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(raw, 'base64');
          doc.image(imgBuffer, x + 20, y, { height: 36, width: sigW - 40 });
        } catch (e) {
          // Silently skip broken images
        }
      }
      // Line
      doc.save().moveTo(x, y + 42).lineTo(x + sigW, y + 42)
         .lineWidth(1).strokeColor(COLORS.textLight).stroke().restore();
      // Label
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.textMuted)
         .text(labelText.toUpperCase(), x, y + 46, { width: sigW, align: 'center' });
    };

    renderSignature(firmaTecnicoB64, sigTechX, 'Firma del Tecnico');
    renderSignature(firmaClienteB64, sigCliX, 'Firma del Cliente');

    y += SIGNATURES_BLOCK_H;

    // ════════════════════════════════════════════════════════════
    // ⑦ FOOTER
    // ════════════════════════════════════════════════════════════
    const footerY = PAGE_H - M - 14;
    doc.save().moveTo(M, footerY).lineTo(M + CW, footerY)
       .lineWidth(0.3).strokeColor(COLORS.borderLight).stroke().restore();

    doc.font('Helvetica').fontSize(6).fillColor(COLORS.textLight)
       .text(`Documento generado digitalmente por Plataforma JMG Ascensores  |  ${formattedDate}`,
         M, footerY + 4, { width: CW, align: 'center' });

    // ── Finalize ────────────────────────────────────────────────
    doc.end();

  } catch (error) {
    console.error('Error al generar PDF con PDFKit:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error interno generando el PDF' });
    }
  }
};

module.exports = { generateReportPDF };