import { CONTEXT, createApplication, Provider, Scope } from 'graphql-modules';
import { Redis } from 'ioredis';
import { adminModule } from './modules/admin';
import { alertsModule } from './modules/alerts';
import { WEBHOOKS_CONFIG, WebhooksConfig } from './modules/alerts/providers/tokens';
import { appDeploymentsModule } from './modules/app-deployments';
import { APP_DEPLOYMENTS_ENABLED } from './modules/app-deployments/providers/app-deployments-enabled-token';
import { auditLogsModule } from './modules/audit-logs';
import { AuditLogRecorder } from './modules/audit-logs/providers/audit-log-recorder';
import { AuditLogS3Config } from './modules/audit-logs/providers/audit-logs-manager';
import { authModule } from './modules/auth';
import { Session } from './modules/auth/lib/authz';
import { cdnModule } from './modules/cdn';
import { AwsClient } from './modules/cdn/providers/aws';
import { CDN_CONFIG, CDNConfig } from './modules/cdn/providers/tokens';
import { collectionModule } from './modules/collection';
import { commerceModule } from './modules/commerce';
import {
  CommerceConfig,
  provideCommerceConfig,
} from './modules/commerce/providers/commerce-client';
import { integrationsModule } from './modules/integrations';
import {
  GITHUB_APP_CONFIG,
  GitHubApplicationConfig,
} from './modules/integrations/providers/github-integration-manager';
import { labModule } from './modules/lab';
import { oidcIntegrationsModule } from './modules/oidc-integrations';
import { OIDC_INTEGRATIONS_ENABLED } from './modules/oidc-integrations/providers/tokens';
import { operationsModule } from './modules/operations';
import { CLICKHOUSE_CONFIG, ClickHouseConfig } from './modules/operations/providers/tokens';
import { organizationModule } from './modules/organization';
import { schemaPolicyModule } from './modules/policy';
import {
  SCHEMA_POLICY_SERVICE_CONFIG,
  SchemaPolicyServiceConfig,
} from './modules/policy/providers/tokens';
import { projectModule } from './modules/project';
import { schemaModule } from './modules/schema';
import { ArtifactStorageWriter } from './modules/schema/providers/artifact-storage-writer';
import { provideSchemaModuleConfig, SchemaModuleConfig } from './modules/schema/providers/config';
import {
  SCHEMA_SERVICE_CONFIG,
  SchemaServiceConfig,
} from './modules/schema/providers/orchestrator/tokens';
import { sharedModule } from './modules/shared';
import { CryptoProvider, encryptionSecretProvider } from './modules/shared/providers/crypto';
import { DistributedCache } from './modules/shared/providers/distributed-cache';
import { Emails, EMAILS_ENDPOINT } from './modules/shared/providers/emails';
import { HttpClient } from './modules/shared/providers/http-client';
import { IdTranslator } from './modules/shared/providers/id-translator';
import {
  InMemoryRateLimiter,
  InMemoryRateLimitStore,
} from './modules/shared/providers/in-memory-rate-limiter';
import { Logger } from './modules/shared/providers/logger';
import { Mutex } from './modules/shared/providers/mutex';
import { PG_POOL_CONFIG } from './modules/shared/providers/pg-pool';
import { PrometheusConfig } from './modules/shared/providers/prometheus-config';
import { HivePubSub, PUB_SUB_CONFIG } from './modules/shared/providers/pub-sub';
import { REDIS_INSTANCE } from './modules/shared/providers/redis';
import { S3_CONFIG, type S3Config } from './modules/shared/providers/s3-config';
import { Storage } from './modules/shared/providers/storage';
import { WEB_APP_URL } from './modules/shared/providers/tokens';
import { supportModule } from './modules/support';
import { provideSupportConfig, SupportConfig } from './modules/support/providers/config';
import { targetModule } from './modules/target';
import { tokenModule } from './modules/token';
import { TOKENS_CONFIG, TokensConfig } from './modules/token/providers/tokens';

const modules = [
  sharedModule,
  authModule,
  organizationModule,
  projectModule,
  targetModule,
  schemaModule,
  operationsModule,
  tokenModule,
  labModule,
  integrationsModule,
  alertsModule,
  cdnModule,
  adminModule,
  commerceModule,
  oidcIntegrationsModule,
  schemaPolicyModule,
  collectionModule,
  appDeploymentsModule,
  auditLogsModule,
];

