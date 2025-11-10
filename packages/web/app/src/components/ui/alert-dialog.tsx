import { type HTMLAttributes } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn, createForwardRefComponent } from '@/lib/utils';
import {
  Action,
  Cancel,
  Content,
  Description,
  Overlay,
  Portal,
  Root,
  Title,
  Trigger,
} from '@radix-ui/react-alert-dialog';

const AlertDialog = Root;

const AlertDialogTrigger = Trigger;

const AlertDialogPortal = Portal;

const AlertDialogOverlay = createForwardRefComponent(Overlay)(({ className, ...props }, ref) => (
  <Overlay
    className={cn(
      'bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm',
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = Overlay.displayName;

const AlertDialogContent = createForwardRefComponent(Content)(({ className, ...props }, ref) => (
  <Portal>
    <AlertDialogOverlay />
    <Content
      ref={ref}
      className={cn(
        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg',
        className,
      )}
      {...props}
    />
  </Portal>
));
AlertDialogContent.displayName = Content.displayName;

const AlertDialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = createForwardRefComponent(Title)(({ className, ...props }, ref) => (
  <Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
AlertDialogTitle.displayName = Title.displayName;

const AlertDialogDescription = createForwardRefComponent(Description)(
  ({ className, ...props }, ref) => (
    <Description ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
  ),
);
AlertDialogDescription.displayName = Description.displayName;

const AlertDialogAction = createForwardRefComponent(Action)(({ className, ...props }, ref) => (
  <Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = Action.displayName;

const AlertDialogCancel = createForwardRefComponent(Cancel)(({ className, ...props }, ref) => (
  <Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
    {...props}
  />
));
AlertDialogCancel.displayName = Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
