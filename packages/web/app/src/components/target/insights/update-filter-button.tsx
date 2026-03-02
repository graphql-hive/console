import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'urql';
import type { SavedFilterView } from '@/components/base/insights-filters';
import { Popover } from '@/components/base/popover/popover';
import { TriggerButton } from '@/components/base/trigger-button';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import type { CurrentFilters } from './save-filter-button';

const InsightsUpdateSavedFilter_Mutation = graphql(`
  mutation InsightsUpdateSavedFilter($input: UpdateSavedFilterInput!) {
    updateSavedFilter(input: $input) {
      error {
        message
      }
      ok {
        savedFilter {
          id
          name
          visibility
          viewerCanUpdate
          filters {
            operationHashes
            clientFilters {
              name
              versions
            }
            dateRange {
              from
              to
            }
          }
        }
      }
    }
  }
`);

type UpdateFilterButtonProps = {
  activeView: SavedFilterView;
  currentFilters: CurrentFilters;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  onUpdated: () => void;
};

export function UpdateFilterButton({
  activeView,
  currentFilters,
  organizationSlug,
  projectSlug,
  targetSlug,
  onUpdated,
}: UpdateFilterButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updateResult, updateSavedFilter] = useMutation(InsightsUpdateSavedFilter_Mutation);
  const { toast } = useToast();

  const hasUnsavedChanges = useMemo(() => {
    const savedOps = [...activeView.filters.operationHashes].sort();
    const currentOps = [...currentFilters.operations].sort();

    if (JSON.stringify(currentOps) !== JSON.stringify(savedOps)) return true;

    const normalizeClients = (arr: Array<{ name: string; versions: string[] | null }>) =>
      JSON.stringify(
        arr
          .map(c => ({ name: c.name, versions: c.versions }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    if (
      normalizeClients(currentFilters.clients) !==
      normalizeClients(activeView.filters.clientFilters)
    )
      return true;

    const savedFrom = activeView.filters.dateRange?.from;
    const savedTo = activeView.filters.dateRange?.to;
    if (currentFilters.dateRange.from !== savedFrom || currentFilters.dateRange.to !== savedTo)
      return true;

    return false;
  }, [activeView, currentFilters]);

  const handleUpdate = useCallback(async () => {
    const result = await updateSavedFilter({
      input: {
        id: activeView.id,
        target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
        insightsFilter: {
          operationHashes: currentFilters.operations,
          clientFilters: currentFilters.clients.map(c => ({
            name: c.name,
            versions: c.versions,
          })),
          dateRange: {
            from: currentFilters.dateRange.from,
            to: currentFilters.dateRange.to,
          },
        },
      },
    });

    if (result.data?.updateSavedFilter.ok) {
      toast({
        title: 'Filter updated',
        description: `"${activeView.name}" has been updated.`,
      });
      setConfirmOpen(false);
      onUpdated();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          result.data?.updateSavedFilter.error?.message ??
          result.error?.message ??
          'Failed to update filter.',
      });
    }
  }, [
    activeView,
    currentFilters,
    organizationSlug,
    projectSlug,
    targetSlug,
    updateSavedFilter,
    toast,
    onUpdated,
  ]);

  if (!hasUnsavedChanges) {
    return null;
  }

  return (
    <Popover
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      align="start"
      title="Update saved filter"
      description={`This will overwrite the current configuration of "${activeView.name}" with your current filter selections.`}
      trigger={<TriggerButton label={`Update "${activeView.name}" filter`} variant="action" />}
      content={
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => void handleUpdate()}
            disabled={updateResult.fetching}
          >
            Update filter
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </div>
      }
    />
  );
}
