/**
 * Process Runtime Supervisor
 * Tracks resources and guarantees reverse-order cleanup.
 */

import { logError, logInfo } from './logger.js';

export const createRuntimeSupervisor = (name = 'runtime') => {
    const controller = new AbortController();
    const cleanupStack = [];
    let stoppingPromise = null;
    let stopped = false;

    const addCleanup = (label, fn) => {
        if (typeof fn !== 'function') {
            throw new TypeError(`Cleanup handler for "${label}" must be a function`);
        }
        cleanupStack.push({ label, fn, active: true });
        return () => {
            const entry = cleanupStack.find(c => c.label === label && c.fn === fn);
            if (entry) entry.active = false;
        };
    };

    const trackInterval = (label, callback, intervalMs, { unref = true } = {}) => {
        const timer = setInterval(callback, intervalMs);
        if (unref) timer.unref?.();
        addCleanup(`interval:${label}`, () => clearInterval(timer));
        return timer;
    };

    const trackTimeout = (label, callback, timeoutMs, { unref = true } = {}) => {
        const timer = setTimeout(callback, timeoutMs);
        if (unref) timer.unref?.();
        addCleanup(`timeout:${label}`, () => clearTimeout(timer));
        return timer;
    };

    const stop = async ({ reason = 'shutdown' } = {}) => {
        if (stopped) return { ok: true, errors: [] };
        if (stoppingPromise) return stoppingPromise;

        stoppingPromise = (async () => {
            const errors = [];
            try {
                controller.abort(reason);
            } catch {
                // ignore abort errors
            }

            for (let i = cleanupStack.length - 1; i >= 0; i -= 1) {
                const task = cleanupStack[i];
                if (!task?.active) continue;
                try {
                    await task.fn();
                } catch (error) {
                    errors.push({ label: task.label, error: error?.message || String(error) });
                    logError('Runtime cleanup task failed', {
                        runtime: name,
                        task: task.label,
                        error: error?.message || String(error)
                    });
                }
            }

            stopped = true;
            logInfo('Runtime stopped', { runtime: name, reason, cleanup_errors: errors.length });
            return { ok: errors.length === 0, errors };
        })();

        return stoppingPromise;
    };

    return {
        name,
        signal: controller.signal,
        addCleanup,
        trackInterval,
        trackTimeout,
        stop
    };
};

export default {
    createRuntimeSupervisor
};
