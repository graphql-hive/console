import { Circle } from 'lucide-react';
import { cn, createForwardRefComponent } from '@/lib/utils';
import { Indicator, Item, Root } from '@radix-ui/react-radio-group';

const RadioGroup = createForwardRefComponent(Root)(({ className, ...props }, ref) => {
  return <Root className={cn('grid gap-2', className)} {...props} ref={ref} />;
});
RadioGroup.displayName = Root.displayName;

const RadioGroupItem = createForwardRefComponent(Item)((
  { className, children: _children, ...props },
  ref,
) => {
  return (
    <Item
      ref={ref}
      className={cn(
        'border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square size-4 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Indicator className="flex items-center justify-center">
        <Circle className="size-2.5 fill-current text-current" />
      </Indicator>
    </Item>
  );
});
RadioGroupItem.displayName = Item.displayName;

export { RadioGroup, RadioGroupItem };
