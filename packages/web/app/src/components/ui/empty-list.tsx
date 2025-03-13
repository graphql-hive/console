import { ReactElement, ReactNode } from 'react';
import magnifier from '../../../public/images/figures/magnifier.svg?url';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { DocsLink } from './docs-note';
import { Heading } from './heading';
import { Code } from './code';

export const EmptyList = ({
  title,
  description,
  docsUrl,
  className,
  children,
}: {
  title: string;
  description: string;
  docsUrl?: string | null;
  children?: ReactNode | null;
  className?: string;
}): ReactElement => {
  return (
    <Card
      className={cn('flex grow cursor-default flex-col items-center gap-y-2 p-4', className)}
      data-cy="empty-list"
    >
      <img
        src={magnifier}
        alt="Magnifier illustration"
        width="200"
        height="200"
        className="drag-none"
      />
      <Heading className="text-center">{title}</Heading>
      <span className="text-center text-sm font-medium text-gray-500">{description}</span>
      {children}
      {docsUrl && <DocsLink href={docsUrl}>Read about it in the documentation</DocsLink>}
    </Card>
  );
};

export const noSchema = (
  <EmptyList
    title="Schema Registry contains no schema"
    description="You can publish a schema with Hive CLI and Hive Client"
    docsUrl="/features/schema-registry#publish-a-schema"
  />
);

export const NoSchemaVersion = ({
  projectType = null,
  recommendedAction = 'none',
}: {
  projectType: ProjectType | null;
  recommendedAction: 'publish' | 'check' | 'none';
}): ReactElement => {
  let children: ReactElement | null = null;
  if (recommendedAction !== 'none') {
    const isDistributed =
      projectType === ProjectType.Federation || projectType === ProjectType.Stitching;

    if (recommendedAction === 'check') {
      children = (
        <>
          <div className="flex w-full justify-center py-2 text-xs text-gray-500">
            It's recommended to check that the schema is valid and compatible with the state of the
            registry before publishing.
          </div>
          <div className="flex w-full justify-center">
            <Code>
              {`hive schema:check ${isDistributed ? '--service <service-name> --url <url> ' : ''}<path/schema.graphql>`}
            </Code>
          </div>
        </>
      );
    } else if (recommendedAction === 'publish') {
      children = (
        <>
          {isDistributed && (
            <div className="flex w-full justify-center py-2 text-xs text-gray-500">
              For distributed systems, it's recommended to publish the schema after the service is
              deployed.
            </div>
          )}
          <div className="flex w-full justify-center">
            <Code>
             {`hive schema:publish ${isDistributed ? '--service <service-name> --url <url> ' : ''}<path/schema.graphql>`}
            </Code>
          </div>
        </>
      );
    }
  }

  return (
    <EmptyList
      title="Hive is waiting for your first schema"
      description="You can publish a schema with Hive CLI and Hive Client"
      docsUrl="/features/schema-registry#publish-a-schema"
    >
      {children}
    </EmptyList>
  );
};

export const noValidSchemaVersion = (
  <EmptyList
    title="Hive is waiting for your first composable schema version"
    description="You can publish a schema with Hive CLI and Hive Client"
    docsUrl="/features/schema-registry#publish-a-schema"
  />
);
