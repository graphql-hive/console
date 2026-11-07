import clsx from 'clsx';
import { Select } from '@/components/ui/primitives/floating/select/select';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import type { OnSurface } from '@/components/ui/primitives/shared-styles';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from '@/gql/graphql';
import { NoAccess, Scope } from '@/lib/access/common';
import { truthy } from '@/lib/utils';
import * as styles from './Permissions.css';

function isLowerThen<T>(targetScope: T, sourceScope: T, scopesInLowerToHigherOrder: readonly T[]) {
  const sourceIndex = scopesInLowerToHigherOrder.indexOf(sourceScope);
  const targetIndex = scopesInLowerToHigherOrder.indexOf(targetScope);

  return targetIndex < sourceIndex;
}

export const PermissionScopeItem = <
  T extends OrganizationAccessScope | ProjectAccessScope | TargetAccessScope,
>(props: {
  disabled?: boolean;
  scope: Scope<T>;
  checkAccess: (scope: T) => boolean;
  initialScope: typeof NoAccess | T | undefined;
  selectedScope: typeof NoAccess | T | undefined;
  onChange: (scopes: T | typeof NoAccess) => void;
  canManageScope: boolean;
  noDowngrade?: boolean;
  possibleScope: T[];
  dataTestId?: string;
  onSurface?: OnSurface;
}): React.ReactElement => {
  const initialScope = props.initialScope ?? NoAccess;

  const inner = (
    <div
      key={props.scope.name}
      className={clsx(
        styles.permissionScopeItemDiv,
        props.canManageScope === false ? styles.permissionScopeItemDiv2 : null,
      )}
      data-testid={props.dataTestId}
    >
      <div>
        <div className={styles.permissionScopeItemDiv3}>{props.scope.name}</div>
        <div className={styles.permissionScopeItemDiv4}>{props.scope.description}</div>
      </div>
      <Select
        aria-label={`${props.scope.name} access`}
        options={[
          { value: NoAccess, label: 'No access' },
          props.scope.mapping['read-only'] &&
            props.checkAccess(props.scope.mapping['read-only']) && {
              value: props.scope.mapping['read-only'],
              label: 'Read-only',
            },
          props.scope.mapping['read-write'] &&
            props.checkAccess(props.scope.mapping['read-write']) && {
              value: props.scope.mapping['read-write'],
              label: 'Read & write',
            },
        ]
          .filter(truthy)
          .map((item, _, all) => {
            const isDisabled =
              props.noDowngrade === true
                ? isLowerThen(
                    item.value,
                    initialScope,
                    all.map(item => item.value),
                  )
                : false;

            return {
              value: item.value,
              label: item.label,
              disabled: isDisabled,
              description: isDisabled ? "Can't downgrade" : undefined,
              'data-testid': `select-option-${item.value}`,
            };
          })}
        disabled={!props.canManageScope || props.disabled}
        value={props.selectedScope}
        onValueChange={value => {
          props.onChange(value as T | typeof NoAccess);
        }}
        width="sm"
        onSurface={props.onSurface}
        data-testid="select-trigger"
        popupDataTestId={props.dataTestId ? `${props.dataTestId}-select-content` : undefined}
      />
    </div>
  );

  return props.canManageScope ? (
    inner
  ) : (
    <Tooltip trigger={inner} content="Your user account does not have these permissions." />
  );
};
