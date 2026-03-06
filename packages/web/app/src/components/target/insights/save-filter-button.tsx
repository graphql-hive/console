import { useCallback, useState } from 'react';
import { useMutation } from 'urql';
import type { SavedFilterView } from '@/components/base/insights-filters';
import { Popover } from '@/components/base/popover/popover';
import { TriggerButton } from '@/components/base/trigger-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { SavedFilterVisibilityType } from '@/gql/graphql';
import { UpdateFilterButton } from './update-filter-button';
import { hasUnsavedChanges, toInsightsFilterInput, type CurrentFilters } from './utils';

const InsightsCreateSavedFilter_Mutation = graphql(`
  mutation InsightsCreateSavedFilter($input: CreateSavedFilterInput!) {
    createSavedFilter(input: $input) {
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

type SaveFilterButtonProps = {
  activeView: SavedFilterView | null;
  viewerCanCreate: boolean;
  viewerCanShare: boolean;
  currentFilters: CurrentFilters;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  onSaved: (viewId: string) => void;
  onUpdated: () => void;
};

export function SaveFilterButton({
  activeView,
  viewerCanCreate,
  viewerCanShare,
  currentFilters,
  organizationSlug,
  projectSlug,
  targetSlug,
  onSaved,
  onUpdated,
}: SaveFilterButtonProps) {
  // When viewing a saved filter without modifications, don't show any save UI.
  if (activeView && !hasUnsavedChanges(activeView, currentFilters)) {
    return null;
  }

  if (activeView?.viewerCanUpdate) {
    return (
      <div className="flex items-center gap-x-2">
        <UpdateFilterButton
          activeView={activeView}
          currentFilters={currentFilters}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          onUpdated={onUpdated}
        />
        {viewerCanCreate && (
          <CreateFilterButton
            viewerCanShare={viewerCanShare}
            currentFilters={currentFilters}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            targetSlug={targetSlug}
            onSaved={onSaved}
          />
        )}
      </div>
    );
  }

  if (viewerCanCreate) {
    return (
      <CreateFilterButton
        viewerCanShare={viewerCanShare}
        currentFilters={currentFilters}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        onSaved={onSaved}
      />
    );
  }

  return null;
}

function CreateFilterButton({
  viewerCanShare,
  currentFilters,
  organizationSlug,
  projectSlug,
  targetSlug,
  onSaved,
}: {
  viewerCanShare: boolean;
  currentFilters: CurrentFilters;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  onSaved: (viewId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<SavedFilterVisibilityType>(
    SavedFilterVisibilityType.Private,
  );
  const [createResult, createSavedFilter] = useMutation(InsightsCreateSavedFilter_Mutation);
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const result = await createSavedFilter({
      input: {
        target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
        name: trimmed,
        visibility,
        insightsFilter: toInsightsFilterInput(currentFilters),
      },
    });

    if (result.data?.createSavedFilter.ok) {
      toast({
        title: 'Filter saved',
        description: `"${trimmed}" has been saved.`,
      });
      setOpen(false);
      setName('');
      setVisibility(SavedFilterVisibilityType.Private);
      onSaved(result.data.createSavedFilter.ok.savedFilter.id);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          result.data?.createSavedFilter.error?.message ??
          result.error?.message ??
          'Failed to save filter.',
      });
    }
  }, [
    name,
    visibility,
    currentFilters,
    organizationSlug,
    projectSlug,
    targetSlug,
    createSavedFilter,
    toast,
    onSaved,
  ]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      title="Save to filter collections"
      trigger={<TriggerButton label="Save this filter view" variant="action" />}
      content={
        <div className="space-y-3">
          <div>
            <Input
              placeholder="Name this filter collection"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) {
                  void handleSave();
                }
              }}
            />
          </div>
          <div>
            <Select
              value={visibility}
              onValueChange={v => setVisibility(v as SavedFilterVisibilityType)}
            >
              <SelectTrigger variant="inset">
                <SelectValue placeholder="Save location" />
              </SelectTrigger>
              <SelectContent variant="inset">
                <SelectItem value={SavedFilterVisibilityType.Private}>My views</SelectItem>
                {viewerCanShare && (
                  <SelectItem value={SavedFilterVisibilityType.Shared}>Shared views</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => void handleSave()}
            disabled={!name.trim() || createResult.fetching}
          >
            Save filter
          </Button>
        </div>
      }
    />
  );
}
