import { useMemo } from "react";
import { useLaboratory } from "@/components/laboratory/context";
import { Operation } from "@/components/laboratory/operation";
import { LaboratoryHistoryRequest } from "@/lib/history";

export const HistoryItem = () => {
  const { activeTab, history } = useLaboratory();

  const historyItem = useMemo(() => {
    if (activeTab?.type !== "history") {
      return null;
    }

    return (
      history.find(
        (h) => h.id === (activeTab.data as LaboratoryHistoryRequest).id
      ) ?? null
    );
  }, [history, activeTab]);

  if (!historyItem) {
    return null;
  }

  return (
    <Operation operation={historyItem.operation} historyItem={historyItem} />
  );
};
