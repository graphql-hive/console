import type { ProjectModule } from './__generated__/types';
import { ProjectType } from '../../shared/entities';
import { createConnection } from '../../shared/schema';
import { ProjectManager } from './providers/project-manager';
import { IdTranslator } from '../shared/providers/id-translator';
import { TargetManager } from '../target/providers/target-manager';
import { z } from 'zod';

const ProjectNameModel = z.string().min(2).max(40);
const URLModel = z.string().url().max(200);
const RepoOwnerWithNameModel = z
  .string()
  .regex(/^[^/]+\/[^/]+$/, 'Expected owner/name format')
  .max(200);
const MaybeModel = <T extends z.ZodType>(value: T) => z.union([z.null(), z.undefined(), value]);

export const resolvers: ProjectModule.Resolvers & { ProjectType: any } = {
  Query: {
    async project(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organization, project] = await Promise.all([
        translator.translateOrganizationId(selector),
        translator.translateProjectId(selector),
      ]);
      return injector.get(ProjectManager).getProject({
        project,
        organization,
      });
    },
    async projects(_, { selector }, { injector }) {
      const organization = await injector.get(IdTranslator).translateOrganizationId(selector);
      return injector.get(ProjectManager).getProjects({ organization });
    },
  },
  Mutation: {
    async createProject(_, { input }, { injector }) {
      const CreateProjectModel = z.object({
        name: ProjectNameModel,
        buildUrl: MaybeModel(URLModel),
        validationUrl: MaybeModel(URLModel),
      });
      const result = CreateProjectModel.safeParse(input);

      if (!result.success) {
        return {
          error: {
            message: 'Please check your input.',
            inputErrors: {
              name: result.error.formErrors.fieldErrors.name?.[0],
              buildUrl: result.error.formErrors.fieldErrors.buildUrl?.[0],
              validationUrl: result.error.formErrors.fieldErrors.validationUrl?.[0],
            },
          },
        };
      }

      const translator = injector.get(IdTranslator);
      const organization = await translator.translateOrganizationId({
        organization: input.organization,
      });
      const project = await injector.get(ProjectManager).createProject({
        ...input,
        organization,
      });

      const targetManager = injector.get(TargetManager);

      const targets = await Promise.all([
        targetManager.createTarget({
          name: 'production',
          project: project.id,
          organization,
        }),
        targetManager.createTarget({
          name: 'staging',
          project: project.id,
          organization,
        }),
        targetManager.createTarget({
          name: 'development',
          project: project.id,
          organization,
        }),
      ]);

      return {
        ok: {
          selector: {
            organization: input.organization,
            project: project.cleanId,
          },
          createdProject: project,
          createdTargets: targets,
        },
      };
    },
    async deleteProject(_, { selector }, { injector }) {
      const translator = injector.get(IdTranslator);
      const [organizationId, projectId] = await Promise.all([
        translator.translateOrganizationId({
          organization: selector.organization,
        }),
        translator.translateProjectId({
          organization: selector.organization,
          project: selector.project,
        }),
      ]);
      const deletedProject = await injector.get(ProjectManager).deleteProject({
        organization: organizationId,
        project: projectId,
      });
      return {
        selector: {
          organization: organizationId,
          project: projectId,
        },
        deletedProject,
      };
    },
    async updateProjectName(_, { input }, { injector }) {
      const UpdateProjectNameModel = z.object({
        name: ProjectNameModel,
      });

      const result = UpdateProjectNameModel.safeParse(input);

      if (!result.success) {
        return {
          error: {
            message: result.error.formErrors.fieldErrors.name?.[0] ?? 'Please check your input.',
          },
        };
      }

      const translator = injector.get(IdTranslator);
      const [organizationId, projectId] = await Promise.all([
        translator.translateOrganizationId(input),
        translator.translateProjectId(input),
      ]);

      const project = await injector.get(ProjectManager).updateName({
        name: input.name,
        organization: organizationId,
        project: projectId,
      });

      return {
        ok: {
          selector: {
            organization: input.organization,
            project: project.cleanId,
          },
          updatedProject: project,
        },
      };
    },
    async updateProjectGitRepository(_, { input }, { injector }) {
      const UpdateProjectGitRepositoryModel = z.object({
        gitRepository: MaybeModel(RepoOwnerWithNameModel),
      });

      const result = UpdateProjectGitRepositoryModel.safeParse(input);

      if (!result.success) {
        return {
          error: {
            message: result.error.formErrors.fieldErrors.gitRepository?.[0] ?? 'Please check your input.',
          },
        };
      }

      const [organization, project] = await Promise.all([
        injector.get(IdTranslator).translateOrganizationId(input),
        injector.get(IdTranslator).translateProjectId(input),
      ]);

      return {
        ok: {
          selector: {
            organization: input.organization,
            project: input.project,
          },
          updatedProject: await injector.get(ProjectManager).updateGitRepository({
            project,
            organization,
            gitRepository: input.gitRepository,
          }),
        },
      };
    },
  },
  ProjectType: {
    FEDERATION: ProjectType.FEDERATION,
    STITCHING: ProjectType.STITCHING,
    SINGLE: ProjectType.SINGLE,
    CUSTOM: ProjectType.CUSTOM,
  },
  Organization: {
    projects(organization, _, { injector }) {
      return injector.get(ProjectManager).getProjects({ organization: organization.id });
    },
  },
  ProjectConnection: createConnection(),
};
