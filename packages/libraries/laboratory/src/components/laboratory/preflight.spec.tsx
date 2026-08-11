// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Preflight } from './preflight';

const laboratory = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./context', () => ({
  useLaboratory: () => laboratory.current,
}));

vi.mock('./editor', () => ({ Editor: () => null }));

const mount = (state: Record<string, unknown> = {}) => {
  laboratory.current = {
    preflight: { enabled: true, script: 'console.log("hi")' },
    preflightLogs: [],
    plugins: [],
    pluginsState: {},
    checkPermissions: () => true,
    setPreflight: vi.fn(),
    setEnv: vi.fn(),
    setPluginsState: vi.fn(),
    setLastTestResult: vi.fn(),
    ...state,
  };

  render(<Preflight />);
};

describe('Preflight', () => {
  // The script runs in the browser of whoever opens the lab, so the warning is for readers
  // as much as for the person allowed to edit it.
  it.each([true, false])('warns about plain text storage when editable is %s', canUpdate => {
    mount({ checkPermissions: () => canUpdate });

    expect(screen.getByText(/stored as plain text/)).toBeDefined();
    expect(screen.getByText(/lab\.prompt\(\)/)).toBeDefined();
  });
});
