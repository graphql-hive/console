import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import type { TargetReferenceInput } from '../../../__generated__/types';
import type {
  SavedFilter,
  SavedFilterType,
  SavedFilterVisibility,
  Target,
} from '../../../shared/entities';
import { isUUID } from '../../../shared/is-uuid';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { SavedFiltersStorage } from './saved-filters-storage';

const InsightsFilterConfigurationModel = zod.object({
  // Use nullish() + transform because the resolver may pass null instead of undefined
  operationHashes: zod
    .array(zod.string())
    .max(100)
    .nullish()
    .transform(v => v ?? []),
  clientFilters: zod
    .array(
      zod.object({
        name: zod.string().min(1).max(100),
        versions: zod.array(zod.string()).max(100).nullable().optional(),
      }),
    )
    .max(50)
    .nullish()
    .transform(v => v ?? []),
});

// Transform GraphQL uppercase enum values to lowercase for database storage
const visibilityEnum = zod
  .enum(['PRIVATE', 'SHARED'])
  .transform(v => v.toLowerCase() as 'private' | 'shared');

const CreateSavedFilterInputModel = zod.object({
  name: zod.string().min(1).max(100),
  description: zod.string().max(500).nullable().optional(),
  visibility: visibilityEnum,
  type: zod.enum(['INSIGHTS']),
  // nullable() needed because GraphQL sends null when field is not provided
  insightsFilter: InsightsFilterConfigurationModel.nullable().optional(),
});

const UpdateSavedFilterInputModel = zod.object({
  name: zod.string().min(1).max(100).optional(),
  description: zod.string().max(500).nullable().optional(),
  // nullish() because resolver passes null when visibility is not provided
  visibility: visibilityEnum.nullish(),
  insightsFilter: InsightsFilterConfigurationModel.nullable().optional(),
});

@Injectable({
  global: true,
  scope: Scope.Operation,
})
export class SavedFiltersProvider {
  private logger: Logger;

  constructor(
    logger: Logger,
    private savedFiltersStorage: SavedFiltersStorage,
    private session: Session,
    private idTranslator: IdTranslator,
    private auditLog: AuditLogRecorder,
  ) {
    this.logger = logger.child({ source: 'SavedFiltersProvider' });
  }

