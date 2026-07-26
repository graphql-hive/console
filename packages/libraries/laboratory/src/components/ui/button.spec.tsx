// @vitest-environment happy-dom
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
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

  // A tooltip on a dropdown trigger stacks three asChild layers, so every wrapper
  // in the chain has to forward its ref, not just the button at the end.
  it('composes with another asChild trigger, keeping the ref and the click', () => {
    const warnings: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => warnings.push(args[0]));

    render(
      <Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button>Menu</Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Copy as cURL</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>Open menu</TooltipContent>
      </Tooltip>,
    );

    spy.mockRestore();

    expect(warnings.join(' ')).not.toContain('cannot be given refs');

    fireEvent.pointerDown(screen.getByText('Menu'), { button: 0 });
    expect(screen.queryByText('Copy as cURL')).not.toBeNull();
  });
});
