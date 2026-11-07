import { BookIcon } from 'lucide-react';
import { GitHubIcon, HiveLogo } from '@/components/ui/brand-icon';
import { Meta } from '@/components/ui/meta';
import { useSession } from '@/lib/auth/use-session';
import * as shared from '@/styles/shared.css';
import { Link, Outlet } from '@tanstack/react-router';
import { authStyles } from './auth.css';

function ExternalLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a href={props.href} className={authStyles.link}>
      <span className={authStyles.linkGlow} />
      {props.children}
    </a>
  );
}

export function AuthPage() {
  const session = useSession();

  return (
    <>
      <Meta title="Welcome" />
      <div className={authStyles.root}>
        <>
          {session.loading ? (
            <div className={authStyles.pending}>
              <HiveLogo animated={false} className={authStyles.pendingLogo} />
            </div>
          ) : (
            <div className={authStyles.layout}>
              <div className={authStyles.intro}>
                <div className={authStyles.introBackdrop} />
                <Link to="/">
                  <div className={authStyles.introBrand}>
                    <HiveLogo animated={false} className={authStyles.introLogo} />
                    Hive Console
                  </div>
                </Link>
                <div className={authStyles.introBody}>
                  <div className={authStyles.introText}>
                    <h1 className={authStyles.introTitle}>
                      Open-source <span className={shared.fg.accent}>GraphQL</span> management
                      platform
                    </h1>
                    <p className={authStyles.introDescription}>
                      Prevent breaking changes, monitor performance of your GraphQL API, and manage
                      your API gateway
                    </p>
                    <div className={authStyles.introLinks}>
                      <ExternalLink href="https://the-guild.dev/graphql/hive/docs">
                        <BookIcon className={authStyles.linkIcon} />
                        <span className={authStyles.linkLabel}>Documentation</span>
                      </ExternalLink>
                      <ExternalLink href="https://github.com/graphql-hive/platform">
                        <GitHubIcon className={authStyles.linkIcon} />
                        <span className={authStyles.linkLabel}>Github</span>
                      </ExternalLink>
                    </div>
                  </div>
                </div>
              </div>
              <div className={authStyles.form}>
                <Outlet />
              </div>
            </div>
          )}
        </>
      </div>
    </>
  );
}
