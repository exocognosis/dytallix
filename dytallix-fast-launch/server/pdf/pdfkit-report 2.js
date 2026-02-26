/**
 * Quantum Risk PDF Generator (PDFKit Edition)
 * 
 * Pure Node.js PDF generation - no browser, no Playwright.
 * Fast, reliable, predictable.
 */

import { logInfo } from '../logger.js';

// Color palette matching the frontend
const COLORS = {
    primary: '#1e40af',
    dark: '#0f172a',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    critical: '#ff4d4d',
    high: '#f97316',
    medium: '#fbbf24',
    low: '#22c55e',
    white: '#ffffff'
};

/**
 * Get risk level metadata based on score
 */
const getRiskMeta = (score) => {
    if (score >= 90) return { label: 'Critical', color: COLORS.critical };
    if (score >= 70) return { label: 'High', color: COLORS.high };
    if (score >= 40) return { label: 'Medium', color: COLORS.medium };
    return { label: 'Low', color: COLORS.low };
};

/**
 * Draw a circular gauge chart
 */
const drawGauge = (doc, x, y, score, label, sublabel) => {
    const radius = 40;
    const meta = getRiskMeta(score);
    
    // Background circle
    doc.circle(x, y, radius)
       .lineWidth(8)
       .strokeColor(COLORS.lightGray)
       .stroke();
    
    // Score arc (simplified - full circle for now, PDFKit arcs are complex)
    doc.circle(x, y, radius)
       .lineWidth(8)
       .strokeColor(meta.color)
       .stroke();
    
    // Score text
    doc.fillColor(COLORS.dark)
       .fontSize(18)
       .font('Helvetica-Bold')
       .text(score.toString(), x - 15, y - 10, { width: 30, align: 'center' });
    
    // Label below
    doc.fillColor(COLORS.gray)
       .fontSize(10)
       .font('Helvetica')
       .text(label, x - 40, y + 50, { width: 80, align: 'center' });
    
    if (sublabel) {
        doc.fontSize(8)
           .text(sublabel, x - 70, y + 62, { width: 140, align: 'center' });
    }
    
    // Risk level label
    doc.fillColor(meta.color)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text(meta.label, x - 40, y + 75, { width: 80, align: 'center' });
};

/**
 * Draw a section header
 */
const drawSectionHeader = (doc, title, y) => {
    doc.fillColor(COLORS.primary)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(title, 50, y);
    
    doc.moveTo(50, y + 18)
       .lineTo(545, y + 18)
       .lineWidth(1)
       .strokeColor(COLORS.lightGray)
       .stroke();
    
    return y + 30;
};

