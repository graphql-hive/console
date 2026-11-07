import { clsx } from 'clsx';
import { BookIcon } from 'lucide-react';
import { GitHubIcon, HiveLogo } from '@/components/ui/brand-icon';
import { Meta } from '@/components/ui/meta';
import { useSession } from '@/lib/auth/use-session';
import * as shared from '@/styles/shared.css';
import { Link, Outlet } from '@tanstack/react-router';
import * as styles from './auth.css';

function ExternalLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a href={props.href} className={clsx(styles.externalLinkA, 'group')}>
      <span className={styles.externalLinkSpan} />
      {props.children}
    </a>
  );
}

export function AuthPage() {
  const session = useSession();

  return (
    <>
      <Meta title="Welcome" />
      <div className={styles.authPageDiv}>
        <>
          {session.loading ? (
            <div className={styles.authPageDiv2}>
              <HiveLogo animated={false} className={styles.authPageHiveLogo} />
            </div>
          ) : (
            <div className={styles.authPageDiv3}>
              <div className={styles.authPageDiv4}>
                <div className={styles.authPageDiv5} />
                <Link to="/">
                  <div className={styles.authPageDiv6}>
                    <HiveLogo animated={false} className={styles.authPageHiveLogo2} />
                    Hive Console
                  </div>
                </Link>
                <div className={styles.authPageDiv7}>
                  <div className={styles.authPageDiv8}>
                    <h1 className={styles.authPageH1}>
                      Open-source <span className={shared.fg.accent}>GraphQL</span> management
                      platform
                    </h1>
                    <p className={styles.authPageP}>
                      Prevent breaking changes, monitor performance of your GraphQL API, and manage
                      your API gateway
                    </p>
                    <div className={styles.authPageDiv9}>
                      <ExternalLink href="https://the-guild.dev/graphql/hive/docs">
                        <BookIcon className={styles.authPageBookIcon} />
                        <span className={styles.authPageSpan2}>Documentation</span>
                      </ExternalLink>
                      <ExternalLink href="https://github.com/graphql-hive/platform">
                        <GitHubIcon className={styles.authPageGitHubIcon} />
                        <span className={styles.authPageSpan3}>Github</span>
                      </ExternalLink>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.authPageDiv10}>
                <Outlet />
              </div>
            </div>
          )}
        </>
      </div>
    </>
  );
}
