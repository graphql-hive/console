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
  ) => React.ReactNode;
}

export interface LaboratoryPlugin<State = Record<string, unknown>> {
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
      object: (
        laboratory: LaboratoryContextProps,
        state: State,
        setState: (state: State) => void,
      ) => Record<string, unknown>;
    };
  };
}

export interface LaboratoryPluginsState {
  plugins: LaboratoryPlugin[];
}

export interface LaboratoryPluginsActions {}

export const usePlugins = (props: {
  plugins?: LaboratoryPlugin[];
}): LaboratoryPluginsState & LaboratoryPluginsActions => {
  return {
    plugins: props.plugins ?? [],
  };
};