/**
 * Generate a professional quantum risk PDF report
 * 
 * @param {Object} formData - User's organization data
 * @param {Object} riskScores - Calculated risk scores
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generatePDFReport = async (formData, riskScores) => {
    logInfo('Generating PDFKit report', { formData, riskScores });

    // Lazy-load PDFKit so the server can start quickly; PDF generation is an on-demand path.
    const { default: PDFDocument } = await import('pdfkit');
    
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'LETTER',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                autoFirstPage: true,
                info: {
                    Title: 'Quantum Risk Analysis Report',
                    Author: 'Dytallix',
                    Subject: 'Post-Quantum Cryptography Risk Assessment'
                }
            });
            
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            
            // === PAGE 1: Cover & Summary ===
            
            // Header
            doc.fillColor(COLORS.primary)
               .fontSize(28)
               .font('Helvetica-Bold')
               .text('Quantum Risk Analysis', 50, 50);
            
            doc.fillColor(COLORS.gray)
               .fontSize(12)
               .font('Helvetica')
               .text('Post-Quantum Cryptography Assessment Report', 50, 85);
            
            // Date
            const reportDate = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            doc.fontSize(10)
               .text(`Generated: ${reportDate}`, 50, 105);
            
            // Organization Profile Section
            let y = drawSectionHeader(doc, 'Organization Profile', 140);
            
            const orgFields = [
                ['Industry', formData.industry || 'Not specified'],
                ['Region', formData.region || 'Not specified'],
                ['Organization Size', formData.orgSize || 'Not specified'],
                ['Regulatory Framework', formData.regulatoryRegime || 'Not specified'],
                ['Data Types', Array.isArray(formData.dataTypes) ? formData.dataTypes.join(', ') : 'Not specified'],
                ['Current Cryptography', Array.isArray(formData.cryptography) ? formData.cryptography.join(', ') : 'Not specified']
            ];
            
            orgFields.forEach(([label, value]) => {
                doc.fillColor(COLORS.gray)
                   .fontSize(10)
                   .font('Helvetica-Bold')
                   .text(label + ':', 50, y, { continued: true })
                   .font('Helvetica')
                   .fillColor(COLORS.dark)
                   .text('  ' + value);
                y += 18;
            });
            
            // Risk Scores Section
            y = drawSectionHeader(doc, 'Risk Assessment Scores', y + 30);
            
            // Draw three gauges
            const gaugeY = y + 60;
            drawGauge(doc, 130, gaugeY, riskScores.hndl || 0, 'HNDL Risk', 'Harvest Now, Decrypt Later');
            drawGauge(doc, 297, gaugeY, riskScores.crqc || 0, 'CRQC Risk', 'Quantum Computer Threat');
            drawGauge(doc, 464, gaugeY, riskScores.migration || riskScores.urgency || 0, 'Migration', 'Urgency Score');
            
            // Risk Explanation Section
            y = gaugeY + 120;
            y = drawSectionHeader(doc, 'What These Scores Mean', y);
            
            const explanations = [
                {
                    title: 'HNDL (Harvest Now, Decrypt Later)',
                    text: 'Adversaries may be collecting encrypted data today to decrypt once quantum computers become available. High scores indicate your data has long-term value to attackers.'
                },
                {
                    title: 'CRQC (Cryptographically Relevant Quantum Computer)',
                    text: 'Measures how vulnerable your current cryptographic implementations will be when large-scale quantum computers arrive. Organizations using RSA or ECC are at highest risk.'
                },
                {
                    title: 'Migration Urgency',
                    text: 'Based on your regulatory requirements, data sensitivity, and current cryptographic posture, this indicates how quickly you should begin post-quantum migration.'
                }
            ];
            
            explanations.forEach(exp => {
                doc.fillColor(COLORS.dark)
                   .fontSize(11)
                   .font('Helvetica-Bold')
                   .text(exp.title, 50, y);
                y += 15;
                doc.fillColor(COLORS.gray)
                   .fontSize(10)
                   .font('Helvetica')
                   .text(exp.text, 50, y, { width: 495 });
                y += 45;
            });
            
            // === PAGE 2: Recommendations ===
            doc.addPage();
            
            doc.fillColor(COLORS.primary)
               .fontSize(20)
               .font('Helvetica-Bold')
               .text('Recommendations', 50, 50);
            
            y = 90;
            
            const overallScore = riskScores.overall || Math.round((riskScores.hndl + riskScores.crqc + (riskScores.migration || riskScores.urgency || 0)) / 3);
            const overallMeta = getRiskMeta(overallScore);
            
            // Overall risk badge
            doc.roundedRect(50, y, 495, 60, 8)
               .fillColor(COLORS.lightGray)
               .fill();
            
            doc.fillColor(overallMeta.color)
               .fontSize(14)
               .font('Helvetica-Bold')
               .text(`Overall Risk Level: ${overallMeta.label}`, 70, y + 15);
            
            doc.fillColor(COLORS.dark)
               .fontSize(11)
               .font('Helvetica')
               .text(`Your organization has a combined risk score of ${overallScore}/100`, 70, y + 35);
            
            y += 80;
            y = drawSectionHeader(doc, 'Recommended Actions', y);
            
            const recommendations = [
                {
                    priority: 'Critical',
                    title: 'Cryptographic Inventory Assessment',
                    description: 'Conduct a comprehensive audit of all cryptographic implementations across your infrastructure to identify quantum-vulnerable algorithms.'
                },
                {
                    priority: 'High',
                    title: 'Post-Quantum Algorithm Evaluation',
                    description: 'Begin evaluating NIST-approved post-quantum algorithms (ML-KEM, ML-DSA) for compatibility with your systems.'
                },
                {
                    priority: 'High',
                    title: 'Hybrid Cryptography Implementation',
                    description: 'Implement hybrid schemes that combine classical and post-quantum algorithms to maintain backward compatibility while adding quantum resistance.'
                },
                {
                    priority: 'Medium',
                    title: 'Key Management Review',
                    description: 'Review and update key management practices to support larger key sizes required by post-quantum algorithms.'
                },
                {
                    priority: 'Medium',
                    title: 'Vendor Assessment',
                    description: 'Evaluate your vendors\' and partners\' quantum readiness to ensure your supply chain is not a weak point.'
                }
            ];
            
            recommendations.forEach((rec, i) => {
                const priorityColor = rec.priority === 'Critical' ? COLORS.critical : 
                                     rec.priority === 'High' ? COLORS.high : COLORS.medium;
                
                // Priority badge
                doc.roundedRect(50, y, 60, 16, 3)
                   .fillColor(priorityColor)
                   .fill();
                
                doc.fillColor(COLORS.white)
                   .fontSize(8)
                   .font('Helvetica-Bold')
                   .text(rec.priority.toUpperCase(), 55, y + 4);
                
                // Title and description
                doc.fillColor(COLORS.dark)
                   .fontSize(11)
                   .font('Helvetica-Bold')
                   .text(rec.title, 120, y);
                
                doc.fillColor(COLORS.gray)
                   .fontSize(9)
                   .font('Helvetica')
                   .text(rec.description, 120, y + 15, { width: 420 });
                
                y += 55;
            });
            
            // What's Next Section
            y += 20;
            y = drawSectionHeader(doc, "What's Next", y);
            
            doc.fillColor(COLORS.dark)
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('The Threat is Happening Now', 50, y);
            y += 16;
            
            doc.fillColor(COLORS.gray)
               .fontSize(10)
               .font('Helvetica')
               .text('Harvest Now, Decrypt Later (HNDL) attacks are not a future threat—they are happening today. Adversaries are actively collecting encrypted data from organizations like yours, storing it until quantum computers can break current encryption. Every day without quantum-safe protection is another day your sensitive data may be harvested.', 50, y, { width: 495 });
            y += 55;
            
            doc.fillColor(COLORS.dark)
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('The Cost of Inaction', 50, y);
            y += 16;
            
            doc.fillColor(COLORS.gray)
               .fontSize(10)
               .font('Helvetica')
               .text('Data breaches are increasingly costly—both financially and reputationally. The faster you implement quantum-resistant solutions, the lower your exposure and the less costly your migration will be. Organizations that wait will face higher costs, greater complexity, and increased risk.', 50, y, { width: 495 });
            y += 50;
            
            // CTA Box
            doc.roundedRect(50, y, 495, 55, 8)
               .fillColor(COLORS.primary)
               .fill();
            
            doc.fillColor(COLORS.white)
               .fontSize(13)
               .font('Helvetica-Bold')
               .text('Begin Your QuantumVault Consultation', 70, y + 10);
            
            doc.fillColor(COLORS.white)
               .fontSize(9)
               .font('Helvetica')
               .text('Contact Dytallix today at hello@dytallix.com to start protecting your organization with enterprise-grade post-quantum cryptography.', 70, y + 28, { width: 445 });
            
            // Footer - right after CTA box on same page
            doc.fillColor(COLORS.gray)
               .fontSize(8)
               .font('Helvetica')
               .text('QuantumVault - PQC Enterprise Security by Dytallix | www.dytallix.com', 50, y + 70, { width: 495, align: 'center' });
            
            // Finalize
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
};

export default { generatePDFReport };
