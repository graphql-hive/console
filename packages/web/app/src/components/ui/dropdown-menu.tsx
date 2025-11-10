import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn, createForwardRefComponent } from '@/lib/utils';
import {
  CheckboxItem,
  Content,
  Group,
  Item,
  ItemIndicator,
  Label,
  Portal,
  RadioGroup,
  RadioItem,
  Root,
  Separator,
  Sub,
  SubContent,
  SubTrigger,
  Trigger,
} from '@radix-ui/react-dropdown-menu';

const DropdownMenu = Root;
const DropdownMenuTrigger = Trigger;
const DropdownMenuGroup = Group;
const DropdownMenuPortal = Portal;
const DropdownMenuSub = Sub;
const DropdownMenuRadioGroup = RadioGroup;

const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof SubTrigger>,
  ComponentPropsWithoutRef<typeof SubTrigger> & {
    inset?: boolean;
    opensToLeft?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <SubTrigger
    ref={ref}
    className={cn(
      'focus:bg-accent data-[state=open]:bg-accent flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" />
  </SubTrigger>
));
DropdownMenuSubTrigger.displayName = SubTrigger.displayName;

const DropdownMenuSubContent = createForwardRefComponent(SubContent)(
  ({ className, ...props }, ref) => (
    <SubContent
      ref={ref}
      className={cn(
        'bg-popover text-popover-foreground animate-in data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuSubContent.displayName = SubContent.displayName;

const DropdownMenuContent = createForwardRefComponent(Content)(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <Portal>
      <Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-2 shadow-md',
          className,
        )}
        {...props}
      />
    </Portal>
  ),
);
DropdownMenuContent.displayName = Content.displayName;

const DropdownMenuItem = forwardRef<
  ElementRef<typeof Item>,
  ComponentPropsWithoutRef<typeof Item> & {
    inset?: boolean;
    active?: boolean;
  }
>(({ className, inset, active, ...props }, ref) => (
  <Item
    ref={ref}
    className={cn(
      'focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer select-none items-center rounded-sm p-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      active && 'bg-accent text-orange-500',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = Item.displayName;

const DropdownMenuCheckboxItem = createForwardRefComponent(CheckboxItem)(
  ({ className, children, checked, ...props }, ref) => (
    <CheckboxItem
      ref={ref}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <ItemIndicator>
          <Check className="size-4" />
        </ItemIndicator>
      </span>
      {children}
    </CheckboxItem>
  ),
);
DropdownMenuCheckboxItem.displayName = CheckboxItem.displayName;

const DropdownMenuRadioItem = createForwardRefComponent(RadioItem)(
  ({ className, children, ...props }, ref) => (
    <RadioItem
      ref={ref}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <ItemIndicator>
          <Circle className="size-2 fill-current" />
        </ItemIndicator>
      </span>
      {children}
    </RadioItem>
  ),
);
DropdownMenuRadioItem.displayName = RadioItem.displayName;

const DropdownMenuLabel = forwardRef<
  ElementRef<typeof Label>,
  ComponentPropsWithoutRef<typeof Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn('p-2 text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = Label.displayName;

const DropdownMenuSeparator = createForwardRefComponent(Separator)(
  ({ className, ...props }, ref) => (
    <Separator ref={ref} className={cn('bg-muted -mx-1 my-1 h-px', className)} {...props} />
  ),
);
DropdownMenuSeparator.displayName = Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
