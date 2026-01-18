import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from './logger.js';

/**
 * Email service for sending quantum risk analysis reports
 */

// Create email transporter
// In production, configure with real SMTP credentials via environment variables
const createTransporter = () => {
  // Check if we have SMTP credentials configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    let port = parseInt(process.env.SMTP_PORT || '587', 10);
    // Validate port is within valid range
    if (port < 1 || port > 65535) {
      logError('Invalid SMTP_PORT value, using default 587', { port });
      port = 587;
    }
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Development mode: log emails to console
  logInfo('Email service running in development mode (emails will be logged, not sent)');
  return nodemailer.createTransport({
    jsonTransport: true
  });
};

const transporter = createTransporter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, 'assets', 'QuantumVault.png');

/**
 * Generate a PDF report for the quantum risk analysis
 */
const generateRiskPDF = (formData, riskScores) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const COLORS = {
        background: '#071a33',
        backgroundDeep: '#051327',
        accent: '#2fe3d0',
        accent2: '#4fb3ff',
        text: '#f8fbff',
        muted: '#b7c7e6',
        card: '#0f2644',
        track: '#1b3150'
      };

      const margin = 50;
      const contentWidth = doc.page.width - margin * 2;

      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      const formatValue = (value) => (value && value.toString().trim() ? value.toString().trim() : 'Not provided');
      const formatArray = (value) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Not provided');

      const getRiskMeta = (score) => {
        if (score >= 90) return { label: 'Critical', color: '#ff4d4d' };
        if (score >= 70) return { label: 'High', color: '#f97316' };
        if (score >= 40) return { label: 'Medium', color: '#fbbf24' };
        return { label: 'Low', color: '#22c55e' };
      };

      const drawBackground = () => {
        doc.save();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.background);
        doc.restore();
      };

      const drawFooter = () => {
        doc.font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text('QuantumVault by Dytallix', margin, doc.page.height - margin + 12, {
            align: 'center',
            width: contentWidth
          });
      };

      const drawSectionTitle = (title, y) => {
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(COLORS.accent)
          .text(title.toUpperCase(), margin, y);
        return y + 18;
      };

      const drawKeyValue = (label, value, y) => {
        const labelText = label.toUpperCase();
        doc.font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(labelText, margin, y);
        const labelHeight = doc.heightOfString(labelText, { width: contentWidth });
        doc.font('Helvetica')
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
            description: 'Encrypted data can be captured today and decrypted later when CRQCs arrive.'
          },
          {
            title: 'CRQC (Cryptographically Relevant Quantum Computer)',
            description: 'A CRQC can break RSA and ECC, undermining TLS, PKI, and signatures.'
          },
          {
            title: "Shor's Algorithm",
            description: 'Efficiently factors large integers and breaks RSA and ECC.'
          },
          {
            title: "Grover's Algorithm",
            description: 'Speeds brute-force search, halving symmetric key strength.'
          }
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
          doc.font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(COLORS.accent2)
            .text(card.title, x + cardPadding, y + cardPadding, { width: cardWidth - cardPadding * 2 });
          doc.font('Helvetica')
            .fontSize(9)
            .fillColor(COLORS.text)
            .text(card.description, x + cardPadding, y + cardPadding + titleHeight + 4, {
              width: cardWidth - cardPadding * 2
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

        doc.font('Helvetica-Bold')
          .fontSize(12)
          .fillColor(COLORS.text)
          .text(label, margin, y);
        y += 16;

        doc.roundedRect(margin, y, barWidth, barHeight, 4).fillColor(COLORS.track).fill();
        if (score > 0) {
          doc.roundedRect(margin, y, (score / 100) * barWidth, barHeight, 4).fillColor(meta.color).fill();
        }

        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(meta.color)
          .text(`${score}/100`, margin + barWidth + 8, y - 3);
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(meta.label, margin + barWidth + 62, y - 2);

        y += 20;
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(description, margin, y, { width: contentWidth });
        return y + 24;
      };

      // Page 1: Organization Profile + Briefing
      drawBackground();

      const headerY = margin - 8;
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, margin, headerY, { width: 46, height: 46 });
      }

      const brandX = margin + 60;
      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(COLORS.text)
        .text('QuantumVault', brandX, headerY + 2);
      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('PQC Enterprise Security by Dytallix', brandX, headerY + 24);

      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(COLORS.text)
        .text('Quantum Risk Report', margin, headerY + 4, { align: 'right', width: contentWidth });
      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(`Generated ${formatDate(new Date())}`, margin, headerY + 26, {
          align: 'right',
          width: contentWidth
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
      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(COLORS.text)
        .text('Risk Assessment Results', margin, y);
      y += 26;
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text('Scores reflect exposure and migration urgency based on the submitted profile.', margin, y, {
          width: contentWidth
        });
      y += 26;

      y = drawRiskBar(
        'HNDL Risk',
        riskScores.hndl,
        'Likelihood that encrypted data is being harvested for future decryption.',
        y
      );
      y = drawRiskBar(
        'CRQC Risk',
        riskScores.crqc,
        'Exposure to quantum computers capable of breaking RSA and ECC.',
        y
      );
      y = drawRiskBar(
        'Migration Urgency',
        riskScores.urgency || 0,
        'How quickly your organization should begin a PQC transition.',
        y
      );
      drawFooter();

      // Page 3: Migration Strategy + CTA
      doc.addPage();
      drawBackground();
      y = margin;
      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(COLORS.text)
        .text('Post-Quantum Migration Strategy', margin, y);
      y += 26;
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text('A generalized framework for moving to quantum-safe cryptography.', margin, y, {
          width: contentWidth
        });
      y += 24;

      const steps = [
        {
          title: 'Inventory Cryptography',
          description: 'Catalog algorithms, certificates, keys, and protocols across infrastructure and vendors.'
        },
        {
          title: 'Classify Data Longevity',
          description: 'Identify data that must remain confidential for 5-15+ years and prioritize it.'
        },
        {
          title: 'Prioritize High-Risk Systems',
          description: 'Focus on TLS, PKI, authentication, and signing pipelines with external exposure.'
        },
        {
          title: 'Adopt NIST PQC + Hybrid',
          description: 'Pilot Kyber and Dilithium alongside existing algorithms to preserve compatibility.'
        },
        {
          title: 'Validate and Migrate',
          description: 'Run pilots, test interoperability, and phase migrations by risk tier.'
        },
        {
          title: 'Govern and Monitor',
          description: 'Establish ownership, timelines, and continuous monitoring as quantum capabilities advance.'
        }
      ];

      steps.forEach((step, index) => {
        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COLORS.accent)
          .text(`${index + 1}.`, margin, y);
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(COLORS.text)
          .text(step.title, margin + 20, y - 2);
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(step.description, margin + 20, y + 12, { width: contentWidth - 20 });
        y += 36;
      });

      const ctaHeight = 110;
      const ctaY = Math.min(y + 8, doc.page.height - margin - ctaHeight);
      doc.roundedRect(margin, ctaY, contentWidth, ctaHeight, 10).fillColor(COLORS.card).fill();
      doc.roundedRect(margin, ctaY, contentWidth, ctaHeight, 10).strokeColor(COLORS.accent2).lineWidth(1).stroke();
      doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(COLORS.text)
        .text('Deploy QuantumVault to Secure Vulnerable Data and Systems', margin + 16, ctaY + 14, {
          width: contentWidth - 32
        });
      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(
          'QuantumVault delivers enterprise-grade PQC readiness with visibility, migration tooling, and cryptographic policy enforcement.',
          margin + 16,
          ctaY + 40,
          { width: contentWidth - 32 }
        );
      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.accent)
        .text('hello@dytallix.com', margin + 16, ctaY + 82);
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.text)
        .text('dytallix.com/quantumvault', margin + 150, ctaY + 82);

      drawFooter();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Send quantum risk analysis email
 */
