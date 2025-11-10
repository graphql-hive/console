import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown } from 'lucide-react';
import { cn, createForwardRefComponent } from '@/lib/utils';
import {
  Content,
  Group,
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  Label,
  Portal,
  Root,
  Separator,
  Trigger,
  Value,
  Viewport,
} from '@radix-ui/react-select';

const Select = Root;

const SelectGroup = Group;

const SelectValue = Value;

const selectVariants = cva(
  'flex h-10 w-full bg-secondary items-center justify-between rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-input ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        ghost: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type SelectTriggerProps = ComponentPropsWithoutRef<typeof Trigger> &
  VariantProps<typeof selectVariants>;

const SelectTrigger = forwardRef<React.ElementRef<typeof Trigger>, SelectTriggerProps>(
  ({ className, children, variant, ...props }, ref) => (
    <Trigger ref={ref} className={cn(selectVariants({ variant, className }))} {...props}>
      {children}
      <Icon asChild>
        <ChevronDown className="ml-2 size-4 opacity-50" />
      </Icon>
    </Trigger>
  ),
);
SelectTrigger.displayName = Trigger.displayName;

const SelectContent = createForwardRefComponent(Content)(
  ({ className, children, position = 'popper', ...props }, ref) => (
    <Portal>
      <Content
        ref={ref}
        className={cn(
          'bg-popover text-popover-foreground animate-in fade-in-80 relative z-50 min-w-[8rem] cursor-pointer overflow-hidden rounded-md border shadow-md',
          position === 'popper' && 'translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {children}
        </Viewport>
      </Content>
    </Portal>
  ),
);
SelectContent.displayName = Content.displayName;

const SelectLabel = createForwardRefComponent(Label)(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)} {...props} />
));
SelectLabel.displayName = Label.displayName;

const SelectItem = createForwardRefComponent(Item)(({ className, children, ...props }, ref) => (
  <Item
    ref={ref}
    className={cn(
      'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <ItemIndicator>
        <Check className="size-4" />
      </ItemIndicator>
    </span>

    <ItemText>{children}</ItemText>
  </Item>
));
SelectItem.displayName = Item.displayName;

const SelectSeparator = createForwardRefComponent(Separator)(({ className, ...props }, ref) => (
  <Separator ref={ref} className={cn('bg-muted -mx-1 my-1 h-px', className)} {...props} />
));
SelectSeparator.displayName = Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
