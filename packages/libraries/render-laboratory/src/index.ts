import type { GraphiQLOptions } from 'graphql-yoga';
import type { LaboratoryProps } from '@graphql-hive/laboratory';
import {
  editorWorkerService,
  favicon,
  faviconDark,
  graphqlWorker,
  js,
  jsonWorker,
  typescriptWorker,
} from './laboratory.js';

const mapGraphiQLOptionsToLaboratoryProps = (opts?: GraphiQLOptions): LaboratoryProps => {
  if (!opts) {
    return {};
  }

  return {
    defaultSettings: {
      fetch: {
        credentials: opts.credentials ?? 'same-origin',
        timeout: opts.timeout,
        retry: opts.retry,
        useGETForQueries: opts.useGETForQueries,
      },
      subscriptions: {
        protocol: opts.subscriptionsProtocol ?? 'WS',
      },
      introspection: {
        method: opts.method,
        schemaDescription: opts.schemaDescription,
      },
    },
  } satisfies LaboratoryProps;
};

export const renderLaboratory = (opts?: GraphiQLOptions) => /* HTML */ `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${opts?.title || 'Hive Laboratory'}</title>
      <link
        rel="icon"
        type="image/svg+xml"
        media="(prefers-color-scheme: light)"
        href="${favicon}"
      />
      <link
        rel="icon"
        type="image/svg+xml"
        media="(prefers-color-scheme: dark)"
        href="${faviconDark}"
      />
      <style>
        html,
        body,
        #root {
          height: 100%;
        }

        body {
          margin: 0;
        }
      </style>
    </head>
    <body id="body" class="no-focus-outline">
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div>

      <script>
        function prepareBlob(workerContent) {
          const blob = new Blob([workerContent], { type: 'application/javascript' });
          return URL.createObjectURL(blob);
        }
        const workers = {
          editorWorkerService: prepareBlob(${JSON.stringify(editorWorkerService)}),
          typescript: prepareBlob(${JSON.stringify(typescriptWorker)}),
          json: prepareBlob(${JSON.stringify(jsonWorker)}),
          graphql: prepareBlob(${JSON.stringify(graphqlWorker)}),
        };
        self['MonacoEnvironment'] = {
          globalAPI: false,
          getWorkerUrl: function (moduleId, label) {
            return workers[label];
          },
        };

        ${js};

        HiveLaboratory.renderLaboratory(
          window.document.querySelector('#root'),
          ${JSON.stringify(mapGraphiQLOptionsToLaboratoryProps(opts))},
        );
      </script>
    </body>
  </html>
`;
