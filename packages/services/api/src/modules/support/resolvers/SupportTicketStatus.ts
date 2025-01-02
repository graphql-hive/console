import { SupportTicketStatus as SupportTicketStatusEnum } from '../../../shared/entities';
import type { SupportTicketStatusResolvers } from './../../../__generated__/types';

export const SupportTicketStatus: SupportTicketStatusResolvers = {
  OPEN: SupportTicketStatusEnum.OPEN,
  SOLVED: SupportTicketStatusEnum.SOLVED,
};
