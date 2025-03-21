import { SupportManager } from '../providers/support-manager';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  'supportTicket' | 'supportTickets' | 'viewerCanManageSupportTickets' | '__isTypeOf'
> = {
  supportTickets: async (org, args, { injector }) => {
    const response = await injector.get(SupportManager).getTickets(org.id);

    return {
      edges: response.nodes.map(ticket => ({
        node: {
          id: String(ticket.id),
          status: ticket.status,
          priority: ticket.priority,
          description: ticket.description,
          subject: ticket.subject,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
        },
        cursor: String(ticket.id),
      })),
      pageInfo: {
        endCursor: String(response.nodes[response.nodes.length - 1]?.id ?? ''),
        hasNextPage: response.meta.has_more,
        hasPreviousPage: false,
        startCursor: String(response.nodes[0]?.id ?? ''),
      },
    };
  },
  supportTicket: async (org, args, { injector }) => {
    const ticket = await injector.get(SupportManager).getTicket(org.id, args.id);

    if (!ticket) {
      return null;
    }

    return {
      id: String(ticket.id),
      status: ticket.status,
      priority: ticket.priority,
      description: ticket.description,
      subject: ticket.subject,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    };
  },
  viewerCanManageSupportTickets: async (organization, _arg, { session, injector }) => {
    try {
      injector.get(SupportManager);
    } catch (err) {
      return false;
    }
    return await session.canPerformAction({
      action: 'support:manageTickets',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
};
