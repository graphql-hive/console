import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    project(reference: ProjectReferenceInput! @tag(name: "public")): Project @tag(name: "public")
  }

  extend type Mutation {
    createProject(input: CreateProjectInput! @tag(name: "public")): CreateProjectResult!
      @tag(name: "public")
    updateProjectSlug(
      input: UpdateProjectSlugInput! @tag(name: "public")
    ): UpdateProjectSlugResult! @tag(name: "public")
    deleteProject(input: DeleteProjectInput! @tag(name: "public")): DeleteProjectResult!
      @tag(name: "public")
  }

  type UpdateProjectGitRepositoryResult {
    ok: UpdateProjectGitRepositoryOk
    error: UpdateProjectGitRepositoryError
  }

  type UpdateProjectGitRepositoryError implements Error {
    message: String!
  }

  type UpdateProjectGitRepositoryOk {
    selector: ProjectSelector!
    updatedProject: Project!
  }

  input UpdateProjectSlugInput {
    project: ProjectReferenceInput! @tag(name: "public")
    slug: String! @tag(name: "public")
  }

  type UpdateProjectSlugResult {
    ok: UpdateProjectSlugOk @tag(name: "public")
    error: UpdateProjectSlugError @tag(name: "public")
  }

  type UpdateProjectSlugOk {
    updatedProject: Project! @tag(name: "public")
  }

  type UpdateProjectSlugError {
    message: String! @tag(name: "public")
  }

  type CreateProjectResult {
    ok: CreateProjectResultOk @tag(name: "public")
    error: CreateProjectResultError @tag(name: "public")
  }

  type CreateProjectResultOk {
    createdProject: Project! @tag(name: "public")
    createdTargets: [Target!]!
    updatedOrganization: Organization!
  }

  type CreateProjectInputErrors {
    slug: String @tag(name: "public")
  }

  type CreateProjectResultError {
    message: String! @tag(name: "public")
    inputErrors: CreateProjectInputErrors! @tag(name: "public")
  }

  input ProjectSelectorInput {
    organizationSlug: String! @tag(name: "public")
    projectSlug: String! @tag(name: "public")
  }

  type ProjectSelector {
    organizationSlug: String!
    projectSlug: String!
  }

  enum ProjectType {
    FEDERATION @tag(name: "public")
    STITCHING @tag(name: "public")
    SINGLE @tag(name: "public")
  }

  extend type Organization {
    projects: ProjectConnection! @tag(name: "public")
    viewerCanCreateProject: Boolean!
    projectBySlug(projectSlug: String!): Project
  }

  input ProjectReferenceInput @oneOf {
    byId: ID @tag(name: "public")
    bySelector: ProjectSelectorInput @tag(name: "public")
  }

  type Project {
    id: ID! @tag(name: "public")
    slug: String! @tag(name: "public")
    cleanId: ID! @deprecated(reason: "Use the 'slug' field instead.")
    name: String! @deprecated(reason: "Use the 'slug' field instead.")
    type: ProjectType! @tag(name: "public")
    buildUrl: String
    validationUrl: String
    experimental_nativeCompositionPerTarget: Boolean!
    """
    Whether the viewer can create a new target within this project.
    """
    viewerCanCreateTarget: Boolean!
    """
    Whether the viewer can view and modify alerts with this project.
    """
    viewerCanModifyAlerts: Boolean!
    """
    Whether the viewer can access the settings page and modify settings of this project.
    """
    viewerCanModifySettings: Boolean!
    """
    Whether the viewer can delete this project.
    """
    viewerCanDelete: Boolean!
  }

  type ProjectEdge {
    node: Project! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type ProjectConnection {
    edges: [ProjectEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  input CreateProjectInput {
    organization: OrganizationReferenceInput! @tag(name: "public")
    slug: String! @tag(name: "public")
    type: ProjectType! @tag(name: "public")
  }

  input UpdateProjectGitRepositoryInput {
    gitRepository: String
    organizationSlug: String!
    projectSlug: String!
  }

  type UpdateProjectPayload {
    selector: ProjectSelector!
    updatedProject: Project!
  }

  input DeleteProjectInput {
    project: ProjectReferenceInput! @tag(name: "public")
  }

  type DeleteProjectResult {
    ok: DeleteProjectResultOk @tag(name: "public")
    error: DeleteProjectResultError @tag(name: "public")
  }

  type DeleteProjectResultOk {
    deletedProjectId: ID! @tag(name: "public")
  }

  type DeleteProjectResultError {
    message: String! @tag(name: "public")
  }
`;
