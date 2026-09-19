import { SupportTicketPriority, SupportTicketStatus } from '@/gql/graphql';

export const statusDescription: Record<SupportTicketStatus, string> = {
  [SupportTicketStatus.Open]: 'Staff is working on the ticket	',
  [SupportTicketStatus.Solved]: 'The ticket has been solved',
};

export const priorityDescription: Record<SupportTicketPriority, string> = {
  [SupportTicketPriority.Normal]:
    'Minor problems or general questions with little to no impact on functionality, often involving small nuisances or easily bypassed errors.',
  [SupportTicketPriority.High]:
    'Problems that significantly hinder functionality, resulting in severe performance degradation while the platform remains operational.',
  [SupportTicketPriority.Urgent]:
    'Problems that halt essential functionality, preventing critical business operations with no workarounds available.',
};
