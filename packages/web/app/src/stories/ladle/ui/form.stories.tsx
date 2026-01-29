import React from 'react';
import type { Story } from '@ladle/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const simpleSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
});

export const SimpleForm: Story = () => {
  const form = useForm<z.infer<typeof simpleSchema>>({
    resolver: zodResolver(simpleSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  });

  const onSubmit = (data: z.infer<typeof simpleSchema>) => {
    console.log('Form submitted:', data);
    alert(`Form submitted!\nUsername: ${data.username}\nEmail: ${data.email}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>This will be your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

const complexSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').optional(),
  notifications: z.boolean(),
  role: z.enum(['user', 'admin', 'moderator']),
});

export const ComplexForm: Story = () => {
  const form = useForm<z.infer<typeof complexSchema>>({
    resolver: zodResolver(complexSchema),
    defaultValues: {
      name: '',
      email: '',
      bio: '',
      notifications: false,
      role: 'user',
    },
  });

  const onSubmit = (data: z.infer<typeof complexSchema>) => {
    console.log('Form submitted:', data);
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormDescription>We'll never share your email with anyone.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about yourself..." {...field} />
              </FormControl>
              <FormDescription>Brief description for your profile (optional).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="user" id="role-user" />
                    <FormLabel htmlFor="role-user" className="font-normal">
                      User
                    </FormLabel>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="admin" id="role-admin" />
                    <FormLabel htmlFor="role-admin" className="font-normal">
                      Admin
                    </FormLabel>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="moderator" id="role-moderator" />
                    <FormLabel htmlFor="role-moderator" className="font-normal">
                      Moderator
                    </FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Email notifications</FormLabel>
                <FormDescription>
                  Receive emails about your account activity.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

export const WithErrors: Story = () => {
  const form = useForm<z.infer<typeof simpleSchema>>({
    resolver: zodResolver(simpleSchema),
    defaultValues: {
      username: 'ab', // Too short
      email: 'invalid-email', // Invalid email
    },
  });

  React.useEffect(() => {
    form.trigger(); // Trigger validation on mount to show errors
  }, [form]);

  const onSubmit = (data: z.infer<typeof simpleSchema>) => {
    console.log('Form submitted:', data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>This will be your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Form Components</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Form Layout</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="space-y-6 max-w-md">
              <div className="space-y-2">
                <div className="text-neutral-11 text-sm font-medium">FormLabel</div>
                <p className="text-xs text-neutral-10">
                  Color: <code className="text-neutral-12">text-neutral-11</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-neutral-11 text-sm">FormDescription</div>
                <p className="text-xs text-neutral-10">
                  Helper text color: <code className="text-neutral-12">text-neutral-11</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-red-500 text-sm">FormMessage (Error)</div>
                <p className="text-xs text-neutral-10">
                  Error color: <code className="text-neutral-12">text-red-500 (destructive)</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Form Spacing</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="space-y-2 max-w-md">
              <p className="text-xs text-neutral-10">
                FormItem: <code className="text-neutral-12">space-y-2</code> (vertical spacing
                between label, control, description, message)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Complete Form Example</h2>
      <div className="p-6 bg-neutral-1 rounded border border-neutral-6">
        <SimpleForm />
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Form with Errors</h2>
      <div className="p-6 bg-neutral-1 rounded border border-neutral-6">
        <WithErrors />
      </div>
    </div>
  </div>
);
