import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, UniqueIntegrityConstraintViolationError, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { buildAppDeploymentIsEnabledKey } from '@hive/cdn-script/artifact-storage-reader';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  decodeHashBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
  encodeHashBasedCursor,
} from '@hive/storage';
import { ClickHouse, sql as cSql } from '../../operations/providers/clickhouse-client';
import { SchemaVersionHelper } from '../../schema/providers/schema-version-helper';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { S3_CONFIG, type S3Config } from '../../shared/providers/s3-config';
import { Storage } from '../../shared/providers/storage';
import { APP_DEPLOYMENTS_ENABLED } from './app-deployments-enabled-token';
import { PersistedDocumentScheduler } from './persisted-document-scheduler';

export const AppDeploymentNameModel = z
  .string()
  .min(1, 'Must be at least 1 character long')
  .max(64, 'Must be at most 64 characters long')
  .regex(/^[a-zA-Z0-9_-]+$/, "Can only contain letters, numbers, '_', and '-'");

const AppDeploymentVersionModel = z
  .string()
  .trim()
  .min(1, 'Must be at least 1 character long')
  .max(64, 'Must be at most 64 characters long')
  .regex(/^[a-zA-Z0-9._-]+$/, "Can only contain letters, numbers, '.', '_', and '-'");

