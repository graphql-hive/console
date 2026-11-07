import { Card } from '@/components/ui/primitives/card/card';
import { authStyles } from './auth.css';

export function AuthCardStack(props: { children: React.ReactNode }) {
  return <div className={authStyles.stack}>{props.children}</div>;
}

export function AuthOrSeparator() {
  return (
    <div className={authStyles.separator}>
      <div className={authStyles.separatorLine} />
      <div className={authStyles.separatorLabel}>or</div>
      <div className={authStyles.separatorLine} />
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
    <div className={authStyles.card}>
      <Card
        variants={{ onSurface: 'raised', titleSize: 'xlarge' }}
        title={title}
        description={
          description ? (
            <span data-testid="auth-card-header-description">{description}</span>
          ) : undefined
        }
      >
        {content}
      </Card>
    </div>
  );
}