export const sendQuantumRiskEmail = async (userEmail, formData, riskScores) => {
  try {
    logInfo('Generating quantum risk PDF', { userEmail });
    
    // Generate PDF
    const pdfBuffer = await generateRiskPDF(formData, riskScores);
    
    logInfo('PDF generated successfully', { size: pdfBuffer.length });
    
    // Prepare email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dytallix.com',
      to: userEmail,
      bcc: 'hello@dytallix.com', // Send copy to hello@dytallix.com
      subject: 'Your Quantum Risk Analysis Report',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Your Quantum Risk Analysis Report</h2>
          
          <p>Thank you for completing the Quantum Risk Assessment with Dytallix.</p>
          
          <p>Please find your personalized risk analysis report attached to this email.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Quick Summary</h3>
            <p style="margin: 10px 0;">
              <strong>HNDL Risk:</strong> ${riskScores.hndl}/100<br>
              <strong>CRQC Risk:</strong> ${riskScores.crqc}/100<br>
              <strong>Migration Urgency:</strong> ${riskScores.urgency || 0}/100
            </p>
          </div>
          
          <p>If you have any questions about your risk assessment or would like to discuss quantum-safe solutions for your organization, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The Dytallix Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            Dytallix - Post-Quantum Cryptography Solutions<br>
            <a href="https://dytallix.com" style="color: #1e40af;">https://dytallix.com</a>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'quantum-risk-analysis.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Check if we're in development mode (using jsonTransport)
    const isDevelopmentMode = !process.env.SMTP_HOST || !process.env.SMTP_USER;
    
    if (isDevelopmentMode && info.messageId) {
      logInfo('Email sent (development mode)', { 
        messageId: info.messageId,
        message: info.message?.toString()
      });
    } else {
      logInfo('Email sent successfully', { 
        messageId: info.messageId,
        userEmail 
      });
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logError('Failed to send quantum risk email', { 
      error: error.message,
      userEmail 
    });
    throw error;
  }
};

export default { sendQuantumRiskEmail };
