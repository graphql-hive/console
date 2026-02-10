import { ArrowBigDown, ArrowDown } from 'lucide-react';
import type { Story, StoryDefault } from '@ladle/react';
import { Button, type ButtonProps } from './button';

export default {
  title: 'UI / Button',
} satisfies StoryDefault;

export const Default: Story<ButtonProps> = args => <Button {...args} />;
Default.args = { variant: 'default', size: 'default', children: 'Default Button' };
Default.argTypes = {
  variant: {
    options: [
      'default',
      'primary',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
      'orangeLink',
    ],
    control: { type: 'select' },
  },
  size: {
    options: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-xs'],
    control: { type: 'select' },
  },
};

export const Primary: Story<ButtonProps> = args => <Button {...args} />;
Primary.args = { variant: 'primary', children: 'Primary Button' };

export const Destructive: Story<ButtonProps> = args => <Button {...args} />;
Destructive.args = { variant: 'destructive', children: 'Destructive Button' };

export const Outline: Story<ButtonProps> = args => <Button {...args} />;
Outline.args = { variant: 'outline', children: 'Outline Button' };

export const Secondary: Story<ButtonProps> = args => <Button {...args} />;
Secondary.args = { variant: 'secondary', children: 'Secondary Button' };

export const Ghost: Story<ButtonProps> = args => <Button {...args} />;
Ghost.args = { variant: 'ghost', children: 'Ghost Button' };

export const Link: Story<ButtonProps> = args => <Button {...args} />;
Link.args = { variant: 'link', children: 'Link Button' };

export const OrangeLink: Story<ButtonProps> = args => <Button {...args} />;
OrangeLink.args = { variant: 'orangeLink', children: 'Orange Link Button' };

export const Small: Story<ButtonProps> = args => <Button {...args} />;
Small.args = { size: 'sm', children: 'Small Button' };

export const Large: Story<ButtonProps> = args => <Button {...args} />;
Large.args = { size: 'lg', children: 'Large Button' };

export const Icon: Story<ButtonProps> = () => (
  <Button variant="default" size="icon">
    <ArrowBigDown />
  </Button>
);

export const IconSmall: Story<ButtonProps> = () => (
  <Button variant="default" size="icon-sm">
    <ArrowDown />
  </Button>
);
