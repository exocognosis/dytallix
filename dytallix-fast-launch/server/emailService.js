import nodemailer from 'nodemailer';
import { chromium } from 'playwright';
import { logInfo, logError } from './logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email service for sending quantum risk analysis reports
 * 
 * This service generates PDFs using Playwright to render the React QuantumRiskReport
 * component, then attaches them to emails.
 */

// Create email transporter
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    let port = parseInt(process.env.SMTP_PORT || '587', 10);
    if (port < 1 || port > 65535) {
      logError('Invalid SMTP_PORT value, using default 587', { port });
      port = 587;
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  logInfo('Email service running in development mode (emails will be logged, not sent)');
  return nodemailer.createTransport({ jsonTransport: true });
};

const transporter = createTransporter();

/**
 * Write report data to a temporary JSON file that the frontend can load
 */
const writeReportData = async (formData, riskScores) => {
  const reportData = {
    generatedAt: new Date().toISOString(),
    organization: {
      industry: formData.industry || 'Not specified',
      region: formData.region || 'Not specified',
      orgSize: formData.orgSize || 'Not specified',
      regulatoryRegime: formData.regulatoryRegime || 'Not specified',
      dataTypes: formData.dataTypes || [],
      cryptography: formData.cryptography || []
    },
    scores: {
      hndl: riskScores.hndl || 0,
      crqc: riskScores.crqc || 0,
      urgency: riskScores.urgency || 0
    },
    recommendations: generateRecommendations(riskScores),
    exposure: {
      harvestNowDecryptLater: {
        level: getRiskLevel(riskScores.hndl),
        description: 'Your organization processes sensitive data that could be harvested today and decrypted when quantum computers become available.',
        affectedSystems: ['Customer databases', 'Transaction logs', 'Identity records']
      },
      cryptographicallyRelevantQuantumComputer: {
        level: getRiskLevel(riskScores.crqc),
        description: 'Current cryptographic implementations will be vulnerable when CRQCs become available.',
        affectedSystems: ['TLS/SSL communications', 'Digital signatures', 'Key exchange protocols']
      }
    }
  };

  // Write to public folder where the frontend can access it
  const publicPath = path.join(__dirname, '..', 'build', 'public', 'report.json');
  fs.writeFileSync(publicPath, JSON.stringify(reportData, null, 2));

  // Also write to dist folder if it exists (for production builds)
  const distPath = path.join(__dirname, '..', 'build', 'dist', 'report.json');
  if (fs.existsSync(path.dirname(distPath))) {
    fs.writeFileSync(distPath, JSON.stringify(reportData, null, 2));
  }

  return reportData;
};

const getRiskLevel = (score) => {
  if (score >= 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const generateRecommendations = (riskScores) => {
  const recommendations = [];

  if (riskScores.hndl >= 70 || riskScores.crqc >= 70) {
    recommendations.push({
      priority: 'Critical',
      title: 'Immediate PQC Assessment',
      description: 'Conduct an immediate assessment of all quantum-vulnerable cryptographic systems, focusing on RSA and ECC implementations.'
    });
    recommendations.push({
      priority: 'High',
      title: 'Migration Roadmap',
      description: 'Develop a comprehensive post-quantum cryptography (PQC) migration plan with defined milestones and resource allocation.'
    });
  }

  if (riskScores.hndl >= 50) {
    recommendations.push({
      priority: 'High',
      title: 'Data Classification',
      description: 'Classify sensitive data by longevity requirements to prioritize protection against Harvest Now, Decrypt Later attacks.'
    });
  }

  recommendations.push({
    priority: 'Medium',
    title: 'Vendor Coordination',
    description: 'Engage with technology vendors to understand their PQC roadmaps and ensure alignment with your migration timeline.'
  });

  return recommendations;
};

/**
 * Generate PDF using Playwright to render the React report component
 */
const generateRiskPDF = async (formData, riskScores) => {
  logInfo('Generating PDF via Playwright', { formData, riskScores });

  // Write report data for the frontend to load
  await writeReportData(formData, riskScores);

  // Determine the frontend URL
  // In production, nginx serves the frontend on port 80
  // In development, use the dev server on port 3000
  let reportUrl;
  if (process.env.NODE_ENV === 'production' || process.env.FRONTEND_URL) {
    reportUrl = process.env.FRONTEND_URL || 'http://localhost/quantumrisk?mode=report';
  } else {
    const frontendPort = process.env.FRONTEND_PORT || 3000;
    const frontendHost = process.env.FRONTEND_HOST || 'localhost';
    reportUrl = `http://${frontendHost}:${frontendPort}/quantumrisk?mode=report`;
  }

  logInfo('Launching Playwright for PDF generation', { reportUrl });

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 816, height: 1056 }
    });

    const page = await context.newPage();

    await page.goto(reportUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for the report to render
    await page.waitForSelector('.quantum-risk-report', {
      state: 'visible',
      timeout: 10000
    });

    // Wait for fonts
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });

    logInfo('PDF generated successfully', { size: pdfBuffer.length });

    return pdfBuffer;

  } finally {
    await browser.close();
  }
};

/**
 * Send quantum risk analysis email with PDF attachment
 */
export const sendQuantumRiskEmail = async (userEmail, formData, riskScores) => {
  try {
    logInfo('Generating quantum risk PDF', { userEmail });

    const pdfBuffer = await generateRiskPDF(formData, riskScores);

    logInfo('PDF generated, sending email', { size: pdfBuffer.length, userEmail });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dytallix.com',
      to: userEmail,
      bcc: 'hello@dytallix.com',
      subject: 'Your Quantum Risk Analysis Report',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f172a;">Your Quantum Risk Analysis Report</h2>
          
          <p>Thank you for completing the Quantum Risk Assessment with QuantumVault.</p>
          
          <p>Please find your personalized risk analysis report attached to this email.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488;">
            <h3 style="margin-top: 0; color: #0f172a;">Quick Summary</h3>
            <p style="margin: 10px 0;">
              <strong>HNDL Risk:</strong> ${riskScores.hndl}/100<br>
              <strong>CRQC Risk:</strong> ${riskScores.crqc}/100<br>
              <strong>Migration Urgency:</strong> ${riskScores.urgency || 0}/100
            </p>
          </div>
          
          <p>If you have questions or would like to discuss quantum-safe solutions for your organization, please contact us.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The QuantumVault Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #64748b;">
            QuantumVault - PQC Enterprise Security by Dytallix<br>
            <a href="https://dytallix.com" style="color: #0d9488;">https://dytallix.com</a>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'quantum-risk-report.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);

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
      stack: error.stack,
      userEmail
    });
    throw error;
  }
};

export default { sendQuantumRiskEmail };
