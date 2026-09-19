import { Card } from '@/components/base/card/card';

export function AuthCardStack(props: { children: React.ReactNode }) {
  return <div className="grid gap-y-4">{props.children}</div>;
}

export function AuthOrSeparator() {
  return (
    <div className="flex flex-row items-center justify-between gap-x-4">
      <div className="bg-neutral-4 h-px w-full" />
      <div className="text-neutral-9 text-center">or</div>
      <div className="bg-neutral-4 h-px w-full" />
    </div>
  );
}

export function AuthCard({
  title,
  description,
  content,
}: {
  title: string;
  description?: string;
  content?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full md:max-w-md">
      <Card
        variants={{ onSurface: 'raised', titleSize: 'xlarge' }}
        title={title}
        description={
          description ? (
            <span data-cy="auth-card-header-description">{description}</span>
          ) : undefined
        }
      >
        {content}
      </Card>
    </div>
  );
}
