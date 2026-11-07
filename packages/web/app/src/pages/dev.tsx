import { GraphiQL } from 'graphiql';
import { Helmet } from 'react-helmet-async';
import { HiveLogo } from '@/components/ui/brand-icon';
import { env } from '@/env/frontend';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import 'graphiql/style.css';
import { devStyles } from './dev.css';

export function DevPage() {
  return (
    <div className={devStyles.root}>
      <Helmet>
        <style key="dev">
          {`
            body.graphiql-dark .graphiql-container {
              --color-base: transparent;
            }
          `}
        </style>
      </Helmet>
      <GraphiQL
        fetcher={createGraphiQLFetcher({
          url: env.graphqlPublicEndpoint,
          // The session is cookies on the API origin; the playground's requests must carry them.
          fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
        })}
      >
        <GraphiQL.Logo>
          <HiveLogo className={devStyles.logo} />
        </GraphiQL.Logo>
      </GraphiQL>
    </div>
  );
}
