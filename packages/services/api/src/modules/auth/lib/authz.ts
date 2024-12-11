import stringify from 'fast-json-stable-stringify';
import { FastifyReply, FastifyRequest } from '@hive/service-common';
import type { User } from '../../../shared/entities';
import { AccessError } from '../../../shared/errors';
import { isUUID } from '../../../shared/is-uuid';
import { Logger } from '../../shared/providers/logger';

export type AuthorizationPolicyStatement = {
  effect: 'allow' | 'deny';
  action: ActionStrings | ActionStrings[];
  resource: string | string[];
};

/**
 * Parses a Hive Resource identifier into an object containing a organization path and resourceId path.
 * e.g. `"hrn:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:target/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"`
 * becomes
 * ```json
 * {
 *   "organizationId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
 *   "resourceId": "target/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
 * }
 * ```
 */
function parseResourceIdentifier(resource: string) {
  const parts = resource.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid resource identifier (1)');
  }
  if (parts[0] !== 'hrn') {
    throw new Error('Invalid resource identifier. Expected string to start with hrn: (2)');
  }

  if (!parts[1] || (!isUUID(parts[1]) && parts[1] !== '*')) {
    throw new Error('Invalid resource identifier. Expected UUID or * (3)');
  }
  const organizationId = parts[1];

  if (!parts[2]) {
    throw new Error('Invalid resource identifier. Expected type or * (4)');
  }

  // TODO: maybe some stricter validation of the resource id characters

  return { organizationId, resourceId: parts[2] };
}

/**
 * Abstract session class that is implemented by various ways to identify a session.
 * A session is a way to identify a user and their permissions for a specific organization.
 *
 * The `Session.loadPolicyStatementsForOrganization` method must be implemented by the subclass.
 */
export abstract class Session {
  private policyStatementCache = new Map<
    string,
    Promise<AuthorizationPolicyStatement[]> | Array<AuthorizationPolicyStatement>
  >();
  private performActionCache = new Map<string, Promise<void>>();
  protected logger: Logger;

  constructor(args: { logger: Logger }) {
    this.logger = args.logger.child({
      module: this.constructor.name,
    });
  }

  /** Load policy statements for a specific organization. */
  protected abstract loadPolicyStatementsForOrganization(
    organizationId: string,
  ): Promise<Array<AuthorizationPolicyStatement>> | Array<AuthorizationPolicyStatement>;

  /** Retrieve the current viewer. Implementations of the session need to implement this function */
  public getViewer(): Promise<User> {
    throw new AccessError('Authorization token is missing', 'UNAUTHENTICATED');
  }

  public isViewer(): boolean {
    return false;
  }

  /** Retrieve the access token of the request. */
  public getLegacySelector(): {
    token: string;
    organizationId: string;
    projectId: string;
    targetId: string;
  } {
    throw new AccessError('Authorization header is missing');
  }

  private async _loadPolicyStatementsForOrganization(organizationId: string) {
    let result = this.policyStatementCache.get(organizationId);
    if (result !== undefined) {
      return result;
    }

    result = this.loadPolicyStatementsForOrganization(organizationId);
    this.policyStatementCache.set(organizationId, result);
    return await result;
  }

  public async assertPerformAction<TAction extends keyof typeof actionDefinitions>(args: {
    action: TAction;
    organizationId: string;
    params: Parameters<(typeof actionDefinitions)[TAction]>[0];
  }): Promise<void> {
    this.logger.debug(
      'Assert performing action (action=%s, organizationId=%s, params=%o)',
      args.action,
      args.organizationId,
      args.params,
    );

    const argsStr = stringify(args);
    let result = this.performActionCache.get(argsStr);
    if (result !== undefined) {
      this.logger.debug(
        'Serve result from cache (action=%s, organizationId=%s, params=%o)',
        args.action,
        args.organizationId,
        args.params,
      );
      return result;
    }
    result = this._assertPerformAction(args);
    this.performActionCache.set(argsStr, result);
    return await result;
  }

