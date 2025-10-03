import { CollectionProvider } from '../providers/collection.provider';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'documentCollection'
  | 'documentCollectionOperation'
  | 'documentCollections'
  | 'viewerCanModifyLaboratory'
  | 'viewerCanModifyPreflightScript'
  | 'viewerCanViewLaboratory'
> = {
  documentCollections: (target, args, { injector }) =>
    injector.get(CollectionProvider).getCollections(target, args.first, args.after),
  documentCollectionOperation: (target, args, { injector }) =>
    injector.get(CollectionProvider).getDocumentCollectionOperationForTarget(target, args.id),
  documentCollection: (target, args, { injector }) =>
    injector.get(CollectionProvider).getDocumentCollectionForTarget(target, args.id),
  viewerCanViewLaboratory: (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'laboratory:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
  viewerCanModifyLaboratory: (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'laboratory:modify',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
  viewerCanModifyPreflightScript: async (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'laboratory:modifyPreflightScript',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
};
