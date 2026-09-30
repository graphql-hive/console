import { useState } from 'react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
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
import { DocsLink } from '@/components/ui/docs-note';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql } from '@/gql';
import { useSlugs, useToggle } from '@/lib/hooks';

function Channels(props: { channels: FragmentType<typeof ChannelsTable_AlertChannelFragment>[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, toggleModalOpen] = useToggle();
  const [modalSession, setModalSession] = useState(0);
  const channels = props.channels ?? [];

  return (
    <Card
      title="Channels"
      description={
        <>
          <p className="pb-2">
            Alert Channels are a way to configure <strong>how</strong> you want to receive alerts
            and notifications from Hive.
          </p>
          <DocsLink text="Learn more" href="/schema-registry/management/projects#alert-channels" />
        </>
      }
    >
      <ChannelsTable
        channels={channels}
        isChecked={channelId => selected.includes(channelId)}
        onCheckedChange={(channelId, isChecked) => {
          setSelected(isChecked ? [...selected, channelId] : selected.filter(k => k !== channelId));
        }}
      />
      <div className="mt-4 flex items-center gap-x-2">
        <Button onClick={toggleModalOpen}>Add channel</Button>
        {channels.length > 0 && (
          <DeleteChannelsButton
            selected={selected}
            onSuccess={() => {
              setSelected([]);
            }}
          />
        )}
      </div>
      <CreateChannelModal
        key={modalSession}
        isOpen={isModalOpen}
        toggleModalOpen={toggleModalOpen}
        onOpenChangeComplete={open => {
          if (!open) {
            setModalSession(s => s + 1);
          }
        }}
      />
    </Card>
  );
}

function Alerts(props: {
  alerts: FragmentType<typeof AlertsTable_AlertFragment>[];
  channels: FragmentType<typeof CreateAlertModal_AlertChannelFragment>[];
  targets: FragmentType<typeof CreateAlertModal_TargetFragment>[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, toggleModalOpen] = useToggle();
  const [modalSession, setModalSession] = useState(0);
  const alerts = props.alerts ?? [];

  return (
    <>
      <Card
        title="Alerts and Notifications"
        description={
          <>
            <p className="pb-2">
              Alerts are a way to configure <strong>when</strong> you want to receive alerts and
              notifications from Hive.
            </p>
            <DocsLink
              text="Learn more"
              href="/schema-registry/management/projects#alerts-and-notifications"
            />
          </>
        }
      >
        <AlertsTable
          alerts={alerts}
          isChecked={alertId => selected.includes(alertId)}
          onCheckedChange={(alertId, isChecked) => {
            setSelected(isChecked ? [...selected, alertId] : selected.filter(k => k !== alertId));
          }}
        />
        <div className="mt-4 flex items-center gap-x-2">
          <Button onClick={toggleModalOpen}>Create alert</Button>
          <DeleteAlertsButton
            selected={selected}
            onSuccess={() => {
              setSelected([]);
            }}
          />
        </div>
      </Card>
      <CreateAlertModal
        key={modalSession}
        targets={props.targets}
        channels={props.channels}
        isOpen={isModalOpen}
        toggleModalOpen={toggleModalOpen}
        onOpenChangeComplete={open => {
          if (!open) {
            setModalSession(s => s + 1);
          }
        }}
      />
    </>
  );
}

export const ProjectAlertsPageQuery = graphql(`
  query ProjectAlertsPageQuery($organizationSlug: String!, $projectSlug: String!) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      targets {
        edges {
          node {
            ...CreateAlertModal_TargetFragment
          }
        }
      }
      alerts {
        ...AlertsTable_AlertFragment
      }
      alertChannels {
        ...ChannelsTable_AlertChannelFragment
        ...CreateAlertModal_AlertChannelFragment
      }
    }
  }
`);

function AlertsPageContent() {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const [query] = useQuery({
    query: ProjectAlertsPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
    },
  });

  const currentProject = query.data?.project;

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const alerts = currentProject?.alerts || [];
  const channels = currentProject?.alertChannels || [];
  const targets = currentProject?.targets?.edges.map(edge => edge.node) || [];

  return (
    <div>
      <div className="py-6">
        <Title>Alerts and Notifications</Title>
        <Subtitle>Configure alerts and notifications for your project.</Subtitle>
      </div>
      {currentProject ? (
        <div className="flex flex-col gap-y-4">
          <Channels channels={channels} />
          <Alerts alerts={alerts} channels={channels} targets={targets} />
        </div>
      ) : null}
    </div>
  );
}

export function ProjectAlertsPage() {
  return (
    <>
      <Meta title="Alerts" />
      <LayoutContent className="flex flex-col gap-y-10">
        <AlertsPageContent />
      </LayoutContent>
    </>
  );
}
