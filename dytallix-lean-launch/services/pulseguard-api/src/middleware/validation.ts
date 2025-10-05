import { Request, Response, NextFunction } from 'express';
import joi from 'joi';
import { createError } from './errorHandler';
import { config } from '../config';

const paginationSchema = joi.object({
  limit: joi.number().integer().min(1).max(config.pagination.maxLimit).optional(),
  offset: joi.number().integer().min(0).optional(),
});

const findingFiltersSchema = joi.object({
  severity: joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  status: joi.string().valid('pending', 'confirmed', 'false_positive', 'under_investigation').optional(),
  address: joi.string().pattern(/^dytallix1[a-z0-9]{38,58}$/).optional(),
  since: joi.date().iso().optional(),
  score_min: joi.number().min(0).max(1).optional(),
  score_max: joi.number().min(0).max(1).optional(),
}).and('score_min', 'score_max');

const firstErrorMessage = (err: joi.ValidationError | undefined): string => {
  if (!err) return 'validation failed';
  const det = Array.isArray(err.details) && err.details.length > 0 ? err.details[0] : undefined;
  return det?.message ?? err.message ?? 'validation failed';
};

export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = paginationSchema.validate(req.query);
  if (error) {
    throw createError(`Validation error: ${firstErrorMessage(error)}`, 400);
  }
  next();
};

export const validateFindingFilters = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = findingFiltersSchema.validate(req.query);
  if (error) {
    throw createError(`Validation error: ${firstErrorMessage(error)}`, 400);
  }
  next();
};