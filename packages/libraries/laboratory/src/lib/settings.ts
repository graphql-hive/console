import { useCallback, useState } from 'react';

export type LaboratorySettings = {
  fetch: {
    credentials: 'include' | 'omit' | 'same-origin';
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
