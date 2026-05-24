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
    method?: 'GET' | 'POST';
    schemaDescription?: boolean;
    headers?: string;
    includeActiveOperationHeaders?: boolean;
  };
};

export const defaultLaboratorySettings: LaboratorySettings = {
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
    method: 'POST',
    schemaDescription: false,
    headers: '',
    includeActiveOperationHeaders: false,
  },
};

export const normalizeLaboratorySettings = (
  settings?: Partial<LaboratorySettings> | null,
): LaboratorySettings => ({
  fetch: {
    credentials: settings?.fetch?.credentials ?? defaultLaboratorySettings.fetch.credentials,
    timeout: settings?.fetch?.timeout ?? defaultLaboratorySettings.fetch.timeout,
    retry: settings?.fetch?.retry ?? defaultLaboratorySettings.fetch.retry,
    useGETForQueries:
      settings?.fetch?.useGETForQueries ?? defaultLaboratorySettings.fetch.useGETForQueries,
  },
  subscriptions: {
    protocol: settings?.subscriptions?.protocol ?? defaultLaboratorySettings.subscriptions.protocol,
  },
  introspection: {
    method: settings?.introspection?.method ?? defaultLaboratorySettings.introspection.method,
    schemaDescription:
      settings?.introspection?.schemaDescription ??
      defaultLaboratorySettings.introspection.schemaDescription,
    headers: settings?.introspection?.headers ?? defaultLaboratorySettings.introspection.headers,
    includeActiveOperationHeaders:
      settings?.introspection?.includeActiveOperationHeaders ??
      defaultLaboratorySettings.introspection.includeActiveOperationHeaders,
  },
});

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
    normalizeLaboratorySettings(props.defaultSettings),
  );

  const setSettings = useCallback(
    (settings: LaboratorySettings) => {
      const normalizedSettings = normalizeLaboratorySettings(settings);
      _setSettings(normalizedSettings);
      props.onSettingsChange?.(normalizedSettings);
    },
    [props],
  );

  return {
    settings,
    setSettings,
  };
};
