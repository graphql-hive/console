import {
  indexSdlDefinitions,
  type SdlDefinitionIndex,
  type SdlDefinitionRange,
} from './graphql-definitions';

// Monaco providers are global per language; the scheme keeps ours out of other editors.
export const SDL_VIEWER_SCHEME = 'hive-sdl';

// The version id is in the path because @monaco-editor/react reuses a model by path
// without resetting its text.
export function sdlModelPath(versionId: string, name: string): string {
  return `${SDL_VIEWER_SCHEME}:/${encodeURIComponent(versionId)}/${encodeURIComponent(name)}.graphql`;
}

export type SdlModelLike = {
  uri: { scheme: string };
  getValue(): string;
  getVersionId(): number;
  getLineContent(lineNumber: number): string;
  getWordAtPosition(position: {
    lineNumber: number;
    column: number;
  }): { word: string; startColumn: number } | null;
};

const indexes = new WeakMap<SdlModelLike, { versionId: number; index: SdlDefinitionIndex }>();

function indexFor(model: SdlModelLike): SdlDefinitionIndex {
  const cached = indexes.get(model);
  if (cached && cached.versionId === model.getVersionId()) {
    return cached.index;
  }
  const index = indexSdlDefinitions(model.getValue());
  indexes.set(model, { versionId: model.getVersionId(), index });
  return index;
}

export function findSdlDefinition(
  model: SdlModelLike,
  position: { lineNumber: number; column: number },
): SdlDefinitionRange | null {
  if (model.uri.scheme !== SDL_VIEWER_SCHEME) {
    return null;
  }
  const word = model.getWordAtPosition(position);
  if (!word) {
    return null;
  }
  const index = indexFor(model);
  const isDirective = model.getLineContent(position.lineNumber)[word.startColumn - 2] === '@';
  return (isDirective ? index.directives : index.types).get(word.word) ?? null;
}
