import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'urql';
import { Button as BaseButton } from '@/components/base/button/button';
import { Popover } from '@/components/base/floating/popover/popover';
import { useToast } from '@/components/base/toast/toast';
import type { SavedFilterView } from '@/components/target/insights/use-insights-filter-extra-sections';
import { graphql } from '@/gql';
import { hasUnsavedChanges, toInsightsFilterInput, type CurrentFilters } from './utils';

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
            excludeOperations
            excludeClientFilters
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

  const hasChanges = useMemo(
    () => hasUnsavedChanges(activeView, currentFilters),
    [activeView, currentFilters],
  );

  const handleUpdate = useCallback(async () => {
    const result = await updateSavedFilter({
      input: {
        id: activeView.id,
        target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
        insightsFilter: toInsightsFilterInput(currentFilters),
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

  if (!hasChanges) {
    return null;
  }

  return (
    <Popover
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      align="start"
      title="Update saved filter"
      description={`This will overwrite the current configuration of "${activeView.name}" with your current filter selections.`}
      trigger={
        <BaseButton label={`Update "${activeView.name}"`} variant="muted-action" size="compact" />
      }
      content={
        <div className="flex gap-2">
          <BaseButton
            variant="primary"
            width="full"
            onClick={() => void handleUpdate()}
            disabled={updateResult.fetching}
          >
            Update filter
          </BaseButton>
          <BaseButton variant="outline" width="full" onClick={() => setConfirmOpen(false)}>
            Cancel
          </BaseButton>
        </div>
      }
    />
  );
}
