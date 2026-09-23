// @vitest-environment jsdom
import { type ReactNode } from 'react';
import { RouterProvider, type AnyRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { previewRouter, PreviewSlotProvider } from '../../../../../foundry.router';
import { SecondaryNavigation } from './secondary-navigation';

// `Link` needs a router with resolved matches; foundry's stand-in router renders the slot. The
// cast steps around the app's registered router type, which the stand-in does not share.
function renderInRouter(node: ReactNode) {
  return render(
    <PreviewSlotProvider value={node}>
      <RouterProvider router={previewRouter as AnyRouter} />
    </PreviewSlotProvider>,
  );
}

const ITEMS = [
  { value: 'schema', label: 'Schema', to: '/$organizationSlug', params: { organizationSlug: 'a' } },
  { value: 'checks', label: 'Checks', to: '/$organizationSlug', params: { organizationSlug: 'b' } },
  {
    value: 'settings',
    label: 'Settings',
    to: '/$organizationSlug',
    params: { organizationSlug: 'c' },
    visible: false,
  },
] as const;

describe('SecondaryNavigation', () => {
  it('renders a nav of router links, marks the current one and drops hidden items', async () => {
    renderInRouter(<SecondaryNavigation aria-label="Target" value="checks" items={ITEMS} />);
    expect(await screen.findByRole('navigation', { name: 'Target' })).toBeTruthy();
    const links = screen.getAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual(['Schema', 'Checks']);
    expect(screen.queryByRole('tab')).toBeNull();

    const checks = screen.getByRole('link', { name: 'Checks' });
    expect(checks.getAttribute('aria-current')).toBe('page');
    expect(checks.getAttribute('href')).toBe('/b');
    // The accent underline must be the only border color on the current link.
    expect(checks.classList.contains('border-accent')).toBe(true);
    expect(checks.classList.contains('border-transparent')).toBe(false);
    const schema = screen.getByRole('link', { name: 'Schema' });
    expect(schema.getAttribute('aria-current')).toBeNull();
    expect(schema.classList.contains('border-transparent')).toBe(true);
  });

  it('draws placeholders instead of links while loading', async () => {
    renderInRouter(
      <SecondaryNavigation items={ITEMS} loading attrs={{ 'data-cy': 'target-nav' }} />,
    );
    await waitFor(() => expect(document.querySelector('[data-cy="target-nav"]')).toBeTruthy());
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('keeps an item with a tooltip a link', async () => {
    renderInRouter(
      <SecondaryNavigation
        value="schema"
        items={[{ ...ITEMS[0], tooltip: 'Shows all types, including unused and deprecated ones' }]}
      />,
    );
    const link = await screen.findByRole('link', { name: 'Schema' });
    expect(link.getAttribute('href')).toBe('/a');
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('keeps the actions outside the nav, after the links', async () => {
    renderInRouter(
      <SecondaryNavigation
        items={ITEMS}
        value="schema"
        actions={<button type="button">Connect to CDN</button>}
        attrs={{ 'data-cy': 'target-nav' }}
      />,
    );
    await screen.findByRole('navigation');
    const bar = document.querySelector('[data-cy="target-nav"]')!;
    expect(bar.lastElementChild?.textContent).toBe('Connect to CDN');
    expect(screen.getByRole('navigation').textContent).not.toContain('Connect to CDN');
  });
});
