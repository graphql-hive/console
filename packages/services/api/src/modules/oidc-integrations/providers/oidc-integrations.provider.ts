import dns from 'node:dns/promises';
import { Inject, Injectable, Scope } from 'graphql-modules';
import zod from 'zod';
import { maskToken } from '@hive/service-common';
import * as GraphQLSchema from '../../../__generated__/types';
import { OIDCIntegration } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { ResourceAssignmentGroup } from '../../organization/lib/resource-assignment-model';
import { ResourceAssignments } from '../../organization/providers/resource-assignments';
import { CryptoProvider } from '../../shared/providers/crypto';
import { Logger } from '../../shared/providers/logger';
import { PUB_SUB_CONFIG, type HivePubSub } from '../../shared/providers/pub-sub';
import { Storage } from '../../shared/providers/storage';
import { OIDCIntegrationDomain, OIDCIntegrationStore } from './oidc-integration.store';
import { OIDC_INTEGRATIONS_ENABLED } from './tokens';

const dnsList = [
  // Google
  '8.8.8.8',
  '8.8.4.4',
  // Cloudflare
  '1.1.1.1',
  '1.0.0.1',
];

@Injectable({
  global: true,
  scope: Scope.Operation,
})
export class OIDCIntegrationsProvider {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private crypto: CryptoProvider,
    private auditLog: AuditLogRecorder,
    @Inject(PUB_SUB_CONFIG) private pubSub: HivePubSub,
    @Inject(OIDC_INTEGRATIONS_ENABLED) private enabled: boolean,
    private session: Session,
    private resourceAssignments: ResourceAssignments,
    private oidcIntegrationStore: OIDCIntegrationStore,
  ) {
    this.logger = logger.child({ source: 'OIDCIntegrationsProvider' });
  }

  isEnabled() {
    return this.enabled;
  }

  async canViewerManageIntegrationForOrganization(organizationId: string) {
    if (this.isEnabled() === false) {
      return false;
    }

    return await this.session.canPerformAction({
      organizationId,
      action: 'oidc:modify',
      params: {
        organizationId,
      },
    });
  }

  async getOIDCIntegrationForOrganization(args: {
    organizationId: string;
    skipAccessCheck?: boolean;
  }): Promise<OIDCIntegration | null> {
    this.logger.debug(
      'getting oidc integration for organization (organizationId=%s)',
      args.organizationId,
    );
    if (this.isEnabled() === false) {
      this.logger.debug('oidc integrations are disabled.');
      return null;
    }

    if (!args.skipAccessCheck) {
      const canPerformAction = await this.session.canPerformAction({
        organizationId: args.organizationId,
        action: 'oidc:modify',
        params: {
          organizationId: args.organizationId,
        },
      });

      if (canPerformAction === false) {
        return null;
      }
    }

    return await this.storage.getOIDCIntegrationForOrganization({
      organizationId: args.organizationId,
    });
  }

  async getClientSecretPreview(integration: OIDCIntegration) {
    const decryptedSecret = this.crypto.decrypt(integration.encryptedClientSecret);
    return decryptedSecret.substring(decryptedSecret.length - 4);
  }

  async createOIDCIntegrationForOrganization(args: {
    organizationId: string;
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    authorizationEndpoint: string;
    additionalScopes: readonly string[];
  }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    await this.session.assertPerformAction({
      organizationId: args.organizationId,
      action: 'oidc:modify',
      params: {
        organizationId: args.organizationId,
      },
    });

    const organization = await this.storage.getOrganization({
      organizationId: args.organizationId,
    });

    if (!organization) {
      throw new Error(`Failed to locate organization ${args.organizationId}`);
    }

    const clientIdResult = OIDCIntegrationClientIdModel.safeParse(args.clientId);
    const clientSecretResult = OIDCClientSecretModel.safeParse(args.clientSecret);
    const tokenEndpointResult = OAuthAPIUrlModel.safeParse(args.tokenEndpoint);
    const userinfoEndpointResult = OAuthAPIUrlModel.safeParse(args.userinfoEndpoint);
    const authorizationEndpointResult = OAuthAPIUrlModel.safeParse(args.authorizationEndpoint);
    const additionalScopesResult = OIDCAdditionalScopesModel.safeParse(args.additionalScopes);

    if (
      clientIdResult.success &&
      clientSecretResult.success &&
      tokenEndpointResult.success &&
      userinfoEndpointResult.success &&
      authorizationEndpointResult.success &&
      additionalScopesResult.success
    ) {
      const creationResult = await this.storage.createOIDCIntegrationForOrganization({
        organizationId: args.organizationId,
        clientId: clientIdResult.data,
        encryptedClientSecret: this.crypto.encrypt(clientSecretResult.data),
        tokenEndpoint: tokenEndpointResult.data,
        userinfoEndpoint: userinfoEndpointResult.data,
        authorizationEndpoint: authorizationEndpointResult.data,
        additionalScopes: additionalScopesResult.data,
      });

      if (creationResult.type === 'ok') {
        await this.auditLog.record({
          eventType: 'OIDC_INTEGRATION_CREATED',
          organizationId: args.organizationId,
          metadata: {
            integrationId: creationResult.oidcIntegration.id,
          },
        });

        return creationResult;
      }

      return {
        type: 'error',
        message: creationResult.reason,
        fieldErrors: {
          clientId: null,
          clientSecret: null,
          tokenEndpoint: null,
          userinfoEndpoint: null,
          authorizationEndpoint: null,
          additionalScopes: null,
        },
      } as const;
    }

    return {
      type: 'error',
      reason: null,
      fieldErrors: {
        clientId: clientIdResult.success ? null : clientIdResult.error.issues[0].message,
        clientSecret: clientSecretResult.success
          ? null
          : clientSecretResult.error.issues[0].message,
        tokenEndpoint: tokenEndpointResult.success
          ? null
          : tokenEndpointResult.error.issues[0].message,
        userinfoEndpoint: userinfoEndpointResult.success
          ? null
          : userinfoEndpointResult.error.issues[0].message,
        authorizationEndpoint: authorizationEndpointResult.success
          ? null
          : authorizationEndpointResult.error.issues[0].message,
        additionalScopes: additionalScopesResult.success
          ? null
          : additionalScopesResult.error.issues[0].message,
      },
    } as const;
  }

  async updateOIDCIntegration(args: {
    oidcIntegrationId: string;
    clientId: string | null;
    clientSecret: string | null;
    tokenEndpoint: string | null;
    userinfoEndpoint: string | null;
    authorizationEndpoint: string | null;
    additionalScopes: readonly string[] | null;
  }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    const integration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (integration === null) {
      return {
        type: 'error',
        message: 'Integration not found.',
        fieldErrors: {
          clientId: null,
          clientSecret: null,
          oauthApiUrl: null,
        },
      } as const;
    }

    await this.session.assertPerformAction({
      action: 'oidc:modify',
      organizationId: integration.linkedOrganizationId,
      params: {
        organizationId: integration.linkedOrganizationId,
      },
    });

    const clientIdResult = maybe(OIDCIntegrationClientIdModel).safeParse(args.clientId);
    const clientSecretResult = maybe(OIDCClientSecretModel).safeParse(args.clientSecret);
    const tokenEndpointResult = maybe(OAuthAPIUrlModel).safeParse(args.tokenEndpoint);
    const userinfoEndpointResult = maybe(OAuthAPIUrlModel).safeParse(args.userinfoEndpoint);
    const authorizationEndpointResult = maybe(OAuthAPIUrlModel).safeParse(
      args.authorizationEndpoint,
    );
    const additionalScopesResult = maybe(OIDCAdditionalScopesModel).safeParse(
      args.additionalScopes,
    );

    if (
      clientIdResult.success &&
      clientSecretResult.success &&
      tokenEndpointResult.success &&
      userinfoEndpointResult.success &&
      authorizationEndpointResult.success &&
      additionalScopesResult.success
    ) {
      const oidcIntegration = await this.storage.updateOIDCIntegration({
        oidcIntegrationId: args.oidcIntegrationId,
        clientId: clientIdResult.data,
        encryptedClientSecret: clientSecretResult.data
          ? this.crypto.encrypt(clientSecretResult.data)
          : null,
        tokenEndpoint: tokenEndpointResult.data,
        userinfoEndpoint: userinfoEndpointResult.data,
        authorizationEndpoint: authorizationEndpointResult.data,
        additionalScopes: additionalScopesResult.data,
      });

      const redactedClientSecret = maskToken(oidcIntegration.clientId);
      const redactedTokenEndpoint = maskToken(oidcIntegration.tokenEndpoint);
      await this.auditLog.record({
        eventType: 'OIDC_INTEGRATION_UPDATED',
        organizationId: integration.linkedOrganizationId,
        metadata: {
          updatedFields: JSON.stringify({
            updateOIDCIntegration: true,
            clientId: args.clientId,
            clientSecret: redactedClientSecret,
            tokenEndpoint: redactedTokenEndpoint,
            userinfoEndpoint: args.userinfoEndpoint,
            authorizationEndpoint: args.authorizationEndpoint,
            additionalScopes: args.additionalScopes,
          }),
          integrationId: args.oidcIntegrationId,
        },
      });

      return {
        type: 'ok',
        oidcIntegration,
      } as const;
    }

    return {
      type: 'error',
      message: "Couldn't update integration.",
      fieldErrors: {
        clientId: clientIdResult.success ? null : clientIdResult.error.issues[0].message,
        clientSecret: clientSecretResult.success
          ? null
          : clientSecretResult.error.issues[0].message,
        tokenEndpoint: tokenEndpointResult.success
          ? null
          : tokenEndpointResult.error.issues[0].message,
        userinfoEndpoint: userinfoEndpointResult.success
          ? null
          : userinfoEndpointResult.error.issues[0].message,
        authorizationEndpoint: authorizationEndpointResult.success
          ? null
          : authorizationEndpointResult.error.issues[0].message,
        additionalScopes: additionalScopesResult.success
          ? null
          : additionalScopesResult.error.issues[0].message,
      },
    } as const;
  }

  async deleteOIDCIntegration(args: { oidcIntegrationId: string }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    const integration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (integration === null) {
      return {
        type: 'error',
        message: 'Integration not found.',
      } as const;
    }

    await this.session.assertPerformAction({
      organizationId: integration.linkedOrganizationId,
      action: 'oidc:modify',
      params: {
        organizationId: integration.linkedOrganizationId,
      },
    });

    await this.storage.deleteOIDCIntegration(args);

    await this.auditLog.record({
      eventType: 'OIDC_INTEGRATION_DELETED',
      organizationId: integration.linkedOrganizationId,
      metadata: {
        integrationId: args.oidcIntegrationId,
      },
    });

    return {
      type: 'ok',
      organizationId: integration.linkedOrganizationId,
    } as const;
  }

  async updateOIDCRestrictions(args: {
    oidcIntegrationId: string;
    oidcUserJoinOnly: boolean | null;
    oidcUserAccessOnly: boolean | null;
    requireInvitation: boolean | null;
  }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    const oidcIntegration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (oidcIntegration === null) {
      return {
        type: 'error',
        message: 'Integration not found.',
      } as const;
    }

    await this.session.assertPerformAction({
      organizationId: oidcIntegration.linkedOrganizationId,
      action: 'oidc:modify',
      params: {
        organizationId: oidcIntegration.linkedOrganizationId,
      },
    });

    return {
      type: 'ok',
      oidcIntegration: await this.storage.updateOIDCRestrictions(args),
    } as const;
  }

  async updateOIDCDefaultAssignedResources(args: {
    oidcIntegrationId: string;
    assignedResources: GraphQLSchema.ResourceAssignmentInput;
  }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    const oidcIntegration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (oidcIntegration === null) {
      return {
        type: 'error',
        message: 'Integration not found.',
      } as const;
    }

    await this.session.assertPerformAction({
      organizationId: oidcIntegration.linkedOrganizationId,
      action: 'oidc:modify',
      params: {
        organizationId: oidcIntegration.linkedOrganizationId,
      },
    });

    const assignedResources: ResourceAssignmentGroup =
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        oidcIntegration.linkedOrganizationId,
        args.assignedResources,
      );

    return {
      type: 'ok',
      oidcIntegration: await this.storage.updateOIDCDefaultAssignedResources({
        oidcIntegrationId: args.oidcIntegrationId,
        assignedResources,
      }),
    } as const;
  }

  async updateOIDCDefaultMemberRole(args: { oidcIntegrationId: string; roleId: string }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    const oidcIntegration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (oidcIntegration === null) {
      return {
        type: 'error',
        message: 'Integration not found.',
      } as const;
    }

    if (
      !(await this.session.canPerformAction({
        action: 'member:modify',
        organizationId: oidcIntegration.linkedOrganizationId,
        params: {
          organizationId: oidcIntegration.linkedOrganizationId,
        },
      }))
    ) {
      return {
        type: 'error',
        message: 'You do not have permission to update the default member role.',
      } as const;
    }

    await this.session.assertPerformAction({
      organizationId: oidcIntegration.linkedOrganizationId,
      action: 'oidc:modify',
      params: {
        organizationId: oidcIntegration.linkedOrganizationId,
      },
    });

    return {
      type: 'ok',
      oidcIntegration: await this.storage.updateOIDCDefaultMemberRole(args),
    } as const;
  }

  async getOIDCIntegrationById(args: { oidcIntegrationId: string }) {
    if (this.isEnabled() === false) {
      return {
        type: 'error',
        message: 'OIDC integrations are disabled.',
      } as const;
    }

    const integration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (integration === null) {
      return {
        type: 'error',
        message: 'Integration not found.',
      } as const;
    }

    return {
      type: 'ok',
      organizationId: integration.linkedOrganizationId,
    } as const;
  }

  async subscribeToOIDCIntegrationLogs(args: { oidcIntegrationId: string }) {
    const integration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: args.oidcIntegrationId,
    });

    if (!integration) {
      throw new HiveError('Integration not found.');
    }

    await this.session.assertPerformAction({
      organizationId: integration.linkedOrganizationId,
      action: 'oidc:modify',
      params: {
        organizationId: integration.linkedOrganizationId,
      },
    });

    return this.pubSub.subscribe('oidcIntegrationLogs', integration.id);
  }

  async registerDomain(args: { oidcIntegrationId: string; domain: string }) {
    const parsedId = zod.string().uuid().safeParse(args.oidcIntegrationId);

    if (parsedId.error) {
      this.session.raise('oidc:modify');
    }

    const integration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: parsedId.data,
    });

    if (!integration) {
      this.session.raise('oidc:modify');
    }

    await this.session.assertPerformAction({
      organizationId: integration.linkedOrganizationId,
      action: 'oidc:modify',
      params: {
        organizationId: integration.linkedOrganizationId,
      },
    });

    const fqdnResult = FQDNModel.safeParse(args.domain);

    if (fqdnResult.error) {
      return {
        type: 'error' as const,
        message: 'Invalid FQDN provided.',
      };
    }

    const domain = await this.oidcIntegrationStore.createDomain(
      integration.linkedOrganizationId,
      integration.id,
      args.domain,
    );
    const challenge = await this.oidcIntegrationStore.createDomainChallenge(domain.id);

    return {
      type: 'result' as const,
      domain,
      challenge,
      integration,
    };
  }

  async requestDomainChallenge(args: { domainId: string }) {
    const parsedId = zod.string().uuid().safeParse(args.domainId);

    if (parsedId.error) {
      this.logger.debug('the provided domain ID is invalid.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    let domain = await this.oidcIntegrationStore.findDomainById(parsedId.data);

    if (!domain) {
      this.logger.debug('the domain does not exist.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    if (
      !(await this.session.canPerformAction({
        organizationId: domain.organizationId,
        action: 'oidc:modify',
        params: {
          organizationId: domain.organizationId,
        },
      }))
    ) {
      this.logger.debug('insuffidient permissions for accessing the domain.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    if (domain.verifiedAt) {
      this.logger.debug('the domain was already verified.');
      return {
        type: 'error' as const,
        message: 'Domain is already verified.',
      };
    }

    let challenge = await this.oidcIntegrationStore.getDomainChallenge(domain.id);

    if (challenge) {
      this.logger.debug('a challenge for this domain already exists.');
      return {
        type: 'error' as const,
        message: 'A challenge already exists.',
      };
    }

    challenge = await this.oidcIntegrationStore.createDomainChallenge(domain.id);

    this.logger.debug('a new challenge for this domain was created.');

    return {
      type: 'success' as const,
      domain,
      challenge,
    };
  }

  async verifyDomainChallenge(args: { domainId: string }) {
    this.logger.debug('attempt to verify the domain challenge.');
    const parsedId = zod.string().uuid().safeParse(args.domainId);

    if (parsedId.error) {
      this.logger.debug('invalid it provided.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    let domain = await this.oidcIntegrationStore.findDomainById(parsedId.data);
    if (!domain) {
      this.logger.debug('the domain does not exist.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    if (
      !(await this.session.canPerformAction({
        organizationId: domain.organizationId,
        action: 'oidc:modify',
        params: {
          organizationId: domain.organizationId,
        },
      }))
    ) {
      this.logger.debug('insufficient permissions.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    const challenge = await this.oidcIntegrationStore.getDomainChallenge(domain.id);

    if (!challenge) {
      this.logger.debug('no challenge was found for this domain.');
      return {
        type: 'error' as const,
        message: 'Pending challenge not found.',
      };
    }

    let records: Array<string>;

    const recordName = challenge.recordName + '.' + domain.domainName;

    try {
      records = (
        await Promise.all(
          dnsList.map(async provider => {
            const resolver = new dns.Resolver({ timeout: 10_000 });
            resolver.setServers([provider]);
            return await resolver.resolveTxt(recordName).catch(err => {
              this.logger.debug(`failed lookup record on '%s': %e`, provider, String(err));
              return [] as string[][];
            });
          }),
        )
      )
        .flatMap(record => record)
        .flatMap(record => record);
    } catch (err) {
      this.logger.debug(`failed lookup record: %s`, String(err));
      return {
        type: 'error' as const,
        message: 'Failed to lookup the TXT record.',
      };
    }

    if (!records) {
      this.logger.debug('no records could be resolved.');
      return {
        type: 'error' as const,
        message: 'The TXT record could not be resolved.',
      };
    }

    // At least one record needs to match for the challenge to succeed
    if (!records.find(record => record === challenge.value)) {
      this.logger.debug('no records match the expected value.');
      return {
        type: 'error' as const,
        message: 'The resolved TXT record value is incorrect.',
      };
    }

    domain = await this.oidcIntegrationStore.updateDomainVerifiedAt(domain.id);

    if (!domain) {
      this.logger.debug('the domain no longer exists.');
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    await this.oidcIntegrationStore.deleteDomainChallenge(domain.id);
    this.logger.debug('the domain challenge was completed sucessfully.');

    return {
      type: 'success' as const,
      domain,
    };
  }

  async getDomainChallenge(domain: OIDCIntegrationDomain) {
    const challenge = await this.oidcIntegrationStore.getDomainChallenge(domain.id);

    if (!challenge) {
      return null;
    }

    return {
      recordType: 'TXT',
      recordName: `${challenge.recordName}.${domain.domainName}`,
      recordValue: challenge.value,
    };
  }

  async deleteDomain(args: { domainId: string }) {
    const parsedId = zod.string().uuid().safeParse(args.domainId);

    if (parsedId.error) {
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }

    const domain = await this.oidcIntegrationStore.findDomainById(parsedId.data);

    if (
      !domain ||
      (await this.session.canPerformAction({
        organizationId: domain.organizationId,
        action: 'oidc:modify',
        params: {
          organizationId: domain.organizationId,
        },
      })) === false
    ) {
      return {
        type: 'error' as const,
        message: 'Domain not found.',
      };
    }
    const integration = await this.storage.getOIDCIntegrationById({
      oidcIntegrationId: domain.oidcIntegrationId,
    });
    await this.oidcIntegrationStore.deleteDomain(args.domainId);

    return {
      type: 'success' as const,
      integration,
    };
  }

  async getRegisteredDomainsForOIDCIntegration(integration: OIDCIntegration) {
    return await this.oidcIntegrationStore.getDomainsForOIDCIntegrationId(integration.id);
  }
}

const OIDCIntegrationClientIdModel = zod
  .string()
  .min(3, 'Must be at least 3 characters long.')
  .max(100, 'Can not be longer than 100 characters.');

const OIDCClientSecretModel = zod
  .string()
  .min(3, 'Must be at least 3 characters long.')
  .max(200, 'Can not be longer than 200 characters.');

const OAuthAPIUrlModel = zod.string().url('Must be a valid OAuth API url.');

const OIDCAdditionalScopesModel = zod
  .array(
    zod
      .string()
      .toLowerCase()
      .nonempty('Must not be empty.')
      .max(50, 'Can not be longer than 50 characters.')
      .regex(/^[a-z0-9](?:[a-z0-9.:/_-]*[a-z0-9])?$/, 'Must be a valid scope.'),
  )
  .max(20, 'Can not be more than 20 items.');

const maybe = <TSchema>(schema: zod.ZodSchema<TSchema>) => zod.union([schema, zod.null()]);

const FQDNModel = zod
  .string()
  .min(3, 'Must be at least 3 characters long')
  .max(255, 'Must be at most 255 characters long.')
  .regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]+$/, 'Invalid domain provided.');
