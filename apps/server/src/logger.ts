import pino, { type DestinationStream, type Logger } from 'pino';

export function createLogger(destination?: DestinationStream): Logger {
  const options = {
    base: {
      service: 'warwrit-server',
    },
    level: process.env['LOG_LEVEL'] ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'authorization',
        'cookie',
        'password',
        'token',
      ],
      censor: '[REDACTED]',
    },
  };

  return destination === undefined ? pino(options) : pino(options, destination);
}
