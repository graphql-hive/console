import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { LabaratoryOperation } from '@/labaratory/lib/operations';
import type { LabaratoryPreflightLog } from '@/labaratory/lib/preflight';

export interface LabaratoryHistoryRequest {
  id: string;
  status: number;
  duration: number;
  size: number;
  response: string;
  headers: string;
  operation: LabaratoryOperation;
  preflightLogs?: LabaratoryPreflightLog[];
  createdAt: string;
}

export interface LabaratoryHistorySubscription {
  id: string;
  responses: {
    createdAt: string;
    data: string;
  }[];
  preflightLogs?: LabaratoryPreflightLog[];
  operation: LabaratoryOperation;
  createdAt: string;
}

export type LabaratoryHistory = LabaratoryHistoryRequest | LabaratoryHistorySubscription;

export interface LabaratoryHistoryState {
  history: LabaratoryHistory[];
}

export interface LabaratoryHistoryActions {
  addHistory: (history: Omit<LabaratoryHistory, 'id'>) => LabaratoryHistory;
  addResponseToHistory: (historyId: string, response: string) => void;
  deleteHistory: (historyId: string) => void;
  deleteHistoryByDay: (day: string) => void;
  deleteAllHistory: () => void;
}

export interface LabaratoryHistoryCallbacks {
  onHistoryCreate?: (history: LabaratoryHistory) => void;
  onHistoryUpdate?: (history: LabaratoryHistory) => void;
  onHistoryDelete?: (history: LabaratoryHistory) => void;
}

export const useHistory = (
  props: {
    defaultHistory?: LabaratoryHistory[];
    onHistoryChange?: (history: LabaratoryHistory[]) => void;
  } & LabaratoryHistoryCallbacks,
): LabaratoryHistoryState & LabaratoryHistoryActions => {
  const [history, setHistory] = useState<LabaratoryHistory[]>(props.defaultHistory ?? []);

  const historyRef = useRef<LabaratoryHistory[]>(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const addHistory = useCallback(
    (item: Omit<LabaratoryHistory, 'id'>) => {
      const newItem: LabaratoryHistory = {
        ...item,
        id: crypto.randomUUID(),
      } as LabaratoryHistory;
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
