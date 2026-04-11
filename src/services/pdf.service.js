const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');
const path = require('path');
const fs = require('fs');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const generateReportPDF = async (report, res) => {
    try {
        // Asegurar que reportData sea un objeto plano
        const reportData = (typeof report.get === 'function') ? report.get({ plain: true }) : report;

        const templatePath = path.join(__dirname, '../templates/informe_template.html');
        let html = fs.readFileSync(templatePath, 'utf8');

        // Configuración de Colores y Títulos
        const isMaintenance = reportData.tipo_informe?.toLowerCase() === 'mantenimiento';
        const isTechnical = !isMaintenance;
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
        
        // Formateo de fecha 100% manual para evitar desfases UTC
        let formattedDate = '';
        if (reportData.fecha_informe) {
            const dateStr = String(reportData.fecha_informe).split('T')[0];
            const [year, month, day] = dateStr.split('-');
            formattedDate = `${day}/${month}/${year}`;
        }
        
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

        // Checklist de Mantenimiento — layout side-by-side en 2 columnas
        let checklistHtml = '';
        if (isMaintenance && reportData.OrdenTrabajo?.detalles) {
            const checklist = reportData.OrdenTrabajo.detalles;
            const groups = {};
            checklist.forEach(item => {
                const cat = item.TareaMaestra?.categoria || 'General';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(item);
            });

            // Separar categorías en dos columnas balanceadas
            const cats = Object.entries(groups);
            const totalTasks = checklist.length;
            let accumulated = 0;
            let splitIdx = 0;
            for (let i = 0; i < cats.length; i++) {
                accumulated += cats[i][1].length;
                if (accumulated >= Math.ceil(totalTasks / 2)) { splitIdx = i + 1; break; }
            }
            const leftCats  = cats.slice(0, splitIdx || Math.ceil(cats.length / 2));
            const rightCats = cats.slice(splitIdx || Math.ceil(cats.length / 2));

            const renderColumn = (columnCats) => {
                let html = '';
                columnCats.forEach(([cat, tasks]) => {
                    html += `<div style="break-inside:avoid; margin-bottom:6px;">`;
                    html += `<div style="background:#1e3a5f; color:#fff; padding:3px 8px; font-size:7.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em;">${cat}</div>`;
                    tasks.forEach(task => {
                        const done = task.realizado;
                        const dot  = done
                            ? `<svg width="10" height="10" viewBox="0 0 10 10" style="vertical-align:middle;margin-right:4px;flex-shrink:0"><circle cx="5" cy="5" r="5" fill="#16a34a"/><path d="M2.5 5l1.8 1.8L7.5 3.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`
                            : `<svg width="10" height="10" viewBox="0 0 10 10" style="vertical-align:middle;margin-right:4px;flex-shrink:0"><circle cx="5" cy="5" r="5" fill="#dc2626"/><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
                        const rowBg = done ? '#f0fdf4' : '#fff5f5';
                        html += `<div style="display:flex; align-items:center; background:${rowBg}; padding:3.5px 8px; border-bottom:1px solid #f1f5f9;">`;
                        html += dot;
                        html += `<span style="font-size:8.5px; color:#1e293b; font-weight:500; flex:1;">${task.TareaMaestra?.descripcion_tarea || ''}</span>`;
                        html += `</div>`;
                    });
                    html += `</div>`;
                });
                return html;
            };

            checklistHtml = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-family:Arial,sans-serif;">
                <div>${renderColumn(leftCats)}</div>
                <div>${renderColumn(rightCats)}</div>
            </div>`;
        }

        html = processConditional(html, !!logoBase64, 'logoBase64');
        html = processConditional(html, !!(reportData.observaciones || reportData.observaciones_tecnico), 'techObservations');
        html = processConditional(html, !!firmaTecnico, 'firmaTecnico');
        html = processConditional(html, !!firmaCliente, 'firmaCliente');
        html = processConditional(html, isMaintenance, 'isMaintenance');
        html = processConditional(html, isTechnical, 'isTechnical');

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
            '{{firmaCliente}}': firmaCliente,
            '{{{maintenanceChecklist}}}': checklistHtml
        };

        for (const [key, value] of Object.entries(replacements)) {
            html = html.split(key).join(value || '');
        }

        // Iniciar Puppeteer
        const browser = await puppeteer.launch({
            args: IS_PRODUCTION ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport,
            executablePath: IS_PRODUCTION ? await chromium.executablePath() : undefined,
            headless: IS_PRODUCTION ? chromium.headless : true,
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        
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