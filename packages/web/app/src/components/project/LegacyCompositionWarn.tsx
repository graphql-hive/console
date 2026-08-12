import { ReactElement } from 'react';
import { Callout } from '@/components/ui/callout';
import { ProductUpdatesLink } from '@/components/ui/docs-note';
import { Link } from '@/components/ui/link';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';

const LegacyCompositionWarn_ProjectFragment = graphql(`
  fragment LegacyCompositionWarn_ProjectFragment on Project {
    id
    slug
    type
    isNativeFederationEnabled
    externalSchemaComposition {
      endpoint
    }
  }
`);

export function LegacyCompositionWarn(props: {
  organizationSlug: string;
  project: FragmentType<typeof LegacyCompositionWarn_ProjectFragment>;
}): ReactElement | null {
  const project = useFragment(LegacyCompositionWarn_ProjectFragment, props.project);

  if (project.type !== ProjectType.Federation) {
    return null;
  }

  const activeMode = project.isNativeFederationEnabled
    ? 'native'
    : project.externalSchemaComposition
      ? 'external'
      : 'legacy';

  if (activeMode !== 'legacy') {
    return null;
  }

  return (
    <Callout type="warning" className="mb-2 w-full">
      <b>This project is using Legacy Federation v1 composition.</b>
      <br />
      Migrate to Native Federation v2 for the recommended composition experience.{' '}
      <Link
        to="/$organizationSlug/$projectSlug/view/settings"
        params={{
          organizationSlug: props.organizationSlug,
          projectSlug: project.slug,
        }}
        search={{ page: 'composition' }}
        className="text-blue-500"
      >
        Open Composition settings
      </Link>
      {' to change it.'}
      <br />
      <ProductUpdatesLink href="2023-10-10-native-federation-2">
        Read the announcement
      </ProductUpdatesLink>
    </Callout>
  );
}
