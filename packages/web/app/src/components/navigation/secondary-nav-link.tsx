import React, { ComponentProps } from 'react';
import { createLink } from '@tanstack/react-router';
import { TabsTrigger } from '../ui/tabs';

const SecondaryNavLinkComponent = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    value: string;
    label: string;
    visible?: boolean;
  }
>(({ value, label, visible = true, ...anchorProps }, ref) => {
  if (!visible) return null;
  return (
    <TabsTrigger variant="menu" value={value} asChild>
      <a ref={ref} {...anchorProps}>
        {label}
      </a>
    </TabsTrigger>
  );
});

SecondaryNavLinkComponent.displayName = 'SecondaryNavLinkComponent';

export const SecondaryNavLink = createLink(SecondaryNavLinkComponent);
export type SecondaryNavLinkProps = ComponentProps<typeof SecondaryNavLink>;
