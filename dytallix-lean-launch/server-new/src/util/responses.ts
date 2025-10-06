import { FastifyReply } from 'fastify';

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Send standardized error response
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): FastifyReply {
  const response: ErrorResponse = {
    code,
    message,
  };
  if (details) {
    response.details = details;
  }
  return reply.code(statusCode).send(response);
}

/**
 * Send standardized success response
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  return reply.code(statusCode).send({
    success: true,
    data,
  } as SuccessResponse<T>);
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  RATE_LIMIT: 'RATE_LIMIT',
  FAUCET_PAUSED: 'FAUCET_PAUSED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  RPC_ERROR: 'RPC_ERROR',
  RPC_TIMEOUT: 'RPC_TIMEOUT',
  RPC_METHOD_NOT_ALLOWED: 'RPC_METHOD_NOT_ALLOWED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;
