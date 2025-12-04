import { useCallback, useState } from 'react';

export interface LabaratoryEnv {
  variables: Record<string, string>;
}

export interface LabaratoryEnvState {
  env: LabaratoryEnv | null;
}

export interface LabaratoryEnvActions {
  setEnv: (env: LabaratoryEnv) => void;
}

export const useEnv = (props: {
  defaultEnv?: LabaratoryEnv | null;
  onEnvChange?: (env: LabaratoryEnv | null) => void;
}): LabaratoryEnvState & LabaratoryEnvActions => {
  // eslint-disable-next-line react/hook-use-state
  const [env, _setEnv] = useState<LabaratoryEnv>(props.defaultEnv ?? { variables: {} });

  const setEnv = useCallback(
    (env: LabaratoryEnv) => {
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
