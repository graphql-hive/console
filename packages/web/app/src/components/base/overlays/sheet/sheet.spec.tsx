// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Sheet } from './sheet';

describe('Sheet', () => {
  it('anchors to the right edge, caps at the requested width and pads the body by default', () => {
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

  it('closes from the corner button', () => {
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange} title="Span details" />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
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
