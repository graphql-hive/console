// @vitest-environment happy-dom
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

describe('Button', () => {
  it('forwards its ref, which Radix asChild triggers need as a positioning anchor', () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Collapse all</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('can be used as an asChild trigger without React dropping the ref', () => {
    const warnings: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => warnings.push(args[0]));

    render(
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button>Collapse all</Button>
        </TooltipTrigger>
        <TooltipContent>Collapse all</TooltipContent>
      </Tooltip>,
    );

    spy.mockRestore();

    expect(warnings.join(' ')).not.toContain('cannot be given refs');
  });
});
