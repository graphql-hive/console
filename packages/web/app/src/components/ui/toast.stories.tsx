import type { Story, StoryDefault } from '@ladle/react';
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

export default {
  title: 'Old / Toast',
} satisfies StoryDefault;

function ToastDemo({
  variant,
  title,
  description,
  action,
}: {
  variant?: 'default' | 'success' | 'destructive' | 'warning';
  title: string;
  description?: string;
  action?: boolean;
}) {
  return (
    <ToastProvider>
      <Toast variant={variant} open forceMount>
        <div className="grid gap-1">
          <ToastTitle>{title}</ToastTitle>
          {description && <ToastDescription>{description}</ToastDescription>}
        </div>
        {action && <ToastAction altText="Undo">Undo</ToastAction>}
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

export const Default: Story = () => (
  <ToastDemo title="Default toast" description="This is a default toast message." />
);

export const Success: Story = () => (
  <ToastDemo variant="success" title="Success" description="The saved filter has been updated." />
);

export const Destructive: Story = () => (
  <ToastDemo
    variant="destructive"
    title="Error"
    description="Something went wrong. Please try again."
  />
);

export const Warning: Story = () => (
  <ToastDemo
    variant="warning"
    title="Warning"
    description="This action may have unintended consequences."
  />
);

export const WithAction: Story = () => (
  <ToastDemo title="Filter deleted" description="The saved filter has been deleted." action />
);

export const TitleOnly: Story = () => <ToastDemo title="Changes saved" />;

export const AllVariants: Story = () => (
  <div className="flex flex-col gap-4">
    <ToastDemo title="Default" description="This is the default variant." />
    <ToastDemo variant="success" title="Success" description="This is the success variant." />
    <ToastDemo
      variant="destructive"
      title="Destructive"
      description="This is the destructive variant."
    />
    <ToastDemo variant="warning" title="Warning" description="This is the warning variant." />
  </div>
);
