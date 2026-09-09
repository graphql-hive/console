import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  children,
  title,
  description,
  content,
}: {
  children?: React.ReactNode;
  title: string;
  description?: string;
  content?: React.ReactNode;
}) {
  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl" data-cy="auth-card-header-title">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription data-cy="auth-card-header-description">{description}</CardDescription>
        ) : null}
      </CardHeader>
      {content && <CardContent>{content}</CardContent>}
      {children}
    </Card>
  );
}
