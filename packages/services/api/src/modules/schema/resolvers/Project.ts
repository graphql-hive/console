import { parseDateRangeInput } from '../../../shared/helpers';
import { SchemaManager } from '../providers/schema-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<
  ProjectResolvers,
  | 'externalSchemaComposition'
  | 'isNativeFederationEnabled'
  | 'nativeFederationCompatibility'
  | 'schemaVersionsCount'
> = {
  externalSchemaComposition: project => {
    if (project.externalComposition.enabled && project.externalComposition.endpoint) {
      return {
        endpoint: project.externalComposition.endpoint,
      };
    }

    return null;
  },
  schemaVersionsCount: (project, { period }, { injector }) => {
    return injector.get(SchemaManager).countSchemaVersionsOfProject({
      organizationId: project.orgId,
      projectId: project.id,
      period: period ? parseDateRangeInput(period) : null,
    });
  },
  isNativeFederationEnabled: project => {
    return project.nativeFederation === true;
  },
  nativeFederationCompatibility: (project, _, { injector }) => {
    return injector.get(SchemaManager).getNativeFederationCompatibilityStatus(project);
  },
};
