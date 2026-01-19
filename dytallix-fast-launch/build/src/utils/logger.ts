/**
 * Frontend Logger Utility
 * 
 * Provides environment-aware logging that only outputs in development mode.
 * Prevents sensitive information from appearing in production console.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Debug-level logging (only in development)
     * Use for detailed debugging information
     */
    debug: (message: string, ...args: any[]) => {
        if (isDev) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },

    /**
     * Info-level logging (only in development)
     * Use for general informational messages
     */
    info: (message: string, ...args: any[]) => {
        if (isDev) {
            console.info(`[INFO] ${message}`, ...args);
        }
    },

    /**
     * Warning-level logging (always shown)
     * Use for recoverable issues that should be investigated
     */
    warn: (message: string, ...args: any[]) => {
        console.warn(`[WARN] ${message}`, ...args);
    },

    /**
     * Error-level logging (always shown)
     * Use for errors and exceptions
     */
    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
};

export default logger;
