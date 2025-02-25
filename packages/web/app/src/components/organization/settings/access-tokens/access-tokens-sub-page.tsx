import { useState } from 'react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { CreateAccessTokenSheetContent } from './create-access-token-sheet-content';

type AccessTokensSubPageProps = {
  organizationSlug: string;
};

const AccessTokensSubPage_OrganizationQuery = graphql(`
  query AccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      ...CreateAccessTokenSheetContent_OrganizationFragment
      ...ResourceSelector_OrganizationFragment
    }
  }
`);

export function AccessTokensSubPage(props: AccessTokensSubPageProps): React.ReactNode {
  const [data] = useQuery({
    query: AccessTokensSubPage_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
  });

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Access Tokens"
        description={
          <>
            <CardDescription>
              Access Tokens are used for the Hive CLI, Hive Public GraphQL API and Hive Usage
              Reporting. Granular resource based access can be granted based on permissions.
            </CardDescription>
            <CardDescription>
              <DocsLink
                // TODO: update this link
                href="/todo"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <div className="my-3.5 flex justify-between" data-cy="target-settings-registry-token">
        <Sheet.Sheet>
          <Sheet.SheetTrigger asChild>
            <Button data-cy="new-button">Create new access token</Button>
          </Sheet.SheetTrigger>
          {data.data?.organization && (
            <>
              <CreateAccessTokenSheetContent
                organization={data.data?.organization}
                onSuccess={() => {
                  alert('YAY');
                }}
              />
            </>
          )}
        </Sheet.Sheet>
      </div>
    </SubPageLayout>
  );
}
