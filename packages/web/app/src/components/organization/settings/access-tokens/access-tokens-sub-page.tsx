import { useState } from 'react';
import { FilterIcon, XIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { AccessTokenScopeType } from '@/gql/graphql';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { AccessTokensTable } from './access-tokens-table';
import { CreateAccessTokenSheetContent } from './create-access-token-sheet-content';

type AccessTokensSubPageProps = {
  organizationSlug: string;
};

const AccessTokensSubPage_OrganizationQuery = graphql(`
  query AccessTokensSubPage_OrganizationQuery(
    $organizationSlug: String!
    $scopes: [AccessTokenScopeType!]
    $userId: ID
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      allAccessTokens(first: 10, filter: { scopes: $scopes, userId: $userId }) {
        ...AccessTokensTable_AccessTokenConnectionFragment
      }
      members(first: 100) {
        edges {
          node {
            id
            user {
              id
              displayName
              email
            }
          }
        }
      }
      ...CreateAccessTokenSheetContent_OrganizationFragment
      ...ResourceSelector_OrganizationFragment
    }
  }
`);

export const enum CreateAccessTokenState {
  closed,
  open,
  /** show confirmation dialog to ditch draft state of new access token */
  closing,
}

const scopeLabels: Record<AccessTokenScopeType, string> = {
  [AccessTokenScopeType.Organization]: 'Organization',
  [AccessTokenScopeType.Project]: 'Project',
  [AccessTokenScopeType.Personal]: 'Personal',
};

const validScopes = new Set<string>(Object.values(AccessTokenScopeType));

function isValidScope(value: string): value is AccessTokenScopeType {
  return validScopes.has(value);
}

export function AccessTokensSubPage(props: AccessTokensSubPageProps): React.ReactNode {
  // URL-based filter state
  const [scopeFilter, setScopeFilter] = useSearchParamsFilter<string[]>('scope', []);
  const [userFilter, setUserFilter] = useSearchParamsFilter<string>('user', '');

  // Validate scope filter values from URL params
  const validatedScopeFilter = scopeFilter.filter(isValidScope);

  const [query, refetchQuery] = useQuery({
    query: AccessTokensSubPage_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      scopes: validatedScopeFilter.length > 0 ? validatedScopeFilter : undefined,
      userId: userFilter || undefined,
    },
    requestPolicy: 'network-only',
  });

  const [createAccessTokenState, setCreateAccessTokenState] = useState<CreateAccessTokenState>(
    CreateAccessTokenState.closed,
  );

  // Extract members for the user filter dropdown
  const users =
    query.data?.organization?.members?.edges?.map(edge => ({
      id: edge.node.user.id,
      displayName: edge.node.user.displayName,
      email: edge.node.user.email,
    })) ?? [];

  const handleScopeToggle = (scope: AccessTokenScopeType) => {
    if (validatedScopeFilter.includes(scope)) {
      setScopeFilter(validatedScopeFilter.filter(s => s !== scope));
    } else {
      setScopeFilter([...validatedScopeFilter, scope]);
    }
  };

  const activeFilterCount =
    (validatedScopeFilter.length > 0 && validatedScopeFilter.length < 3 ? 1 : 0) +
    (userFilter ? 1 : 0);

  if (query.error) {
    return <QueryError error={query.error} organizationSlug={props.organizationSlug} />;
  }

  const clearFilters = () => {
    setScopeFilter([]);
    setUserFilter('');
  };

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Access Tokens"
        description={
          <div className="max-w-[800px] space-y-2">
            <CardDescription>
              Access Tokens are used for the Hive CLI, Hive Public GraphQL API and Hive Usage
              Reporting. Granular resource based access can be granted based on permissions.
            </CardDescription>
            <CardDescription>
              Here you can see, create and revoke access tokens issued within the whole organization
              (including project, personal and organization scoped) access tokens.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/access-tokens"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </div>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-access-tokens">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Scope Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 size-4" />
                  Scope
                  {validatedScopeFilter.length > 0 && validatedScopeFilter.length < 3 && (
                    <Badge variant="secondary" className="ml-2">
                      {validatedScopeFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Filter by scope</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(
                  [
                    AccessTokenScopeType.Organization,
                    AccessTokenScopeType.Project,
                    AccessTokenScopeType.Personal,
                  ] as const
                ).map(scope => (
                  <DropdownMenuCheckboxItem
                    key={scope}
                    checked={validatedScopeFilter.includes(scope)}
                    onCheckedChange={() => handleScopeToggle(scope)}
                  >
                    {scopeLabels[scope]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Filter Dropdown (only show if there are users) */}
            {users.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FilterIcon className="mr-2 size-4" />
                    Owner
                    {userFilter && (
                      <Badge variant="secondary" className="ml-2">
                        1
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Filter by owner</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={!userFilter}
                    onCheckedChange={() => setUserFilter('')}
                  >
                    All users
                  </DropdownMenuCheckboxItem>
                  {users.map(user => (
                    <DropdownMenuCheckboxItem
                      key={user.id}
                      checked={userFilter === user.id}
                      onCheckedChange={() => setUserFilter(user.id)}
                    >
                      <span className="truncate">
                        {user.displayName || user.email}
                        {user.displayName && (
                          <span className="text-muted-foreground ml-1 text-xs">({user.email})</span>
                        )}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <XIcon className="mr-1 size-4" />
                Clear filters
              </Button>
            )}
          </div>

          <Sheet
            open={createAccessTokenState !== CreateAccessTokenState.closed}
            onOpenChange={isOpen => {
              if (isOpen === false) {
                setCreateAccessTokenState(CreateAccessTokenState.closing);
                return;
              }
              setCreateAccessTokenState(CreateAccessTokenState.open);
            }}
          >
            <SheetTrigger asChild>
              <Button data-cy="organization-settings-access-tokens-create-new">
                Create new access token
              </Button>
            </SheetTrigger>
            {createAccessTokenState !== CreateAccessTokenState.closed &&
              query.data?.organization && (
                <CreateAccessTokenSheetContent
                  organization={query.data.organization}
                  onSuccess={() => {
                    setCreateAccessTokenState(CreateAccessTokenState.closed);
                    refetchQuery();
                  }}
                />
              )}
          </Sheet>
        </div>
        {createAccessTokenState === CreateAccessTokenState.closing && (
          <DiscardAccessTokenDraft
            onContinue={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
            onDiscard={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
          />
        )}
        {query.data?.organization && (
          <AccessTokensTable
            accessTokens={query.data.organization.allAccessTokens}
            organizationSlug={props.organizationSlug}
            refetch={refetchQuery}
            scopeFilter={validatedScopeFilter}
            userFilter={userFilter}
          />
        )}
      </div>
    </SubPageLayout>
  );
}
