import { useMemo } from 'react';
import { LaboratoryHistoryRequest } from '../../lib/history';
import { useLaboratory } from './context';
import { Operation } from './operation';

export const HistoryItem = () => {
  const { activeTab, history } = useLaboratory();

  const historyItem = useMemo(() => {
    if (activeTab?.type !== 'history') {
      return null;
    }

    return history.find(h => h.id === (activeTab.data as LaboratoryHistoryRequest).id) ?? null;
  }, [history, activeTab]);

  if (!historyItem) {
    return null;
  }

  return <Operation operation={historyItem.operation} historyItem={historyItem} />;
};