const noAccessToAppDeploymentsMessage =
  'This organization has no access to app deployments. Please contact the Hive team for early access.';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class AppDeployments {
  private logger: Logger;

  constructor(
    logger: Logger,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    @Inject(S3_CONFIG) private s3: S3Config,
    private clickhouse: ClickHouse,
    private storage: Storage,
    private schemaVersionHelper: SchemaVersionHelper,
    private persistedDocumentScheduler: PersistedDocumentScheduler,
    @Inject(APP_DEPLOYMENTS_ENABLED) private appDeploymentsEnabled: Boolean,
  ) {
    this.logger = logger.child({ source: 'AppDeployments' });
  }

  async getAppDeploymentById(args: {
    appDeploymentId: string;
  }): Promise<AppDeploymentRecord | null> {
    this.logger.debug('get app deployment by id (appDeploymentId=%s)', args.appDeploymentId);

    const record = await this.pool.maybeOne<unknown>(
      sql`
        SELECT
          ${appDeploymentFields}
        FROM
          "app_deployments"
        WHERE
          "id" = ${args.appDeploymentId}
      `,
    );

    if (!record) {
      return null;
    }

    return AppDeploymentModel.parse(record);
  }

  async findAppDeployment(args: {
    targetId: string;
    name: string;
    version: string;
  }): Promise<AppDeploymentRecord | null> {
    this.logger.debug(
      'find app deployment (targetId=%s, appName=%s, appVersion=%s)',
      args.targetId,
      args.name,
      args.version,
    );

    const record = await this.pool.maybeOne<unknown>(
      sql`
        SELECT
          ${appDeploymentFields}
        FROM
          "app_deployments"
        WHERE
          "target_id" = ${args.targetId}
          AND "name" = ${args.name}
          AND "version" = ${args.version}
      `,
    );

    if (record === null) {
      this.logger.debug(
        'no app deployment found (targetId=%s, appName=%s, appVersion=%s)',
        args.targetId,
        args.name,
        args.version,
      );
      return null;
    }

    const appDeployment = AppDeploymentModel.parse(record);

    this.logger.debug(
      'app deployment found (targetId=%s, appName=%s, appVersion=%s, deploymentId=%s)',
      args.targetId,
      args.name,
      args.version,
      appDeployment.id,
    );

    return appDeployment;
  }

  async createAppDeployment(args: {
    organizationId: string;
    targetId: string;
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    this.logger.debug(
      'create app deployment (targetId=%s, appName=%s, appVersion=%s)',
      args.targetId,
      args.appDeployment.name,
      args.appDeployment.version,
    );

    if (this.appDeploymentsEnabled === false) {
      const organization = await this.storage.getOrganization({
        organizationId: args.organizationId,
      });
      if (organization.featureFlags.appDeployments === false) {
        this.logger.debug(
          'organization has no access to app deployments (targetId=%s, appName=%s, appVersion=%s)',
          args.targetId,
          args.appDeployment.name,
          args.appDeployment.version,
        );
        return {
          type: 'error' as const,
          error: {
            message: noAccessToAppDeploymentsMessage,
            details: null,
          },
        };
      }
    }

    const nameValidationResult = AppDeploymentNameModel.safeParse(args.appDeployment.name);
    const versionValidationResult = AppDeploymentVersionModel.safeParse(args.appDeployment.version);

    if (nameValidationResult.success === false || versionValidationResult.success === false) {
      this.logger.debug(
        'app deployment input validation failed (targetId=%s, appName=%s, appVersion=%s)',
        args.targetId,
        args.appDeployment.name,
        args.appDeployment.version,
      );
      return {
        type: 'error' as const,
        error: {
          message: 'Invalid input',
          details: {
            appName: nameValidationResult.error?.issues[0].message ?? null,
            appVersion: versionValidationResult.error?.issues[0].message ?? null,
          },
        },
      };
    }

    try {
      const result = await this.pool.maybeOne(
        sql`
          INSERT INTO "app_deployments" (
            "target_id"
            , "name"
            , "version"
          )
          VALUES (
            ${args.targetId}
            , ${args.appDeployment.name}
            , ${args.appDeployment.version}
          )
          RETURNING
            ${appDeploymentFields}
        `,
      );

      if (result === null) {
        return {
          type: 'error' as const,
          error: {
            message: 'App deployment already exists',
            details: null,
          },
        };
      }

      return {
        type: 'success' as const,
        appDeployment: AppDeploymentModel.parse(result),
      };
    } catch (err) {
      if (err instanceof UniqueIntegrityConstraintViolationError) {
        const appDeployment = await this.findAppDeployment({
          targetId: args.targetId,
          name: args.appDeployment.name,
          version: args.appDeployment.version,
        });

        if (!appDeployment) {
          throw new Error('Invalid state. app deployment not found after insert failed');
        }

        // In case the deployment already exists, we return the existing deployment.
        // That makes re-running CI/CD pipelines easier for re-deployments of older apps.
        // The CLI/Clients that try to publish a deployment should check the app deployment status
        // and not try to send documents if the status is 'active'

        return {
          type: 'success' as const,
          appDeployment,
        };
      }

      throw err;
    }
  }

  async addDocumentsToAppDeployment(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    appDeployment: {
      name: string;
      version: string;
    };
    operations: ReadonlyArray<{
      hash: string;
      body: string;
    }>;
  }) {
    if (this.appDeploymentsEnabled === false) {
      const organization = await this.storage.getOrganization({
        organizationId: args.organizationId,
      });
      if (organization.featureFlags.appDeployments === false) {
        this.logger.debug(
          'organization has no access to app deployments (targetId=%s, appName=%s, appVersion=%s)',
        );

        return {
          type: 'error' as const,
          error: {
            message: noAccessToAppDeploymentsMessage,
            details: null,
          },
        };
      }
    }

    // todo: validate input

    const appDeployment = await this.findAppDeployment({
      targetId: args.targetId,
      name: args.appDeployment.name,
      version: args.appDeployment.version,
    });

    if (appDeployment === null) {
      return {
        type: 'error' as const,
        error: {
          message: 'App deployment not found',
          details: null,
        },
      };
    }

    if (appDeployment.activatedAt !== null) {
      return {
        type: 'error' as const,
        error: {
          message: 'App deployment has already been activated and is locked for modifications',
          details: null,
        },
      };
    }

    if (args.operations.length !== 0) {
      const latestSchemaVersion = await this.storage.getMaybeLatestValidVersion({
        targetId: args.targetId,
      });

      if (latestSchemaVersion === null) {
        return {
          type: 'error' as const,
          error: {
            // TODO: better error message with links to docs
            message: 'No schema has been published yet',
            details: null,
          },
        };
      }

      const compositeSchemaSdl = await this.schemaVersionHelper.getCompositeSchemaSdl({
        ...latestSchemaVersion,
        organizationId: args.organizationId,
        projectId: args.projectId,
        targetId: args.targetId,
      });
      if (compositeSchemaSdl === null) {
        // No valid schema found.
        return {
          type: 'error' as const,
          error: {
            message: 'Composite schema not found',
            details: null,
          },
        };
      }

      const result = await this.persistedDocumentScheduler.processBatch({
        schemaSdl: compositeSchemaSdl,
        targetId: args.targetId,
        appDeployment: {
          id: appDeployment.id,
          name: args.appDeployment.name,
          version: args.appDeployment.version,
        },
        documents: args.operations,
      });

      if (result.type === 'error') {
        return {
          type: 'error' as const,
          error: result.error,
        };
      }
    }

    return {
      type: 'success' as const,
      appDeployment,
    };
  }

  async activateAppDeployment(args: {
    organizationId: string;
    targetId: string;
    appDeployment: {
      name: string;
      version: string;
    };
  }) {
    this.logger.debug('activate app deployment (targetId=%s, appName=%s, appVersion=%s)');

    if (this.appDeploymentsEnabled === false) {
      const organization = await this.storage.getOrganization({
        organizationId: args.organizationId,
      });
      if (organization.featureFlags.appDeployments === false) {
        this.logger.debug(
          'organization has no access to app deployments (targetId=%s, appName=%s, appVersion=%s)',
        );

        return {
          type: 'error' as const,
          message: noAccessToAppDeploymentsMessage,
        };
      }
    }

    const appDeployment = await this.findAppDeployment({
      targetId: args.targetId,
      name: args.appDeployment.name,
      version: args.appDeployment.version,
    });

    if (appDeployment === null) {
      this.logger.debug(
        'activate app deployment failed as it does not exist. (targetId=%s, appName=%s, appVersion=%s)',
      );
      return {
        type: 'error' as const,
        message: 'App deployment not found',
      };
    }

    if (appDeployment.retiredAt !== null) {
      this.logger.debug(
        'app deployment is already retired. (targetId=%s, appName=%s, appVersion=%s)',
      );

      return {
        type: 'error' as const,
        message: 'App deployment is retired',
      };
    }

    if (appDeployment.activatedAt !== null) {
      this.logger.debug(
        'app deployment is already active. (targetId=%s, appName=%s, appVersion=%s)',
      );

      return {
        type: 'success' as const,
        isSkipped: true,
        appDeployment,
      };
    }

    for (const s3 of this.s3) {
      const result = await s3.client.fetch(
        [
          s3.endpoint,
          s3.bucket,
          buildAppDeploymentIsEnabledKey(
            appDeployment.targetId,
            appDeployment.name,
            appDeployment.version,
          ),
        ].join('/'),
        {
          method: 'PUT',
          body: '1',
          headers: {
            'content-type': 'text/plain',
          },
          aws: {
            signQuery: true,
          },
        },
      );

      if (result.statusCode !== 200) {
        throw new Error(`Failed to enable app deployment: ${result.statusMessage}`);
      }
    }

    const updatedAppDeployment = await this.pool
      .maybeOne(
        sql`
          UPDATE
            "app_deployments"
          SET
            "activated_at" = NOW()
          WHERE
            "id" = ${appDeployment.id}
          RETURNING
            ${appDeploymentFields}
        `,
      )
      .then(result => AppDeploymentModel.parse(result));

    await this.clickhouse.query({
      query: cSql`
        INSERT INTO "app_deployments" (
          "target_id"
          , "app_deployment_id"
          , "app_name"
          , "app_version"
          , "is_active"
        )
        VALUES (
          ${appDeployment.targetId}
          , ${appDeployment.id}
          , ${appDeployment.name}
          , ${appDeployment.version}
          , True
        );
      `,
      timeout: 10000,
      queryId: 'app-deployment-activate',
    });

    this.logger.debug(
      'activate app deployment succeeded. (targetId=%s, appName=%s, appVersion=%s)',
    );

    return {
      type: 'success' as const,
      isSkipped: false,
      appDeployment: updatedAppDeployment,
    };
  }

  async retireAppDeployment(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    appDeployment: {
      name: string;
      version: string;
    };
    force?: boolean;
  }): Promise<
    | { type: 'success'; appDeployment: AppDeploymentRecord }
    | {
        type: 'error';
        message: string;
        protectionDetails?: {
          lastUsed: Date | null;
          daysSinceLastUsed: number | null;
          requiredMinDaysInactive: number;
          currentTrafficPercentage: number | null;
          maxTrafficPercentage: number;
        };
      }
  > {
    this.logger.debug('retire app deployment (targetId=%s, appName=%s, appVersion=%s)');

    if (this.appDeploymentsEnabled === false) {
      const organization = await this.storage.getOrganization({
        organizationId: args.organizationId,
      });
      if (organization.featureFlags.appDeployments === false) {
        this.logger.debug(
          'organization has no access to app deployments (targetId=%s, appName=%s, appVersion=%s)',
        );

        return {
          type: 'error' as const,
          message: noAccessToAppDeploymentsMessage,
        };
      }
    }

    const appDeployment = await this.findAppDeployment({
      targetId: args.targetId,
      name: args.appDeployment.name,
      version: args.appDeployment.version,
    });

    if (appDeployment === null) {
      this.logger.debug(
        'retire app deployment failed as it does not exist. (targetId=%s, appName=%s, appVersion=%s)',
        args.targetId,
        args.appDeployment.name,
        args.appDeployment.version,
      );
      return {
        type: 'error' as const,
        message: 'App deployment not found',
      };
    }

    if (appDeployment.activatedAt === null) {
      this.logger.debug(
        'retire app deployment failed as it was never active. (targetId=%s, appDeploymentId=%s)',
        args.targetId,
        appDeployment.id,
      );
      return {
        type: 'error' as const,
        message: 'App deployment is not active',
      };
    }

    if (appDeployment.retiredAt !== null) {
      this.logger.debug(
        'retire app deployment failed as it is already retired. (targetId=%s, appDeploymentId=%s)',
        args.targetId,
        appDeployment.id,
      );

      return {
        type: 'error' as const,
        message: 'App deployment is already retired',
      };
    }

    // Check protection settings if force flag is not set
    if (args.force !== true) {
      const targetSettings = await this.storage.getTargetSettings({
        organizationId: args.organizationId,
        targetId: args.targetId,
        projectId: args.projectId,
      });

      if (targetSettings.appDeploymentProtection.isEnabled) {
        const protectionConfig = targetSettings.appDeploymentProtection;

        // Get last used timestamp
        const lastUsedResults = await this.getLastUsedForAppDeployments({
          appDeploymentIds: [appDeployment.id],
        });
        const lastUsedStr =
          lastUsedResults.find(r => r.appDeploymentId === appDeployment.id)?.lastUsed ?? null;
        const lastUsed = lastUsedStr ? new Date(lastUsedStr) : null;

        // Calculate days since last used
        let daysSinceLastUsed: number | null = null;
        if (lastUsed) {
          const now = new Date();
          const diffMs = now.getTime() - lastUsed.getTime();
          daysSinceLastUsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        // Get traffic percentage using configured period
        const trafficData = await this.getAppDeploymentTrafficPercentage({
          targetId: args.targetId,
          appName: args.appDeployment.name,
          appVersion: args.appDeployment.version,
          periodDays: protectionConfig.trafficPeriodDays,
        });
        const trafficPercentage = trafficData?.trafficPercentage ?? null;

        // Check protection rules:
        // 1. App deployment must have been created at least minDaysSinceCreation days ago
        // 2. If usage data exists, check inactivity and traffic criteria based on ruleLogic:
        //    AND: Both conditions must pass (inactive enough AND low traffic)
        //    OR: Either condition can pass (inactive enough OR low traffic)

        let isBlocked = false;
        let blockReason = '';

        const createdAt = new Date(appDeployment.createdAt);
        const daysSinceCreation = differenceInCalendarDays(new Date(), createdAt);

        if (daysSinceCreation < protectionConfig.minDaysSinceCreation) {
          isBlocked = true;
          blockReason = `App deployment was created ${daysSinceCreation} days ago, but requires at least ${protectionConfig.minDaysSinceCreation} days since creation`;
        } else if (lastUsed !== null) {
          const inactiveEnough =
            daysSinceLastUsed === null || daysSinceLastUsed >= protectionConfig.minDaysInactive;
          const lowTraffic =
            trafficPercentage === null ||
            trafficPercentage <= protectionConfig.maxTrafficPercentage;

          if (protectionConfig.ruleLogic === 'OR') {
            // OR logic: retirement allowed if EITHER condition is met
            isBlocked = !inactiveEnough && !lowTraffic;
            if (isBlocked) {
              blockReason = `App deployment was used ${daysSinceLastUsed} days ago (requires ${protectionConfig.minDaysInactive}) and has ${trafficPercentage?.toFixed(2)}% traffic (max ${protectionConfig.maxTrafficPercentage}%)`;
            }
          } else {
            // AND logic (default): retirement allowed only if BOTH conditions are met
            if (!inactiveEnough) {
              isBlocked = true;
              blockReason = `App deployment was used ${daysSinceLastUsed} days ago, but requires ${protectionConfig.minDaysInactive} days of inactivity`;
            } else if (!lowTraffic) {
              isBlocked = true;
              blockReason = `App deployment has ${trafficPercentage?.toFixed(2)}% of traffic, but maximum allowed is ${protectionConfig.maxTrafficPercentage}%`;
            }
          }
        }

        if (isBlocked) {
          this.logger.debug(
            'retire app deployment blocked by protection settings. (targetId=%s, appDeploymentId=%s, reason=%s)',
            args.targetId,
            appDeployment.id,
            blockReason,
          );

          return {
            type: 'error' as const,
            message: `App deployment retirement blocked by protection settings. ${blockReason}.`,
            protectionDetails: {
              lastUsed,
              daysSinceLastUsed,
              requiredMinDaysInactive: protectionConfig.minDaysInactive,
              currentTrafficPercentage: trafficPercentage,
              maxTrafficPercentage: protectionConfig.maxTrafficPercentage,
            },
          };
        }
      }
    }

    for (const s3 of this.s3) {
      const result = await s3.client.fetch(
        [
          s3.endpoint,
          s3.bucket,
          buildAppDeploymentIsEnabledKey(
            appDeployment.targetId,
            appDeployment.name,
            appDeployment.version,
          ),
        ].join('/'),
        {
          method: 'DELETE',
          aws: {
            signQuery: true,
          },
        },
      );

      /** We receive a 204 status code if the DELETE operation was successful */
      if (result.statusCode !== 204) {
        this.logger.error(
          'Failed to disable app deployment (organizationId=%s, targetId=%s, appDeploymentId=%s, statusCode=%s)',
          args.organizationId,
          args.targetId,
          appDeployment.id,
          result.statusCode,
        );
        throw new Error(
          `Failed to disable app deployment. Request failed with status code "${result.statusMessage}".`,
        );
      }
    }

    await this.clickhouse.query({
      query: cSql`
        INSERT INTO "app_deployments" (
          "target_id"
          , "app_deployment_id"
          , "app_name"
          , "app_version"
          , "is_active"
        )
        VALUES (
          ${appDeployment.targetId}
          , ${appDeployment.id}
          , ${appDeployment.name}
          , ${appDeployment.version}
          , False
        );
      `,
      timeout: 10000,
      queryId: 'app-deployment-retire',
    });

    const updatedAppDeployment = await this.pool
      .one(
        sql`
          UPDATE
            "app_deployments"
          SET
            "retired_at" = NOW()
          WHERE
            "id" = ${appDeployment.id}
          RETURNING
            ${appDeploymentFields}
        `,
      )
      .then(result => AppDeploymentModel.parse(result));

    this.logger.debug(
      'retire app deployment succeeded. (targetId=%s, appName=%s, appVersion=%s, appDeploymentId=%s)',
      args.targetId,
      args.appDeployment.name,
      args.appDeployment.version,
      appDeployment.id,
    );

    return {
      type: 'success' as const,
      appDeployment: updatedAppDeployment,
    };
  }

  async getPaginatedAppDeployments(args: {
    targetId: string;
    cursor: string | null;
    first: number | null;
  }) {
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;
    const cursor = args.cursor ? decodeCreatedAtAndUUIDIdBasedCursor(args.cursor) : null;

    const result = await this.pool.query<unknown>(sql`
      SELECT
        ${appDeploymentFields}
      FROM
        "app_deployments"
      WHERE
        "target_id" = ${args.targetId}
        ${
          cursor
            ? sql`
                AND (
                  (
                    "created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "created_at" < ${cursor.createdAt}
                )
              `
            : sql``
        }
      ORDER BY "created_at" DESC, "id"
      LIMIT ${limit + 1}
    `);

    let items = result.rows.map(row => {
      const node = AppDeploymentModel.parse(row);

      return {
        cursor: encodeCreatedAtAndUUIDIdBasedCursor(node),
        node,
      };
    });

    const hasNextPage = items.length > limit;

    items = items.slice(0, limit);

    return {
      edges: items,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        endCursor: items[items.length - 1]?.cursor ?? '',
        startCursor: items[0]?.cursor ?? '',
      },
    };
  }

  async getPaginatedGraphQLDocuments(args: {
    appDeploymentId: string;
    cursor: string | null;
    first: number | null;
    operationName: string;
    schemaCoordinates: string[] | null;
  }) {
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;
    const cursor = args.cursor ? decodeHashBasedCursor(args.cursor) : null;
    const operationName = args.operationName.trim();
    const schemaCoordinates = args.schemaCoordinates;
    const result = await this.clickhouse.query({
      query: cSql`
        SELECT
          "app_deployment_documents"."document_hash" AS "hash"
          , "app_deployment_documents"."document_body" AS "body"
          , "app_deployment_documents"."operation_name" AS "operationName"
          , "app_deployment_documents"."hash" AS "internalHash"
        FROM
          "app_deployment_documents"
        WHERE
          "app_deployment_id" = ${args.appDeploymentId}
          ${cursor?.id ? cSql`AND "document_hash" > ${cursor.id}` : cSql``}
          ${operationName.length ? cSql`AND "operation_name" ILIKE CONCAT('%', ${operationName}, '%')` : cSql``}
          ${schemaCoordinates?.length ? cSql`AND hasAny("schema_coordinates", ${cSql.array(schemaCoordinates, 'String')})` : cSql``}
        ORDER BY "app_deployment_id", ${operationName.length ? cSql`positionCaseInsensitive("operation_name", ${operationName}) ASC, "operation_name" ASC` : cSql`"document_hash"`}
        LIMIT 1 BY "app_deployment_id", "document_hash"
        LIMIT ${cSql.raw(String(limit + 1))}
      `,
      queryId: 'get-paginated-graphql-documents',
      timeout: 20_000,
    });

    let items = result.data.map(row => {
      const node = GraphQLDocumentModel.parse(row);

      return {
        cursor: encodeHashBasedCursor({ id: node.hash }),
        node,
      };
    });

    const hasNextPage = items.length > limit;

    items = items.slice(0, limit);

    return {
      edges: items,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        endCursor: items[items.length - 1]?.cursor ?? '',
        startCursor: items[0]?.cursor ?? '',
      },
    };
  }

  async getDocumentCountForAppDeployments(args: { appDeploymentIds: Array<string> }) {
    const result = await this.clickhouse.query({
      query: cSql`
        SELECT
          "app_deployment_id" AS "appDeploymentId"
          , count() AS "count"
        FROM
          "app_deployment_documents"
        WHERE
          "app_deployment_id" IN (${cSql.array(args.appDeploymentIds, 'String')})
        GROUP BY
          "app_deployment_id"
      `,
      queryId: 'get-document-count-for-app-deployments',
      timeout: 20_000,
    });

    const model = z.array(
      z.object({
        appDeploymentId: z.string(),
        count: z.string().transform(str => parseInt(str, 10)),
      }),
    );

    return model.parse(result.data);
  }

  async getLastUsedForAppDeployments(args: { appDeploymentIds: Array<string> }) {
    const result = await this.clickhouse.query({
      query: cSql`
        SELECT
          "filtered_app_deployments"."app_deployment_id" AS "appDeploymentId"
          , formatDateTimeInJodaSyntax(max("app_deployment_usage"."last_request"), 'yyyy-MM-dd\\'T\\'HH:mm:ss.000000+00:00') AS "lastUsed"
        FROM (
          SELECT
            "target_id"
            , "app_deployment_id"
            , "app_name"
            , "app_version"
          FROM
            "app_deployments"
          PREWHERE
            "app_deployment_id" IN (${cSql.array(args.appDeploymentIds, 'String')})
          ORDER BY ("target_id", "app_deployment_id", "app_name", "app_version")
          LIMIT 1 BY "app_deployment_id"
        ) AS "filtered_app_deployments"
        INNER JOIN "app_deployment_usage" ON (
            "filtered_app_deployments"."target_id" = "app_deployment_usage"."target_id"
            AND "filtered_app_deployments"."app_name" = "app_deployment_usage"."app_name"
            AND "filtered_app_deployments"."app_version" = "app_deployment_usage"."app_version"
          )
        GROUP BY "filtered_app_deployments"."app_deployment_id"
      `,
      queryId: 'get-document-count-for-app-deployments',
      timeout: 20_000,
    });

    const model = z.array(
      z.object({
        appDeploymentId: z.string(),
        lastUsed: z.string(),
      }),
    );

    return model.parse(result.data);
  }

  private async getStaleDeploymentIds(args: {
    targetId: string;
    name: string | null;
    lastUsedBefore: string | null;
    neverUsedAndCreatedBefore: string | null;
  }): Promise<string[]> {
    const { targetId, name, lastUsedBefore, neverUsedAndCreatedBefore } = args;

    if (!lastUsedBefore && !neverUsedAndCreatedBefore) {
      return [];
    }

    const lastUsedCondition = lastUsedBefore
      ? cSql`(target_id, app_name, app_version) IN (
          SELECT target_id, app_name, app_version
          FROM app_deployment_usage
          WHERE target_id = ${targetId}
          GROUP BY target_id, app_name, app_version
          HAVING max(last_request) < parseDateTimeBestEffort(${lastUsedBefore})
        )`
      : null;

    const neverUsedCondition = neverUsedAndCreatedBefore
      ? cSql`(target_id, app_name, app_version) NOT IN (
          SELECT DISTINCT target_id, app_name, app_version
          FROM app_deployment_usage
          WHERE target_id = ${targetId}
        )`
      : null;

    const staleCondition = (
      lastUsedCondition && neverUsedCondition
        ? cSql`(${lastUsedCondition} OR ${neverUsedCondition})`
        : (lastUsedCondition ?? neverUsedCondition)
    )!;

    let result;
    try {
      result = await this.clickhouse.query({
        query: cSql`
          SELECT app_deployment_id FROM app_deployments
          WHERE target_id = ${targetId}
            ${name ? cSql`AND app_name ILIKE ${'%' + name + '%'}` : cSql``}
            AND ${staleCondition}
        `,
        queryId: 'get-stale-deployment-ids',
        timeout: 30_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to query stale deployment IDs from clickhouse (targetId=%s, lastUsedBefore=%s, neverUsedAndCreatedBefore=%s): %s',
        targetId,
        lastUsedBefore,
        neverUsedAndCreatedBefore,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    const model = z.array(z.object({ app_deployment_id: z.string() }));
    const parsed = model.parse(result.data);

    this.logger.debug(
      'found %d stale deployment candidates from clickhouse (targetId=%s)',
      parsed.length,
      targetId,
    );

    return parsed.map(row => row.app_deployment_id);
  }

  async getAffectedAppDeploymentsBySchemaCoordinates(args: {
    targetId: string;
    schemaCoordinates: string[];
    firstDeployments?: number;
    afterCursor?: string;
    firstOperations?: number;
    excludedAppDeploymentNames?: string[] | null;
  }) {
    const emptyResult = {
      deployments: [],
      totalDeployments: 0,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: '',
        endCursor: '',
      },
    };

    if (args.schemaCoordinates.length === 0) {
      return emptyResult;
    }

    this.logger.debug(
      'Finding affected app deployments by schema coordinates (targetId=%s, coordinateCount=%d)',
      args.targetId,
      args.schemaCoordinates.length,
    );

    // Get active deployments
    let activeDeploymentsResult;
    try {
      activeDeploymentsResult = await this.clickhouse.query({
        query: cSql`
          SELECT
            app_deployment_id AS "appDeploymentId",
            any(app_name) AS "appName",
            any(app_version) AS "appVersion"
          FROM app_deployments
          PREWHERE
            target_id = ${args.targetId}
            ${
              args.excludedAppDeploymentNames?.length
                ? cSql`AND app_name NOT IN (${cSql.array(args.excludedAppDeploymentNames, 'String')})`
                : cSql``
            }
          GROUP BY app_deployment_id
          HAVING min(is_active) = True
        `,
        queryId: 'get-active-app-deployment-ids',
        timeout: 30_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to query active app deployments from ClickHouse (targetId=%s): %s',
        args.targetId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    const ActiveDeploymentModel = z.object({
      appDeploymentId: z.string(),
      appName: z.string(),
      appVersion: z.string(),
    });

    let activeDeployments = z.array(ActiveDeploymentModel).parse(activeDeploymentsResult.data);

    if (activeDeployments.length === 0) {
      this.logger.debug('No active app deployments found (targetId=%s)', args.targetId);
      return emptyResult;
    }

    const deploymentIdToInfo = new Map(
      activeDeployments.map(d => [d.appDeploymentId, { name: d.appName, version: d.appVersion }]),
    );

    // Count total affected deployments
    let countResult;
    try {
      countResult = await this.clickhouse.query({
        query: cSql`
          SELECT uniq(app_deployment_id) AS "total"
          FROM app_deployment_documents
          PREWHERE app_deployment_id IN (
            SELECT app_deployment_id
            FROM app_deployments
            PREWHERE
              target_id = ${args.targetId}
              ${
                args.excludedAppDeploymentNames?.length
                  ? cSql`AND app_name NOT IN (${cSql.array(args.excludedAppDeploymentNames, 'String')})`
                  : cSql``
              }
            GROUP BY app_deployment_id
            HAVING min(is_active) = True
          )
          WHERE hasAny(schema_coordinates, ${cSql.array(args.schemaCoordinates, 'String')})
        `,
        queryId: 'count-affected-app-deployments',
        timeout: 30_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to count affected deployments from ClickHouse (targetId=%s): %s',
        args.targetId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    const totalDeployments =
      z.array(z.object({ total: z.coerce.number() })).parse(countResult.data)[0]?.total ?? 0;

    if (totalDeployments === 0) {
      this.logger.debug(
        'No affected operations found (targetId=%s, coordinateCount=%d)',
        args.targetId,
        args.schemaCoordinates.length,
      );
      return emptyResult;
    }

    // Get paginated affected deployments
    const limit = args.firstDeployments;
    let affectedDeploymentIdsResult;
    try {
      affectedDeploymentIdsResult = await this.clickhouse.query({
        query: cSql`
          SELECT DISTINCT app_deployment_id AS "appDeploymentId"
          FROM app_deployment_documents
          PREWHERE app_deployment_id IN (
            SELECT app_deployment_id
            FROM app_deployments
            PREWHERE
              target_id = ${args.targetId}
              ${
                args.excludedAppDeploymentNames?.length
                  ? cSql`AND app_name NOT IN (${cSql.array(args.excludedAppDeploymentNames, 'String')})`
                  : cSql``
              }
            GROUP BY app_deployment_id
            HAVING min(is_active) = True
          )
          WHERE hasAny(schema_coordinates, ${cSql.array(args.schemaCoordinates, 'String')})
          ${args.afterCursor ? cSql`AND app_deployment_id > ${args.afterCursor}` : cSql``}
          ${limit ? cSql`ORDER BY app_deployment_id LIMIT ${cSql.raw(String(limit + 1))}` : cSql``}
        `,
        queryId: 'get-limited-affected-deployment-ids',
        timeout: 30_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to query affected deployment IDs from ClickHouse (targetId=%s): %s',
        args.targetId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    let affectedDeploymentIds = z
      .array(z.object({ appDeploymentId: z.string() }))
      .parse(affectedDeploymentIdsResult.data)
      .map(d => d.appDeploymentId);

    // Check if there are more results (only if limit is set)
    const hasNextPage = limit ? affectedDeploymentIds.length > limit : false;
    if (hasNextPage && limit) {
      affectedDeploymentIds = affectedDeploymentIds.slice(0, limit);
    }

    if (affectedDeploymentIds.length === 0) {
      return {
        deployments: [],
        totalDeployments,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: !!args.afterCursor,
          startCursor: '',
          endCursor: '',
        },
      };
    }

    const operationsLimit = args.firstOperations;

    // Get operation counts per deployment per coordinate
    let countsResult;
    try {
      countsResult = await this.clickhouse.query({
        query: cSql`
          SELECT
            app_deployment_id AS "appDeploymentId",
            coord AS "coordinate",
            count() AS "count"
          FROM app_deployment_documents
          ARRAY JOIN arrayIntersect(schema_coordinates, ${cSql.array(args.schemaCoordinates, 'String')}) AS coord
          PREWHERE app_deployment_id IN (
            SELECT app_deployment_id
            FROM app_deployments
            PREWHERE
              target_id = ${args.targetId}
              ${
                args.excludedAppDeploymentNames?.length
                  ? cSql`AND app_name NOT IN (${cSql.array(args.excludedAppDeploymentNames, 'String')})`
                  : cSql``
              }
            GROUP BY app_deployment_id
            HAVING min(is_active) = True
          )
          WHERE hasAny(schema_coordinates, ${cSql.array(args.schemaCoordinates, 'String')})
          GROUP BY app_deployment_id, coord
        `,
        queryId: 'count-affected-operations-by-coordinate',
        timeout: 30_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to count affected operations from ClickHouse (targetId=%s): %s',
        args.targetId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    const CountModel = z.object({
      appDeploymentId: z.string(),
      coordinate: z.string(),
      count: z.coerce.number(),
    });
    const counts = z.array(CountModel).parse(countsResult.data);

    // Build count map: deploymentId -> coordinate -> count
    const countMap = new Map<string, Map<string, number>>();
    for (const { appDeploymentId, coordinate, count } of counts) {
      let coordMap = countMap.get(appDeploymentId);
      if (!coordMap) {
        coordMap = new Map();
        countMap.set(appDeploymentId, coordMap);
      }
      coordMap.set(coordinate, count);
    }

    // Get limited operations per deployment (only fetch what we need)
    let affectedDocumentsResult;
    try {
      affectedDocumentsResult = await this.clickhouse.query({
        query: cSql`
          SELECT
            app_deployment_id AS "appDeploymentId",
            document_hash AS "hash",
            operation_name AS "operationName",
            arrayIntersect(schema_coordinates, ${cSql.array(args.schemaCoordinates, 'String')}) AS "matchingCoordinates"
          FROM app_deployment_documents
          PREWHERE app_deployment_id IN (
            SELECT app_deployment_id
            FROM app_deployments
            PREWHERE
              target_id = ${args.targetId}
              ${
                args.excludedAppDeploymentNames?.length
                  ? cSql`AND app_name NOT IN (${cSql.array(args.excludedAppDeploymentNames, 'String')})`
                  : cSql``
              }
            GROUP BY app_deployment_id
            HAVING min(is_active) = True
          )
          WHERE hasAny(schema_coordinates, ${cSql.array(args.schemaCoordinates, 'String')})
          ${operationsLimit ? cSql`LIMIT ${cSql.raw(String(operationsLimit))} BY app_deployment_id` : cSql``}
        `,
        queryId: 'get-affected-app-deployments-by-coordinates',
        timeout: 30_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to query affected documents from ClickHouse (targetId=%s, deploymentCount=%d, coordinateCount=%d): %s',
        args.targetId,
        affectedDeploymentIds.length,
        args.schemaCoordinates.length,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    const AffectedDocumentModel = z.object({
      appDeploymentId: z.string(),
      hash: z.string(),
      operationName: z.string().transform(value => (value === '' ? null : value)),
      matchingCoordinates: z.array(z.string()),
    });

    const affectedDocuments = z.array(AffectedDocumentModel).parse(affectedDocumentsResult.data);

    // Group results by deployment and coordinate
    // deploymentId -> coordinate -> operations
    const deploymentCoordinateOperations = new Map<
      string,
      Map<string, Array<{ hash: string; name: string | null }>>
    >();

    for (const doc of affectedDocuments) {
      let coordinateMap = deploymentCoordinateOperations.get(doc.appDeploymentId);
      if (!coordinateMap) {
        coordinateMap = new Map();
        deploymentCoordinateOperations.set(doc.appDeploymentId, coordinateMap);
      }

      for (const coordinate of doc.matchingCoordinates) {
        const ops = coordinateMap.get(coordinate) ?? [];
        ops.push({
          hash: doc.hash,
          name: doc.operationName,
        });
        coordinateMap.set(coordinate, ops);
      }
    }

    const deployments = [];
    for (const deploymentId of affectedDeploymentIds) {
      const info = deploymentIdToInfo.get(deploymentId);
      const coordinateMap = deploymentCoordinateOperations.get(deploymentId);
      const coordCounts = countMap.get(deploymentId);

      if (info) {
        const totalOperations = coordCounts
          ? Array.from(coordCounts.values()).reduce((sum, count) => sum + count, 0)
          : 0;
        const operations: Record<string, Array<{ hash: string; name: string | null }>> = {};

        if (coordinateMap) {
          for (const [coordinate, ops] of coordinateMap) {
            operations[coordinate] = ops;
          }
        }

        deployments.push({
          appDeployment: {
            id: deploymentId,
            name: info.name,
            version: info.version,
          },
          affectedOperationsByCoordinate: operations,
          countByCoordinate: coordCounts ? Object.fromEntries(coordCounts) : {},
          totalOperationsByCoordinate: totalOperations,
        });
      }
    }

    this.logger.debug(
      'Found %d affected app deployments (returning: %d) with %d total operations (targetId=%s)',
      totalDeployments,
      deployments.length,
      affectedDocuments.length,
      args.targetId,
    );

    // Sort deployments by ID to match the order from query
    deployments.sort((a, b) => a.appDeployment.id.localeCompare(b.appDeployment.id));

    return {
      deployments,
      totalDeployments,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!args.afterCursor,
        startCursor: deployments[0]?.appDeployment.id ?? '',
        endCursor: deployments[deployments.length - 1]?.appDeployment.id ?? '',
      },
    };
  }

  async getActiveAppDeployments(args: {
    targetId: string;
    cursor: string | null;
    first: number | null;
    filter: {
      name?: string | null;
      lastUsedBefore?: string | null;
      neverUsedAndCreatedBefore?: string | null;
    };
  }) {
    this.logger.debug(
      'get active app deployments (targetId=%s, cursor=%s, first=%s, filter=%o)',
      args.targetId,
      args.cursor ? '[provided]' : '[none]',
      args.first,
      args.filter,
    );

    if (args.filter.lastUsedBefore && Number.isNaN(Date.parse(args.filter.lastUsedBefore))) {
      this.logger.debug(
        'invalid lastUsedBefore filter (targetId=%s, value=%s)',
        args.targetId,
        args.filter.lastUsedBefore,
      );
      throw new Error(
        `Invalid lastUsedBefore filter: "${args.filter.lastUsedBefore}" is not a valid date string`,
      );
    }
    if (
      args.filter.neverUsedAndCreatedBefore &&
      Number.isNaN(Date.parse(args.filter.neverUsedAndCreatedBefore))
    ) {
      this.logger.debug(
        'invalid neverUsedAndCreatedBefore filter (targetId=%s, value=%s)',
        args.targetId,
        args.filter.neverUsedAndCreatedBefore,
      );
      throw new Error(
        `Invalid neverUsedAndCreatedBefore filter: "${args.filter.neverUsedAndCreatedBefore}" is not a valid date string`,
      );
    }

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    let cursor = null;
    if (args.cursor) {
      try {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      } catch (error) {
        this.logger.error(
          'Failed to decode cursor for activeAppDeployments (targetId=%s, cursor=%s): %s',
          args.targetId,
          args.cursor,
          error instanceof Error ? error.message : String(error),
        );
        throw new Error(
          `Invalid cursor format for activeAppDeployments. Expected a valid pagination cursor.`,
        );
      }
    }

    // Get active deployments from db
    const hasDateFilter = args.filter.lastUsedBefore || args.filter.neverUsedAndCreatedBefore;
    const maxDeployments = 1000; // note: hard limit, only applies when no date filters are used

    // When date filters are present, query clickhouse first to identify stale deployment IDs
    // This avoids the LIMIT 1000 problem where old stale deployments get cut off
    let staleDeploymentIds;
    if (hasDateFilter) {
      staleDeploymentIds = await this.getStaleDeploymentIds({
        targetId: args.targetId,
        name: args.filter.name ?? null,
        lastUsedBefore: args.filter.lastUsedBefore ?? null,
        neverUsedAndCreatedBefore: args.filter.neverUsedAndCreatedBefore ?? null,
      });

      this.logger.debug(
        'found %d stale deployment candidates from clickhouse (targetId=%s)',
        staleDeploymentIds.length,
        args.targetId,
      );

      if (staleDeploymentIds.length === 0) {
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: cursor !== null,
            endCursor: '',
            startCursor: '',
          },
        };
      }
    }

    // Fetch deployments from postgres
    let activeDeployments;
    try {
      const activeDeploymentsResult = await this.pool.query<unknown>(sql`
        SELECT
          ${appDeploymentFields}
        FROM
          "app_deployments"
        WHERE
          ${
            staleDeploymentIds
              ? sql`"id" = ANY(${sql.array(staleDeploymentIds, 'uuid')})`
              : sql`"target_id" = ${args.targetId}
              ${args.filter.name ? sql`AND "name" ILIKE ${'%' + args.filter.name + '%'}` : sql``}`
          }
          AND "activated_at" IS NOT NULL
          AND "retired_at" IS NULL
        ORDER BY "created_at" DESC, "id"
        ${staleDeploymentIds ? sql`` : sql`LIMIT ${maxDeployments}`}
      `);

      activeDeployments = activeDeploymentsResult.rows.map(row => AppDeploymentModel.parse(row));
    } catch (error) {
      this.logger.error(
        'Failed to query active deployments from PostgreSQL (targetId=%s): %s',
        args.targetId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    this.logger.debug(
      'found %d active deployments for target (targetId=%s)',
      activeDeployments.length,
      args.targetId,
    );

    if (activeDeployments.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: cursor !== null,
          endCursor: '',
          startCursor: '',
        },
      };
    }

    // Get lastUsed data from clickhouse for all active deployment IDs
    const deploymentIds = activeDeployments.map(d => d.id);
    let usageData;
    try {
      usageData = await this.getLastUsedForAppDeployments({
        appDeploymentIds: deploymentIds,
      });
    } catch (error) {
      this.logger.error(
        'Failed to query lastUsed data from ClickHouse (targetId=%s, deploymentCount=%d): %s',
        args.targetId,
        deploymentIds.length,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    // Create a map of deployment ID -> lastUsed date
    const lastUsedMap = new Map<string, string>();
    for (const usage of usageData) {
      lastUsedMap.set(usage.appDeploymentId, usage.lastUsed);
    }

    // Apply OR filter logic for date filters
    // If no date filters provided, return all active deployments (name filter already applied in SQL)
    const filteredDeployments = activeDeployments.filter(deployment => {
      // If no date filters, include all deployments
      if (!hasDateFilter) {
        return true;
      }

      const lastUsed = lastUsedMap.get(deployment.id);
      const hasBeenUsed = lastUsed !== undefined;

      // Check lastUsedBefore filter, deployment HAS been used AND was last used before the threshold
      if (args.filter.lastUsedBefore && hasBeenUsed) {
        const lastUsedDate = new Date(lastUsed);
        const thresholdDate = new Date(args.filter.lastUsedBefore);
        if (Number.isNaN(thresholdDate.getTime())) {
          throw new Error(
            `Invalid lastUsedBefore filter: "${args.filter.lastUsedBefore}" is not a valid date`,
          );
        }
        if (lastUsedDate < thresholdDate) {
          return true;
        }
      }

      // Check neverUsedAndCreatedBefore filter, deployment has NEVER been used AND was created before threshold
      if (args.filter.neverUsedAndCreatedBefore && !hasBeenUsed) {
        const createdAtDate = new Date(deployment.createdAt);
        const thresholdDate = new Date(args.filter.neverUsedAndCreatedBefore);
        if (Number.isNaN(thresholdDate.getTime())) {
          throw new Error(
            `Invalid neverUsedAndCreatedBefore filter: "${args.filter.neverUsedAndCreatedBefore}" is not a valid date`,
          );
        }
        if (createdAtDate < thresholdDate) {
          return true;
        }
      }

      return false;
    });

    this.logger.debug(
      'after filter: %d deployments match criteria (targetId=%s)',
      filteredDeployments.length,
      args.targetId,
    );

    // apply cursor-based pagination
    // Order is: created_at DESC, id ASC
    // Items after cursor have: smaller created_at OR (same created_at AND larger id)
    // Note: Compare ISO strings directly to preserve microsecond precision (JS Date loses it)
    let paginatedDeployments = filteredDeployments;
    if (cursor) {
      paginatedDeployments = filteredDeployments.filter(deployment => {
        if (deployment.createdAt < cursor.createdAt) return true;
        if (deployment.createdAt === cursor.createdAt && deployment.id > cursor.id) return true;
        return false;
      });
    }

    // Apply limit
    const hasNextPage = paginatedDeployments.length > limit;
    const items = paginatedDeployments.slice(0, limit).map(node => ({
      cursor: encodeCreatedAtAndUUIDIdBasedCursor(node),
      node,
    }));

    return {
      edges: items,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        endCursor: items[items.length - 1]?.cursor ?? '',
        startCursor: items[0]?.cursor ?? '',
      },
    };
  }

  async getAppDeploymentTrafficPercentage(args: {
    targetId: string;
    appName: string;
    appVersion: string;
    periodDays: number;
  }): Promise<{
    trafficPercentage: number;
    totalOperations: number;
    appDeploymentOperations: number;
  } | null> {
    const periodFrom = startOfDay(subDays(new Date(), args.periodDays));

    const periodTo = new Date();

    const result = await this.clickhouse.query({
      query: cSql`
        SELECT
          SUM(CASE WHEN "client_name" = ${args.appName} AND "client_version" = ${args.appVersion} THEN "total" ELSE 0 END) AS "appDeploymentOps"
          , SUM("total") AS "totalOps"
        FROM "operations_daily"
        WHERE
          "target" = ${args.targetId}
          AND "timestamp" >= parseDateTimeBestEffort(${periodFrom.toISOString()})
          AND "timestamp" <= parseDateTimeBestEffort(${periodTo.toISOString()})
      `,
      queryId: 'get-app-deployment-traffic-percentage',
      timeout: 20_000,
    });

    const model = z.array(
      z.object({
        appDeploymentOps: z.string().transform(str => parseInt(str, 10)),
        totalOps: z.string().transform(str => parseInt(str, 10)),
      }),
    );

    const parsed = model.parse(result.data);

    if (parsed.length === 0 || parsed[0].totalOps === 0) {
      return null;
    }

    const { appDeploymentOps, totalOps } = parsed[0];

    return {
      trafficPercentage: (appDeploymentOps / totalOps) * 100,
      totalOperations: totalOps,
      appDeploymentOperations: appDeploymentOps,
    };
  }
}

const appDeploymentFields = sql`
  "id"
  , "target_id" AS "targetId"
  , "name"
  , "version"
  , to_json("created_at") AS "createdAt"
  , to_json("activated_at") AS "activatedAt"
  , to_json("retired_at") AS "retiredAt"
`;

const AppDeploymentModel = z.intersection(
  z.object({
    id: z.string(),
    targetId: z.string(),
    name: z.string(),
    version: z.string(),
    createdAt: z.string(),
  }),
  z.union([
    // This is the case where the deployment is pending
    z.object({
      activatedAt: z.null(),
      retiredAt: z.null(),
    }),
    // This is the case where the deployment is active
    z.object({
      activatedAt: z.string(),
      retiredAt: z.null(),
    }),
    // This is the case where the deployment is retired
    z.object({
      activatedAt: z.string(),
      retiredAt: z.string(),
    }),
  ]),
);

const GraphQLDocumentModel = z.object({
  hash: z.string(),
  body: z.string(),
  operationName: z.string().transform(value => (value === '' ? null : value)),
  internalHash: z.string(),
});

export type AppDeploymentRecord = z.infer<typeof AppDeploymentModel>;

export type GraphQLDocumentRecord = z.infer<typeof GraphQLDocumentModel>;
