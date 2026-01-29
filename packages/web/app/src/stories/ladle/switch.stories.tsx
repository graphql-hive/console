import type { Story } from "@ladle/react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export const Default: Story = () => <Switch />;

export const Checked: Story = () => <Switch defaultChecked />;

export const Disabled: Story = () => <Switch disabled />;

export const DisabledChecked: Story = () => <Switch disabled checked />;

export const WithLabel: Story = () => (
  <div className="flex items-center space-x-2">
    <Switch id="airplane-mode" />
    <label
      htmlFor="airplane-mode"
      className="text-neutral-11 text-sm cursor-pointer"
    >
      Airplane Mode
    </label>
  </div>
);

export const Interactive: Story = () => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="interactive" checked={checked} onCheckedChange={setChecked} />
        <label
          htmlFor="interactive"
          className="text-neutral-11 text-sm cursor-pointer"
        >
          Toggle me
        </label>
      </div>
      <p className="text-neutral-11 text-xs">
        State: <span className="text-neutral-12">{checked ? "ON" : "OFF"}</span>
      </p>
    </div>
  );
};

export const MultipleToggles: Story = () => (
  <div className="space-y-4 w-[300px]">
    <div className="flex items-center justify-between">
      <label className="text-neutral-11 text-sm">Email Notifications</label>
      <Switch defaultChecked />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-neutral-11 text-sm">Push Notifications</label>
      <Switch />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-neutral-11 text-sm">SMS Notifications</label>
      <Switch />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-neutral-11 text-sm opacity-50">
        Maintenance Mode
      </label>
      <Switch disabled />
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-2xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Switch States</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">
            Unchecked (data-[state=unchecked]:bg-input)
          </p>
          <div className="flex items-center space-x-2">
            <Switch />
            <span className="text-neutral-11 text-sm">Off state</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">
            Checked (data-[state=checked]:bg-primary)
          </p>
          <div className="flex items-center space-x-2">
            <Switch defaultChecked />
            <span className="text-neutral-11 text-sm">On state</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">
            Disabled (opacity-50)
          </p>
          <div className="flex items-center space-x-2">
            <Switch disabled />
            <span className="text-neutral-11 text-sm">Disabled off</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">
            Disabled & Checked
          </p>
          <div className="flex items-center space-x-2">
            <Switch disabled checked />
            <span className="text-neutral-11 text-sm">Disabled on</span>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Thumb Animation
      </h2>
      <p className="text-neutral-11 text-sm mb-4">
        The thumb (bg-neutral-3) translates: data-[state=checked]:translate-x-5
      </p>
      <div className="flex gap-4 items-center">
        <Switch />
        <span className="text-neutral-11">→</span>
        <Switch defaultChecked />
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Settings Example
      </h2>
      <div className="space-y-4 bg-neutral-3 p-4 rounded-lg">
        <h3 className="text-neutral-12 font-semibold">
          Notification Preferences
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-neutral-12 text-sm font-medium">
                Email Notifications
              </p>
              <p className="text-neutral-10 text-xs">
                Receive updates via email
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-neutral-12 text-sm font-medium">
                Schema Change Alerts
              </p>
              <p className="text-neutral-10 text-xs">
                Get notified of schema updates
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-neutral-12 text-sm font-medium">
                Error Notifications
              </p>
              <p className="text-neutral-10 text-xs">
                Alert me when errors occur
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-neutral-12 text-sm font-medium">
                Marketing Emails
              </p>
              <p className="text-neutral-10 text-xs">
                Receive product updates and news
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
    </div>
  </div>
);
