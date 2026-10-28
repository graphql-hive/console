import { z } from 'zod';
import { NameModel } from '../../shared/entities';

export const TargetNameModel = NameModel.min(2).max(30);
export const TargetSlugModel = z
  .string({
    error: issue => (issue.input === undefined ? 'Target slug is required' : undefined),
  })
  .min(1, 'Target slug is required')
  .max(50, 'Slug must be at most 50 characters long')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and dashes')
  .refine(slug => slug !== 'view', {
    error: "Slug can't be 'view'",
  });

export const PercentageModel = z
  .number()
  .min(0, 'Percentage must be at least 0.')
  .max(100, 'Percentage must be at most 100.')
  .multipleOf(0.01, 'Percentage can have at most 2 decimal places, e.g. 0.25.');