  async getSavedFilter(target: Target, filterId: string): Promise<SavedFilter | null> {
    this.logger.debug(
      'Fetching saved filter (filterId=%s, projectId=%s)',
      filterId,
      target.projectId,
    );
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
      },
    });

    if (!isUUID(filterId)) {
      return null;
    }

    const filter = await this.savedFiltersStorage.getSavedFilter({ id: filterId });

    if (!filter || filter.projectId !== target.projectId) {
      return null;
    }

    // Check visibility: private filters are only visible to the creator
    const currentUser = await this.session.getViewer();
    if (filter.visibility === 'private' && filter.createdByUserId !== currentUser.id) {
      return null;
    }

    return filter;
  }

  async getSavedFilters(
    target: Target,
    type: SavedFilterType,
    first: number,
    cursor: string | null,
    visibility: SavedFilterVisibility | null,
    search: string | null,
  ) {
    this.logger.debug(
      'Listing saved filters (projectId=%s, type=%s, visibility=%s, search=%s)',
      target.projectId,
      type,
      visibility,
      search,
    );
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
      },
    });

    const currentUser = await this.session.getViewer();

    return this.savedFiltersStorage.getPaginatedSavedFiltersForProject({
      projectId: target.projectId,
      type,
      userId: currentUser.id,
      visibility,
      search,
      first,
      cursor,
    });
  }

  async createSavedFilter(
    target: TargetReferenceInput,
    input: {
      type: string;
      name: string;
      description: string | null;
      visibility: string;
      insightsFilter?: {
        operationHashes?: string[] | null;
        clientFilters?: Array<{ name: string; versions?: string[] | null }> | null;
      } | null;
    },
  ): Promise<{ type: 'success'; savedFilter: SavedFilter } | { type: 'error'; message: string }> {
    this.logger.info(
      'Creating saved filter (name=%s, type=%s, visibility=%s)',
      input.name,
      input.type,
      input.visibility,
    );

    const resolved = await this.idTranslator.resolveTargetReference({ reference: target });
    if (resolved === null) {
      return { type: 'error', message: 'Target not found' };
    }
    const { organizationId, projectId } = resolved;

    await this.session.assertPerformAction({
      action: 'project:modifySettings',
      organizationId,
      params: {
        organizationId,
        projectId,
      },
    });

    const validationResult = CreateSavedFilterInputModel.safeParse(input);
    if (!validationResult.success) {
      return {
        type: 'error',
        message: validationResult.error.errors[0].message,
      };
    }

    const data = validationResult.data;

    // For INSIGHTS type, insightsFilter should be provided
    if (data.type === 'INSIGHTS' && !input.insightsFilter) {
      return {
        type: 'error',
        message: 'insightsFilter is required for INSIGHTS type',
      };
    }

    const currentUser = await this.session.getViewer();

    const filters =
      data.type === 'INSIGHTS'
        ? {
            operationHashes: data.insightsFilter?.operationHashes ?? [],
            clientFilters: data.insightsFilter?.clientFilters ?? [],
          }
        : {};

    const savedFilter = await this.savedFiltersStorage.createSavedFilter({
      projectId,
      type: data.type as SavedFilterType,
      createdByUserId: currentUser.id,
      name: data.name,
      description: data.description ?? null,
      filters,
      visibility: data.visibility as SavedFilterVisibility,
    });

    await this.auditLog.record({
      eventType: 'SAVED_FILTER_CREATED',
      organizationId,
      metadata: {
        filterId: savedFilter.id,
        filterName: savedFilter.name,
        filterType: savedFilter.type,
        visibility: savedFilter.visibility,
        projectId,
      },
    });

    return {
      type: 'success',
      savedFilter,
    };
  }

  async updateSavedFilter(
    target: TargetReferenceInput,
    filterId: string,
    input: {
      name?: string | null;
      description?: string | null;
      visibility?: string | null;
      insightsFilter?: {
        operationHashes?: string[] | null;
        clientFilters?: Array<{ name: string; versions?: string[] | null }> | null;
      } | null;
    },
  ): Promise<{ type: 'success'; savedFilter: SavedFilter } | { type: 'error'; message: string }> {
    this.logger.info('Updating saved filter (filterId=%s)', filterId);

    const resolved = await this.idTranslator.resolveTargetReference({ reference: target });
    if (resolved === null) {
      return { type: 'error', message: 'Target not found' };
    }
    const { organizationId, projectId } = resolved;

    await this.session.assertPerformAction({
      action: 'project:modifySettings',
      organizationId,
      params: {
        organizationId,
        projectId,
      },
    });

    if (!isUUID(filterId)) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    const existingFilter = await this.savedFiltersStorage.getSavedFilter({ id: filterId });

    if (!existingFilter || existingFilter.projectId !== projectId) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    const currentUser = await this.session.getViewer();

    // Check if user can update this filter
    if (!this.canUserModifyFilter(existingFilter, currentUser.id)) {
      return {
        type: 'error',
        message: 'You do not have permission to update this filter',
      };
    }

    const validationResult = UpdateSavedFilterInputModel.safeParse(input);
    if (!validationResult.success) {
      return {
        type: 'error',
        message: validationResult.error.errors[0].message,
      };
    }

    const data = validationResult.data;

    const filters = data.insightsFilter
      ? {
          operationHashes: data.insightsFilter.operationHashes ?? [],
          clientFilters: data.insightsFilter.clientFilters ?? [],
        }
      : null;

    const savedFilter = await this.savedFiltersStorage.updateSavedFilter({
      id: filterId,
      updatedByUserId: currentUser.id,
      name: data.name ?? null,
      description: data.description ?? null,
      filters,
      visibility: (data.visibility as SavedFilterVisibility) ?? null,
    });

    if (!savedFilter) {
      return {
        type: 'error',
        message: 'Failed to update saved filter',
      };
    }

    await this.auditLog.record({
      eventType: 'SAVED_FILTER_UPDATED',
      organizationId,
      metadata: {
        filterId: savedFilter.id,
        filterName: savedFilter.name,
        filterType: savedFilter.type,
        updatedFields: JSON.stringify({
          name: data.name,
          description: data.description,
          visibility: data.visibility,
          filters: filters ? true : false,
        }),
      },
    });

    return {
      type: 'success',
      savedFilter,
    };
  }

  async deleteSavedFilter(
    target: TargetReferenceInput,
    filterId: string,
  ): Promise<{ type: 'success'; deletedId: string } | { type: 'error'; message: string }> {
    this.logger.info('Deleting saved filter (filterId=%s)', filterId);

    const resolved = await this.idTranslator.resolveTargetReference({ reference: target });
    if (resolved === null) {
      return { type: 'error', message: 'Target not found' };
    }
    const { organizationId, projectId } = resolved;

    await this.session.assertPerformAction({
      action: 'project:modifySettings',
      organizationId,
      params: {
        organizationId,
        projectId,
      },
    });

    if (!isUUID(filterId)) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    const existingFilter = await this.savedFiltersStorage.getSavedFilter({ id: filterId });

    if (!existingFilter || existingFilter.projectId !== projectId) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    const currentUser = await this.session.getViewer();

    // Check if user can delete this filter
    if (!this.canUserModifyFilter(existingFilter, currentUser.id)) {
      return {
        type: 'error',
        message: 'You do not have permission to delete this filter',
      };
    }

    const deletedId = await this.savedFiltersStorage.deleteSavedFilter({ id: filterId });

    if (!deletedId) {
      return {
        type: 'error',
        message: 'Failed to delete saved filter',
      };
    }

    await this.auditLog.record({
      eventType: 'SAVED_FILTER_DELETED',
      organizationId,
      metadata: {
        filterId: existingFilter.id,
        filterName: existingFilter.name,
        filterType: existingFilter.type,
      },
    });

    return {
      type: 'success',
      deletedId,
    };
  }

  async trackView(
    target: TargetReferenceInput,
    filterId: string,
  ): Promise<{ type: 'success'; savedFilter: SavedFilter } | { type: 'error'; message: string }> {
    this.logger.debug('Tracking saved filter view (filterId=%s)', filterId);

    const resolved = await this.idTranslator.resolveTargetReference({ reference: target });
    if (resolved === null) {
      return { type: 'error', message: 'Target not found' };
    }
    const { organizationId, projectId } = resolved;

    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId,
      params: {
        organizationId,
        projectId,
      },
    });

    if (!isUUID(filterId)) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    const existingFilter = await this.savedFiltersStorage.getSavedFilter({ id: filterId });

    if (!existingFilter || existingFilter.projectId !== projectId) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    const currentUser = await this.session.getViewer();

    // Check visibility
    if (
      existingFilter.visibility === 'private' &&
      existingFilter.createdByUserId !== currentUser.id
    ) {
      return {
        type: 'error',
        message: 'Saved filter not found',
      };
    }

    await this.savedFiltersStorage.incrementSavedFilterViews({ id: filterId });

    // Fetch the updated filter
    const savedFilter = await this.savedFiltersStorage.getSavedFilter({ id: filterId });

    if (!savedFilter) {
      return {
        type: 'error',
        message: 'Failed to track view',
      };
    }

    return {
      type: 'success',
      savedFilter,
    };
  }

  canUserModifyFilter(filter: SavedFilter, userId: string): boolean {
    // Private filters can only be modified by the creator
    if (filter.visibility === 'private') {
      return filter.createdByUserId === userId;
    }
    // Shared filters can be modified by anyone with project:modify permission
    // The permission check is done at the method level
    return true;
  }

  canUserDeleteFilter(filter: SavedFilter, userId: string): boolean {
    // Same logic as canUserModifyFilter
    return this.canUserModifyFilter(filter, userId);
  }
}
