import type { CompositionErrorSource } from '../lib/errors';
import type { Metadata } from '../types';

export type CompositionErrorType = {
  message: string;
  source: CompositionErrorSource;
};

type ContractResult<T> = {
  id: string;
  result: T;
};

export type ContractResultSuccess = ContractResult<{
  type: 'success';
  result: {
    supergraph: string;
    sdl: string;
  };
}>;

export type ContractResultFailure = ContractResult<{
  type: 'failure';
  result: {
    supergraph: string | null;
    sdl: string | null;
    errors: Array<CompositionErrorType>;
    includesNetworkError: boolean;
    includesException: boolean;
  };
}>;

export type ContractResultType = ContractResultSuccess | ContractResultFailure;

type SharedResult = {
  contracts: Array<ContractResultType> | null;
  schemaMetadata: Record<string, Metadata[]> | null;
  metadataAttributes: Record<string, string[]> | null;
  tags: Array<string> | null;
};

export type CompositionResultSuccess = {
  type: 'success';
  result: {
    supergraph: string;
    sdl: string;
    errors?: never;
    includesNetworkError?: never;
    includesException?: never;
  } & SharedResult;
};

export type CompositionResultFailure = {
  type: 'failure';
  result: {
    supergraph: string | null;
    sdl: string | null;
    errors: Array<CompositionErrorType>;
    includesNetworkError: boolean;
    includesException: boolean;
  } & SharedResult;
};

export type CompositionResult = CompositionResultSuccess | CompositionResultFailure;
