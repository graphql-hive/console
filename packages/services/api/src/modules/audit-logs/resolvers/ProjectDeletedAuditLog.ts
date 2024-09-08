import type { ProjectDeletedAuditLogResolvers } from './../../../__generated__/types.next';

export const ProjectDeletedAuditLog: ProjectDeletedAuditLogResolvers = {
  __isTypeOf: e => e.eventType === 'PROJECT_DELETED',
  eventTime: e => e.eventTime,
  eventType: e => e.eventType,
  id: e => e.id,
  projectId: e => {
    if (e.eventType === 'PROJECT_DELETED') {
      return e.projectId;
    }
    throw new Error('Invalid eventType');
  },
  projectName: e => {
    if (e.eventType === 'PROJECT_DELETED') {
      return e.projectName;
    }
    throw new Error('Invalid eventType');
  },
  organizationId: e => e.organizationId,
  user: async (parent, _args, _ctx) => {
    return {
      userEmail: parent.user.userEmail,
      userId: parent.user.userId,
      user: parent.user.user,
      __typename: 'AuditLogUserRecord',
    };
  },
};