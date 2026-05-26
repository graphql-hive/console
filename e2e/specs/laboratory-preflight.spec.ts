import type { Page, Request } from '@playwright/test';
import { expect, test } from '../fixtures';

const selectors = {
  buttonGraphiQLPreflight: '[aria-label*="Preflight Script"]',
  buttonModalCy: 'preflight-modal-button',
  buttonToggleCy: 'toggle-preflight',
  buttonHeaders: '[data-name="headers"]',
  headersEditor: {
    textArea: '.graphiql-editor-tool .graphiql-editor:last-child textarea',
  },
  graphiql: {
    buttonExecute: '.graphiql-execute-button',
  },

  modal: {
    buttonSubmitCy: 'preflight-modal-submit',
  },
};

function waitForLabRequest(page: Page, predicate: (request: Request) => boolean = () => true) {
  return page.waitForRequest(
    request =>
      request.method() === 'POST' && request.url().includes('/api/lab/') && predicate(request),
  );
}

async function waitForPreflightSaved(page: Page) {
  await expect(
    page.getByText('Preflight script has been updated successfully', { exact: true }).last(),
  ).toBeVisible();
}

test.beforeEach(async ({ page, seed, auth, laboratory }) => {
  const { accessToken, slug, refreshToken } = await seed.seedTarget();
  await auth.useSession({ refreshToken, accessToken });
  await laboratory.openSeededTarget(slug);
  await laboratory.updateEditorValue('query PreflightTest { __typename }');
  await expect.poll(() => laboratory.getEditorValue()).toContain('PreflightTest');
  await page.locator(selectors.buttonGraphiQLPreflight).click();
});

test.describe('Laboratory > Preflight Script', () => {
  test('regression: loads even if local storage is set to {}', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('hive:laboratory:environment', '{}');
    });
    await page.reload();
    await page.locator(selectors.buttonGraphiQLPreflight).click();
    await expect(page.locator(`[data-cy="${selectors.buttonModalCy}"]`)).toBeVisible();
  });

  test('mini script editor is read only', async ({ page }) => {
    await page.locator(`[data-cy="${selectors.buttonToggleCy}"]`).click();
    await expect(page.locator('[data-cy="preflight-editor-mini"]')).not.toContainText('Loading');
    await page.locator('[data-cy="preflight-editor-mini"]').click();
    await page.locator('[data-cy="preflight-editor-mini"] textarea').pressSequentially('x');
    await expect(page.locator('[data-cy="preflight-editor-mini"] textarea')).not.toHaveValue('x');
  });
});

test.describe('Preflight Script Modal', () => {
  const script = 'console.log("Hello_world")';
  const env = '{"foo":123}';

  test.beforeEach(async ({ page, laboratory }) => {
    await page.locator('[data-cy="preflight-modal-button"]').click();
    await laboratory.setMonacoEditorContents('env-editor', env);
  });

  test('save script and environment variables when submitting', async ({ page, laboratory }) => {
    await laboratory.setMonacoEditorContents('preflight-editor', script);
    await page.locator('[data-cy="preflight-modal-submit"]').click();
    await waitForPreflightSaved(page);
    await expect(page.locator('[data-cy="env-editor-mini"]')).toContainText(env);
    await page.locator('[data-cy="toggle-preflight"]').click();
    await expect(page.locator('[data-cy="preflight-editor-mini"]')).toContainText(script);
    await page.reload();
    await page.locator(selectors.buttonGraphiQLPreflight).click();
    await expect(page.locator('[data-cy="env-editor-mini"]')).toContainText(env);
    await expect(page.locator('[data-cy="preflight-editor-mini"]')).toContainText(script);
  });

  test('logs show console/error information', async ({ page, laboratory }) => {
    await laboratory.setMonacoEditorContents('preflight-editor', script);
    await page.locator('[data-cy="run-preflight"]').click();
    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: Hello_world (1:1)',
    );

    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `console.info(1); console.warn(true); console.error('Fatal'); throw new TypeError('Test')`,
    );

    await page.locator('[data-cy="run-preflight"]').click();
    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: Hello_world (1:1)',
    );
    await expect(page.locator('[data-cy="console-output"]')).toContainText('info: 1');
    await expect(page.locator('[data-cy="console-output"]')).toContainText('warn: true');
    await expect(page.locator('[data-cy="console-output"]')).toContainText('error: Fatal');
    await expect(page.locator('[data-cy="console-output"]')).toContainText('error: Test');
  });

  test('prompt and pass the awaited response', async ({ page, laboratory }) => {
    await laboratory.setMonacoEditorContents('preflight-editor', script);

    await page.locator('[data-cy="run-preflight"]').click();
    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: Hello_world (1:1)',
    );

    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `const username = await lab.prompt('Enter your username'); console.info(username);`,
    );

    await page.locator('[data-cy="run-preflight"]').click();
    await page.locator('[data-cy="prompt"] input').fill('test-username');
    await page.locator('[data-cy="prompt"] form').evaluate(form => {
      (form as HTMLFormElement).requestSubmit();
    });

    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: Hello_world (1:1)',
    );
    await expect(page.locator('[data-cy="console-output"]')).toContainText('info: test-username');
  });

  test('prompt and cancel', async ({ page, laboratory }) => {
    await laboratory.setMonacoEditorContents('preflight-editor', script);

    await page.locator('[data-cy="run-preflight"]').click();
    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: Hello_world (1:1)',
    );

    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `const username = await lab.prompt('Enter your username'); console.info(username);`,
    );

    await page.locator('[data-cy="run-preflight"]').click();
    await page.locator('[data-cy="prompt"] input').fill('test-username');
    await page.locator('[data-cy="prompt-cancel"]').click();

    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: Hello_world (1:1)',
    );
    await expect(page.locator('[data-cy="console-output"]')).toContainText('info: null');
  });

  test('script execution updates environment variables', async ({ page, laboratory }) => {
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      'lab.environment.set(\'my-test\', "TROLOLOL")',
    );

    await page.locator('[data-cy="run-preflight"]').click();
    await expect(page.locator('[data-cy="env-editor"]')).toContainText('"my-test": "TROLOLOL"');
  });

  test('`crypto-js` can be used for generating hashes', async ({ page, laboratory }) => {
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      'console.log(lab.CryptoJS.SHA256("test"))',
    );
    await page.locator('[data-cy="run-preflight"]').click();
    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'info: Using crypto-js version:',
    );
    await expect(page.locator('[data-cy="console-output"]')).toContainText(
      'log: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    );
  });
});

