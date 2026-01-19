/**
 * Quantum Risk PDF Generator
 * Generates comprehensive quantum risk analysis reports
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatDate, formatValue, formatArray, getRiskMeta, COLORS } from './formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'QuantumVault.png');

/**
 * Generate a PDF report for the quantum risk analysis
 */
export const generateRiskPDF = (formData, riskScores) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'LETTER',
                margins: { top: 40, bottom: 40, left: 50, right: 50 },
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const margin = 50;
            const contentWidth = doc.page.width - margin * 2;

            // Helper functions
            const drawBackground = () => {
                doc.save();
                doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.background);
                doc.restore();
            };

            const drawFooter = () => {
                doc
                    .font('Helvetica')
                    .fontSize(8)
                    .fillColor(COLORS.muted)
                    .text('QuantumVault by Dytallix', margin, doc.page.height - margin + 12, {
                        align: 'center',
                        width: contentWidth,
                    });
            };

            const drawSectionTitle = (title, y) => {
                doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.accent).text(title.toUpperCase(), margin, y);
                return y + 18;
            };

            const drawKeyValue = (label, value, y) => {
                const labelText = label.toUpperCase();
                doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(labelText, margin, y);
                const labelHeight = doc.heightOfString(labelText, { width: contentWidth });
                doc
                    .font('Helvetica')
                    .fontSize(11)
                    .fillColor(COLORS.text)
                    .text(value, margin, y + labelHeight + 4, { width: contentWidth });
                const valueHeight = doc.heightOfString(value, { width: contentWidth });
                return y + labelHeight + valueHeight + 12;
            };

            const drawBriefingCards = (startY) => {
                const cards = [
                    {
                        title: 'HNDL (Harvest Now, Decrypt Later)',
                        description: 'Encrypted data can be captured today and decrypted later when CRQCs arrive.',
                    },
                    {
                        title: 'CRQC (Cryptographically Relevant Quantum Computer)',
                        description: 'A CRQC can break RSA and ECC, undermining TLS, PKI, and signatures.',
                    },
                    {
                        title: "Shor's Algorithm",
                        description: 'Efficiently factors large integers and breaks RSA and ECC.',
                    },
                    {
                        title: "Grover's Algorithm",
                        description: 'Speeds brute-force search, halving symmetric key strength.',
                    },
                ];

                const cardGap = 16;
                const cardWidth = (contentWidth - cardGap) / 2;
                const cardPadding = 10;
                let leftY = startY;
                let rightY = startY;

                cards.forEach((card, index) => {
                    const isLeft = index % 2 === 0;
                    const x = isLeft ? margin : margin + cardWidth + cardGap;
                    const y = isLeft ? leftY : rightY;

                    doc.font('Helvetica-Bold').fontSize(10);
                    const titleHeight = doc.heightOfString(card.title, { width: cardWidth - cardPadding * 2 });
                    doc.font('Helvetica').fontSize(9);
                    const bodyHeight = doc.heightOfString(card.description, { width: cardWidth - cardPadding * 2 });
                    const cardHeight = titleHeight + bodyHeight + cardPadding * 2 + 6;

                    doc.roundedRect(x, y, cardWidth, cardHeight, 6).fillColor(COLORS.card).fill();
                    doc
                        .font('Helvetica-Bold')
                        .fontSize(10)
                        .fillColor(COLORS.accent2)
                        .text(card.title, x + cardPadding, y + cardPadding, { width: cardWidth - cardPadding * 2 });
                    doc
                        .font('Helvetica')
                        .fontSize(9)
                        .fillColor(COLORS.text)
                        .text(card.description, x + cardPadding, y + cardPadding + titleHeight + 4, {
                            width: cardWidth - cardPadding * 2,
                        });

                    if (isLeft) {
                        leftY = y + cardHeight + cardGap;
                    } else {
                        rightY = y + cardHeight + cardGap;
                    }
                });

                return Math.max(leftY, rightY);
            };

            const drawRiskBar = (label, score, description, y) => {
                const meta = getRiskMeta(score);
                const barWidth = contentWidth - 140;
                const barHeight = 10;

                doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.text).text(label, margin, y);
                y += 16;

                doc.roundedRect(margin, y, barWidth, barHeight, 4).fillColor(COLORS.track).fill();
                if (score > 0) {
                    doc.roundedRect(margin, y, (score / 100) * barWidth, barHeight, 4).fillColor(meta.color).fill();
                }

                doc.font('Helvetica-Bold').fontSize(10).fillColor(meta.color).text(`${score}/100`, margin + barWidth + 8, y - 3);
                doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(meta.label, margin + barWidth + 62, y - 2);

                y += 20;
                doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(description, margin, y, { width: contentWidth });
                return y + 24;
            };

            // Page 1: Organization Profile + Briefing
            drawBackground();

            const headerY = margin - 8;
            if (fs.existsSync(LOGO_PATH)) {
                doc.image(LOGO_PATH, margin, headerY, { width: 46, height: 46 });
            }

            const brandX = margin + 60;
            doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.text).text('QuantumVault', brandX, headerY + 2);
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('PQC Enterprise Security by Dytallix', brandX, headerY + 24);

            doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.text).text('Quantum Risk Report', margin, headerY + 4, { align: 'right', width: contentWidth });
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`Generated ${formatDate(new Date())}`, margin, headerY + 26, {
                align: 'right',
                width: contentWidth,
            });

            let y = headerY + 70;
            y = drawSectionTitle('Organization Profile', y);
            y = drawKeyValue('Industry', formatValue(formData.industry), y);
            y = drawKeyValue('Region', formatValue(formData.region), y);
            y = drawKeyValue('Organization Size', formatValue(formData.orgSize), y);
            y = drawKeyValue('Regulatory Regime', formatValue(formData.regulatoryRegime), y);
            y = drawKeyValue('Data Types', formatArray(formData.dataTypes), y);
            y = drawKeyValue('Current Cryptography', formatArray(formData.cryptography), y);

            y += 6;
            y = drawSectionTitle('Quantum Threat Briefing', y);
            drawBriefingCards(y);
            drawFooter();

            // Page 2: Risk Scores
            doc.addPage();
            drawBackground();
            y = margin;
            doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.text).text('Risk Assessment Results', margin, y);
            y += 26;
            doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Scores reflect exposure and migration urgency based on the submitted profile.', margin, y, {
                width: contentWidth,
            });
            y += 26;

            y = drawRiskBar('HNDL Risk', riskScores.hndl, 'Likelihood that encrypted data is being harvested for future decryption.', y);
            y = drawRiskBar('CRQC Risk', riskScores.crqc, 'Exposure to quantum computers capable of breaking RSA and ECC.', y);
            y = drawRiskBar('Migration Urgency', riskScores.urgency || 0, 'How quickly your organization should begin a PQC transition.', y);
            drawFooter();

            // Page 3: Migration Strategy + CTA
            doc.addPage();
            drawBackground();
            y = margin;
            doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.text).text('Post-Quantum Migration Strategy', margin, y);
            y += 26;
            doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('A generalized framework for moving to quantum-safe cryptography.', margin, y, {
                width: contentWidth,
            });
            y += 24;

            const steps = [
                {
                    title: 'Inventory Cryptography',
                    description: 'Catalog algorithms, certificates, keys, and protocols across infrastructure and vendors.',
                },
                {
                    title: 'Classify Data Longevity',
                    description: 'Identify data that must remain confidential for 5-15+ years and prioritize it.',
                },
                {
                    title: 'Prioritize High-Risk Systems',
                    description: 'Focus on TLS, PKI, authentication, and signing pipelines with external exposure.',
                },
                {
                    title: 'Adopt NIST PQC + Hybrid',
                    description: 'Pilot Kyber and Dilithium alongside existing algorithms to preserve compatibility.',
                },
                {
                    title: 'Validate and Migrate',
                    description: 'Run pilots, test interoperability, and phase migrations by risk tier.',
                },
                {
                    title: 'Govern and Monitor',
                    description: 'Establish ownership, timelines, and continuous monitoring as quantum capabilities advance.',
                },
            ];

            steps.forEach((step, index) => {
                doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent).text(`${index + 1}.`, margin, y);
                doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text(step.title, margin + 20, y - 2);
                doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(step.description, margin + 20, y + 12, { width: contentWidth - 20 });
                y += 36;
            });

            const ctaHeight = 110;
            const ctaY = Math.min(y + 8, doc.page.height - margin - ctaHeight);
            doc.roundedRect(margin, ctaY, contentWidth, ctaHeight, 10).fillColor(COLORS.card).fill();
            doc.roundedRect(margin, ctaY, contentWidth, ctaHeight, 10).strokeColor(COLORS.accent2).lineWidth(1).stroke();
            doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.text).text('Deploy QuantumVault to Secure Vulnerable Data and Systems', margin + 16, ctaY + 14, {
                width: contentWidth - 32,
            });
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(
                'QuantumVault delivers enterprise-grade PQC readiness with visibility, migration tooling, and cryptographic policy enforcement.',
                margin + 16,
                ctaY + 40,
                { width: contentWidth - 32 }
            );
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent).text('hello@dytallix.com', margin + 16, ctaY + 82);
            doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text('dytallix.com/quantumvault', margin + 150, ctaY + 82);

            drawFooter();

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
