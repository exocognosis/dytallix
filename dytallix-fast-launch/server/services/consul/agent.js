import { logInfo, logError } from '../../logger.js';

let started = false;

export function startConsulAgent() {
  if (started) return;
  started = true;
  logInfo('Consul agent started (fast-launch stub)');
}

export function stopConsulAgent() {
  if (!started) return;
  started = false;
  try {
    logInfo('Consul agent stopped (fast-launch stub)');
  } catch (err) {
    logError('Consul agent stop failed (stub)', err);
  }
}
