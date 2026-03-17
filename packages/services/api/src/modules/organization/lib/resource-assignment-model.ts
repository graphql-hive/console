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

type AssignedServices = z.TypeOf<typeof AssignedServicesModel>;

const AssignedAppDeploymentsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    appDeployments: z.array(AppDeploymentAssignmentModel),
  }),
  WildcardAssignmentMode,
]);

type AssignedAppDeployments = z.TypeOf<typeof AssignedAppDeploymentsModel>;

export const TargetAssignmentModel = z.object({
  type: z.literal('target'),
  id: z.string().uuid(),
  services: AssignedServicesModel,
  appDeployments: AssignedAppDeploymentsModel,
});

export type AssignedTarget = z.TypeOf<typeof TargetAssignmentModel>;

const AssignedTargetsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    targets: z.array(TargetAssignmentModel),
  }),
  WildcardAssignmentMode,
]);

type AssignedTargets = z.TypeOf<typeof AssignedTargetsModel>;

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

/**
 * Get the intersection of two resource assignments
 */
export function intersectResourceAssignments(
  a: ResourceAssignmentGroup,
  b: ResourceAssignmentGroup,
): ResourceAssignmentGroup {
  if (a.mode === '*' && b.mode === '*') {
    return { mode: '*' };
  }

  if (a.mode === '*') {
    return b;
  }

  if (b.mode === '*') {
    return a;
  }

  return {
    mode: 'granular',
    projects: a.projects
      .map(projectA => {
        const projectB = b.projects.find(p => p.id === projectA.id);
        if (!projectB) {
          return null;
        }

        const intersectedTargets = intersectTargets(projectA.targets, projectB.targets);

        return {
          ...projectA,
          targets: intersectedTargets,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
  };
}

function intersectTargets(a: AssignedTargets, b: AssignedTargets): AssignedTargets {
  if (a.mode === '*' && b.mode === '*') {
    return { mode: '*' };
  }

  if (a.mode === '*') {
    return b;
  }

  if (b.mode === '*') {
    return a;
  }

  const targets = a.targets
    .map(targetA => {
      const targetB = b.targets.find(t => t.id === targetA.id);
      if (!targetB) return null;

      return {
        ...targetA,
        services: intersectServices(targetA.services, targetB.services),
        appDeployments: intersectAppDeployments(targetA.appDeployments, targetB.appDeployments),
      };
    })
    .filter(t => t !== null);

  return { mode: 'granular', targets };
}

function intersectServices(a: AssignedServices, b: AssignedServices): AssignedServices {
  if (a.mode === '*' && b.mode === '*') {
    return { mode: '*' };
  }
  if (a.mode === '*') {
    return b;
  }
  if (b.mode === '*') {
    return a;
  }

  // Both granular
  const services = a.services.filter(s => b.services.some(sb => sb.serviceName === s.serviceName));
  return { mode: 'granular', services };
}

function intersectAppDeployments(
  a: AssignedAppDeployments,
  b: AssignedAppDeployments,
): AssignedAppDeployments {
  if (a.mode === '*' && b.mode === '*') {
    return { mode: '*' };
  }

  if (a.mode === '*') {
    return b;
  }

  if (b.mode === '*') {
    return a;
  }

  // Both granular
  const appDeployments = a.appDeployments.filter(ad =>
    b.appDeployments.some(bd => bd.type === ad.type && bd.appName === ad.appName),
  );

  return { mode: 'granular', appDeployments };
}
