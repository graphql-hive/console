import clsx from 'clsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from '@/gql/graphql';
import { NoAccess, Scope } from '@/lib/access/common';
import { truthy } from '@/utils';

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
        <div className="font-semibold text-white">{props.scope.name}</div>
        <div className="text-xs text-gray-400">{props.scope.description}</div>
      </div>
      <Select
        disabled={!props.canManageScope || props.disabled}
        value={props.selectedScope}
        onValueChange={value => {
          props.onChange(value as T | typeof NoAccess);
        }}
      >
        <SelectTrigger className="w-[150px] shrink-0" data-cy="select-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-cy={props.dataCy ? `${props.dataCy}-select-content` : ''}>
          {[
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

              return (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  disabled={isDisabled}
                  data-cy={`select-option-${item.value}`}
                >
                  {item.label}
                  {isDisabled ? (
                    <span className="block text-xs italic">Can't downgrade</span>
                  ) : null}
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>
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
