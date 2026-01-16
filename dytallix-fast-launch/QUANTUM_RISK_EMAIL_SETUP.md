# Quantum Risk Dashboard - Email Integration

## Overview

The Quantum Risk Dashboard now includes email functionality that allows users to receive their personalized quantum risk analysis report via email. The report is delivered as a professionally formatted PDF with detailed risk assessment information.

## Features

### 1. Email Capture Form
- Located at the bottom of the `/quantumrisk` page
- Users enter their email address to receive their analysis
- Real-time validation and user feedback

### 2. Risk Analysis PDF
The generated PDF includes:
- **Organization Profile**: Industry, region, organization size, data types, cryptography used, regulatory regime
- **Risk Assessment**: 
  - HNDL Risk (Harvest Now, Decrypt Later) score and level
  - CRQC Risk (Cryptographically Relevant Quantum Computer) score and level
- **Recommendations**: Customized based on risk level (Critical, High, Medium, or Low)
- **Branding**: Dytallix logo and contact information

### 3. Email Delivery
- Sent to the user's provided email address
- BCC copy sent to hello@dytallix.com for lead tracking
- Professional HTML email template with:
  - Quick summary of risk scores
  - PDF attachment with full report
  - Call to action for further engagement

## API Endpoint

### POST `/api/quantum-risk/submit-email`

**Request Body:**
```json
{
  "email": "user@example.com",
  "formData": {
    "industry": "Finance & Banking",
    "region": "United States",
    "dataTypes": ["PII", "Financial Records"],
    "cryptography": ["RSA-2048 (Legacy)"],
    "regulatoryRegime": "SEC / NYDFS (US Finance)",
    "orgSize": "Enterprise (500 - 5000 employees)"
  },
  "riskScores": {
    "hndl": 75,
    "crqc": 65
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Your Quantum Risk Analysis has been sent to your email",
  "messageId": "<unique-message-id>"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Error description"
}
```

## Configuration

### Environment Variables

The email service can be configured using the following environment variables:

**Production SMTP (Required for production):**
- `SMTP_HOST`: SMTP server hostname (e.g., smtp.gmail.com)
- `SMTP_PORT`: SMTP port (default: 587)
- `SMTP_SECURE`: Use secure connection (true/false)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `EMAIL_FROM`: Sender email address (default: noreply@dytallix.com)

**Development Mode:**
If SMTP credentials are not configured, the service runs in development mode where:
- Emails are logged to console instead of being sent
- Full email content (including PDF) is logged for testing
- No actual email delivery occurs

### Example Production Configuration

```bash
# .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@dytallix.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@dytallix.com
```

## UI Changes

### Removed Hover Effects
- Checkbox/radio button cards in the assessment form no longer have hover effects
- Form and visualization panels no longer lift on hover
- Maintains clean, professional appearance without distracting animations

## Testing

### Manual Testing
1. Start the server:
   ```bash
   cd dytallix-fast-launch
   PORT=3001 node server/index.js
   ```

2. Navigate to `/quantumrisk` in your browser

3. Fill out the risk assessment form

4. Enter your email address and click "Get My Analysis"

5. Check the server logs for email content (development mode)

### Automated Testing
A test script is provided:

```bash
cd dytallix-fast-launch
node test-quantum-risk-email.js
```

This will:
- Submit a test email request to the API
- Verify the response
- Display success/failure status

## Dependencies

New dependencies added:
- `nodemailer@^6.9.8`: Email sending library
- `pdfkit@^0.15.0`: PDF generation library

## Files Modified/Created

### Created:
- `server/emailService.js`: Email service module with PDF generation
- `test-quantum-risk-email.js`: Test script for email functionality

### Modified:
- `server/index.js`: Added email API endpoint
- `build/src/pages/QuantumRiskDashboard.tsx`: Updated form to call API
- `build/src/components/dashboard/RiskAssessmentForm.tsx`: Removed hover effects
- `build/src/components/dashboard/RiskVisualization.tsx`: Removed hover effects
- `package.json`: Added nodemailer and pdfkit dependencies

## Security Considerations

1. **Rate Limiting**: Email submission endpoint uses the existing AI rate limiter (12 requests per minute per IP)
2. **Email Validation**: Basic email format validation on both frontend and backend
3. **Data Validation**: All input data is validated before processing
4. **SMTP Credentials**: Stored in environment variables, never committed to code
5. **Development Mode**: Safe fallback when SMTP is not configured

## Future Enhancements

Potential improvements:
- Add email templates for different risk levels
- Include more detailed analysis in PDF
- Add email delivery tracking
- Implement email verification
- Add option to download PDF directly from the page
- Include comparison charts in PDF
- Add industry benchmarking data

## Troubleshooting

### Email not sending in production
1. Verify SMTP credentials are set correctly
2. Check SMTP server allows connections from your server IP
3. Review server logs for detailed error messages
4. Ensure firewall allows outbound connections on SMTP port

### PDF generation fails
1. Check that pdfkit dependency is installed
2. Verify sufficient disk space for temporary files
3. Review error logs for specific PDF generation errors

### Frontend form submission fails
1. Verify API URL is correct (check VITE_API_URL)
2. Check browser console for CORS errors
3. Ensure server is running and accessible
4. Verify form data is complete before submission
