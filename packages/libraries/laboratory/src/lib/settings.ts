import { useCallback, useState } from 'react';

export type LaboratorySettings = {
  fetch: {
    credentials: 'include' | 'omit' | 'same-origin';
    timeout?: number;
    retry?: number;
    useGETForQueries?: boolean;
  };
  subscriptions: {
    protocol: 'SSE' | 'GRAPHQL_SSE' | 'WS' | 'LEGACY_WS';
  };
  introspection: {
    queryName?: string;
    method?: 'GET' | 'POST';
    schemaDescription?: boolean;
  };
};

export interface LaboratorySettingsState {
  settings: LaboratorySettings;
}

export interface LaboratorySettingsActions {
  setSettings: (settings: LaboratorySettings) => void;
}

export const useSettings = (props: {
  defaultSettings?: LaboratorySettings | null;
  onSettingsChange?: (settings: LaboratorySettings | null) => void;
}): LaboratorySettingsState & LaboratorySettingsActions => {
  const [settings, _setSettings] = useState<LaboratorySettings>(
    props.defaultSettings ?? {
      fetch: {
        credentials: 'same-origin',
        timeout: 10000,
        retry: 3,
        useGETForQueries: false,
      },
      subscriptions: {
        protocol: 'WS',
      },
      introspection: {
        queryName: 'IntrospectionQuery',
        method: 'POST',
        schemaDescription: false,
      },
    },
  );

  const setSettings = useCallback(
    (settings: LaboratorySettings) => {
      _setSettings(settings);
      props.onSettingsChange?.(settings);
    },
    [props],
  );

  return {
    settings,
    setSettings,
  };
};
