import { useEffect, useState } from 'react';
import { useClient } from 'urql';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VirtualLogList } from '@/components/ui/virtual-log-list';
import { DocumentType, graphql } from '@/gql';

const SubscribeToOIDCIntegrationLogSubscription = graphql(`
  subscription oidcProviderLog($oidcIntegrationId: ID!) {
    oidcIntegrationLog(input: { oidcIntegrationId: $oidcIntegrationId }) {
      timestamp
      message
    }
  }
`);

type OIDCLogEventType = DocumentType<
  typeof SubscribeToOIDCIntegrationLogSubscription
>['oidcIntegrationLog'];

export function DebugOIDCIntegrationModal(props: { close: () => void; oidcIntegrationId: string }) {
  const client = useClient();

  const [isSubscribing, setIsSubscribing] = useState(true);

  const [logs, setLogs] = useState<Array<OIDCLogEventType>>([]);

  useEffect(() => {
    if (isSubscribing && props.oidcIntegrationId) {
      setLogs(logs => [
        ...logs,
        {
          __typename: 'OIDCIntegrationLogEvent',
          timestamp: new Date().toISOString(),
          message: 'Subscribing to logs...',
        },
      ]);
      const sub = client
        .subscription(SubscribeToOIDCIntegrationLogSubscription, {
          oidcIntegrationId: props.oidcIntegrationId,
        })
        .subscribe(next => {
          if (next.data?.oidcIntegrationLog) {
            const log = next.data.oidcIntegrationLog;
            setLogs(logs => [...logs, log]);
          }
        });

      return () => {
        setLogs(logs => [
          ...logs,
          {
            __typename: 'OIDCIntegrationLogEvent',
            timestamp: new Date().toISOString(),
            message: 'Stopped subscribing to logs...',
          },
        ]);

        sub.unsubscribe();
      };
    }
  }, [props.oidcIntegrationId, isSubscribing]);

  return (
    <Dialog open onOpenChange={props.close}>
      <DialogContent className="min-w-[750px]">
        <DialogHeader>
          <DialogTitle>Debug OpenID Connect Integration</DialogTitle>
          <DialogDescription>
            Here you can see to the live logs of users attempting to sign in. It can help
            identifying issues with the OpenID Connect configuration.
          </DialogDescription>
        </DialogHeader>
        <VirtualLogList logs={logs} className="h-[300px]" />
        <DialogFooter>
          <Button type="button" onClick={props.close} tabIndex={0} variant="destructive">
            Close
          </Button>
          <Button
            type="submit"
            onClick={() => {
              setIsSubscribing(isSubscribed => !isSubscribed);
            }}
          >
            {isSubscribing ? 'Stop subscription' : 'Subscribe to logs'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
