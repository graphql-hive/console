// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Sheet } from './sheet';

describe('Sheet', () => {
  it('anchors to the right edge on the width rung and pads the body by default', () => {
    render(
      <Sheet
        open
        width="lg"
        title="Create access token"
        footer={<button type="button">Create</button>}
      >
        <p>Body</p>
      </Sheet>,
    );
    const sheet = screen.getByRole('dialog');
    expect(sheet.className).toContain('right-0');
    expect(sheet.className).toContain('sm:max-w-[800px]');
    expect(screen.getByText('Body').parentElement?.className).toContain('px-6');
  });

  it('drops the body inset for edge-to-edge content', () => {
    render(
      <Sheet open padding="none" title="Span details">
        <ul>
          <li>http.method GET</li>
        </ul>
      </Sheet>,
    );
    const body = screen.getByText('http.method GET').closest('ul')?.parentElement;
    expect(body?.className).not.toContain('px-6');
  });
});
