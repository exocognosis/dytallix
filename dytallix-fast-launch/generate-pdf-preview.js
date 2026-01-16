#!/usr/bin/env node

/**
 * Generate and save the quantum risk PDF locally for visual inspection
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color palette
const COLORS = {
    primary: '#0f172a',
    secondary: '#1e40af',
    accent: '#06b6d4',
    textDark: '#1f2937',
    textMuted: '#6b7280',
    textLight: '#9ca3af',
    riskLow: '#10b981',
    riskMedium: '#f59e0b',
    riskHigh: '#ef4444',
    riskCritical: '#7f1d1d',
    background: '#f8fafc',
    border: '#e2e8f0',
};

const getRiskLevel = (score) => {
    if (score < 30) return { label: 'Low', color: COLORS.riskLow };
    if (score < 70) return { label: 'Medium', color: COLORS.riskMedium };
    if (score < 90) return { label: 'High', color: COLORS.riskHigh };
    return { label: 'Critical', color: COLORS.riskCritical };
};

const drawRiskBarChart = (doc, x, y, width, scores) => {
    const barHeight = 35;
    const barSpacing = 20;
    const labelWidth = 130;
    const barMaxWidth = width - labelWidth - 80;

    const data = [
        { name: 'HNDL Risk', score: scores.hndl || 0 },
        { name: 'CRQC Risk', score: scores.crqc || 0 },
        { name: 'Migration Urgency', score: scores.urgency || 0 },
    ];

    data.forEach((item, index) => {
        const barY = y + (index * (barHeight + barSpacing));
        const riskLevel = getRiskLevel(item.score);
        const barWidth = (item.score / 100) * barMaxWidth;

        doc.fontSize(11).fillColor(COLORS.textDark).font('Helvetica').text(item.name, x, barY + 10, { width: labelWidth, lineBreak: false });
        doc.roundedRect(x + labelWidth, barY + 5, barMaxWidth, barHeight - 10, 4).fillColor('#e5e7eb').fill();
        if (barWidth > 0) {
            doc.roundedRect(x + labelWidth, barY + 5, barWidth, barHeight - 10, 4).fillColor(riskLevel.color).fill();
        }
        doc.fontSize(12).fillColor(riskLevel.color).font('Helvetica-Bold').text(`${item.score}`, x + labelWidth + barMaxWidth + 10, barY + 10, { lineBreak: false });
        doc.fontSize(9).fillColor(COLORS.textMuted).font('Helvetica').text(`(${riskLevel.label})`, x + labelWidth + barMaxWidth + 35, barY + 11, { lineBreak: false });
    });

    return (data.length * (barHeight + barSpacing));
};

const drawDivider = (doc, y) => {
    doc.moveTo(50, y).lineTo(545, y).strokeColor(COLORS.border).lineWidth(1).stroke();
};

// Draw footer on current page - must be called BEFORE adding new page
const drawFooter = (doc) => {
    const pageHeight = 841.89; // A4 height in points
    doc.fontSize(9)
        .fillColor(COLORS.textLight)
        .font('Helvetica')
        .text('QuantumVault by Dytallix  |  www.dytallix.com', 50, pageHeight - 50, {
            align: 'center',
            width: 495,
            lineBreak: false
        });
};

// Sample data
const formData = {
    industry: 'Finance & Banking',
    region: 'United States',
    dataTypes: ['PII (Personally Identifiable Information)', 'Financial Records'],
    cryptography: ['RSA-2048 (Legacy)', 'AES-256 (Symmetric)'],
    regulatoryRegime: 'SEC / NYDFS (US Finance)',
    orgSize: 'Enterprise (500 - 5000 employees)'
};

const riskScores = { hndl: 75, crqc: 65, urgency: 60 };

console.log('Generating PDF...');

const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 60, left: 50, right: 50 },
    autoFirstPage: true
});

const outputPath = path.join(__dirname, 'quantum-risk-preview.pdf');
const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// =====================
// PAGE 1
// =====================
const headerY = 35;
const logoWidth = 160;
const titleStartX = 230;

// Left column: Logo
const logoPath = path.join(__dirname, 'server', 'assets', 'QuantumVault.png');
if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, headerY, { width: logoWidth });
    console.log('✅ Logo loaded successfully');
} else {
    console.error('❌ Logo not found at:', logoPath);
    doc.fontSize(18).fillColor(COLORS.secondary).font('Helvetica-Bold').text('QuantumVault', 50, headerY + 15, { lineBreak: false });
}

// Right column: Title and Date
doc.fontSize(24).fillColor(COLORS.primary).font('Helvetica-Bold').text('Quantum Risk Profile', titleStartX, headerY + 10, { width: 315, lineBreak: false });
doc.fontSize(10).fillColor(COLORS.textMuted).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, titleStartX, headerY + 40, { width: 315, lineBreak: false });

let currentY = 110;

// QUANTUM THREATS SECTION
drawDivider(doc, currentY);
currentY += 15;

doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text('Understanding Quantum Threats', 50, currentY, { lineBreak: false });
currentY += 25;

doc.fontSize(11).fillColor(COLORS.secondary).font('Helvetica-Bold').text('HNDL (Harvest Now, Decrypt Later)', 50, currentY, { lineBreak: false });
currentY += 15;
doc.fontSize(10).fillColor(COLORS.textDark).font('Helvetica').text('Adversaries are collecting encrypted data today, storing it until quantum computers can decrypt it. Data that needs to remain confidential for 10+ years is already at risk.', 50, currentY, { width: 495 });
currentY += 35;

doc.fontSize(11).fillColor(COLORS.secondary).font('Helvetica-Bold').text('CRQC (Cryptographically Relevant Quantum Computer)', 50, currentY, { lineBreak: false });
currentY += 15;
doc.fontSize(10).fillColor(COLORS.textDark).font('Helvetica').text('A quantum computer powerful enough to break current encryption. Expected within 10-15 years, this will render RSA, ECC, and similar algorithms obsolete.', 50, currentY, { width: 495 });
currentY += 35;

// Algorithm explanations
doc.fontSize(11).fillColor(COLORS.secondary).font('Helvetica-Bold').text("Shor's Algorithm", 50, currentY, { lineBreak: false });
doc.fontSize(11).fillColor(COLORS.secondary).font('Helvetica-Bold').text("Grover's Algorithm", 300, currentY, { lineBreak: false });
currentY += 15;

doc.fontSize(9).fillColor(COLORS.textDark).font('Helvetica').text('Breaks RSA and ECC by efficiently factoring large numbers. Eliminates public-key cryptography security.', 50, currentY, { width: 230 });
doc.fontSize(9).fillColor(COLORS.textDark).font('Helvetica').text('Speeds up brute-force attacks on symmetric encryption. Reduces AES-256 to AES-128 equivalent security.', 300, currentY, { width: 230 });
currentY += 45;

// ORGANIZATION PROFILE
drawDivider(doc, currentY);
currentY += 15;

doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text('Your Organization Profile', 50, currentY, { lineBreak: false });
currentY += 22;

const profileData = [['Industry', formData.industry], ['Region', formData.region], ['Organization Size', formData.orgSize], ['Regulatory Regime', formData.regulatoryRegime]];
profileData.forEach(([label, value]) => {
    doc.fontSize(10).fillColor(COLORS.textMuted).font('Helvetica').text(`${label}: `, 50, currentY, { continued: true, lineBreak: false }).fillColor(COLORS.textDark).text(value, { lineBreak: false });
    currentY += 16;
});

doc.fontSize(10).fillColor(COLORS.textMuted).font('Helvetica').text('Data Types: ', 50, currentY, { continued: true, lineBreak: false }).fillColor(COLORS.textDark).text(formData.dataTypes.join(' • '), { lineBreak: false });
currentY += 16;

doc.fontSize(10).fillColor(COLORS.textMuted).text('Current Cryptography: ', 50, currentY, { continued: true, lineBreak: false }).fillColor(COLORS.textDark).text(formData.cryptography.join(' • '), { lineBreak: false });
currentY += 25;

// RISK ASSESSMENT
drawDivider(doc, currentY);
currentY += 15;

doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text('Your Quantum Risk Assessment', 50, currentY, { lineBreak: false });
currentY += 25;

drawRiskBarChart(doc, 50, currentY, 495, riskScores);

// Footer for page 1
drawFooter(doc);

// =====================
// PAGE 2
// =====================
doc.addPage();
currentY = 50;

doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text('Post-Quantum Cryptography Transition Strategy', 50, currentY, { lineBreak: false });
currentY += 25;

doc.fontSize(10).fillColor(COLORS.textDark).font('Helvetica').text('To protect your organization against quantum threats, we recommend the following strategic roadmap:', 50, currentY, { width: 495 });
currentY += 30;

const tasks = [
    { title: '1. Cryptographic Inventory Audit', desc: 'Catalog all cryptographic assets including certificates, keys, algorithms, and protocols in use across your infrastructure.' },
    { title: '2. Identify Quantum-Vulnerable Systems', desc: 'Prioritize systems based on data sensitivity, longevity requirements, and exposure to HNDL attacks.' },
    { title: '3. Evaluate NIST-Approved PQC Algorithms', desc: 'Assess CRYSTALS-Kyber (key encapsulation), CRYSTALS-Dilithium, FALCON, and SPHINCS+ (digital signatures) for your use cases.' },
    { title: '4. Implement Hybrid Encryption', desc: 'Deploy hybrid schemes combining classical and post-quantum algorithms during the transition period for backward compatibility.' },
    { title: '5. Migrate Critical Systems First', desc: 'Prioritize long-lived secrets, key exchange mechanisms, and systems handling sensitive data with extended confidentiality requirements.' },
    { title: '6. Continuous Monitoring', desc: 'Stay informed about quantum computing advancements and update migration timelines accordingly.' }
];

tasks.forEach((task) => {
    doc.fontSize(11).fillColor(COLORS.secondary).font('Helvetica-Bold').text(task.title, 50, currentY, { lineBreak: false });
    currentY += 16;
    doc.fontSize(9).fillColor(COLORS.textDark).font('Helvetica').text(task.desc, 60, currentY, { width: 475 });
    currentY += 32;
});

currentY += 10;

// CTA
drawDivider(doc, currentY);
currentY += 20;

doc.roundedRect(50, currentY, 495, 100, 8).fillColor('#eff6ff').fill();
doc.roundedRect(50, currentY, 495, 100, 8).strokeColor(COLORS.secondary).lineWidth(2).stroke();
currentY += 15;

doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text('Ready to Quantum-Proof Your Organization?', 70, currentY, { lineBreak: false });
currentY += 22;

doc.fontSize(10).fillColor(COLORS.textDark).font('Helvetica').text('Our team of post-quantum cryptography experts can help you assess your risk, develop a migration roadmap, and implement quantum-safe solutions tailored to your needs.', 70, currentY, { width: 455 });
currentY += 40;

doc.fontSize(11).fillColor(COLORS.secondary).font('Helvetica-Bold').text('Contact us: hello@dytallix.com  |  dytallix.com/contact', 70, currentY, { lineBreak: false });

// Footer for page 2
drawFooter(doc);

// End document
doc.end();

writeStream.on('finish', () => {
    console.log(`\n✅ PDF generated successfully!`);
    console.log(`📄 Output: ${outputPath}`);
});

writeStream.on('error', (err) => {
    console.error('❌ Error writing PDF:', err);
});
