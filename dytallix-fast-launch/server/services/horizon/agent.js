import { logInfo, logError } from '../../logger.js';

let started = false;

export function startHorizonAgent() {
  if (started) return;
  started = true;
  logInfo('Horizon agent started (fast-launch stub)');
}

export function shutdownHorizonAgent() {
  if (!started) return;
  started = false;
  try {
    logInfo('Horizon agent stopped (fast-launch stub)');
  } catch (err) {
    logError('Horizon agent stop failed (stub)', err);
  }
}
