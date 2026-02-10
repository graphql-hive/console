import cookies from 'js-cookie';
import { LifeBuoyIcon } from 'lucide-react';
import { FaUsersSlash } from 'react-icons/fa';
import { useMutation } from 'urql';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/icon';
import { Avatar } from '@/components/v2';
import { LAST_VISITED_ORG_KEY } from '@/constants';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { getDocsUrl } from '@/lib/docs-url';
import { useToggle } from '@/lib/hooks';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { GetStartedProgress } from '../get-started/trigger';
import { UserSettingsModal } from '../user/settings';
import { Changelog } from './changelog/changelog';
import { latestChangelog } from './changelog/generated-changelog';

const UserMenu_OrganizationConnectionFragment = graphql(`
  fragment UserMenu_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
    }
  }
`);

const UserMenu_OrganizationFragment = graphql(`
  fragment UserMenu_OrganizationFragment on Organization {
    id
    slug
    me {
      id
      canLeaveOrganization
    }
    getStarted {
      ...GetStartedWizard_GetStartedProgress
    }
  }
`);

const UserMenu_MeFragment = graphql(`
  fragment UserMenu_MeFragment on User {
    id
    email
    displayName
    provider
    isAdmin
    canSwitchOrganization
  }
`);

export function UserMenu(props: {
  me: FragmentType<typeof UserMenu_MeFragment> | null;
  organizations: FragmentType<typeof UserMenu_OrganizationConnectionFragment> | null;
  currentOrganization: FragmentType<typeof UserMenu_OrganizationFragment> | null;
}) {
  const docsUrl = getDocsUrl();
  const me = useFragment(UserMenu_MeFragment, props.me);
  const organizations = useFragment(
    UserMenu_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;
  const currentOrganization = useFragment(UserMenu_OrganizationFragment, props.currentOrganization);
  const [isUserSettingsModalOpen, toggleUserSettingsModalOpen] = useToggle();
  const [isLeaveOrganizationModalOpen, toggleLeaveOrganizationModalOpen] = useToggle();

  return (
    <>
      <UserSettingsModal
        toggleModalOpen={toggleUserSettingsModalOpen}
        isOpen={isUserSettingsModalOpen}
      />
      {currentOrganization?.me.canLeaveOrganization ? (
        <LeaveOrganizationModal
          toggleModalOpen={toggleLeaveOrganizationModalOpen}
          isOpen={isLeaveOrganizationModalOpen}
          organizationSlug={currentOrganization.slug}
        />
      ) : null}
      <div className="flex flex-row items-center gap-8">
        <Changelog changes={latestChangelog} />
        {currentOrganization ? (
          <GetStartedProgress className="hidden md:block" tasks={currentOrganization.getStarted} />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn('cursor-pointer', currentOrganization ? '' : 'animate-pulse')}
              data-cy="user-menu-trigger"
            >
              <Avatar shape="circle" className="border-accent_80 border-2" />
            </div>
          </DropdownMenuTrigger>

          {me && organizations ? (
            <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
              <DropdownMenuLabel className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <div className="truncate text-sm font-medium leading-none">{me?.displayName}</div>
                  <div className="text-neutral-10 truncate text-xs font-normal leading-none">
                    {me?.email}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                {me?.canSwitchOrganization ? (
                  <DropdownMenuSubTrigger>
                    <GridIcon className="mr-2 size-4" />
                    Switch organization
                  </DropdownMenuSubTrigger>
                ) : null}
                <DropdownMenuSubContent className="max-w-[300px]">
                  {organizations.length ? (
                    <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                  ) : null}
                  <DropdownMenuSeparator />
                  {organizations.map(org => (
                    <DropdownMenuItem
                      asChild
                      key={org.slug}
                      active={currentOrganization?.slug === org.slug}
                    >
                      <Link
                        to="/$organizationSlug"
                        params={{
                          organizationSlug: org.slug,
                        }}
                      >
                        {org.slug}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/org/new">
                      Create organization
                      <PlusIcon className="ml-2 size-4" />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem asChild>
                <a
                  href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3KSfa5HXLUJKSoxdziqD_2rWPlDevQgWHeSNGEUN5GqafDw7ezvWlvKYjmxOo5_0hcB4_8W8G2"
                  target="_blank"
                  rel="noreferrer"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  Schedule a meeting
                </a>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  toggleUserSettingsModalOpen();
                }}
              >
                <SettingsIcon className="mr-2 size-4" />
                Profile settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeSwitcher />
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={docsUrl} target="_blank" rel="noreferrer">
                  <FileTextIcon className="mr-2 size-4" />
                  Documentation
                </a>
              </DropdownMenuItem>
              {currentOrganization && env.zendeskSupport ? (
                <DropdownMenuItem asChild>
                  <Link
                    to="/$organizationSlug/view/support"
                    params={{
                      organizationSlug: currentOrganization.slug,
                    }}
                  >
                    <LifeBuoyIcon className="mr-2 size-4" />
                    Support
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <a href="https://status.graphql-hive.com" target="_blank" rel="noreferrer">
                  <AlertTriangleIcon className="mr-2 size-4" />
                  Status page
                </a>
              </DropdownMenuItem>
              {me.isAdmin && (
                <Link to="/manage">
                  <DropdownMenuItem>
                    <TrendingUpIcon className="mr-2 size-4" />
                    Manage Instance
                  </DropdownMenuItem>
                </Link>
              )}
              {env.nodeEnv === 'development' && (
                <DropdownMenuItem asChild>
                  <Link to="/dev">
                    <GraphQLIcon className="mr-2 size-4" />
                    Dev GraphiQL
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {currentOrganization?.me.canLeaveOrganization ? (
                <DropdownMenuItem
                  onClick={() => {
                    toggleLeaveOrganizationModalOpen();
                  }}
                >
                  <FaUsersSlash className="mr-2 size-4" />
                  Leave organization
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <a href="/logout" data-cy="user-menu-logout">
                  <LogOutIcon className="mr-2 size-4" />
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

const LeaveOrganizationModal_LeaveOrganizationMutation = graphql(`
  mutation LeaveOrganizationModal_LeaveOrganizationMutation($input: OrganizationSelectorInput!) {
    leaveOrganization(input: $input) {
      ok {
        organizationId
      }
      error {
        message
      }
    }
  }
`);

export function LeaveOrganizationModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
}) {
  const { organizationSlug } = props;
  const [, mutate] = useMutation(LeaveOrganizationModal_LeaveOrganizationMutation);
  const notify = useNotifications();

  async function onSubmit() {
    const result = await mutate({
      input: {
        organizationSlug,
      },
    });

    if (result.error) {
      notify("Couldn't leave organization. Please try again.", 'error');
    }

    if (result.data?.leaveOrganization.error) {
      notify(result.data.leaveOrganization.error.message, 'error');
    }

    if (result.data?.leaveOrganization.ok) {
      props.toggleModalOpen();
      cookies.remove(LAST_VISITED_ORG_KEY);
      window.location.href = '/';
    }
  }

  return (
    <LeaveOrganizationModalContent
      isOpen={props.isOpen}
      toggleModalOpen={props.toggleModalOpen}
      organizationSlug={organizationSlug}
      onSubmit={onSubmit}
    />
  );
}

export function LeaveOrganizationModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-4/5 max-w-[520px] md:w-3/5">
        <DialogHeader>
          <DialogTitle>Leave {props.organizationSlug}?</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave this organization?
            <br />
            You will lose access to{' '}
            <span className="text-neutral-12 font-semibold">{props.organizationSlug}</span>.
          </DialogDescription>
          <DialogDescription className="font-bold">This action is irreversible!</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            onClick={ev => {
              ev.preventDefault();
              props.toggleModalOpen();
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.onSubmit}>
            Leave organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
