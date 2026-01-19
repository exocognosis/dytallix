/**
 * PDF Formatting Utilities
 * Helper functions for formatting data in PDFs
 */

/**
 * Format date for display
 */
export const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Format value with fallback
 */
export const formatValue = (value) => {
    if (value === null || value === undefined) return 'Not provided';
    const str = value.toString().trim();
    return str.length > 0 ? str : 'Not provided';
};

/**
 * Format array for display
 */
export const formatArray = (value) => {
    return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Not provided';
};

/**
 * Get risk metadata based on score
 */
export const getRiskMeta = (score) => {
    if (score >= 90) return { label: 'Critical', color: '#ff4d4d' };
    if (score >= 70) return { label: 'High', color: '#f97316' };
    if (score >= 40) return { label: 'Medium', color: '#fbbf24' };
    return { label: 'Low', color: '#22c55e' };
};

/**
 * PDF Color Palette
 */
export const COLORS = {
    background: '#071a33',
    backgroundDeep: '#051327',
    accent: '#2fe3d0',
    accent2: '#4fb3ff',
    text: '#f8fbff',
    muted: '#b7c7e6',
    card: '#0f2644',
    track: '#1b3150',
};
