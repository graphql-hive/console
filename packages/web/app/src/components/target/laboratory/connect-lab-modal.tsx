import { type ReactElement } from 'react';
import { Button } from '@/components/base/button/button';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { Callout } from '@/components/ui/callout';
import { InputCopy } from '@/components/ui/input-copy';
import { Link } from '@/components/ui/link';
import { FragmentType, graphql, useFragment } from '@/gql';
import { getDocsUrl } from '@/lib/docs-url';

const Laboratory_IsCDNEnabledFragment = graphql(`
  fragment Laboratory_IsCDNEnabledFragment on Query {
    isCDNEnabled
  }
`);

export const ConnectLabModal = (props: {
  isOpen: boolean;
  close: () => void;
  endpoint: string;
  isCDNEnabled: FragmentType<typeof Laboratory_IsCDNEnabledFragment> | null;
}): ReactElement => {
  const docsUrl = getDocsUrl('/schema-registry/management/targets#registry-access-tokens');
  const isCDNEnabled = useFragment(
    Laboratory_IsCDNEnabledFragment,
    props.isCDNEnabled,
  )?.isCDNEnabled;

  return (
    <ConnectLabModalContent
      isOpen={props.isOpen}
      close={props.close}
      endpoint={props.endpoint}
      isCDNEnabled={isCDNEnabled}
      docsUrl={docsUrl}
    />
  );
};

export const ConnectLabModalContent = (props: {
  isOpen: boolean;
  close: () => void;
  endpoint: string;
  isCDNEnabled?: boolean;
  docsUrl: string;
}) => {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={props.close}
      width="lg"
      title="Use GraphQL Schema Externally"
      description="Hive allow you to consume and use the Laboratory schema with your configured mocks while developing."
      footer={
        <Button onSurface="raised" onClick={() => props.close()}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {props?.isCDNEnabled ? (
          <div>
            <h3 className="text-neutral-12 text-sm">High-availability CDN:</h3>
            <Callout className="mt-2" type="info">
              If you want to consume the GraphQL schema for a tool like GraphQL Code Generator, we
              instead recommend using the high-availability CDN instead.
            </Callout>
          </div>
        ) : null}
        <span className="text-neutral-12 text-sm">You can use the following endpoint:</span>
        <InputCopy value={props.endpoint} onSurface="raised" />
        <span className="text-neutral-12 text-sm">
          To authenticate, use the following HTTP headers, with a token that has `target:read`
          scope:
        </span>
        {/* A header line with a link inside, not a pill: a code block rather than a Badge. */}
        <code className="bg-neutral-4 text-neutral-11 inline-flex items-center gap-x-1 rounded-sm p-2 text-sm">
          X-Hive-Key:
          <Link
            as="a"
            variant="secondary"
            target="_blank"
            className="underline underline-offset-2"
            rel="noreferrer"
            href={props.docsUrl}
          >
            YOUR_TOKEN_HERE
          </Link>
        </code>
        <p className="text-neutral-10 text-sm">
          Read the{' '}
          <Link as="a" variant="primary" target="_blank" rel="noreferrer" href={props.docsUrl}>
            Managing Tokens
          </Link>{' '}
          chapter in our documentation to create a Registry Access Token.
        </p>
      </div>
    </Dialog>
  );
};
