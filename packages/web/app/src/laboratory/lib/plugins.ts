import { useCallback, useState } from 'react';
import type { LaboratoryContextProps } from '@/laboratory/components/laboratory/context';
import { LaboratoryTabCustom } from '@/laboratory/lib/tabs';

export interface LaboratoryPluginTab<State = Record<string, unknown>> {
  type: string;
  name: string | ((laboratory: LaboratoryContextProps, state: State) => string);
  icon?: React.ReactNode | ((laboratory: LaboratoryContextProps, state: State) => React.ReactNode);
  component: (
    tab: LaboratoryTabCustom,
    laboratory: LaboratoryContextProps,
    state: State,
    setState: (state: State) => void,
  ) => React.ReactNode;
}

export interface LaboratoryPlugin<State = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  defaultState?: State;
  onStateChange?: (state: State) => void;
  tabs?: LaboratoryPluginTab<State>[];
  commands?: {
    name: string | ((laboratory: LaboratoryContextProps, state: State) => string);
    icon?:
      | React.ReactNode
      | ((laboratory: LaboratoryContextProps, state: State) => React.ReactNode);
    onClick: (laboratory: LaboratoryContextProps, state: State) => void;
  }[];
  preflight?: {
    lab?: {
      definition?: string;
      props?: Record<string, string>;
      object: (
        props: Record<string, string>,
        state: State,
        setState: (state: State) => void,
      ) => Record<string, unknown>;
    };
  };
}

export interface LaboratoryPluginsState {
  plugins: LaboratoryPlugin[];
  pluginsState: Record<string, any>;
}

export interface LaboratoryPluginsActions {
  setPluginsState: (state: Record<string, any>) => void;
}

export const usePlugins = (props: {
  plugins?: LaboratoryPlugin[];
  defaultPluginsState?: Record<string, any>;
  onPluginsStateChange?: (state: Record<string, any>) => void;
}): LaboratoryPluginsState & LaboratoryPluginsActions => {
  // eslint-disable-next-line react/hook-use-state
  const [pluginsState, _setPluginsState] = useState<Record<string, any>>({
    ...props.plugins?.reduce(
      (acc, plugin) => {
        acc[plugin.id] = plugin.defaultState ?? {};
        return acc;
      },
      {} as Record<string, any>,
    ),
    ...props.defaultPluginsState,
  });

  const setPluginsState = useCallback(
    (state: Record<string, any>) => {
      _setPluginsState(state);
      props.onPluginsStateChange?.(state);
    },
    [props],
  );

  return {
    plugins: props.plugins ?? [],
    pluginsState,
    setPluginsState,
  };
};
