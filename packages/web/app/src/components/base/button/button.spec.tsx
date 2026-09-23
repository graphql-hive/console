// @vitest-environment jsdom
import { createRef, forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders an icon-only button as a square at each size', () => {
    const { rerender } = render(<Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" />);
    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('w-9');
    expect(button.className).toContain('justify-center');

    rerender(<Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" size="compact" />);
    expect(button.className).toContain('h-7.5');
    expect(button.className).toContain('w-7.5');
  });

  it('leaves the width of a text button to its content', () => {
    render(<Button variant="primary">Save alert</Button>);
    const button = screen.getByRole('button', { name: 'Save alert' });
    expect(button.className).toContain('px-4');
    expect(button.className).not.toContain('w-9');
  });

  it('draws a link variant as text with no box', () => {
    render(<Button variant="link">Read more</Button>);
    const button = screen.getByRole('button', { name: 'Read more' });
    expect(button.className).toContain('text-accent');
    expect(button.className).toContain('h-auto');
    expect(button.className).toContain('p-0');
    // The merge drops the rung's height and padding rather than leaving both in place.
    expect(button.className).not.toContain('h-9');
    expect(button.className).not.toContain('px-4');
    expect(button.className).not.toMatch(/(^|\s)border(\s|$)/);
  });

  it('renders as the given element and keeps its classes, ref and handlers', () => {
    const onClick = vi.fn();
    const onLinkClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button
        ref={ref}
        variant="outline"
        width="full"
        onClick={onClick}
        render={<RouterLink to="/orgs" onClick={onLinkClick} />}
      >
        Go to your organization
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Go to your organization' });
    expect(link.getAttribute('href')).toBe('/orgs');
    expect(link.className).toContain('w-full');
    expect(link.className).toContain('justify-center');
    expect(ref.current).toBe(link);
    expect(screen.queryByRole('button')).toBeNull();
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it('renders an anchor from `anchor`, filling in rel for a new tab and mapping disabled to aria-disabled', () => {
    const { rerender } = render(
      <Button anchor={{ href: 'https://the-guild.dev', target: '_blank' }}>Docs</Button>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link.getAttribute('href')).toBe('https://the-guild.dev');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.queryByRole('button')).toBeNull();

    rerender(
      <Button anchor={{ href: 'https://the-guild.dev', target: '_blank', rel: 'me' }}>Docs</Button>,
    );
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('rel')).toBe('me');

    rerender(
      <Button anchor={{ href: 'https://the-guild.dev' }} disabled>
        Docs
      </Button>,
    );
    const disabledAnchor = screen.getByText('Docs');
    expect(disabledAnchor.tagName).toBe('A');
    expect(disabledAnchor.hasAttribute('href')).toBe(false);
    expect(disabledAnchor.hasAttribute('disabled')).toBe(false);
    expect(disabledAnchor.getAttribute('aria-disabled')).toBe('true');
    expect(disabledAnchor.getAttribute('tabindex')).toBe('-1');
  });
});

/** Stands in for a router `<Link>`: a component that renders an anchor from a `to` prop. */
const RouterLink = forwardRef<
  HTMLAnchorElement,
  { to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(function RouterLink({ to, children, ...rest }, ref) {
  return (
    <a ref={ref} href={to} {...rest}>
      {children}
    </a>
  );
});
