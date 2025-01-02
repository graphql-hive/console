import { useState } from 'react';
import { useQuery } from 'urql';
import { Page, ProjectLayout } from '@/components/layouts/project';
import { AlertsTable, AlertsTable_AlertFragment } from '@/components/project/alerts/alerts-table';
import {
  ChannelsTable,
  ChannelsTable_AlertChannelFragment,
} from '@/components/project/alerts/channels-table';
import {
  CreateAlertModal,
  CreateAlertModal_AlertChannelFragment,
  CreateAlertModal_TargetFragment,
} from '@/components/project/alerts/create-alert';
import { CreateChannelModal } from '@/components/project/alerts/create-channel';
import { DeleteAlertsButton } from '@/components/project/alerts/delete-alerts-button';
import { DeleteChannelsButton } from '@/components/project/alerts/delete-channels-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql } from '@/gql';
import { useRedirect } from '@/lib/access/common';
import { useToggle } from '@/lib/hooks';

function Channels(props: {
  organizationSlug: string;
  projectSlug: string;
  channels: FragmentType<typeof ChannelsTable_AlertChannelFragment>[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, toggleModalOpen] = useToggle();
  const channels = props.channels ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        <CardDescription>
          Alert Channels are a way to configure <strong>how</strong> you want to receive alerts and
          notifications from Hive.
          <br />
          <DocsLink
            className="text-muted-foreground text-sm"
            href="/management/projects#alert-channels"
          >
            Learn more
          </DocsLink>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChannelsTable
          channels={channels}
          isChecked={channelId => selected.includes(channelId)}
          onCheckedChange={(channelId, isChecked) => {
            setSelected(
              isChecked ? [...selected, channelId] : selected.filter(k => k !== channelId),
            );
          }}
        />
      </CardContent>
      <CardFooter>
        <div className="mt-4 flex gap-x-2">
          <Button variant="default" onClick={toggleModalOpen}>
            Add channel
          </Button>
          {channels.length > 0 && (
            <DeleteChannelsButton
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              selected={selected}
              onSuccess={() => {
                setSelected([]);
              }}
            />
          )}
        </div>
      </CardFooter>
      {isModalOpen && (
        <CreateChannelModal
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          isOpen={isModalOpen}
          toggleModalOpen={toggleModalOpen}
        />
      )}
    </Card>
  );
}

function Alerts(props: {
  alerts: FragmentType<typeof AlertsTable_AlertFragment>[];
  channels: FragmentType<typeof CreateAlertModal_AlertChannelFragment>[];
  targets: FragmentType<typeof CreateAlertModal_TargetFragment>[];
  organizationSlug: string;
  projectSlug: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, toggleModalOpen] = useToggle();
  const alerts = props.alerts ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Alerts and Notifications</CardTitle>
          <CardDescription>
            Alerts are a way to configure <strong>when</strong> you want to receive alerts and
            notifications from Hive.
            <br />
            <DocsLink
              className="text-muted-foreground text-sm"
              href="/management/projects#alerts-and-notifications-1"
            >
              Learn more
            </DocsLink>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertsTable
            alerts={alerts}
            isChecked={alertId => selected.includes(alertId)}
            onCheckedChange={(alertId, isChecked) => {
              setSelected(isChecked ? [...selected, alertId] : selected.filter(k => k !== alertId));
            }}
          />
        </CardContent>
        <CardFooter>
          <div className="flex gap-x-2">
            <Button variant="default" onClick={toggleModalOpen}>
              Create alert
            </Button>
            <DeleteAlertsButton
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              selected={selected}
              onSuccess={() => {
                setSelected([]);
              }}
            />
          </div>
        </CardFooter>
      </Card>
      {isModalOpen && (
        <CreateAlertModal
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
          targets={props.targets}
          channels={props.channels}
          isOpen={isModalOpen}
          toggleModalOpen={toggleModalOpen}
        />
      )}
    </>
  );
}

const ProjectAlertsPageQuery = graphql(`
  query ProjectAlertsPageQuery($organizationSlug: String!, $projectSlug: String!) {
    project(selector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug }) {
      id
      targets {
        nodes {
          ...CreateAlertModal_TargetFragment
        }
      }
      alerts {
        ...AlertsTable_AlertFragment
      }
      alertChannels {
        ...ChannelsTable_AlertChannelFragment
        ...CreateAlertModal_AlertChannelFragment
      }
      viewerCanModifyAlerts
    }
  }
`);

function AlertsPageContent(props: { organizationSlug: string; projectSlug: string }) {
  const [query] = useQuery({
    query: ProjectAlertsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
    },
    requestPolicy: 'cache-and-network',
  });

  const currentProject = query.data?.project;

  useRedirect({
    canAccess: currentProject?.viewerCanModifyAlerts === true,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
        },
      });
    },
    entity: currentProject,
  });

  if (query.data?.project?.viewerCanModifyAlerts === false) {
    return null;
  }

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const alerts = currentProject?.alerts || [];
  const channels = currentProject?.alertChannels || [];
  const targets = currentProject?.targets?.nodes || [];

  return (
    <div>
      <div className="py-6">
        <Title>Alerts and Notifications</Title>
        <Subtitle>Configure alerts and notifications for your project.</Subtitle>
      </div>
      {currentProject ? (
        <div className="flex flex-col gap-y-4">
          <Channels
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            channels={channels}
          />
          <Alerts
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            alerts={alerts}
            channels={channels}
            targets={targets}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ProjectAlertsPage(props: { organizationSlug: string; projectSlug: string }) {
  return (
    <>
      <Meta title="Alerts" />
      <ProjectLayout
        projectSlug={props.projectSlug}
        organizationSlug={props.organizationSlug}
        page={Page.Alerts}
        className="flex flex-col gap-y-10"
      >
        <AlertsPageContent
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
        />
      </ProjectLayout>
    </>
  );
}
