
import { logError } from '../logger.js';

export const validateRequest = (requiredFields) => {
    return (req, res, next) => {
        // Check if fields are present in body or query
        const missing = requiredFields.filter(field => {
            const value = req.body[field] || req.query[field];
            return value === undefined || value === null || value === '';
        });

        if (missing.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: requiredFields,
                missing: missing
            });
        }

        next();
    };
};

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            logError(`Route Error: ${req.path}`, err);
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
            });
        });
    };
};
