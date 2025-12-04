import { useMemo } from 'react';
import { useLabaratory } from '@/labaratory/components/labaratory/context';
import { Operation } from '@/labaratory/components/labaratory/operation';

export const HistoryItem = () => {
  const { activeTab, history } = useLabaratory();

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