export function createRegistry({
  app,
  commerce,
  tokens,
  webhooks,
  schemaService,
  schemaPolicyService,
  logger,
  storage,
  clickHouse,
  redis,
  githubApp,
  cdn,
  s3,
  s3Mirror,
  s3AuditLogs,
  encryptionSecret,
  schemaConfig,
  supportConfig,
  emailsEndpoint,
  organizationOIDC,
  pubSub,
  appDeploymentsEnabled,
  prometheus,
}: {
  logger: Logger;
  storage: Storage;
  clickHouse: ClickHouseConfig;
  redis: Redis;
  commerce: CommerceConfig;
  tokens: TokensConfig;
  webhooks: WebhooksConfig;
  schemaService: SchemaServiceConfig;
  schemaPolicyService: SchemaPolicyServiceConfig;
  githubApp: GitHubApplicationConfig | null;
  cdn: CDNConfig | null;
  s3: {
    bucketName: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKeyId: string;
    sessionToken?: string;
  };
  s3Mirror: {
    bucketName: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKeyId: string;
    sessionToken?: string;
  } | null;
  s3AuditLogs: {
    bucketName: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKeyId: string;
    sessionToken?: string;
  } | null;
  encryptionSecret: string;
  app: {
    baseUrl: string;
  } | null;
  schemaConfig: SchemaModuleConfig;
  supportConfig: SupportConfig | null;
  emailsEndpoint?: string;
  organizationOIDC: boolean;
  pubSub: HivePubSub;
  appDeploymentsEnabled: boolean;
  prometheus: null | Record<string, unknown>;
}) {
  const s3Config: S3Config = [
    {
      client: new AwsClient({
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKeyId,
        sessionToken: s3.sessionToken,
        service: 's3',
      }),
      bucket: s3.bucketName,
      endpoint: s3.endpoint,
    },
  ];

  if (s3Mirror) {
    s3Config.push({
      client: new AwsClient({
        accessKeyId: s3Mirror.accessKeyId,
        secretAccessKey: s3Mirror.secretAccessKeyId,
        sessionToken: s3Mirror.sessionToken,
        service: 's3',
      }),
      bucket: s3Mirror.bucketName,
      endpoint: s3Mirror.endpoint,
    });
  }

  const artifactStorageWriter = new ArtifactStorageWriter(s3Config, logger);

  const auditLogS3Config = s3AuditLogs
    ? new AuditLogS3Config(
        new AwsClient({
          accessKeyId: s3AuditLogs.accessKeyId,
          secretAccessKey: s3AuditLogs.secretAccessKeyId,
          sessionToken: s3AuditLogs.sessionToken,
          service: 's3',
        }),
        s3.endpoint,
        s3.bucketName,
      )
    : new AuditLogS3Config(s3Config[0].client, s3Config[0].endpoint, s3Config[0].bucket);

  const providers: Provider[] = [
    AuditLogRecorder,
    HttpClient,
    IdTranslator,
    Mutex,
    DistributedCache,
    CryptoProvider,
    Emails,
    InMemoryRateLimitStore,
    InMemoryRateLimiter,
    {
      provide: AuditLogS3Config,
      useValue: auditLogS3Config,
    },
    {
      provide: ArtifactStorageWriter,
      useValue: artifactStorageWriter,
    },
    {
      provide: Logger,
      useValue: logger,
      scope: Scope.Singleton,
    },
    {
      provide: Storage,
      useValue: storage,
      scope: Scope.Singleton,
    },
    {
      provide: CLICKHOUSE_CONFIG,
      useValue: clickHouse,
      scope: Scope.Singleton,
    },
    {
      provide: TOKENS_CONFIG,
      useValue: tokens,
      scope: Scope.Singleton,
    },

    {
      provide: WEBHOOKS_CONFIG,
      useValue: webhooks,
      scope: Scope.Singleton,
    },
    {
      provide: SCHEMA_SERVICE_CONFIG,
      useValue: schemaService,
      scope: Scope.Singleton,
    },
    {
      provide: SCHEMA_POLICY_SERVICE_CONFIG,
      useValue: schemaPolicyService,
      scope: Scope.Singleton,
    },
    {
      provide: REDIS_INSTANCE,
      useValue: redis,
      scope: Scope.Singleton,
    },
    {
      provide: GITHUB_APP_CONFIG,
      useValue: githubApp,
      scope: Scope.Singleton,
    },
    {
      provide: CDN_CONFIG,
      useValue: cdn,
      scope: Scope.Singleton,
    },
    {
      provide: S3_CONFIG,
      useValue: s3Config,
      scope: Scope.Singleton,
    },
    {
      provide: OIDC_INTEGRATIONS_ENABLED,
      useValue: organizationOIDC,
      scope: Scope.Singleton,
    },
    {
      provide: APP_DEPLOYMENTS_ENABLED,
      useValue: appDeploymentsEnabled,
      scope: Scope.Singleton,
    },
    {
      provide: WEB_APP_URL,
      useValue: app?.baseUrl.replace(/\/$/, '') ?? 'http://localhost:3000',
      scope: Scope.Singleton,
    },
    {
      provide: PG_POOL_CONFIG,
      scope: Scope.Singleton,
      useValue: storage.pool,
    },
    { provide: PUB_SUB_CONFIG, scope: Scope.Singleton, useValue: pubSub },
    encryptionSecretProvider(encryptionSecret),
    provideSchemaModuleConfig(schemaConfig),
    provideCommerceConfig(commerce),
    {
      provide: Session,
      useFactory(context: { session: Session }) {
        return context.session;
      },
      scope: Scope.Operation,
      deps: [CONTEXT],
    },
    {
      provide: PrometheusConfig,
      useFactory() {
        return new PrometheusConfig(!!prometheus);
      },
    },
  ];

  if (emailsEndpoint) {
    providers.push({
      provide: EMAILS_ENDPOINT,
      useValue: emailsEndpoint,
      scope: Scope.Singleton,
    });
    modules.push(supportModule);
  }

  if (supportConfig) {
    providers.push(provideSupportConfig(supportConfig));
  }

  return createApplication({
    modules,
    providers,
  });
}
