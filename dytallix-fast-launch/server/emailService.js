import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { logInfo, logError } from './logger.js';

/**
 * Email service for sending quantum risk analysis reports
 */

// Create email transporter
// In production, configure with real SMTP credentials via environment variables
const createTransporter = () => {
  // Check if we have SMTP credentials configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
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

/**
 * Generate a PDF report for the quantum risk analysis
 */
const generateRiskPDF = (formData, riskScores) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Title
      doc.fontSize(24)
         .fillColor('#1e40af')
         .text('Quantum Risk Analysis Report', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12)
         .fillColor('#6b7280')
         .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      
      doc.moveDown(2);
      
      // Organization Profile Section
      doc.fontSize(16)
         .fillColor('#000000')
         .text('Organization Profile');
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .fillColor('#374151');
      
      if (formData.industry) {
        doc.text(`Industry: ${formData.industry}`);
      }
      if (formData.region) {
        doc.text(`Region: ${formData.region}`);
      }
      if (formData.orgSize) {
        doc.text(`Organization Size: ${formData.orgSize}`);
      }
      if (formData.regulatoryRegime) {
        doc.text(`Regulatory Regime: ${formData.regulatoryRegime}`);
      }
      
      if (formData.dataTypes && formData.dataTypes.length > 0) {
        doc.moveDown(0.5);
        doc.text('Data Types:', { continued: false });
        formData.dataTypes.forEach(type => {
          doc.text(`  • ${type}`, { indent: 20 });
        });
      }
      
      if (formData.cryptography && formData.cryptography.length > 0) {
        doc.moveDown(0.5);
        doc.text('Current Cryptography:', { continued: false });
        formData.cryptography.forEach(crypto => {
          doc.text(`  • ${crypto}`, { indent: 20 });
        });
      }
      
      doc.moveDown(2);
      
      // Risk Scores Section
      doc.fontSize(16)
         .fillColor('#000000')
         .text('Risk Assessment');
      
      doc.moveDown(0.5);
      
      // HNDL Risk
      const getRiskLevel = (score) => {
        if (score < 30) return { label: 'Low', color: '#10b981' };
        if (score < 70) return { label: 'Medium', color: '#f59e0b' };
        if (score < 90) return { label: 'High', color: '#ef4444' };
        return { label: 'Critical', color: '#7f1d1d' };
      };
      
      const hndlRisk = getRiskLevel(riskScores.hndl);
      const crqcRisk = getRiskLevel(riskScores.crqc);
      
      doc.fontSize(14)
         .fillColor('#000000')
         .text('HNDL Risk (Harvest Now, Decrypt Later)');
      
      doc.fontSize(11)
         .fillColor('#6b7280')
         .text('This risk represents the threat of encrypted data being harvested today and decrypted in the future when quantum computers become available.');
      
      doc.moveDown(0.5);
      doc.fontSize(12)
         .fillColor(hndlRisk.color)
         .text(`Risk Score: ${riskScores.hndl}/100 (${hndlRisk.label})`, { bold: true });
      
      doc.moveDown(1.5);
      
      doc.fontSize(14)
         .fillColor('#000000')
         .text('CRQC Risk (Cryptographically Relevant Quantum Computer)');
      
      doc.fontSize(11)
         .fillColor('#6b7280')
         .text('This risk represents the immediate threat when quantum computers reach the capability to break current cryptographic systems.');
      
      doc.moveDown(0.5);
      doc.fontSize(12)
         .fillColor(crqcRisk.color)
         .text(`Risk Score: ${riskScores.crqc}/100 (${crqcRisk.label})`, { bold: true });
      
      doc.moveDown(2);
      
      // Recommendations
      doc.fontSize(16)
         .fillColor('#000000')
         .text('Recommendations');
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .fillColor('#374151');
      
      if (riskScores.hndl >= 70 || riskScores.crqc >= 70) {
        doc.text('Your organization faces significant quantum threats. We recommend:');
        doc.moveDown(0.3);
        doc.text('  • Immediate assessment of quantum-vulnerable systems', { indent: 20 });
        doc.text('  • Development of a post-quantum cryptography (PQC) migration plan', { indent: 20 });
        doc.text('  • Implementation of quantum-safe encryption for sensitive data', { indent: 20 });
        doc.text('  • Regular security audits with quantum threat considerations', { indent: 20 });
      } else if (riskScores.hndl >= 30 || riskScores.crqc >= 30) {
        doc.text('Your organization should begin preparing for quantum threats:');
        doc.moveDown(0.3);
        doc.text('  • Monitor developments in quantum computing capabilities', { indent: 20 });
        doc.text('  • Evaluate current cryptographic implementations', { indent: 20 });
        doc.text('  • Plan for eventual PQC migration', { indent: 20 });
        doc.text('  • Consider quantum-safe solutions for new implementations', { indent: 20 });
      } else {
        doc.text('Your organization has lower quantum risk exposure:');
        doc.moveDown(0.3);
        doc.text('  • Stay informed about quantum computing developments', { indent: 20 });
        doc.text('  • Review cryptographic practices periodically', { indent: 20 });
        doc.text('  • Consider quantum-safe options for future projects', { indent: 20 });
      }
      
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(10)
         .fillColor('#9ca3af')
         .text('Dytallix - Post-Quantum Cryptography Solutions', { align: 'center' });
      doc.text('https://dytallix.com', { align: 'center', link: 'https://dytallix.com' });
      
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
              <strong>CRQC Risk:</strong> ${riskScores.crqc}/100
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
