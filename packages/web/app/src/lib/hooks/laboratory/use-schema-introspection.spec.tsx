// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/primitives/toast/toast';
import { renderHook, screen } from '@testing-library/react';
import { useSchemaIntrospection } from './use-schema-introspection';

const TITLE = 'Failed to fetch schema';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const renderIntrospection = (sdl: string | undefined) =>
  renderHook(() => useSchemaIntrospection(sdl), { wrapper });

// Base UI repeats toast text in a live region, so the text is queried with *AllBy*.
describe('useSchemaIntrospection', () => {
  it('toasts the build error in the app toaster when the SDL is invalid', () => {
    const { result } = renderIntrospection('type Query {');

    expect(result.current).toBeNull();
    expect(screen.getAllByText(TITLE).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Syntax Error/).length).toBeGreaterThan(0);
  });

  it('returns the introspection without a toast when the SDL builds', () => {
    const { result } = renderIntrospection('type Query { a: String }');

    expect(result.current?.__schema.queryType?.name).toBe('Query');
    expect(screen.queryAllByText(TITLE)).toHaveLength(0);
  });

  it('returns null without a toast when there is no SDL', () => {
    const { result } = renderIntrospection(undefined);

    expect(result.current).toBeNull();
    expect(screen.queryAllByText(TITLE)).toHaveLength(0);
  });
});
