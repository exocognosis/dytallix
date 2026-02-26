import { logInfo, logError } from '../../logger.js';

let started = false;

export function startGarrisonAgent() {
  if (started) return;
  started = true;
  logInfo('Garrison agent started (fast-launch stub)');
}

export function stopGarrisonAgent() {
  if (!started) return;
  started = false;
  try {
    logInfo('Garrison agent stopped (fast-launch stub)');
  } catch (err) {
    logError('Garrison agent stop failed (stub)', err);
  }
}
