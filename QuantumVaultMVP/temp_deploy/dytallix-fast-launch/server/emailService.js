/**
 * Email Service
 * Sends quantum risk analysis reports via email
 */

import { transporter } from './email/transport.js';
import { quantumRiskTemplate } from './email/templates.js';
import { generateRiskPDF } from './pdf/quantum-risk.js';
import { logInfo, logError } from './logger.js';

/**
 * Send quantum risk analysis email with PDF attachment
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
      html: quantumRiskTemplate(riskScores),
      attachments: [
        {
          filename: 'quantum-risk-analysis.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Check if we're in development mode (using jsonTransport)
    const isDevelopmentMode = !process.env.SMTP_HOST || !process.env.SMTP_USER;

    if (isDevelopmentMode && info.messageId) {
      logInfo('Email sent (development mode)', {
        messageId: info.messageId,
        message: info.message?.toString(),
      });
    } else {
      logInfo('Email sent successfully', {
        messageId: info.messageId,
        userEmail,
      });
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logError('Failed to send quantum risk email', {
      error: error.message,
      userEmail,
    });
    throw error;
  }
};

export default { sendQuantumRiskEmail };
