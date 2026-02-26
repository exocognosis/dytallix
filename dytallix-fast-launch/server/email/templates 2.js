/**
 * Email Templates
 * HTML templates for various email types
 */

/**
 * Quantum Risk Analysis email template
 */
export const quantumRiskTemplate = (riskScores) => {
    return `
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
  `;
};
