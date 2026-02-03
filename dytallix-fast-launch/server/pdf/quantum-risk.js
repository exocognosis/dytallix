/**
 * Quantum Risk PDF Generator (Playwright Edition)
 * Generates comprehensive quantum risk analysis reports using the actual React frontend
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the report URL at runtime (not module load time)
 * This ensures dotenv has loaded before we read env vars
 */
const getReportUrl = () => {
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://127.0.0.1';
    const port = process.env.FRONTEND_PORT || '80';
    // Only append port if not already in the URL and not standard HTTP port
    const base = frontendUrl.includes(':') ? frontendUrl : 
                 port === '80' ? frontendUrl : `${frontendUrl}:${port}`;
    return `${base}/quantumrisk?mode=report`;
};

/**
 * Generate a PDF report for the quantum risk analysis using Playwright
 * @param {Object} formData - User submission data
 * @param {Object} riskScores - Calculated risk scores
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateRiskPDF = async (formData, riskScores) => {
    const REPORT_URL = getReportUrl();
    logInfo('Starting Playwright PDF generation', { url: REPORT_URL });

    // Construct the full report data object expected by the frontend
    const reportData = {
        generatedAt: new Date().toISOString(),
        organization: {
            industry: formData.industry,
            region: formData.region,
            orgSize: formData.orgSize,
            regulatoryRegime: formData.regulatoryRegime,
            dataTypes: formData.dataTypes,
            cryptography: formData.cryptography
        },
        scores: riskScores,
        // Default recommendations and exposure can be static or dynamic
        // For now, we'll let the frontend use its default logic or we can inject them if needed.
        // The current QuantumRiskReport component uses the properties of `data` directly.
        // We need to ensure the injected data matches the `ReportData` interface.
        recommendations: [
            { priority: 'Critical', title: 'Immediate PQC Assessment', description: 'Conduct an assessment of quantum-vulnerable systems.' }
        ],
        exposure: {
            harvestNowDecryptLater: {
                level: riskScores.hndl > 70 ? 'Critical' : 'High',
                description: 'Adversaries may be harvesting encrypted data for future decryption.',
                affectedSystems: ['Customer databases', 'Transaction logs']
            },
            cryptographicallyRelevantQuantumComputer: {
                level: riskScores.crqc > 70 ? 'Critical' : 'High',
                description: 'Current implementations will be vulnerable when CRQCs become available.',
                affectedSystems: ['TLS/SSL', 'Digital signatures']
            }
        }
    };

    let browser = null;

    try {
        logInfo('Launching headless browser...');
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some container environments
        });

        const context = await browser.newContext({
            viewport: { width: 1200, height: 1600 }, // Wide viewport to avoid mobile CSS breakpoints
            deviceScaleFactor: 2, // Higher DPI for better quality
            bypassCSP: true
            // No Host header needed - localhost server block handles 127.0.0.1 directly
        });

        // Disable caching
        await context.route('**/*', route => route.continue());

        const page = await context.newPage();

        // Inject the data so the frontend picks it up immediately
        await page.addInitScript((data) => {
            window.__INJECTED_REPORT_DATA__ = data;
            console.log('Injected report data:', data);
        }, reportData);

        logInfo('Navigating to report page...');
        await page.goto(REPORT_URL, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Log the current URL for debugging
        logInfo('Current URL after navigation:', { url: page.url() });

        // Wait for the report content to render
        try {
            await page.waitForSelector('.quantum-risk-report', {
                state: 'visible',
                timeout: 30000
            });
        } catch (selectorError) {
            // Log page content for debugging
            const bodyContent = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
            logError('Selector wait failed, page content:', { bodyContent });
            throw selectorError;
        }

        // Wait for fonts to load
        await page.evaluate(() => document.fonts.ready);

        // Brief pause for animations/charts
        await page.waitForTimeout(1000);

        logInfo('Printing PDF...');
        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0in',
                right: '0in',
                bottom: '0in',
                left: '0in'
            },
            displayHeaderFooter: false
        });

        logInfo('PDF generation complete', { size: pdfBuffer.length });
        return pdfBuffer;

    } catch (error) {
        logError('Playwright PDF generation failed', { error: error.message });
        throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
