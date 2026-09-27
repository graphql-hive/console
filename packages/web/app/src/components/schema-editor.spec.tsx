// @vitest-environment jsdom
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { SchemaEditor } from './schema-editor';

vi.mock('@theguild/editor', () => ({
  SchemaEditor: () => <div data-testid="monaco" />,
}));
vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({}));
vi.mock('monaco-editor/esm/vs/editor/contrib/readOnlyMessage/browser/contribution.js', () => ({}));
vi.mock('monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution.js', () => ({}));
vi.mock('monaco-editor/esm/vs/language/json/monaco.contribution.js', () => ({}));
vi.mock('@monaco-editor/react', () => ({ loader: { config: () => {} } }));
vi.mock('@/components/theme/theme-provider', () => ({
  useMonacoTheme: () => 'vs-dark',
}));

describe('SchemaEditor', () => {
  it('never suspends the boundary around it while its chunk loads', async () => {
    render(
      <Suspense fallback={<p>route fallback</p>}>
        <SchemaEditor schema="type Query { a: String }" height={300} />
      </Suspense>,
    );

    expect(screen.queryByText('route fallback')).toBeNull();
    expect(await screen.findByTestId('monaco')).toBeTruthy();
    expect(screen.queryByText('route fallback')).toBeNull();
  });
});
