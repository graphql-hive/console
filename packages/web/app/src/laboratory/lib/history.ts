import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';
import type { LaboratoryPreflightLog } from '@/laboratory/lib/preflight';

export interface LaboratoryHistoryRequest {
  id: string;
  status: number;
  duration: number;
  size: number;
  response: string;
  headers: string;
  operation: LaboratoryOperation;
  preflightLogs?: LaboratoryPreflightLog[];
  createdAt: string;
}

export interface LaboratoryHistorySubscription {
  id: string;
  responses: {
    createdAt: string;
    data: string;
  }[];
  preflightLogs?: LaboratoryPreflightLog[];
  operation: LaboratoryOperation;
  createdAt: string;
}

export type LaboratoryHistory = LaboratoryHistoryRequest | LaboratoryHistorySubscription;

export interface LaboratoryHistoryState {
  history: LaboratoryHistory[];
}

export interface LaboratoryHistoryActions {
  addHistory: (history: Omit<LaboratoryHistory, 'id'>) => LaboratoryHistory;
  addResponseToHistory: (historyId: string, response: string) => void;
  deleteHistory: (historyId: string) => void;
  deleteHistoryByDay: (day: string) => void;
  deleteAllHistory: () => void;
}

export interface LaboratoryHistoryCallbacks {
  onHistoryCreate?: (history: LaboratoryHistory) => void;
  onHistoryUpdate?: (history: LaboratoryHistory) => void;
  onHistoryDelete?: (history: LaboratoryHistory) => void;
}

export const useHistory = (
  props: {
    defaultHistory?: LaboratoryHistory[];
    onHistoryChange?: (history: LaboratoryHistory[]) => void;
  } & LaboratoryHistoryCallbacks,
): LaboratoryHistoryState & LaboratoryHistoryActions => {
  const [history, setHistory] = useState<LaboratoryHistory[]>(props.defaultHistory ?? []);

  const historyRef = useRef<LaboratoryHistory[]>(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const addHistory = useCallback(
    (item: Omit<LaboratoryHistory, 'id'>) => {
      const newItem: LaboratoryHistory = {
        ...item,
        id: crypto.randomUUID(),
      } as LaboratoryHistory;
      const newHistory = [...history, newItem];
      setHistory(newHistory);

      props.onHistoryChange?.(newHistory);
      props.onHistoryCreate?.(newItem);

      return newItem;
    },
    [history, props],
  );

  const addResponseToHistory = useCallback(
    (historyId: string, response: string) => {
      const historyItem = historyRef.current.find(item => item.id === historyId);

      if (!historyItem) {
        return;
      }

      if ('responses' in historyItem) {
        const newResponses = [
          ...historyItem.responses,
          {
            createdAt: new Date().toISOString(),
            data: response,
          },
        ];

        const updatedHistoryItem = {
          ...historyItem,
          responses: newResponses,
        };
        const newHistory = historyRef.current.map(item =>
          item.id === historyId ? updatedHistoryItem : item,
        );
        setHistory(newHistory);
        props.onHistoryChange?.(newHistory);
        props.onHistoryUpdate?.(updatedHistoryItem);
      }
    },
    [props],
  );

  const deleteHistory = useCallback(
    (historyId: string) => {
      const historyToDelete = historyRef.current.find(item => item.id === historyId);
      const newHistory = historyRef.current.filter(item => item.id !== historyId);
      setHistory(newHistory);
      props.onHistoryChange?.(newHistory);
      if (historyToDelete) {
        props.onHistoryDelete?.(historyToDelete);
      }
    },
    [props],
  );

  const deleteAllHistory = useCallback(() => {
    const removedItems = [...historyRef.current];
    setHistory([]);
    props.onHistoryChange?.([]);
    if (props.onHistoryDelete) {
      for (const item of removedItems) {
        props.onHistoryDelete(item);
      }
    }
  }, [props]);

  const deleteHistoryByDay = useCallback(
    (day: string) => {
      const removedItems = historyRef.current.filter(
        item => format(new Date(item.createdAt), 'dd MMM yyyy') === day,
      );
      const newHistory = historyRef.current.filter(
        item => format(new Date(item.createdAt), 'dd MMM yyyy') !== day,
      );
      setHistory(newHistory);
      props.onHistoryChange?.(newHistory);
      if (props.onHistoryDelete) {
        for (const item of removedItems) {
          props.onHistoryDelete(item);
        }
      }
    },
    [props],
  );

  return {
    history,
    addHistory,
    addResponseToHistory,
    deleteHistory,
    deleteAllHistory,
    deleteHistoryByDay,
  };
};
