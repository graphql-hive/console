import { ProjectType, RegistryModel } from 'testkit/gql/graphql';
import { initSeed } from './seed';

export async function prepareProject(
  projectType: ProjectType,
  model: RegistryModel = RegistryModel.Modern,
) {
  const { createOrg } = await initSeed().createOwner();
  const { organization, createProject, setFeatureFlag, setOrganizationSchemaPolicy } =
    await createOrg();
  const {
    project,
    createTargetAccessToken,
    createCdnAccess,
    target,
    targets,
    setProjectSchemaPolicy,
    setNativeFederation,
    fetchVersions,
  } = await createProject(projectType, {
    useLegacyRegistryModels: model === RegistryModel.Legacy,
  });

  const { secret: readwriteToken } = await createTargetAccessToken({});

  const { secret: readonlyToken } = await createTargetAccessToken({
    mode: 'readOnly',
  });

  // Create CDN token
  const { secretAccessToken: cdnToken, cdnUrl, fetchMetadataFromCDN } = await createCdnAccess();

  return {
    organization,
    project,
    targets,
    target,
    fetchVersions,
    policy: {
      setOrganizationSchemaPolicy,
      setProjectSchemaPolicy,
    },
    tokens: {
      registry: {
        readwrite: readwriteToken,
        readonly: readonlyToken,
      },
    },
    cdn: {
      token: cdnToken,
      url: cdnUrl,
      fetchMetadata() {
        return fetchMetadataFromCDN();
      },
    },
    setFeatureFlag,
    setNativeFederation,
  };
}
