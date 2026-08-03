import { z } from 'zod';
import { NameModel } from '../../shared/entities';

export const TargetNameModel = NameModel.min(2).max(30);
export const TargetSlugModel = z
  .string({
    error: issue => (issue.input === undefined ? 'Target slug is required' : issue.message),
  })
  .min(1, 'Target slug is required')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and dashes')
  .refine(slug => slug !== 'view', {
    message: "Slug can't be 'view'",
  });

export const PercentageModel = z.number().min(0).max(100).step(0.01);
