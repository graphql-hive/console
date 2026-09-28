// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('is a hidden, shimmering line of body-text height by default', () => {
    const { container } = render(<Skeleton />);
    const element = container.firstElementChild!;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect([...element.classList]).toEqual(
      expect.arrayContaining(['animate-skeleton', 'bg-fixed', 'rounded-sm', 'h-4', 'w-48']),
    );
  });

  it('fills its parent as a block and ignores line sizing', () => {
    const { container } = render(
      <Skeleton variants={{ shape: 'block', size: 'xl', width: 'xs' }} />,
    );
    const classes = [...container.firstElementChild!.classList];
    expect(classes).toEqual(expect.arrayContaining(['size-full', 'rounded-sm']));
    expect(classes).not.toContain('h-6');
    expect(classes).not.toContain('w-12');
  });

  it('holds still for viewers who prefer reduced motion', () => {
    const { container } = render(<Skeleton />);
    expect([...container.firstElementChild!.classList]).toEqual(
      expect.arrayContaining(['motion-reduce:animate-none', 'motion-reduce:bg-none']),
    );
  });
});

describe('circle', () => {
  it("defaults to the app's avatar size", () => {
    const { container } = render(<Skeleton variants={{ shape: 'circle' }} />);
    expect(container.firstElementChild?.className).toContain('size-9');
  });
});
