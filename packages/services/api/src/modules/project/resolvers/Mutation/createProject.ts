import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { ProjectManager } from '../../providers/project-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createProject: NonNullable<MutationResolvers['createProject']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(ProjectManager).createProject({
    slug: input.slug,
    type: input.type,
    organization: input.organization,
  });

  if (result.ok === false) {
    return {
      error: {
        message: result.message,
        inputErrors: {
          slug: result.inputErrors?.slug ?? null,
        },
      },
      ok: null,
    };
  }

  return {
    ok: {
      createdProject: result.project,
      createdTargets: result.targets,
      updatedOrganization: await injector
        .get(OrganizationManager)
        .getOrganization({ organizationId: result.project.orgId }),
    },
    error: null,
  };
};
