import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import { DocumentCollection, DocumentCollectionOperation, Target } from '../../../shared/entities';
import { isUUID } from '../../../shared/is-uuid';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';

@Injectable({
  global: true,
  scope: Scope.Operation,
})
export class CollectionProvider {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private session: Session,
    private idTranslator: IdTranslator,
    private auditLog: AuditLogRecorder,
  ) {
    this.logger = logger.child({ source: 'CollectionProvider' });
  }

  async getCollections(target: Target, first: number, cursor: string | null) {
    await this.session.assertPerformAction({
      action: 'laboratory:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });

    return this.storage.getPaginatedDocumentCollectionsForTarget({
      targetId: target.id,
      first,
      cursor,
    });
  }

  getCollectionForDocumentCollectionOperation(operation: DocumentCollectionOperation) {
    return this.storage.getDocumentCollection({ id: operation.documentCollectionId });
  }

  async getDocumentCollectionForTarget(target: Target, documentCollectionId: string) {
    await this.session.assertPerformAction({
      action: 'laboratory:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });

    const collection = await this.storage.getDocumentCollection({ id: documentCollectionId });

    if (collection?.targetId !== target.id) {
      return null;
    }

    return collection;
  }

  async getOperationsForDocumentCollection(
    documentCollection: DocumentCollection,
    first: number,
    cursor: string | null,
  ) {
    return this.storage.getPaginatedDocumentsForDocumentCollection({
      documentCollectionId: documentCollection.id,
      first,
      cursor,
    });
  }

  async getDocumentCollectionOperationForTarget(target: Target, documentCollectionId: string) {
    await this.session.assertPerformAction({
      action: 'laboratory:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });

    const operation = await this.storage.getDocumentCollectionDocument({
      id: documentCollectionId,
    });

    if (!operation) {
      return null;
    }

    const collection = await this.storage.getDocumentCollection({
      id: operation.documentCollectionId,
    });

    if (!collection || collection.targetId !== target.id) {
      return null;
    }

    return operation;
  }

  async createCollection(
    selector: {
      organizationSlug: string;
      projectSlug: string;
      targetSlug: string;
    },
    args: {
      name: string;
      description: string | null;
    },
  ) {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(selector),
      this.idTranslator.translateProjectId(selector),
      this.idTranslator.translateTargetId(selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modify',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    const target = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });
    const currentUser = await this.session.getViewer();
    const collection = await this.storage.createDocumentCollection({
      createdByUserId: currentUser.id,
      title: args.name,
      description: args.description || '',
      targetId,
    });

    await this.auditLog.record({
      eventType: 'COLLECTION_CREATED',
      organizationId,
      metadata: {
        collectionId: collection.id,
        collectionName: collection.title,
        targetId: target.id,
      },
    });

    return {
      collection,
      target,
    };
  }

  async updateCollection(
    selector: {
      organizationSlug: string;
      projectSlug: string;
      targetSlug: string;
    },
    args: {
      collectionId: string;
      name: string;
      description: string | null;
    },
  ) {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(selector),
      this.idTranslator.translateProjectId(selector),
      this.idTranslator.translateTargetId(selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modify',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    let collection = await this.storage.getDocumentCollection({ id: args.collectionId });

    if (!collection || collection.targetId !== targetId) {
      return null;
    }

    collection = await this.storage.updateDocumentCollection({
      documentCollectionId: collection.id,
      description: args.description || null,
      title: args.name,
    });

    if (!collection) {
      return null;
    }

    const target = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });

    await this.auditLog.record({
      eventType: 'COLLECTION_UPDATED',
      organizationId,
      metadata: {
        collectionId: collection.id,
        collectionName: collection.title,
        updatedFields: JSON.stringify({
          name: args.name,
          description: args.description || null,
        }),
      },
    });

    return {
      collection,
      target,
    };
  }

  async deleteCollection(
    selector: {
      organizationSlug: string;
      projectSlug: string;
      targetSlug: string;
    },
    args: {
      collectionId: string;
    },
  ) {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(selector),
      this.idTranslator.translateProjectId(selector),
      this.idTranslator.translateTargetId(selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modify',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    const target = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });

    const collection = await this.storage.getDocumentCollection({
      id: args.collectionId,
    });

    if (!collection || collection.targetId !== targetId) {
      return { target, deletedCollectionId: args.collectionId };
    }

    await this.storage.deleteDocumentCollection({
      documentCollectionId: args.collectionId,
    });

    await this.auditLog.record({
      eventType: 'COLLECTION_DELETED',
      organizationId,
      metadata: {
        collectionId: args.collectionId,
        collectionName: collection.title,
      },
    });

    return {
      target,
      deletedCollectionId: args.collectionId,
    };
  }

  async createOperation(
    selector: {
      organizationSlug: string;
      projectSlug: string;
      targetSlug: string;
    },
    args: {
      collectionId: string;
      operation: {
        name: string;
        query: string;
        variables: string | null;
        headers: string | null;
      };
    },
  ) {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(selector),
      this.idTranslator.translateProjectId(selector),
      this.idTranslator.translateTargetId(selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modify',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    if (!isUUID(args.collectionId)) {
      return {
        type: 'error' as const,
        message: 'Collection not found.',
      };
    }

    let collection = await this.storage.getDocumentCollection({
      id: args.collectionId,
    });

    const target = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });

    if (!collection || collection.targetId !== targetId) {
      return {
        type: 'error' as const,
        message: 'Collection not found.',
      };
    }

    const currentUser = await this.session.getViewer();

    const validationResult = OperationCreateModel.safeParse({
      name: args.operation.name,
      query: args.operation.query,
      variables: args.operation.variables,
      headers: args.operation.headers,
    });

    if (validationResult.error) {
      return {
        type: 'error' as const,
        message: validationResult.error.errors[0].message,
      };
    }

    const data = validationResult.data;

    const document = await this.storage.createDocumentCollectionDocument({
      documentCollectionId: collection.id,
      title: data.name,
      contents: data.query,
      variables: data.variables,
      headers: data.headers,
      createdByUserId: currentUser.id,
    });

    await this.auditLog.record({
      eventType: 'OPERATION_IN_DOCUMENT_COLLECTION_CREATED',
      organizationId,
      metadata: {
        collectionId: collection.id,
        collectionName: collection.title,
        operationId: document.id,
        operationQuery: document.contents,
        targetId: target.id,
      },
    });

    return {
      type: 'success' as const,
      target,
      collection,
      document,
    };
  }

  async updateOperation(
    selector: { organizationSlug: string; projectSlug: string; targetSlug: string },
    args: {
      collectionDocumentId: string;
      operation: {
        name: string | null;
        query: string | null;
        variables: string | null;
        headers: string | null;
      };
    },
  ) {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(selector),
      this.idTranslator.translateProjectId(selector),
      this.idTranslator.translateTargetId(selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modify',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    if (!isUUID(args.collectionDocumentId)) {
      return {
        type: 'error' as const,
        message: 'Collection document not found. 1',
      };
    }

    const target = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });

    let document = await this.storage.getDocumentCollectionDocument({
      id: args.collectionDocumentId,
    });

    if (!document) {
      return {
        type: 'error' as const,
        message: 'Collection document not found. 2',
      };
    }

    const collection = await this.storage.getDocumentCollection({
      id: document.documentCollectionId,
    });

    if (!collection || collection.targetId !== targetId) {
      return {
        type: 'error' as const,
        message: 'Collection document not found. 3',
      };
    }

    const validationResult = OperationUpdateModel.safeParse({
      name: args.operation.name,
      query: args.operation.query,
      variables: args.operation.variables,
      headers: args.operation.headers,
    });

    if (validationResult.error) {
      return {
        type: 'error' as const,
        message: validationResult.error.errors[0].message,
      };
    }

    const data = validationResult.data;

    document = await this.storage.updateDocumentCollectionDocument({
      documentCollectionDocumentId: args.collectionDocumentId,
      title: data.name,
      contents: data.query,
      variables: data.variables,
      headers: data.headers,
    });

    if (!document) {
      return {
        type: 'error' as const,
        message: 'Collection document not found. 4',
      };
    }

    await this.auditLog.record({
      eventType: 'OPERATION_IN_DOCUMENT_COLLECTION_UPDATED',
      organizationId,
      metadata: {
        collectionId: collection.id,
        collectionName: collection.title,
        operationId: document.id,
        updatedFields: JSON.stringify({
          name: data.name,
          query: data.query,
          variables: data.variables,
          headers: data.headers,
        }),
      },
    });

    return {
      type: 'success' as const,
      target,
      collection,
      document,
    };
  }

  async deleteOperation(
    selector: { organizationSlug: string; projectSlug: string; targetSlug: string },
    args: {
      collectionDocumentId: string;
    },
  ) {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(selector),
      this.idTranslator.translateProjectId(selector),
      this.idTranslator.translateTargetId(selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modify',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    if (!isUUID(args.collectionDocumentId)) {
      return {
        type: 'error' as const,
        message: 'Collection document not found.',
      };
    }

    let document = await this.storage.getDocumentCollectionDocument({
      id: args.collectionDocumentId,
    });

    if (!document) {
      return {
        type: 'error' as const,
        message: 'Collection document not found.',
      };
    }

    const collection = await this.storage.getDocumentCollection({
      id: document.documentCollectionId,
    });

    if (!collection || collection.targetId !== targetId) {
      return {
        type: 'error' as const,
        message: 'Collection document not found.',
      };
    }

    const deletedCollectionDocumentId = await this.storage.deleteDocumentCollectionDocument({
      documentCollectionDocumentId: args.collectionDocumentId,
    });

    if (!deletedCollectionDocumentId) {
      return {
        type: 'error' as const,
        message: 'Collection document not found.',
      };
    }

    const target = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });

    await this.auditLog.record({
      eventType: 'OPERATION_IN_DOCUMENT_COLLECTION_DELETED',
      organizationId,
      metadata: {
        collectionId: collection.id,
        collectionName: collection.title,
        operationId: document.id,
      },
    });

    return {
      type: 'success' as const,
      target,
      collection,
      deletedCollectionDocumentId,
    };
  }
}

const MAX_INPUT_LENGTH = 10_000;

// The following validates the length and the validity of the JSON object incoming as string.
const inputObjectSchema = zod
  .string()
  .max(MAX_INPUT_LENGTH)
  .refine(v => {
    if (!v) {
      return true;
    }

    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  });

const OperationCreateModel = zod.object({
  name: zod.string().min(1).max(100),
  query: zod.string().min(1).max(MAX_INPUT_LENGTH),
  variables: inputObjectSchema.nullable(),
  headers: inputObjectSchema.nullable(),
});

const OperationUpdateModel = zod.object({
  name: zod.string().min(1).max(100).nullable(),
  query: zod.string().min(1).max(MAX_INPUT_LENGTH).nullable(),
  variables: inputObjectSchema.nullable(),
  headers: inputObjectSchema.nullable(),
});
