
import express from 'express';
import { sendQuantumRiskEmail } from '../emailService.js';
import { saveLead } from '../leadsDatabase.js';
import { generatePDFReport } from '../pdf/pdfkit-report.js'
import { logInfo, logError } from '../logger.js';
import { validateRequest, asyncHandler } from '../middleware/validation.js';

const router = express.Router();

// Quantum Risk Email endpoint
router.post('/email',
    validateRequest(['email', 'formData', 'riskScores']),
    asyncHandler(async (req, res) => {
        const { email, formData, riskScores } = req.body;

        await sendQuantumRiskEmail(email, formData, riskScores);

        res.json({
            success: true,
            message: 'Quantum risk analysis report sent successfully',
        });
    })
);

// Quantum Risk PDF Download endpoint
router.post('/report',
    validateRequest(['email', 'formData', 'riskScores']),
    asyncHandler(async (req, res) => {
        const { email, formData, riskScores } = req.body;

        // Save lead to database
        const leadResult = saveLead({
            email,
            formData,
            riskScores,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        logInfo('Quantum risk lead captured', { email, leadId: leadResult.id });

        // Generate PDF
        const pdfBuffer = await generatePDFReport(formData, riskScores);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=QuantumSafe_Risk_Report.pdf');
        res.send(pdfBuffer);
    })
);

export default router;
