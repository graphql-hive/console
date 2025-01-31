import { Injectable, Scope } from 'graphql-modules';
import * as GraphQLSchema from '../../../__generated__/types';
import { cache } from '../../../shared/helpers';
import { isUUID } from '../../../shared/is-uuid';
import { Session } from '../../auth/lib/authz';
import { Logger } from './logger';
import { Storage } from './storage';

interface OrganizationSelectorInput {
  organizationSlug: string;
}

interface ProjectSelectorInput extends OrganizationSelectorInput {
  projectSlug: string;
}

export interface TargetSelectorInput extends ProjectSelectorInput {
  targetSlug: string;
}

@Injectable({
  scope: Scope.Operation,
})
export class IdTranslator {
  private logger: Logger;
  constructor(
    private storage: Storage,
    private session: Session,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: 'IdTranslator' });
  }

  @cache<OrganizationSelectorInput>(selector => selector.organizationSlug)
  async translateOrganizationId(selector: OrganizationSelectorInput) {
    this.logger.debug(
      'Translating Organization Clean ID (selector=%o)',
      filterSelector('organization', selector),
    );
    const organizationId = await this.storage.getOrganizationId({
      organizationSlug: selector.organizationSlug,
    });

    if (!organizationId) {
      throw new Error('Organization not found');
    }

    return organizationId;
  }

  @cache<OrganizationSelectorInput>(selector => selector.organizationSlug)
  translateOrganizationIdSafe(selector: OrganizationSelectorInput) {
    this.logger.debug(
      'Translating Organization Clean ID (selector=%o)',
      filterSelector('organization', selector),
    );
    return this.storage.getOrganizationId({
      organizationSlug: selector.organizationSlug,
    });
  }

  @cache<ProjectSelectorInput>(selector =>
    [selector.organizationSlug, selector.projectSlug].join(','),
  )
  translateProjectId(selector: ProjectSelectorInput) {
    this.logger.debug(
      'Translating Project Clean ID (selector=%o)',
      filterSelector('project', selector),
    );
    return this.storage.getProjectId({
      organizationSlug: selector.organizationSlug,
      projectSlug: selector.projectSlug,
    });
  }

  @cache<TargetSelectorInput>(selector =>
    [selector.organizationSlug, selector.projectSlug, selector.targetSlug].join(','),
  )
  translateTargetId(selector: TargetSelectorInput) {
    this.logger.debug(
      'Translating Target Clean ID (selector=%o)',
      filterSelector('target', selector),
    );

    return this.storage.getTargetId({
      organizationSlug: selector.organizationSlug,
      projectSlug: selector.projectSlug,
      targetSlug: selector.targetSlug,
    });
  }

  /** Resolve a GraphQLSchema.TargetReferenceInput */
  async resolveTargetReference(args: {
    reference: GraphQLSchema.TargetReferenceInput | null;
    onError: () => never;
  }): Promise<{ organizationId: string; projectId: string; targetId: string }> {
    this.logger.debug('Resolve target reference. (reference=%o)', args.reference);

    let selector: {
      organizationId: string;
      projectId: string;
      targetId: string;
    };

    if (args.reference?.bySelector) {
      const [organizationId, projectId, targetId] = await Promise.all([
        this.translateOrganizationId(args.reference.bySelector),
        this.translateProjectId(args.reference.bySelector),
        this.translateTargetId(args.reference.bySelector),
      ]).catch(error => {
        this.logger.debug(error);
        this.logger.debug('Failed to resolve input slug to ids (slug=%o)', args.reference);
        args.onError();
      });

      this.logger.debug(
        'Target selector resolved. (organization=%s, project=%s, target=%s)',
        organizationId,
        projectId,
        targetId,
      );

      selector = {
        organizationId,
        projectId,
        targetId,
      };
    } else if (args.reference?.byId) {
      if (!isUUID(args.reference.byId)) {
        this.logger.debug('Invalid uuid provided. (targetId=%s)', args.reference.byId);
        args.onError();
      }

      const target = await this.storage.getTargetById(args.reference.byId);
      if (!target) {
        this.logger.debug('Target not found. (targetId=%s)', args.reference.byId);
        args.onError();
      }

      selector = {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      };
    } else {
      this.logger.debug('Attempt resolving target selector from access token.');
      selector = this.session.getLegacySelector();
    }

    this.logger.debug(
      'Target selector resolved. (organization=%s, project=%s, target=%s)',
      selector.organizationId,
      selector.projectId,
      selector.targetId,
    );

    return selector;
  }
}

function filterSelector(
  kind: 'organization',
  selector: OrganizationSelectorInput,
): OrganizationSelectorInput;
function filterSelector(kind: 'project', selector: ProjectSelectorInput): ProjectSelectorInput;
function filterSelector(kind: 'target', selector: TargetSelectorInput): TargetSelectorInput;
function filterSelector(kind: 'organization' | 'project' | 'target', selector: any): any {
  switch (kind) {
    case 'organization':
      return {
        organizationSlug: selector.organizationSlug,
      };
    case 'project':
      return {
        organizationSlug: selector.organizationSlug,
        projectSlug: selector.projectSlug,
      };
    case 'target':
      return {
        organizationSlug: selector.organizationSlug,
        projectSlug: selector.projectSlug,
        targetSlug: selector.targetSlug,
      };
  }
}
