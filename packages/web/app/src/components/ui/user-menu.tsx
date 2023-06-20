import NextLink from 'next/link';
import { FaGithub, FaGoogle, FaKey } from 'react-icons/fa';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/v2';
import {
  AlertTriangleIcon,
  CalendarIcon,
  FileTextIcon,
  GraphQLIcon,
  GridIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  TrendingUpIcon,
} from '@/components/v2/icon';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AuthProvider } from '@/graphql';
import { getDocsUrl } from '@/lib/docs-url';
import { useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { GetStartedProgress } from '../get-started/wizard';
import { UserSettingsModal } from '../user/settings';

export const UserMenu_CurrentOrganizationFragment = graphql(`
  fragment UserMenu_CurrentOrganizationFragment on Organization {
    id
    cleanId
    name
    getStarted {
      ...GetStartedWizard_GetStartedProgress
    }
  }
`);

export const UserMenu_OrganizationConnectionFragment = graphql(`
  fragment UserMenu_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      cleanId
      name
    }
  }
`);

export const UserMenu_MeFragment = graphql(`
  fragment UserMenu_MeFragment on User {
    id
    email
    fullName
    displayName
    provider
    isAdmin
    canSwitchOrganization
  }
`);

export function UserMenu(props: {
  me: FragmentType<typeof UserMenu_MeFragment> | null;
  currentOrganization: FragmentType<typeof UserMenu_CurrentOrganizationFragment> | null;
  organizations: FragmentType<typeof UserMenu_OrganizationConnectionFragment> | null;
}) {
  const docsUrl = getDocsUrl();
  const me = useFragment(UserMenu_MeFragment, props.me);
  const currentOrganization = useFragment(
    UserMenu_CurrentOrganizationFragment,
    props.currentOrganization,
  );
  const organizations = useFragment(UserMenu_OrganizationConnectionFragment, props.organizations);
  const [isUserSettingsModalOpen, toggleUserSettingsModalOpen] = useToggle();

  return (
    <>
      <UserSettingsModal
        toggleModalOpen={toggleUserSettingsModalOpen}
        isOpen={isUserSettingsModalOpen}
      />
      <div className="flex flex-row gap-8 items-center">
        {currentOrganization ? <GetStartedProgress tasks={currentOrganization.getStarted} /> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn('cursor-pointer', currentOrganization ? '' : 'animate-pulse')}
              data-cy="user-menu-trigger"
            >
              <Avatar shape="circle" className="border-2 border-orange-900/50" />
            </div>
          </DropdownMenuTrigger>

          {me && organizations ? (
            <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
              <DropdownMenuLabel>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <div className="text-sm font-medium leading-none truncate">
                      {me?.displayName}
                    </div>
                    <div className="text-xs font-normal leading-none text-muted-foreground truncate">
                      {me?.email}
                    </div>
                  </div>
                  <div>
                    {me?.provider === AuthProvider.Google ? (
                      <FaGoogle title="Signed in using Google" />
                    ) : me?.provider === AuthProvider.Github ? (
                      <FaGithub title="Signed in using Github" />
                    ) : (
                      <FaKey title="Signed in using username and password" />
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                {me?.canSwitchOrganization ? (
                  <DropdownMenuSubTrigger>
                    <GridIcon className="mr-2 h-4 w-4" />
                    Switch organization
                  </DropdownMenuSubTrigger>
                ) : null}
                <DropdownMenuSubContent className="max-w-[300px]">
                  {organizations.nodes.length ? (
                    <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                  ) : null}
                  <DropdownMenuSeparator />
                  {organizations.nodes.map(org => (
                    <NextLink href={`/${org.cleanId}`} key={org.cleanId}>
                      <DropdownMenuItem active={currentOrganization?.cleanId === org.cleanId}>
                        {org.name}
                      </DropdownMenuItem>
                    </NextLink>
                  ))}
                  <DropdownMenuSeparator />
                  <NextLink href="/org/new">
                    <DropdownMenuItem>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Create an organization
                    </DropdownMenuItem>
                  </NextLink>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem asChild>
                <a
                  href="https://cal.com/team/the-guild/graphql-hive-15m"
                  target="_blank"
                  rel="noreferrer"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Schedule a meeting
                </a>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  toggleUserSettingsModalOpen();
                }}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Profile settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {docsUrl ? (
                <DropdownMenuItem asChild>
                  <a href={docsUrl} target="_blank" rel="noreferrer">
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    Documentation
                  </a>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <a href="https://status.graphql-hive.com" target="_blank" rel="noreferrer">
                  <AlertTriangleIcon className="mr-2 h-4 w-4" />
                  Status page
                </a>
              </DropdownMenuItem>
              {me.isAdmin === true && (
                <NextLink href="/manage">
                  <DropdownMenuItem>
                    <TrendingUpIcon className="mr-2 h-4 w-4" />
                    Manage Instance
                  </DropdownMenuItem>
                </NextLink>
              )}
              {env.nodeEnv === 'development' && (
                <NextLink href="/dev">
                  <DropdownMenuItem>
                    <GraphQLIcon className="mr-2 h-4 w-4" />
                    Dev GraphiQL
                  </DropdownMenuItem>
                </NextLink>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/logout" data-cy="user-menu-logout">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Log out
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          ) : null}
        </DropdownMenu>
      </div>
    </>
  );
}