  /**
   * Check whether a session is allowed to perform a specific action.
   * Throws a AccessError if the action is not allowed.
   */
  private async _assertPerformAction<TAction extends keyof typeof actionDefinitions>(args: {
    action: TAction;
    organizationId: string;
    params: Parameters<(typeof actionDefinitions)[TAction]>[0];
  }): Promise<void> {
    const permissions = await this._loadPolicyStatementsForOrganization(args.organizationId);

    const resourceIdsForAction = actionDefinitions[args.action](args.params as any);
    let isAllowed = false;

    for (const permission of permissions) {
      const parsedResources = (
        Array.isArray(permission.resource) ? permission.resource : [permission.resource]
      ).map(parseResourceIdentifier);

      /** If no resource matches, we skip this permission */
      if (
        !parsedResources.some(resource => {
          if (resource.organizationId !== '*' && resource.organizationId !== args.organizationId) {
            return false;
          }

          for (const resourceActionId of resourceIdsForAction) {
            if (isResourceIdMatch(resource.resourceId, resourceActionId)) {
              return true;
            }
          }

          return false;
        })
      ) {
        continue;
      }

      const actions = Array.isArray(permission.action) ? permission.action : [permission.action];

      // check if action matches
      for (const action of actions) {
        if (isActionMatch(action, args.action)) {
          if (permission.effect === 'deny') {
            this.logger.debug(
              'Session not authorized to perform action. Action explicitly denied. (action=%s, organizationId=%s, params=%o)',
              args.action,
              args.organizationId,
              args.params,
            );
            throw new AccessError(`Missing permission for performing '${args.action}' on resource`);
          } else {
            isAllowed = true;
          }
        }
      }
    }

    if (!isAllowed) {
      this.logger.debug(
        'Session not authorized to perform action. Action not allowed. (action=%s, organizationId=%s, params=%o)',
        args.action,
        args.organizationId,
        args.params,
      );

      throw new AccessError(`Missing permission for performing '${args.action}' on resource`);
    }
  }

  /**
   * Check whether a session is allowed to perform a specific action.
   * Returns a boolean that indicates whether the action is allowed or not allowed.
   */
  public async canPerformAction<TAction extends keyof typeof actionDefinitions>(args: {
    action: TAction;
    organizationId: string;
    params: Parameters<(typeof actionDefinitions)[TAction]>[0];
  }): Promise<boolean> {
    return await this.assertPerformAction(args)
      .then(() => true)
      .catch(err => {
        if (err instanceof AccessError) {
          return false;
        }
        return Promise.reject(err);
      });
  }

  /** Reset the permissions cache. */
  public reset() {
    this.logger.debug('Reset cache.');
    this.performActionCache.clear();
    this.policyStatementCache.clear();
  }
}

/** Check whether a action definition (using wildcards) matches a action */
function isActionMatch(actionContainingWildcard: string, action: string) {
  // any action
  if (actionContainingWildcard === '*') {
    return true;
  }
  // exact match
  if (actionContainingWildcard === action) {
    return true;
  }

  const [actionScope] = action.split(':');
  const [userSpecifiedActionScope, userSpecifiedActionId] = actionContainingWildcard.split(':');

  // wildcard match "scope:*"
  if (actionScope === userSpecifiedActionScope && userSpecifiedActionId === '*') {
    return true;
  }

  return false;
}

/** Check whether a resource id path (containing wildcards) matches a resource id path */
function isResourceIdMatch(
  /** The resource id path containing wildcards */
  resourceIdContainingWildcards: string,
  /** The Resource id without wildcards */
  resourceId: string,
): boolean {
  const wildcardIdParts = resourceIdContainingWildcards.split('/');
  const resourceIdParts = resourceId.split('/');

  do {
    const wildcardIdPart = wildcardIdParts.shift();
    const resourceIdPart = resourceIdParts.shift();

    if (wildcardIdPart === '*' && wildcardIdParts.length === 0) {
      return true;
    }

    if (wildcardIdPart !== resourceIdPart) {
      return false;
    }
  } while (wildcardIdParts.length || resourceIdParts.length);

  return true;
}

function defaultOrgIdentity(args: { organizationId: string }) {
  return [`organization/${args.organizationId}`];
}

function defaultProjectIdentity(
  args: { projectId: string } & Parameters<typeof defaultOrgIdentity>[0],
) {
  return [...defaultOrgIdentity(args), `project/${args.projectId}`];
}

function defaultTargetIdentity(
  args: { targetId: string } & Parameters<typeof defaultProjectIdentity>[0],
) {
  return [...defaultProjectIdentity(args), `target/${args.targetId}`];
}

function defaultAppDeploymentIdentity(
  args: { appDeploymentName: string | null } & Parameters<typeof defaultTargetIdentity>[0],
) {
  const ids = defaultTargetIdentity(args);

  if (args.appDeploymentName !== null) {
    ids.push(`target/${args.targetId}/appDeployment/${args.appDeploymentName}`);
  }

  return ids;
}

