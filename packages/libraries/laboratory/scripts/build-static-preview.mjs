import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.resolve(scriptDirectory, '..');
const distDirectory = path.resolve(packageDirectory, 'dist');

const resolveDistPath = relativePath => path.resolve(distDirectory, relativePath);

const readRequiredText = relativePath => fs.readFile(resolveDistPath(relativePath), 'utf8');

const readOptionalText = async relativePath => {
  try {
    return await fs.readFile(resolveDistPath(relativePath), 'utf8');
  } catch {
    return '';
  }
};

const [
  bundleSource,
  cssSource,
  editorWorkerSource,
  graphqlWorkerSource,
  jsonWorkerSource,
  tsWorkerSource,
] = await Promise.all([
  readRequiredText('hive-laboratory.umd.js'),
  readOptionalText('laboratory.css'),
  readRequiredText('monacoeditorwork/editor.worker.bundle.js'),
  readRequiredText('monacoeditorwork/graphql.worker.bundle.js'),
  readRequiredText('monacoeditorwork/json.worker.bundle.js'),
  readRequiredText('monacoeditorwork/ts.worker.bundle.js'),
]);

const serializeForScriptTag = value =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const payload = {
  cssSource,
  bundleSource,
  workers: {
    editorWorkerService: editorWorkerSource,
    graphql: graphqlWorkerSource,
    json: jsonWorkerSource,
    typescript: tsWorkerSource,
  },
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hive Laboratory Static Preview</title>
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
  <body>
    <div id="root"></div>
    <script>
      const payload = ${serializeForScriptTag(payload)};

      const createWorkerUrl = workerContent => {
        const blob = new Blob([workerContent], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
      };

      const workerUrls = {
        editorWorkerService: createWorkerUrl(payload.workers.editorWorkerService),
        typescript: createWorkerUrl(payload.workers.typescript),
        json: createWorkerUrl(payload.workers.json),
        graphql: createWorkerUrl(payload.workers.graphql),
      };

      globalThis.MonacoEnvironment = {
        globalAPI: false,
        getWorkerUrl(_moduleId, label) {
          return workerUrls[label] || workerUrls.editorWorkerService;
        },
      };

      if (payload.cssSource) {
        const style = document.createElement('style');
        style.textContent = payload.cssSource;
        document.head.appendChild(style);
      }

      new Function(payload.bundleSource)();

      const params = new URLSearchParams(globalThis.location.search);
      const endpoint = params.get('endpoint') || globalThis.localStorage.getItem('hive-laboratory:endpoint');

      globalThis.HiveLaboratory.renderLaboratory(document.getElementById('root'), {
        defaultEndpoint: endpoint || globalThis.location.origin + '/graphql',
      });
    </script>
  </body>
</html>
`;

const outputPath = resolveDistPath('hive-laboratory.static-preview.html');
await fs.writeFile(outputPath, html, 'utf8');

console.log(`Created static preview: ${outputPath}`);
