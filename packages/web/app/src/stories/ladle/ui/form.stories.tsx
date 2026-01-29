import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Form',
};

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
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
                <FormDescription>Receive emails about your account activity.</FormDescription>
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
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
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Form Components</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Form Layout</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="max-w-md space-y-6">
              <div className="space-y-2">
                <div className="text-neutral-11 text-sm font-medium">FormLabel</div>
                <p className="text-neutral-10 text-xs">
                  Color: <code className="text-neutral-12">text-neutral-11</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-neutral-11 text-sm">FormDescription</div>
                <p className="text-neutral-10 text-xs">
                  Helper text color: <code className="text-neutral-12">text-neutral-11</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-red-500">FormMessage (Error)</div>
                <p className="text-neutral-10 text-xs">
                  Error color: <code className="text-neutral-12">text-red-500 (destructive)</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Form Spacing</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="max-w-md space-y-2">
              <p className="text-neutral-10 text-xs">
                FormItem: <code className="text-neutral-12">space-y-2</code> (vertical spacing
                between label, control, description, message)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Complete Form Example</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-6">
        <SimpleForm />
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Form with Errors</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-6">
        <WithErrors />
      </div>
    </div>
  </div>
);