test.describe('Execution', () => {
  test('result.request.headers are added to the graphiql request base headers', async ({
    page,
    laboratory,
  }) => {
    const preflightHeaders = {
      foo: 'bar',
    };
    await page.locator(`[data-cy="${selectors.buttonToggleCy}"]`).click();
    await page.locator(`[data-cy="${selectors.buttonModalCy}"]`).click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `lab.request.headers.append('foo', '${preflightHeaders.foo}')`,
    );
    await page.locator(`[data-cy="${selectors.modal.buttonSubmitCy}"]`).click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page, request => request.headers().foo === 'bar');
    await page.locator(selectors.graphiql.buttonExecute).click();
    await requestPromise;
  });

  test('result.request.headers take precedence over graphiql request base headers', async ({
    page,
    laboratory,
  }) => {
    const baseHeaders = {
      accept: 'application/json, multipart/mixed',
    };
    await expect(page.locator('.graphiql-query-editor .cm-s-graphiql')).toBeVisible();
    const integrityCheck = waitForLabRequest(page, request => {
      return request.headers().accept?.includes(baseHeaders.accept);
    });
    await page.locator(selectors.graphiql.buttonExecute).click();
    await integrityCheck;

    const preflightHeaders = {
      accept: 'application/graphql-response+json; charset=utf-8, application/json; charset=utf-8',
    };
    await page.locator(`[data-cy="${selectors.buttonToggleCy}"]`).click();
    await page.locator(`[data-cy="${selectors.buttonModalCy}"]`).click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `lab.request.headers.append('accept', '${preflightHeaders.accept}')`,
    );
    await page.locator(`[data-cy="${selectors.modal.buttonSubmitCy}"]`).click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page, request =>
      request.headers().accept?.includes(preflightHeaders.accept),
    );
    await page.locator(selectors.graphiql.buttonExecute).click();
    await requestPromise;
  });

  test('result.request.headers are NOT substituted with environment variables', async ({
    page,
    laboratory,
  }) => {
    const barEnvVarInterpolation = '{{bar}}';
    await page.locator(selectors.buttonHeaders).click();
    await page.locator(selectors.headersEditor.textArea).fill(
      JSON.stringify({
        foo_static: barEnvVarInterpolation,
      }),
    );

    await page.locator(`[data-cy="${selectors.buttonToggleCy}"]`).click();
    await page.locator(`[data-cy="${selectors.buttonModalCy}"]`).click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `
      lab.environment.set('bar', 'BAR_VALUE')
      lab.request.headers.append('foo_preflight', '${barEnvVarInterpolation}')
    `,
    );
    await page.locator(`[data-cy="${selectors.modal.buttonSubmitCy}"]`).click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page, request => {
      const headers = request.headers();

      return headers.foo_preflight === barEnvVarInterpolation && headers.foo_static === 'BAR_VALUE';
    });
    await page.locator(selectors.graphiql.buttonExecute).click();
    await requestPromise;
  });

  test('header placeholders are substituted with environment variables', async ({
    page,
    laboratory,
  }) => {
    await page.locator('[data-cy="toggle-preflight"]').click();
    await page.locator('[data-name="headers"]').click();
    await page
      .locator('.graphiql-editor-tool .graphiql-editor:last-child textarea')
      .fill('{ "__test": "{{foo}} bar {{nonExist}}" }');
    await laboratory.setMonacoEditorContents('env-editor-mini', '{"foo":"injected"}');

    const requestPromise = page.waitForRequest(request => {
      return (
        request.method() === 'POST' && request.headers().__test === 'injected bar {{nonExist}}'
      );
    });
    await page.locator('.graphiql-execute-button').click();
    await requestPromise;
  });

  test('executed script updates update env editor and substitute headers', async ({
    page,
    laboratory,
  }) => {
    await page.locator('[data-cy="toggle-preflight"]').click();
    await page.locator('[data-name="headers"]').click();
    await page
      .locator('.graphiql-editor-tool .graphiql-editor:last-child textarea')
      .fill('{ "__test": "{{foo}}" }');
    await page.locator('[data-cy="preflight-modal-button"]').click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      "lab.environment.set('foo', '92')",
    );
    await page.locator('[data-cy="preflight-modal-submit"]').click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page, request => {
      return request.headers().__test === '92';
    });
    await page.locator('.graphiql-execute-button').click();
    await requestPromise;
  });

  test('execute, prompt and use it in headers', async ({ page, laboratory }) => {
    await page.locator('[data-cy="toggle-preflight"]').click();

    await page.locator('[data-name="headers"]').click();
    await page.locator('[data-name="headers"]').click();
    await page
      .locator('.graphiql-editor-tool .graphiql-editor:last-child textarea')
      .fill('{ "__test": "{{username}}" }');

    await page.locator('[data-cy="preflight-modal-button"]').click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `const username = await lab.prompt('Enter your username'); lab.environment.set('username', username);`,
    );
    await page.locator('[data-cy="preflight-modal-submit"]').click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page, request => {
      return request.headers().__test === 'foo';
    });
    await page.locator('.graphiql-execute-button').click();

    await page.locator('[data-cy="prompt"] input').fill('foo');
    await page.locator('[data-cy="prompt"] form').evaluate(form => {
      (form as HTMLFormElement).requestSubmit();
    });

    await requestPromise;
  });

  test('disabled script is not executed', async ({ page, laboratory }) => {
    await page.locator('[data-name="headers"]').click();
    await page
      .locator('.graphiql-editor-tool .graphiql-editor:last-child textarea')
      .fill('{ "__test": "{{foo}}" }');
    await page.locator('[data-cy="preflight-modal-button"]').click();
    await laboratory.setMonacoEditorContents('preflight-editor', "lab.environment.set('foo', 92)");
    await laboratory.setMonacoEditorContents('env-editor', '{"foo":10}');

    await page.locator('[data-cy="preflight-modal-submit"]').click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page, request => {
      return request.headers().__test === '10';
    });
    await page.locator('.graphiql-execute-button').click();
    await requestPromise;
  });

  test('logs are visible when opened', async ({ page, laboratory }) => {
    await page.locator('[data-cy="toggle-preflight"]').click();

    await page.locator('[data-cy="preflight-modal-button"]').click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `console.info(1); console.warn(true); console.error('Fatal'); throw new TypeError('Test')`,
    );
    await page.locator('[data-cy="preflight-modal-submit"]').click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page);

    await page.getByRole('button', { name: 'Preflight Script Logs' }).click();
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toBeVisible();
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'No logs available',
    );
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'Execute a query to see logs',
    );

    await page.locator('.graphiql-execute-button').click();
    await requestPromise;

    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'log: Running script...',
    );
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText('info: 1');
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText('warn: true');
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText('error: Fatal');
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText('error: Test');
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'log: Script failed',
    );
  });

  test('logs are cleared when requested', async ({ page, laboratory }) => {
    await page.locator('[data-cy="toggle-preflight"]').click();

    await page.locator('[data-cy="preflight-modal-button"]').click();
    await laboratory.setMonacoEditorContents(
      'preflight-editor',
      `console.info(1); console.warn(true); console.error('Fatal'); throw new TypeError('Test')`,
    );
    await page.locator('[data-cy="preflight-modal-submit"]').click();
    await waitForPreflightSaved(page);

    const requestPromise = waitForLabRequest(page);
    await page.locator('.graphiql-execute-button').click();
    await requestPromise;

    await page.getByRole('button', { name: 'Preflight Script Logs' }).click();
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toBeVisible();
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'log: Running script...',
    );

    await page.locator('#preflight-logs button[data-cy="erase-logs"]').click();
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'No logs available',
    );
    await expect(page.locator('#preflight-logs [data-cy="logs"]')).toContainText(
      'Execute a query to see logs',
    );
  });
});
