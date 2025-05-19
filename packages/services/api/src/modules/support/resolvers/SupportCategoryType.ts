import type { SupportCategoryTypeResolvers } from './../../../__generated__/types';
import { SupportCategoryType as SupportCategoryTypeEnum } from '../../../shared/entities';

export const SupportCategoryType: SupportCategoryTypeResolvers = {
  TECHNICAL_ISSUE: SupportCategoryTypeEnum.TECHNICAL_ISSUE,
  BILLING: SupportCategoryTypeEnum.BILLING,
  COMPLIANCE: SupportCategoryTypeEnum.COMPLIANCE,
  OTHER: SupportCategoryTypeEnum.OTHER,
};
