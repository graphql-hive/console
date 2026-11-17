import { useEffect, useRef, type ReactElement } from 'react';
import { SchemaEditor } from '@/components/schema-editor';
import { usePrettify } from '@/lib/hooks';
import { findSdlDefinition, SDL_VIEWER_SCHEME } from '@/lib/sdl-definition-lookup';
import { cn } from '@/lib/utils';
import type { OnMount } from '@monaco-editor/react';

type Monaco = Parameters<OnMount>[1];

let definitionsRegistered = false;

function registerSdlDefinitions(monaco: Monaco) {
  if (definitionsRegistered) {
    return;
  }
  definitionsRegistered = true;
  monaco.languages.registerDefinitionProvider('graphql', {
    provideDefinition(model, position) {
      const range = findSdlDefinition(model, position);
      return range ? { uri: model.uri, range } : null;
    },
  });
}

let mountedViewers = 0;

// Deferred so a remount in the same tick (StrictMode, a route swap) keeps its model.
function disposeSdlModelsWhenUnused(monaco: Monaco) {
  setTimeout(() => {
    if (mountedViewers > 0) {
      return;
    }
    for (const model of monaco.editor.getModels()) {
      if (model.uri.scheme === SDL_VIEWER_SCHEME) {
        model.dispose();
      }
    }
  }, 0);
}

const OPTIONS = {
  readOnly: true,
  lineNumbers: 'on',
  folding: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  // Otherwise clicking a definition itself falls back to Find References, which nothing provides.
  gotoLocation: { alternativeDefinitionCommand: '' },
} as const;

export function SdlViewer(props: {
  sdl: string;
  modelPath: string;
  className?: string;
}): ReactElement {
  const pretty = usePrettify(props.sdl);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    mountedViewers++;
    return () => {
      mountedViewers--;
      if (monacoRef.current) {
        disposeSdlModelsWhenUnused(monacoRef.current);
      }
    };
  }, []);

  const handleMount: OnMount = (_editor, monaco) => {
    monacoRef.current = monaco;
    registerSdlDefinitions(monaco);
  };

  return (
    <div className={cn('h-full', props.className)}>
      <SchemaEditor
        value={pretty ?? ''}
        path={props.modelPath}
        keepCurrentModel
        height="100%"
        options={OPTIONS}
        onMount={handleMount}
      />
    </div>
  );
}
