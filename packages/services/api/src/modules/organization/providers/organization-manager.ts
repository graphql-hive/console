import { Inject, Injectable, Scope } from 'graphql-modules';
import { OrganizationReferenceInput } from 'packages/libraries/core/src/client/__generated__/types';
import { z } from 'zod';
import * as GraphQLSchema from '../../../__generated__/types';
import { Organization } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { AuthManager } from '../../auth/providers/auth-manager';
import { BillingProvider } from '../../commerce/providers/billing.provider';
import { OIDCIntegrationsProvider } from '../../oidc-integrations/providers/oidc-integrations.provider';
import { Emails } from '../../shared/providers/emails';
import { IdTranslator } from '../../shared/providers/id-translator';
import { InMemoryRateLimiter } from '../../shared/providers/in-memory-rate-limiter';
import { Logger } from '../../shared/providers/logger';
import type { OrganizationSelector } from '../../shared/providers/storage';
import { Storage } from '../../shared/providers/storage';
import { WEB_APP_URL } from '../../shared/providers/tokens';
import { TokenStorage } from '../../token/providers/token-storage';
import { CreateOrUpdateMemberRoleModel } from '../validation';
import { reservedOrganizationSlugs } from './organization-config';
import { OrganizationMemberRoles, type OrganizationMemberRole } from './organization-member-roles';
import { OrganizationMembers } from './organization-members';
import { ResourceAssignments } from './resource-assignments';

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class OrganizationManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private session: Session,
    private authManager: AuthManager,
    private auditLog: AuditLogRecorder,
    private tokenStorage: TokenStorage,
    private billingProvider: BillingProvider,
    private oidcIntegrationProvider: OIDCIntegrationsProvider,
    private emails: Emails,
    private organizationMemberRoles: OrganizationMemberRoles,
    private organizationMembers: OrganizationMembers,
    private resourceAssignments: ResourceAssignments,
    private inMemoryRateLimiter: InMemoryRateLimiter,
    @Inject(WEB_APP_URL) private appBaseUrl: string,
    private idTranslator: IdTranslator,
  ) {
    this.logger = logger.child({ source: 'OrganizationManager' });
  }

  async getOrganizationByReference(reference: OrganizationReferenceInput): Promise<Organization> {
    const selector = await this.idTranslator.resolveOrganizationReference({
      reference,
      onError: () => {
        this.session.raise('organization:describe');
      },
    });

    return this.getOrganization(selector);
  }

  async getOrganization(selector: OrganizationSelector): Promise<Organization> {
    this.logger.debug('Fetching organization (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'organization:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    return this.storage.getOrganization(selector);
  }

  async getOrganizationOrNull(organizationId: string) {
    const canAccessOrganization = await this.session.canPerformAction({
      action: 'organization:describe',
      organizationId,
      params: {
        organizationId,
      },
    });

    if (canAccessOrganization === false) {
      return null;
    }

    return this.storage.getOrganization({ organizationId });
  }

  async getOrganizationBySlug(organizationSlug: string): Promise<Organization | null> {
    const organization = await this.storage.getOrganizationBySlug({ slug: organizationSlug });

    if (!organization) {
      return null;
    }

    const canAccess = await this.session.canPerformAction({
      action: 'organization:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });

    if (canAccess === false) {
      return null;
    }

    return organization;
  }

  async getOrganizations(): Promise<readonly Organization[]> {
    this.logger.debug('Fetching organizations');
    const user = await this.session.getViewer();
    return this.storage.getOrganizations({ userId: user.id });
  }

  getFeatureFlags(selector: OrganizationSelector) {
    return this.getOrganization(selector).then(organization => organization.featureFlags);
  }

  async canLeaveOrganization({
    organizationId,
    userId,
  }: {
    organizationId: string;
    userId: string;
  }) {
    const member = await this.storage.getOrganizationMember({
      organizationId: organizationId,
      userId: userId,
    });

    if (!member) {
      return {
        result: false,
        reason: 'Member not found',
      };
    }

    if (member.isOwner) {
      return {
        result: false,
        reason: 'Cannot leave organization as an owner',
      };
    }

    if (member.oidcIntegrationId !== null) {
      return {
        result: false,
        reason: 'Cannot leave an organization as an OIDC member.',
      };
    }

    const membersCount = await this.countOrganizationMembers({
      organizationId: organizationId,
    });

    if (membersCount > 1) {
      return {
        result: true,
        reason: 'Organization has more than one member',
      };
    }

    return {
      result: false,
      reason: 'Cannot leave organization as the last member',
    };
  }

  async leaveOrganization(organizationId: string): Promise<
    | {
        ok: true;
      }
    | {
        ok: false;
        message: string;
      }
  > {
    this.logger.debug('Leaving organization (organization=%s)', organizationId);
    const user = await this.session.getViewer();

    const canLeave = await this.canLeaveOrganization({
      organizationId,
      userId: user.id,
    });

    if (!canLeave.result) {
      return {
        ok: false,
        message: canLeave.reason,
      };
    }

    await this.storage.deleteOrganizationMember({
      userId: user.id,
      organizationId: organizationId,
    });

    // Because we checked the access before, it's stale by now
    this.session.reset();

    return {
      ok: true,
    };
  }

  async getOrganizationByInviteCode({
    code,
  }: {
    code: string;
  }): Promise<Organization | { message: string } | never> {
    this.logger.debug('Fetching organization (inviteCode=%s)', code);
    const organization = await this.storage.getOrganizationByInviteCode({
      inviteCode: code,
    });

    if (!organization) {
      return {
        message: 'Invitation expired',
      };
    }

    const hasAccess = await this.session.canPerformAction({
      action: 'organization:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });

    if (hasAccess) {
      return {
        message: "You're already a member",
      };
    }

    return organization;
  }

  countOrganizationMembers(selector: OrganizationSelector) {
    return this.storage.countOrganizationMembers(selector);
  }

  async getOrganizationMember(selector: OrganizationSelector & { userId: string }) {
    const organization = await this.storage.getOrganization({
      organizationId: selector.organizationId,
    });
    const member = await this.organizationMembers.findOrganizationMembership({
      organization,
      userId: selector.userId,
    });

    if (!member) {
      throw new HiveError('Member not found');
    }

    return member;
  }

  async getInvitations(
    organization: Organization,
    args: {
      first: number | null;
      after: string | null;
    },
  ) {
    const canAccessInvitations = await this.session.canPerformAction({
      action: 'member:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });

    if (!canAccessInvitations) {
      return null;
    }

    return await this.storage.getOrganizationInvitations(organization.id, args);
  }

  async getOrganizationOwner(selector: OrganizationSelector) {
    return this.storage.getOrganizationOwner(selector);
  }

  async createOrganization(input: {
    slug: string;
    user: {
      id: string;
      superTokensUserId: string | null;
      oidcIntegrationId: string | null;
    };
  }) {
    const { slug, user } = input;
    this.logger.info('Creating an organization (input=%o)', input);

    if (user.oidcIntegrationId) {
      this.logger.debug(
        'Failed to create organization as oidc user is not allowed to do so (input=%o)',
        input,
      );
      throw new HiveError('Cannot create organization with OIDC user.');
    }

    const result = await this.storage.createOrganization({
      slug,
      userId: user.id,
      reservedSlugs: reservedOrganizationSlugs,
    });

    if (result.ok) {
      await this.auditLog.record({
        eventType: 'ORGANIZATION_CREATED',
        organizationId: result.organization.id,
        metadata: {
          organizationSlug: result.organization.id,
        },
      });
    }

    return result;
  }

  async deleteOrganization(selector: OrganizationSelector): Promise<Organization> {
    this.logger.info('Deleting an organization (organization=%s)', selector.organizationId);
    await this.session.assertPerformAction({
      action: 'organization:delete',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    const organization = await this.storage.getOrganization({
      organizationId: selector.organizationId,
    });

    const deletedOrganization = await this.storage.deleteOrganization({
      organizationId: organization.id,
    });

    await this.tokenStorage.invalidateTokens(deletedOrganization.tokens);

    // Because we checked the access before, it's stale by now
    this.session.reset();

    await this.auditLog.record({
      eventType: 'ORGANIZATION_DELETED',
      organizationId: organization.id,
    });

    return deletedOrganization;
  }

  async updatePlan(
    input: {
      plan: string;
    } & OrganizationSelector,
  ): Promise<Organization> {
    const { plan } = input;
    this.logger.info('Updating an organization plan (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'billing:update',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
      },
    });

    const organization = await this.storage.getOrganization({
      organizationId: input.organizationId,
    });

    const result = await this.storage.updateOrganizationPlan({
      billingPlan: plan,
      organizationId: organization.id,
    });

    await this.auditLog.record({
      eventType: 'ORGANIZATION_PLAN_UPDATED',
      organizationId: organization.id,
      metadata: {
        newPlan: plan,
        previousPlan: organization.billingPlan,
      },
    });

    return result;
  }

  async updateRateLimits(
    input: Pick<Organization, 'monthlyRateLimit'> & OrganizationSelector,
  ): Promise<Organization> {
    const { monthlyRateLimit } = input;
    this.logger.info('Updating an organization plan (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'billing:update',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
      },
    });

    const organization = await this.storage.getOrganization({
      organizationId: input.organizationId,
    });

    const result = await this.storage.updateOrganizationRateLimits({
      monthlyRateLimit,
      organizationId: organization.id,
    });

    if (this.billingProvider.enabled) {
      await this.billingProvider.syncOrganization({
        organizationId: organization.id,
        reserved: {
          operations: Math.floor(input.monthlyRateLimit.operations / 1_000_000),
        },
      });
    }

    await this.auditLog.record({
      eventType: 'SUBSCRIPTION_UPDATED',
      organizationId: organization.id,
      metadata: {
        updatedFields: JSON.stringify({
          monthlyRateLimit: {
            retentionInDays: monthlyRateLimit.retentionInDays,
            operations: monthlyRateLimit.operations,
          },
        }),
      },
    });

    return result;
  }

  async updateSlug(
    input: {
      slug: string;
    } & OrganizationSelector,
  ) {
    const { slug } = input;
    this.logger.info('Updating an organization clean id (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'organization:modifySlug',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
      },
    });

    const [user, organization] = await Promise.all([
      this.session.getViewer(),
      this.storage.getOrganization({
        organizationId: input.organizationId,
      }),
    ]);

    if (organization.slug === slug) {
      return {
        ok: true,
        organization,
      } as const;
    }

    const result = await this.storage.updateOrganizationSlug({
      slug,
      organizationId: organization.id,
      userId: user.id,
      reservedSlugs: reservedOrganizationSlugs,
    });

    if (result.ok) {
      await this.auditLog.record({
        eventType: 'ORGANIZATION_SLUG_UPDATED',
        organizationId: organization.id,
        metadata: {
          previousSlug: organization.slug,
          newSlug: slug,
        },
      });
    }

    return result;
  }

  async deleteInvitation(args: {
    email: string;
    organization: GraphQLSchema.OrganizationReferenceInput;
  }) {
    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError: () => {
        this.session.raise('member:modify');
      },
    });
    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId,
      params: {
        organizationId,
      },
    });
    return this.storage.deleteOrganizationInvitationByEmail({
      organizationId,
      email: args.email,
    });
  }

  async inviteByEmail(input: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    email: string;
    role?: string | null;
  }) {
    await this.inMemoryRateLimiter.check(
      'inviteToOrganizationByEmail',
      5_000, // 5 seconds
      6, // 6 invites
      `Exceeded rate limit for inviting to organization by email.`,
    );

    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: input.organization,
      onError: () => {
        this.session.raise('member:modify');
      },
    });

    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId,
      params: {
        organizationId,
      },
    });

    const InputModel = z.object({
      email: z.string().email().max(128, 'Email must be at most 128 characters long'),
    });
    const result = InputModel.safeParse(input);

    if (!result.success) {
      return {
        error: {
          message: 'Please check your input.',
          inputErrors: {
            email: result.error.formErrors.fieldErrors.email?.[0],
          },
        },
      };
    }

    const { email } = input;
    this.logger.info(
      'Inviting to the organization (email=%s, organization=%s, role=%s)',
      email,
      input.organization,
      input.role,
    );
    const organization = await this.getOrganization({
      organizationId,
    });

    const existingMember = await this.organizationMembers.findOrganizationMembershipByEmail(
      organization,
      email,
    );

    if (existingMember) {
      return {
        error: {
          message: `User ${email} is already a member of the organization`,
          inputErrors: {},
        },
      };
    }

    const role = input.role
      ? await this.organizationMemberRoles.findMemberRoleById(input.role)
      : await this.organizationMemberRoles.findViewerRoleByOrganizationId(organizationId);

    if (!role) {
      throw new HiveError(`Role not found`);
    }

    // Delete existing invitation
    await this.storage.deleteOrganizationInvitationByEmail({
      organizationId: organization.id,
      email,
    });

    // create an invitation code (with 7d TTL)
    const invitation = await this.storage.createOrganizationInvitation({
      organizationId: organization.id,
      email,
      roleId: role.id,
    });

    await Promise.all([
      this.storage.completeGetStartedStep({
        organizationId: organization.id,
        step: 'invitingMembers',
      }),
      // schedule an email
      this.emails.api?.sendOrganizationInviteEmail.mutate({
        organizationId: invitation.organizationId,
        organizationName: organization.name,
        email,
        code: invitation.code,
        link: `${this.appBaseUrl}/join/${invitation.code}`,
      }),
    ]);

    await this.auditLog.record({
      eventType: 'USER_INVITED',
      organizationId: organization.id,
      metadata: {
        inviteeEmail: email,
        roleId: role.id,
      },
    });

    return {
      ok: invitation,
    };
  }

  async joinOrganization({ code }: { code: string }): Promise<Organization | { message: string }> {
    this.logger.info('Joining an organization (code=%s)', code);

    const user = await this.session.getViewer();
    const isOIDCUser = user.oidcIntegrationId !== null;

    if (isOIDCUser) {
      return {
        message: `You cannot join an organization with an OIDC account.`,
      };
    }

    const organization = await this.getOrganizationByInviteCode({
      code,
    });

    if ('message' in organization) {
      return organization;
    }

    if (this.oidcIntegrationProvider.isEnabled()) {
      const oidcIntegration = await this.storage.getOIDCIntegrationForOrganization({
        organizationId: organization.id,
      });

      if (oidcIntegration?.oidcUserAccessOnly && !isOIDCUser) {
        return {
          message: 'Non-OIDC users are not allowed to join this organization.',
        };
      }
    }

    this.logger.debug('Adding member (organization=%s, code=%s)', organization.id, code);

    await this.storage.addOrganizationMemberViaInvitationCode({
      code,
      userId: user.id,
      organizationId: organization.id,
    });

    // Because we checked the access before, it's stale by now
    this.session.reset();

    await Promise.all([
      this.storage.completeGetStartedStep({
        organizationId: organization.id,
        step: 'invitingMembers',
      }),
      this.auditLog.record({
        eventType: 'USER_JOINED',
        organizationId: organization.id,
        metadata: {
          inviteeEmail: user.email,
        },
      }),
    ]);

    return organization;
  }

  async requestOwnershipTransfer(
    selector: {
      userId: string;
    } & OrganizationSelector,
  ) {
    const currentUser = await this.session.getViewer();

    if (currentUser.id === selector.userId) {
      return {
        error: {
          message: 'Cannot transfer ownership to yourself',
        },
      };
    }

    await this.authManager.ensureOrganizationOwnership({
      organization: selector.organizationId,
    });

    const member = await this.storage.getOrganizationMember(selector);

    if (!member) {
      return {
        error: {
          message: 'Member not found',
        },
      };
    }

    const organization = await this.getOrganization(selector);

    const { code } = await this.storage.createOrganizationTransferRequest({
      organizationId: organization.id,
      userId: member.user.id,
    });

    await this.emails.api?.sendOrganizationOwnershipTransferEmail.mutate({
      email: member.user.email,
      organizationId: organization.id,
      organizationName: organization.name,
      authorName: currentUser.displayName,
      link: `${this.appBaseUrl}/action/transfer/${organization.slug}/${code}`,
    });

    await this.auditLog.record({
      eventType: 'ORGANIZATION_TRANSFERRED_REQUEST',
      organizationId: organization.id,
      metadata: {
        newOwnerEmail: member.user.email,
        newOwnerId: member.user.id,
      },
    });

    return {
      ok: {
        email: member.user.email,
        code,
      },
    };
  }

  async getOwnershipTransferRequest(
    selector: {
      code: string;
    } & OrganizationSelector,
  ) {
    await this.session.assertPerformAction({
      action: 'organization:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });
    const currentUser = await this.session.getViewer();

    return this.storage.getOrganizationTransferRequest({
      organizationId: selector.organizationId,
      code: selector.code,
      userId: currentUser.id,
    });
  }

  async answerOwnershipTransferRequest(
    input: {
      code: string;
      accept: boolean;
    } & OrganizationSelector,
  ) {
    await this.session.assertPerformAction({
      action: 'organization:describe',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
      },
    });
    const currentUser = await this.session.getViewer();

    await this.auditLog.record({
      eventType: 'ORGANIZATION_TRANSFERRED',
      organizationId: input.organizationId,
      metadata: {
        newOwnerEmail: currentUser.email,
        newOwnerId: currentUser.id,
      },
    });

    await this.storage.answerOrganizationTransferRequest({
      organizationId: input.organizationId,
      code: input.code,
      userId: currentUser.id,
      accept: input.accept,
    });
  }

  async deleteMember(
    selector: {
      user: string;
    } & OrganizationSelector,
  ): Promise<Organization> {
    this.logger.info('Deleting a member from an organization (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    const owner = await this.getOrganizationOwner(selector);
    const { user, organizationId: organization } = selector;

    if (user === owner.id) {
      throw new HiveError(`Cannot remove the owner from the organization`);
    }

    const currentUser = await this.session.getViewer();

    const [currentUserAsMember, member] = await Promise.all([
      this.storage.getOrganizationMember({
        organizationId: organization,
        userId: currentUser.id,
      }),
      this.storage.getOrganizationMember({
        organizationId: organization,
        userId: user,
      }),
    ]);

    if (!member) {
      throw new HiveError(`Member not found`);
    }

    if (!currentUserAsMember) {
      throw new Error(`Logged user is not a member of the organization`);
    }

    await this.storage.deleteOrganizationMember({
      userId: user,
      organizationId: organization,
    });

    // Because we checked the access before, it's stale by now
    this.session.reset();

    await this.auditLog.record({
      eventType: 'USER_REMOVED',
      organizationId: organization,
      metadata: {
        removedUserEmail: member.user.email,
        removedUserId: member.user.id,
      },
    });

    return this.storage.getOrganization({
      organizationId: organization,
    });
  }

  async createMemberRole(args: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    name: string;
    description: string;
    permissions: ReadonlyArray<string>;
  }) {
    const selector = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError: () => {
        this.session.raise('member:modify');
      },
    });

    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    const inputValidation = CreateOrUpdateMemberRoleModel.safeParse({
      name: args.name,
      description: args.description,
    });

    if (!inputValidation.success) {
      return {
        error: {
          message: 'Please check your input.',
          inputErrors: {
            name: inputValidation.error.formErrors.fieldErrors.name?.[0],
            description: inputValidation.error.formErrors.fieldErrors.description?.[0],
          },
        },
      };
    }

    const roleName = args.name.trim();

    const foundRole = await this.organizationMemberRoles.findRoleByOrganizationIdAndName(
      selector.organizationId,
      roleName,
    );

    // Ensure name is unique in the organization
    if (foundRole) {
      const msg = 'Role name already exists. Please choose a different name.';

      return {
        error: {
          message: msg,
          inputErrors: {
            name: msg,
          },
        },
      };
    }

    const role = await this.organizationMemberRoles.createOrganizationMemberRole({
      organizationId: selector.organizationId,
      name: roleName,
      description: args.description,
      permissions: args.permissions,
    });

    await this.auditLog.record({
      eventType: 'ROLE_CREATED',
      organizationId: selector.organizationId,
      metadata: {
        roleId: role.id,
        roleName: role.name,
      },
    });

    return {
      ok: {
        updatedOrganization: await this.storage.getOrganization({
          organizationId: selector.organizationId,
        }),
        createdMemberRole: role,
      },
    };
  }

  async deleteMemberRole(input: { memberRoleId: string }) {
    const role = await this.organizationMemberRoles.findMemberRoleById(input.memberRoleId);

    if (!role) {
      this.session.raise('member:modify');
    }

    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });

    if (!role) {
      return {
        error: {
          message: 'Role not found',
        },
      };
    }

    if (role.membersCount > 0) {
      return {
        error: {
          message: `Cannot delete a role with members`,
        },
      };
    }

    // delete the role
    await this.storage.deleteOrganizationMemberRole({
      organizationId: role.organizationId,
      roleId: role.id,
    });

    await this.auditLog.record({
      eventType: 'ROLE_DELETED',
      organizationId: role.organizationId,
      metadata: {
        roleId: role.id,
        roleName: role.name,
      },
    });

    return {
      ok: {
        updatedOrganization: await this.storage.getOrganization({
          organizationId: role.organizationId,
        }),
        deletedMemberRoleId: role.id,
      },
    };
  }

  async assignMemberRole(args: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    userId: string;
    memberRoleId: string;
    resources: GraphQLSchema.ResourceAssignmentInput;
  }) {
    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError: () => {
        this.session.raise('member:modify');
      },
    });

    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId,
      params: {
        organizationId,
      },
    });

    const organization = await this.storage.getOrganization({
      organizationId,
    });

    // Ensure selected member is part of the organization
    const previousMembership = await this.organizationMembers.findOrganizationMembership({
      organization,
      userId: args.userId,
    });

    if (!previousMembership) {
      throw new Error(`Member is not part of the organization`);
    }

    const newRole = await this.organizationMemberRoles.findMemberRoleById(args.memberRoleId);

    if (!newRole) {
      return {
        error: {
          message: 'Role not found',
        },
      };
    }

    const resourceAssignmentGroup =
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        organization.id,
        args.resources,
      );

    // Assign the role to the member
    await this.organizationMembers.assignOrganizationMemberRole({
      organizationId,
      userId: args.userId,
      roleId: args.memberRoleId,
      resourceAssignmentGroup,
    });

    // Access cache is stale by now
    this.session.reset();

    const previousMemberRole = previousMembership.assignedRole.role ?? null;
    const updatedMembership = await this.organizationMembers.findOrganizationMembership({
      organization,
      userId: args.userId,
    });

    if (!updatedMembership) {
      throw new Error('Somethign went wrong.');
    }

    const result = {
      updatedMember: updatedMembership,
      previousMemberRole,
    };

    const user = await this.storage.getUserById({ id: previousMembership.userId });

    if (!user) {
      throw new Error('User not found.');
    }

    if (result) {
      await this.auditLog.record({
        eventType: 'ROLE_ASSIGNED',
        organizationId,
        metadata: {
          previousMemberRole: previousMemberRole ? previousMemberRole.name : null,
          roleId: newRole.id,
          updatedMember: user.email,
          userIdAssigned: args.userId,
        },
      });
    }

    return {
      ok: result,
    };
  }

  async updateMemberRole(input: {
    memberRoleId: string;
    name: string;
    description: string;
    permissions: readonly string[];
  }) {
    const role = await this.organizationMemberRoles.findMemberRoleById(input.memberRoleId);

    if (!role) {
      this.session.raise('member:modify');
    }

    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });

    const inputValidation = CreateOrUpdateMemberRoleModel.safeParse({
      name: input.name,
      description: input.description,
    });

    if (!inputValidation.success) {
      return {
        error: {
          message: 'Please check your input.',
          inputErrors: {
            name: inputValidation.error.formErrors.fieldErrors.name?.[0],
            description: inputValidation.error.formErrors.fieldErrors.description?.[0],
          },
        },
      };
    }

    // Ensure name is unique in the organization
    const roleName = input.name.trim();
    const foundRole = await this.organizationMemberRoles.findRoleByOrganizationIdAndName(
      role.organizationId,
      roleName,
    );

    if (foundRole && foundRole.id !== input.memberRoleId) {
      const msg = 'Role name already exists. Please choose a different name.';

      return {
        error: {
          message: msg,
          inputErrors: {
            name: msg,
          },
        },
      };
    }

    // Update the role
    const updatedRole = await this.organizationMemberRoles.updateOrganizationMemberRole({
      organizationId: role.organizationId,
      roleId: input.memberRoleId,
      name: roleName,
      description: input.description,
      permissions: input.permissions,
    });

    // Access cache is stale by now
    this.session.reset();

    await this.auditLog.record({
      eventType: 'ROLE_UPDATED',
      organizationId: role.organizationId,
      metadata: {
        roleId: updatedRole.id,
        roleName: updatedRole.name,
        updatedFields: JSON.stringify({
          name: roleName,
          description: input.description,
          permissions: input.permissions,
        }),
      },
    });

    return {
      ok: {
        updatedRole,
      },
    };
  }

  async getPaginatedOrganizationMembersForOrganization(
    organization: Organization,
    args: { first: number | null; after: string | null },
  ) {
    await this.session.assertPerformAction({
      action: 'member:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });

    return this.organizationMembers.getPaginatedOrganizationMembersForOrganization(
      organization,
      args,
    );
  }

  async getViewerMemberRole(selector: {
    organizationId: string;
  }): Promise<OrganizationMemberRole | null> {
    await this.session.assertPerformAction({
      action: 'member:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
      },
    });

    return this.organizationMemberRoles.findViewerRoleByOrganizationId(selector.organizationId);
  }

  async findOrganizationOwner(organization: Organization) {
    await this.session.assertPerformAction({
      action: 'member:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });

    return this.organizationMembers.findOrganizationOwner(organization);
  }
}
