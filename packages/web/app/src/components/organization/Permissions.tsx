import clsx from 'clsx';
import { Select } from '@/components/base/floating/select/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from '@/gql/graphql';
import { NoAccess, Scope } from '@/lib/access/common';
import { truthy } from '@/lib/utils';

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
  dataCy?: string;
}): React.ReactElement => {
  const initialScope = props.initialScope ?? NoAccess;

  const inner = (
    <div
      key={props.scope.name}
      className={clsx(
        'flex flex-row items-center justify-between space-x-4 py-2',
        props.canManageScope === false ? 'cursor-not-allowed opacity-50' : null,
      )}
      data-cy={props.dataCy}
    >
      <div>
        <div className="text-neutral-12 font-semibold">{props.scope.name}</div>
        <div className="text-neutral-10 text-xs">{props.scope.description}</div>
      </div>
      <Select
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
              'data-cy': `select-option-${item.value}`,
            };
          })}
        disabled={!props.canManageScope || props.disabled}
        value={props.selectedScope}
        onValueChange={value => {
          props.onChange(value as T | typeof NoAccess);
        }}
        width="sm"
        data-cy="select-trigger"
        popupDataCy={props.dataCy ? `${props.dataCy}-select-content` : undefined}
      />
    </div>
  );

  return props.canManageScope ? (
    inner
  ) : (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent>Your user account does not have these permissions.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
