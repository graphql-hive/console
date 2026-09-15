import { renderToString } from 'react-dom/server';
import { Link, RouterProvider } from '@tanstack/react-router';
import { previewRouter, PreviewSlotProvider } from './foundry.router';

/**
 * Guards the preview router. `Link` throws without router context, so if this breaks, every preview
 * rendering a real app component goes blank.
 */
function render(children: React.ReactNode) {
  return renderToString(
    <PreviewSlotProvider value={children}>
      <RouterProvider router={previewRouter} />
    </PreviewSlotProvider>,
  );
}

describe('preview router', () => {
  beforeAll(async () => {
    await previewRouter.load();
  });

  it('renders a Link with interpolated params', () => {
    const html = render(
      <Link
        to="/$organizationSlug/$projectSlug"
        params={{ organizationSlug: 'the-guild', projectSlug: 'graphql-hive' }}
      >
        my-project
      </Link>,
    );

    expect(html).toContain('/the-guild/graphql-hive');
    expect(html).toContain('my-project');
  });

  it('renders a disabled Link', () => {
    const html = render(
      <Link
        to="/$organizationSlug/$projectSlug"
        disabled
        params={{ organizationSlug: 'unknown-yet', projectSlug: 'unknown-yet' }}
      >
        placeholder
      </Link>,
    );

    expect(html).toContain('placeholder');
  });
});
