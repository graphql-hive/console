import { useMemo } from 'react';
import { useLaboratory } from '@/laboratory/components/laboratory/context';
import { Operation } from '@/laboratory/components/laboratory/operation';

export const HistoryItem = () => {
  const { activeTab, history } = useLaboratory();

  const historyItem = useMemo(() => {
    if (activeTab?.type !== 'history') {
      return null;
    }

    return history.find(h => h.id === activeTab.data.id) ?? null;
  }, [history, activeTab]);

  if (!historyItem) {
    return null;
  }

  return <Operation operation={historyItem.operation} historyItem={historyItem} />;
};
