import { useState } from 'react';
import { Select } from '@/components/base/floating/select/select';
import type { OnSurface } from '@/components/base/shared-styles';

type Role<T> = {
  id: string;
  name: string;
  description: string;
} & T;

export function RoleSelector<T>(props: {
  roles: readonly Role<T>[];
  defaultRole?: Role<T>;
  isRoleActive(role: Role<T>):
    | boolean
    | {
        active: boolean;
        reason?: string;
      };
  disabled?: boolean;
  searchPlaceholder?: string;
  onSelect(role: Role<T>): void | Promise<void>;
  onBlur?(): void;
  width?: 'auto' | 'full';
  /** `raised` inside a dialog or sheet. */
  onSurface?: OnSurface;
}) {
  // The trigger stays disabled while an async `onSelect` settles, so a slow mutation cannot be
  // double-fired.
  const [phase, setPhase] = useState<'idle' | 'busy'>('idle');
  const isBusy = phase === 'busy';

  return (
    <Select
      options={props.roles.map(role => {
        const isRoleActiveResult = props.isRoleActive(role);
        const isActive =
          typeof isRoleActiveResult === 'boolean' ? isRoleActiveResult : isRoleActiveResult.active;
        const reason =
          typeof isRoleActiveResult === 'boolean' ? undefined : isRoleActiveResult.reason;

        return {
          value: role.id,
          label: role.name,
          description: role.description,
          disabled: !isActive,
          tooltip: isActive ? undefined : reason,
          'data-cy': 'role-selector-item',
        };
      })}
      value={props.defaultRole?.id}
      onValueChange={roleId => {
        const role = props.roles.find(r => r.id === roleId);
        if (!role) {
          return;
        }
        setPhase('busy');
        void Promise.resolve(props.onSelect(role)).finally(() => {
          setPhase('idle');
        });
      }}
      label={props.defaultRole?.name}
      placeholder="Select role"
      disabled={props.disabled === true || isBusy}
      searchable
      searchPlaceholder={props.searchPlaceholder ?? 'Search roles...'}
      onBlur={props.onBlur}
      align="end"
      width={props.width}
      onSurface={props.onSurface}
      data-cy="role-selector-trigger"
    />
  );
}
