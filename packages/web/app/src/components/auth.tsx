import { Card } from '@/components/ui/primitives/card/card';
import * as styles from './auth.css';

export function AuthCardStack(props: { children: React.ReactNode }) {
  return <div className={styles.authCardStackDiv}>{props.children}</div>;
}

export function AuthOrSeparator() {
  return (
    <div className={styles.authOrSeparatorDiv}>
      <div className={styles.authOrSeparatorDiv2} />
      <div className={styles.authOrSeparatorDiv3}>or</div>
      <div className={styles.authOrSeparatorDiv4} />
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
    <div className={styles.authCardDiv}>
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
