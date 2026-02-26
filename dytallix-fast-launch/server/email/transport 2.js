/**
 * Email Transport Configuration
 * Handles nodemailer transporter setup for production and development
 */

import nodemailer from 'nodemailer';
import { logInfo, logError } from '../logger.js';

/**
 * Create email transporter based on environment
 */
export const createTransporter = () => {
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
        jsonTransport: true,
    });
};

// Create and export singleton transporter
export const transporter = createTransporter();
