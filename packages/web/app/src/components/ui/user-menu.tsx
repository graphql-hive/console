import cookies from 'js-cookie';
import { LifeBuoyIcon, UserRoundMinus } from 'lucide-react';
import { useMutation } from 'urql';
import { Menu } from '@/components/base/floating/menu/menu';
import { useThemeMenuEntry } from '@/components/theme/theme-switcher';
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
import { Avatar } from '@/components/v2/avatar';
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
    provisionInfo {
      __typename
    }
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
  const themeEntry = useThemeMenuEntry();
  const [isUserSettingsModalOpen, toggleUserSettingsModalOpen] = useToggle();
  const [isLeaveOrganizationModalOpen, toggleLeaveOrganizationModalOpen] = useToggle();

  return (
    <>
      <UserSettingsModal
        toggleModalOpen={toggleUserSettingsModalOpen}
        isOpen={isUserSettingsModalOpen}
      />
      {currentOrganization?.me?.canLeaveOrganization ? (
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
        <Menu
          align="end"
          sideOffset={5}
          minWidth="md"
          trigger={
            <div
              className={cn('cursor-pointer', currentOrganization ? '' : 'animate-pulse')}
              data-cy="user-menu-trigger"
            >
              <Avatar shape="circle" className="border-accent_80 border-2" />
            </div>
          }
          sections={
            me && organizations
              ? [
                  [{ kind: 'header', title: me.displayName, subtitle: me.email }],
                  [
                    me.canSwitchOrganization && {
                      kind: 'submenu',
                      label: 'Switch organization',
                      icon: GridIcon,
                      maxWidth: 'default',
                      items: [
                        organizations.length
                          ? {
                              label: 'Organizations',
                              items: organizations.map(org => ({
                                label: org.slug,
                                selected: currentOrganization?.slug === org.slug,
                                render: (
                                  <Link
                                    to="/$organizationSlug"
                                    params={{ organizationSlug: org.slug }}
                                  />
                                ),
                              })),
                            }
                          : [],
                        [
                          {
                            label: 'Create organization',
                            trailingIcon: PlusIcon,
                            render: <Link to="/org/new" />,
                          },
                        ],
                      ],
                    },
                    {
                      kind: 'link',
                      label: 'Schedule a meeting',
                      icon: CalendarIcon,
                      external: true,
                      href: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3KSfa5HXLUJKSoxdziqD_2rWPlDevQgWHeSNGEUN5GqafDw7ezvWlvKYjmxOo5_0hcB4_8W8G2',
                    },
                    !me.provisionInfo && {
                      label: 'Profile settings',
                      icon: SettingsIcon,
                      onClick: toggleUserSettingsModalOpen,
                    },
                  ],
                  [themeEntry],
                  [
                    {
                      kind: 'link',
                      label: 'Documentation',
                      icon: FileTextIcon,
                      href: docsUrl,
                      external: true,
                    },
                    currentOrganization &&
                      env.zendeskSupport && {
                        label: 'Support',
                        icon: LifeBuoyIcon,
                        render: (
                          <Link
                            to="/$organizationSlug/view/support"
                            params={{ organizationSlug: currentOrganization.slug }}
                          />
                        ),
                      },
                    {
                      kind: 'link',
                      label: 'Status page',
                      icon: AlertTriangleIcon,
                      href: 'https://status.graphql-hive.com',
                      external: true,
                    },
                    me.isAdmin && {
                      label: 'Manage Instance',
                      icon: TrendingUpIcon,
                      render: <Link to="/manage" />,
                    },
                    env.nodeEnv === 'development' && {
                      label: 'Dev GraphiQL',
                      icon: GraphQLIcon,
                      render: <Link to="/dev" />,
                    },
                  ],
                  [
                    currentOrganization?.me?.canLeaveOrganization && {
                      label: 'Leave organization',
                      icon: UserRoundMinus,
                      onClick: toggleLeaveOrganizationModalOpen,
                    },
                    {
                      kind: 'link',
                      label: 'Log out',
                      icon: LogOutIcon,
                      href: '/logout',
                      attrs: { 'data-cy': 'user-menu-logout' },
                    },
                  ],
                ]
              : []
          }
        />
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
