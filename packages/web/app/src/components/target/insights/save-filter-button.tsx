import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'urql';
import type { SavedFilterView } from '@/components/base/insights-filters';
import { TriggerButton } from '@/components/base/trigger-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover } from '@/components/base/popover/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { SavedFilterType, SavedFilterVisibilityType } from '@/gql/graphql';

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
          }
        }
      }
    }
  }
`);

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

export type CurrentFilters = {
  operations: string[];
  clients: Array<{ name: string; versions: string[] | null }>;
  dateRange: { from: string; to: string };
};

type SaveFilterButtonProps = {
  activeView: SavedFilterView | null;
  viewerCanCreate: boolean;
  currentFilters: CurrentFilters;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  onSaved: (viewId: string) => void;
  onUpdated: () => void;
};

export function SaveFilterButton({ activeView, viewerCanCreate, ...rest }: SaveFilterButtonProps) {
  if (activeView?.viewerCanUpdate) {
    return <UpdateFilterButton activeView={activeView} {...rest} />;
  }

  if (viewerCanCreate) {
    return <SaveFilterPopover viewerCanCreate={viewerCanCreate} {...rest} />;
  }

  return null;
}

function SaveFilterPopover({
  currentFilters,
  organizationSlug,
  projectSlug,
  targetSlug,
  onSaved,
}: Omit<SaveFilterButtonProps, 'activeView' | 'onUpdated'>) {
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
        type: SavedFilterType.Insights,
        name: trimmed,
        visibility,
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
                <SelectItem value={SavedFilterVisibilityType.Shared}>Shared views</SelectItem>
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

function UpdateFilterButton({
  activeView,
  currentFilters,
  organizationSlug,
  projectSlug,
  targetSlug,
  onUpdated,
}: {
  activeView: SavedFilterView;
} & Omit<SaveFilterButtonProps, 'activeView' | 'viewerCanCreate' | 'onSaved'>) {
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
