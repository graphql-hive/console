import { z } from 'zod';

const WildcardAssignmentModeModel = z.literal('*');
const GranularAssignmentModeModel = z.literal('granular');

const WildcardAssignmentMode = z.object({
  mode: WildcardAssignmentModeModel,
});

const AppDeploymentAssignmentModel = z.object({
  type: z.literal('appDeployment'),
  appName: z.string(),
});

const ServiceAssignmentModel = z.object({ type: z.literal('service'), serviceName: z.string() });

const AssignedServicesModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    services: z
      .array(ServiceAssignmentModel)
      .optional()
      .nullable()
      .transform(value => value ?? []),
  }),
  WildcardAssignmentMode,
]);

const AssignedAppDeploymentsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    appDeployments: z.array(AppDeploymentAssignmentModel),
  }),
  WildcardAssignmentMode,
]);

export const TargetAssignmentModel = z.object({
  type: z.literal('target'),
  id: z.string().uuid(),
  services: AssignedServicesModel,
  appDeployments: AssignedAppDeploymentsModel,
});

const AssignedTargetsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    targets: z.array(TargetAssignmentModel),
  }),
  WildcardAssignmentMode,
]);

const ProjectAssignmentModel = z.object({
  type: z.literal('project'),
  id: z.string().uuid(),
  targets: AssignedTargetsModel,
});

const GranularAssignedProjectsModel = z.object({
  mode: GranularAssignmentModeModel,
  projects: z.array(ProjectAssignmentModel),
});

/**
 * Tree data structure that represents the resources assigned to an organization member.
 *
 * Together with the assigned member role, these are used to determine whether a user is allowed
 * or not allowed to perform an action on a specific resource (project, target, service, or app deployment).
 *
 * If no resources are assigned to a member role, the permissions are granted on all the resources within the
 * organization.
 */
export const ResourceAssignmentModel = z.union([
  GranularAssignedProjectsModel,
  WildcardAssignmentMode,
]);

/**
 * Resource assignments as stored within the database.
 */
export type ResourceAssignmentGroup = z.TypeOf<typeof ResourceAssignmentModel>;
export type GranularAssignedProjects = z.TypeOf<typeof GranularAssignedProjectsModel>;