function schemaCheckOrPublishIdentity(
  args: { serviceName: string | null } & Parameters<typeof defaultTargetIdentity>[0],
) {
  const ids = defaultTargetIdentity(args);

  if (args.serviceName !== null) {
    ids.push(`target/${args.targetId}/service/${args.serviceName}`);
  }

  return ids;
}

/**
 * Object map containing all possible actions
 * and resource identifier builder functions required for checking whether an action can be performed.
 *
 * Used within the `Session.assertPerformAction` function for a fully type-safe experience.
 * If you are adding new permissions to the existing system.
 * This is the place to do so.
 */
const actionDefinitions = {
  'organization:describe': defaultOrgIdentity,
  'organization:modifySlug': defaultOrgIdentity,
  'organization:delete': defaultOrgIdentity,
  'gitHubIntegration:modify': defaultOrgIdentity,
  'slackIntegration:modify': defaultOrgIdentity,
  'oidc:modify': defaultOrgIdentity,
  'support:manageTickets': defaultOrgIdentity,
  'billing:describe': defaultOrgIdentity,
  'billing:update': defaultOrgIdentity,
  'targetAccessToken:modify': defaultTargetIdentity,
  'cdnAccessToken:modify': defaultTargetIdentity,
  'member:describe': defaultOrgIdentity,
  'member:assignRole': defaultOrgIdentity,
  'member:modifyRole': defaultOrgIdentity,
  'member:removeMember': defaultOrgIdentity,
  'member:manageInvites': defaultOrgIdentity,
  'project:create': defaultOrgIdentity,
  'project:describe': defaultProjectIdentity,
  'project:delete': defaultProjectIdentity,
  'project:modifySettings': defaultProjectIdentity,
  'alert:modify': defaultProjectIdentity,
  'schemaLinting:modifyOrganizationRules': defaultOrgIdentity,
  'schemaLinting:modifyProjectRules': defaultProjectIdentity,
  'target:create': defaultProjectIdentity,
  'target:delete': defaultTargetIdentity,
  'target:modifySettings': defaultTargetIdentity,
  'laboratory:describe': defaultTargetIdentity,
  'laboratory:modify': defaultTargetIdentity,
  'appDeployment:describe': defaultTargetIdentity,
  'appDeployment:create': defaultAppDeploymentIdentity,
  'appDeployment:publish': defaultAppDeploymentIdentity,
  'appDeployment:retire': defaultAppDeploymentIdentity,
  'schemaCheck:create': schemaCheckOrPublishIdentity,
  'schemaCheck:approve': schemaCheckOrPublishIdentity,
  'schemaVersion:publish': schemaCheckOrPublishIdentity,
  'schemaVersion:approve': defaultTargetIdentity,
  'schemaVersion:deleteService': schemaCheckOrPublishIdentity,
  'schema:loadFromRegistry': defaultTargetIdentity,
  'schema:compose': defaultTargetIdentity,
  'auditLog:export': defaultOrgIdentity,
} satisfies ActionDefinitionMap;

type ActionDefinitionMap = {
  [key: `${string}:${string}`]: (args: any) => Array<string>;
};

type Actions = keyof typeof actionDefinitions;

type ActionStrings = Actions | '*';

/** Unauthenticated session that is returned by default. */
class UnauthenticatedSession extends Session {
  protected loadPolicyStatementsForOrganization(
    _: string,
  ): Promise<Array<AuthorizationPolicyStatement>> | Array<AuthorizationPolicyStatement> {
    return [];
  }
}

/**
 * Strategy to authenticate a session from an incoming request.
 * E.g. SuperTokens, JWT, etc.
 */
export abstract class AuthNStrategy<TSession extends Session> {
  /**
   * Parse a session from an incoming request.
   * Returns null if the strategy does not apply to the request.
   * Returns a session if the strategy applies to the request.
   * Rejects if the strategy applies to the request but the session could not be parsed.
   */
  public abstract parse(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<TSession | null>;
}

/** Helper class to Authenticate an incoming request. */
export class AuthN {
  private strategies: Array<AuthNStrategy<Session>>;

  constructor(deps: {
    /** List of strategies for authentication a user */
    strategies: Array<AuthNStrategy<Session>>;
  }) {
    this.strategies = deps.strategies;
  }

  /**
   * Returns the first successful `Session` created by a authentication strategy.
   * If no authentication strategy succeeds a `UnauthenticatedSession` is returned instead.
   */
  async authenticate(args: { req: FastifyRequest; reply: FastifyReply }): Promise<Session> {
    for (const strategy of this.strategies) {
      const session = await strategy.parse(args);
      if (session) {
        return session;
      }
    }

    return new UnauthenticatedSession({
      logger: args.req.log,
    });
  }
}
