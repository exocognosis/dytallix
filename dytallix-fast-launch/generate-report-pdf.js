/**
 * Quantum Risk Report PDF Generator
 * 
 * Uses Playwright to render the React report component and export it as a PDF.
 * 
 * Prerequisites:
 *   - npm install playwright (already in dependencies)
 *   - Dev server running on localhost:3000
 * 
 * Usage:
 *   node generate-report-pdf.js
 * 
 * Output:
 *   reports/quantum-risk-report.pdf
 * 
 * Data source:
 *   build/public/report.json - Edit this file to customize report content
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.FRONTEND_PORT || 3000;
const REPORT_URL = `http://localhost:${PORT}/quantumrisk?mode=report`;
const OUTPUT_DIR = path.join(__dirname, 'reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'quantum-risk-report.pdf');

async function generatePDF() {
    console.log('🚀 Starting Quantum Risk Report PDF generation...');
    console.log(`   URL: ${REPORT_URL}`);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        headless: true
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 816, height: 1056 } // Letter size at 96 DPI
        });

        const page = await context.newPage();

        console.log('   Loading report page...');
        await page.goto(REPORT_URL, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for the report content to render
        await page.waitForSelector('.quantum-risk-report', {
            state: 'visible',
            timeout: 10000
        });

        // Wait for fonts to load
        await page.evaluate(() => document.fonts.ready);

        // Additional wait for SVG charts to render
        await page.waitForTimeout(1000);

        console.log('   Generating PDF...');
        await page.pdf({
            path: OUTPUT_FILE,
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

        console.log(`✅ PDF generated successfully: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('❌ Failed to generate PDF:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Run the generator
generatePDF();
