import morgan from 'morgan'

// Format: method url status response-time - remote-addr user-agent
export const requestLogger = morgan(':method :url :status :response-time ms - :remote-addr :user-agent')

export function logInfo(...args) {
  // eslint-disable-next-line no-console
  console.log('[INFO]', new Date().toISOString(), ...args)
}

export function logError(...args) {
  // eslint-disable-next-line no-console
  console.error('[ERROR]', new Date().toISOString(), ...args)
}
