import { useCallback, useState } from 'react';

export interface LaboratoryEnv {
  variables: Record<string, string>;
}

export interface LaboratoryEnvState {
  env: LaboratoryEnv | null;
}

export interface LaboratoryEnvActions {
  setEnv: (env: LaboratoryEnv) => void;
}

export const useEnv = (props: {
  defaultEnv?: LaboratoryEnv | null;
  onEnvChange?: (env: LaboratoryEnv | null) => void;
}): LaboratoryEnvState & LaboratoryEnvActions => {
  // eslint-disable-next-line react/hook-use-state
  const [env, _setEnv] = useState<LaboratoryEnv>(props.defaultEnv ?? { variables: {} });

  const setEnv = useCallback(
    (env: LaboratoryEnv) => {
      _setEnv(env);
      props.onEnvChange?.(env);
    },
    [props],
  );

  return {
    env,
    setEnv,
  };
};
