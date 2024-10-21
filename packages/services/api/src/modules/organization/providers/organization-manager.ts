import { createHash } from 'node:crypto';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { Organization, OrganizationMemberRole } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { cache, diffArrays, share } from '../../../shared/helpers';
import { AuthManager } from '../../auth/providers/auth-manager';
import { OrganizationAccessScope } from '../../auth/providers/organization-access';
import { ProjectAccessScope } from '../../auth/providers/project-access';
import { TargetAccessScope } from '../../auth/providers/target-access';
import { BillingProvider } from '../../billing/providers/billing.provider';
import { OIDCIntegrationsProvider } from '../../oidc-integrations/providers/oidc-integrations.provider';
import { ActivityManager } from '../../shared/providers/activity-manager';
import { Emails, mjml } from '../../shared/providers/emails';
import { Logger } from '../../shared/providers/logger';
import type { OrganizationSelector } from '../../shared/providers/storage';
import { Storage } from '../../shared/providers/storage';
import { WEB_APP_URL } from '../../shared/providers/tokens';
import { TokenStorage } from '../../token/providers/token-storage';
import {
  organizationAdminScopes,
  organizationViewerScopes,
  reservedOrganizationSlugs,
} from './organization-config';

function ensureReadAccess(
  scopes: readonly (OrganizationAccessScope | ProjectAccessScope | TargetAccessScope)[],
) {
  const newScopes: (OrganizationAccessScope | ProjectAccessScope | TargetAccessScope)[] = [
    ...scopes,
  ];

  if (!scopes.includes(OrganizationAccessScope.READ)) {
    newScopes.push(OrganizationAccessScope.READ);
  }

  if (!scopes.includes(ProjectAccessScope.READ)) {
    newScopes.push(ProjectAccessScope.READ);
  }

  if (!scopes.includes(TargetAccessScope.READ)) {
    newScopes.push(TargetAccessScope.READ);
  }

  // Remove duplicates
  return newScopes.filter((scope, i, all) => all.indexOf(scope) === i);
}

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
    private authManager: AuthManager,
    private tokenStorage: TokenStorage,
    private activityManager: ActivityManager,
    private billingProvider: BillingProvider,
    private oidcIntegrationProvider: OIDCIntegrationsProvider,
    private emails: Emails,
    @Inject(WEB_APP_URL) private appBaseUrl: string,
  ) {
    this.logger = logger.child({ source: 'OrganizationManager' });
  }

  getOrganizationFromToken: () => Promise<Organization | never> = share(async () => {
    const token = this.authManager.ensureApiToken();
    const result = await this.tokenStorage.getToken({ token });

    await this.authManager.ensureOrganizationAccess({
      organizationId: result.organization,
      scope: OrganizationAccessScope.READ,
    });

    return this.storage.getOrganization({
      organizationId: result.organization,
    });
  });

  getOrganizationIdByToken: () => Promise<string | never> = share(async () => {
    const token = this.authManager.ensureApiToken();
    const { organization } = await this.tokenStorage.getToken({
      token,
    });

    return organization;
  });

  async getOrganization(
    selector: OrganizationSelector,
    scope = OrganizationAccessScope.READ,
  ): Promise<Organization> {
    this.logger.debug('Fetching organization (selector=%o)', selector);
    await this.authManager.ensureOrganizationAccess({
      ...selector,
      scope,
    });
    return this.storage.getOrganization(selector);
  }

  async getOrganizations(): Promise<readonly Organization[]> {
    this.logger.debug('Fetching organizations');
    const user = await this.authManager.getCurrentUser();
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
    const user = await this.authManager.getCurrentUser();

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

    await this.activityManager.create({
      type: 'MEMBER_LEFT',
      selector: {
        organizationId: organizationId,
      },
      user: user,
      meta: {
        email: user.email,
      },
    });

    // Because we checked the access before, it's stale by now
    this.authManager.resetAccessCache();

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

    const hasAccess = await this.authManager.checkOrganizationAccess({
      organizationId: organization.id,
      scope: OrganizationAccessScope.READ,
    });

    if (hasAccess) {
      return {
        message: "You're already a member",
      };
    }

    return organization;
  }

  @cache((selector: OrganizationSelector) => selector.organizationId)
  async getOrganizationMembers(selector: OrganizationSelector) {
    return this.storage.getOrganizationMembers(selector);
  }

  countOrganizationMembers(selector: OrganizationSelector) {
    return this.storage.countOrganizationMembers(selector);
  }

  async getOrganizationMember(selector: OrganizationSelector & { userId: string }) {
    const member = await this.storage.getOrganizationMember(selector);

    if (!member) {
      throw new HiveError('Member not found');
    }

    return member;
  }

  @cache((selector: OrganizationSelector) => selector.organizationId)
  async getInvitations(selector: OrganizationSelector) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: selector.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });
    return this.storage.getOrganizationInvitations(selector);
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
      adminScopes: organizationAdminScopes,
      viewerScopes: organizationViewerScopes,
      reservedSlugs: reservedOrganizationSlugs,
    });

    if (result.ok) {
      await this.activityManager.create({
        type: 'ORGANIZATION_CREATED',
        selector: {
          organizationId: result.organization.id,
        },
        user,
      });
    }

    return result;
  }

  async deleteOrganization(selector: OrganizationSelector): Promise<Organization> {
    this.logger.info('Deleting an organization (organization=%s)', selector.organizationId);
    await this.authManager.ensureOrganizationAccess({
      organizationId: selector.organizationId,
      scope: OrganizationAccessScope.DELETE,
    });

    const organization = await this.getOrganization({
      organizationId: selector.organizationId,
    });

    const deletedOrganization = await this.storage.deleteOrganization({
      organizationId: organization.id,
    });

    await this.tokenStorage.invalidateTokens(deletedOrganization.tokens);

    // Because we checked the access before, it's stale by now
    this.authManager.resetAccessCache();

    return deletedOrganization;
  }

  async updatePlan(
    input: {
      plan: string;
    } & OrganizationSelector,
  ): Promise<Organization> {
    const { plan } = input;
    this.logger.info('Updating an organization plan (input=%o)', input);
    await this.authManager.ensureOrganizationAccess({
      ...input,
      scope: OrganizationAccessScope.SETTINGS,
    });
    const organization = await this.getOrganization({
      organizationId: input.organizationId,
    });

    const result = await this.storage.updateOrganizationPlan({
      billingPlan: plan,
      organizationId: organization.id,
    });

    await this.activityManager.create({
      type: 'ORGANIZATION_PLAN_UPDATED',
      selector: {
        organizationId: organization.id,
      },
      meta: {
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
    await this.authManager.ensureOrganizationAccess({
      ...input,
      scope: OrganizationAccessScope.SETTINGS,
    });
    const organization = await this.getOrganization({
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

    return result;
  }

  async updateSlug(
    input: {
      slug: string;
    } & OrganizationSelector,
  ) {
    const { slug } = input;
    this.logger.info('Updating an organization clean id (input=%o)', input);
    await this.authManager.ensureOrganizationAccess({
      ...input,
      scope: OrganizationAccessScope.SETTINGS,
    });
    const [user, organization] = await Promise.all([
      this.authManager.getCurrentUser(),
      this.getOrganization({
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
      await this.activityManager.create({
        type: 'ORGANIZATION_ID_UPDATED',
        selector: {
          organizationId: organization.id,
        },
        meta: {
          value: result.organization.slug,
        },
      });
    }

    return result;
  }

  async deleteInvitation(input: { email: string; organizationId: string }) {
    await this.authManager.ensureOrganizationAccess({
      scope: OrganizationAccessScope.MEMBERS,
      organizationId: input.organizationId,
    });
    return this.storage.deleteOrganizationInvitationByEmail(input);
  }

  async inviteByEmail(input: { email: string; organization: string; role?: string | null }) {
    await this.authManager.ensureOrganizationAccess({
      scope: OrganizationAccessScope.MEMBERS,
      organizationId: input.organization,
    });

    const { email } = input;
    this.logger.info(
      'Inviting to the organization (email=%s, organization=%s, role=%s)',
      email,
      input.organization,
      input.role,
    );
    const organization = await this.getOrganization({
      organizationId: input.organization,
    });

    const [members, currentUserAccessScopes] = await Promise.all([
      this.getOrganizationMembers({ organizationId: input.organization }),
      this.authManager.getCurrentUserAccessScopes(organization.id),
    ]);
    const existingMember = members.find(member => member.user.email === email);

    if (existingMember) {
      return {
        error: {
          message: `User ${email} is already a member of the organization`,
          inputErrors: {},
        },
      };
    }

    const role = input.role
      ? await this.storage.getOrganizationMemberRole({
          organizationId: organization.id,
          roleId: input.role,
        })
      : await this.storage.getViewerOrganizationMemberRole({
          organizationId: organization.id,
        });
    if (!role) {
      throw new HiveError(`Role not found`);
    }

    // Ensure user has access to all scopes in the role
    const currentUserMissingScopes = role.scopes.filter(
      scope => !currentUserAccessScopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserAccessScopes.join(','));
      this.logger.debug(`Missing scopes: %s`, currentUserMissingScopes.join(','));
      return {
        error: {
          message: `Not enough access to invite a member with this role`,
          inputErrors: {},
        },
      };
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
      this.emails.schedule({
        id: JSON.stringify({
          id: 'org-invitation',
          organization: invitation.organization_id,
          code: createHash('sha256').update(invitation.code).digest('hex'),
          email: createHash('sha256').update(invitation.email).digest('hex'),
        }),
        email,
        body: mjml`
          <mjml>
            <mj-body>
              <mj-section>
                <mj-column>
                  <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
                  <mj-divider border-color="#ca8a04"></mj-divider>
                  <mj-text>
                    Someone from <strong>${organization.name}</strong> invited you to join GraphQL Hive.
                  </mj-text>.
                  <mj-button href="${mjml.raw(this.appBaseUrl)}/join/${invitation.code}">
                    Accept the invitation
                  </mj-button>
                </mj-column>
              </mj-section>
            </mj-body>
          </mjml>
        `,
        subject: `You have been invited to join ${organization.name}`,
      }),
    ]);

    return {
      ok: invitation,
    };
  }

  async joinOrganization({ code }: { code: string }): Promise<Organization | { message: string }> {
    this.logger.info('Joining an organization (code=%s)', code);

    const user = await this.authManager.getCurrentUser();
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
    this.authManager.resetAccessCache();

    await Promise.all([
      this.storage.completeGetStartedStep({
        organizationId: organization.id,
        step: 'invitingMembers',
      }),
      this.activityManager.create({
        type: 'MEMBER_ADDED',
        selector: {
          organizationId: organization.id,
          userId: user.id,
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
    const currentUser = await this.authManager.getCurrentUser();

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

    await this.emails.schedule({
      email: member.user.email,
      subject: `Organization transfer from ${currentUser.displayName} (${organization.name})`,
      body: mjml`
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
                <mj-divider border-color="#ca8a04"></mj-divider>
                <mj-text>
                  ${member.user.displayName} wants to transfer the ownership of the <strong>${organization.name}</strong> organization.
                </mj-text>
                <mj-button href="${mjml.raw(this.appBaseUrl)}/action/transfer/${organization.slug}/${code}">
                  Accept the transfer
                </mj-button>
                <mj-text align="center">
                  This link will expire in a day.
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `,
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
    await this.authManager.ensureOrganizationAccess({
      organizationId: selector.organizationId,
      scope: OrganizationAccessScope.READ,
    });
    const currentUser = await this.authManager.getCurrentUser();

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
    await this.authManager.ensureOrganizationAccess({
      organizationId: input.organizationId,
      scope: OrganizationAccessScope.READ,
    });
    const currentUser = await this.authManager.getCurrentUser();

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
    await this.authManager.ensureOrganizationAccess({
      ...selector,
      scope: OrganizationAccessScope.MEMBERS,
    });
    const owner = await this.getOrganizationOwner(selector);
    const { user, organizationId: organization } = selector;

    if (user === owner.id) {
      throw new HiveError(`Cannot remove the owner from the organization`);
    }

    const currentUser = await this.authManager.getCurrentUser();

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

    // Ensure current user has access to all scopes of the member.
    // User with less access scopes cannot remove a member with more access scopes.
    const currentUserMissingScopes = member.scopes.filter(
      scope => !currentUserAsMember.scopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %o`, currentUserAsMember.scopes);
      throw new HiveError(`Not enough access to remove the member`);
    }

    await this.storage.deleteOrganizationMember({
      userId: user,
      organizationId: organization,
    });

    if (member) {
      await this.activityManager.create({
        type: 'MEMBER_DELETED',
        selector: {
          organizationId: organization,
        },
        meta: {
          email: member.user.email,
        },
      });
    }

    // Because we checked the access before, it's stale by now
    this.authManager.resetAccessCache();

    return this.storage.getOrganization({
      organizationId: organization,
    });
  }

  async updateMemberAccess(
    input: {
      user: string;
      organizationScopes: readonly OrganizationAccessScope[];
      projectScopes: readonly ProjectAccessScope[];
      targetScopes: readonly TargetAccessScope[];
    } & OrganizationSelector,
  ) {
    this.logger.info('Updating a member access in an organization (input=%o)', input);
    await this.authManager.ensureOrganizationAccess({
      ...input,
      scope: OrganizationAccessScope.MEMBERS,
    });

    const currentUser = await this.authManager.getCurrentUser();

    const [currentMember, member] = await Promise.all([
      this.getOrganizationMember({
        organizationId: input.organizationId,
        userId: currentUser.id,
      }),
      this.getOrganizationMember({
        organizationId: input.organizationId,
        userId: input.user,
      }),
    ]);

    if (member.role?.id) {
      throw new HiveError(`Cannot update access for a member with a role.`);
    }

    const newScopes = ensureReadAccess([
      ...input.organizationScopes,
      ...input.projectScopes,
      ...input.targetScopes,
    ]);

    // See what scopes were removed or added
    const modifiedScopes = diffArrays(member.scopes, newScopes);

    // Check if the current user has rights to update these member scopes
    // User can't manage other user's scope if he's missing the scope as well
    const currentUserMissingScopes = modifiedScopes.filter(
      scope => !currentMember.scopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %o`, currentMember.scopes);
      throw new HiveError(`No access to modify the scopes: ${currentUserMissingScopes.join(', ')}`);
    }

    // Update the scopes
    await this.storage.updateOrganizationMemberAccess({
      organizationId: input.organizationId,
      userId: input.user,
      scopes: newScopes,
    });

    // Because we checked the access before, it's stale by now
    this.authManager.resetAccessCache();

    return this.storage.getOrganization({
      organizationId: input.organizationId,
    });
  }

  async createMemberRole(input: {
    organizationId: string;
    name: string;
    description: string;
    organizationAccessScopes: readonly OrganizationAccessScope[];
    projectAccessScopes: readonly ProjectAccessScope[];
    targetAccessScopes: readonly TargetAccessScope[];
  }) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: input.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });

    const scopes = ensureReadAccess([
      ...input.organizationAccessScopes,
      ...input.projectAccessScopes,
      ...input.targetAccessScopes,
    ]);

    const currentUser = await this.authManager.getCurrentUser();
    const currentUserAsMember = await this.getOrganizationMember({
      organizationId: input.organizationId,
      userId: currentUser.id,
    });

    // Ensure user has access to all scopes in the role
    const currentMemberMissingScopes = scopes.filter(
      scope => !currentUserAsMember.scopes.includes(scope),
    );

    if (currentMemberMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserAsMember.scopes.join(', '));
      this.logger.debug(`Missing scopes: %s`, currentMemberMissingScopes.join(', '));
      return {
        error: {
          message: `Missing access to some of the selected scopes`,
        },
      };
    }

    const roleName = input.name.trim();

    const nameExists = await this.storage.hasOrganizationMemberRoleName({
      organizationId: input.organizationId,
      roleName,
    });

    // Ensure name is unique in the organization
    if (nameExists) {
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

    const role = await this.storage.createOrganizationMemberRole({
      organizationId: input.organizationId,
      name: roleName,
      description: input.description,
      scopes,
    });

    return {
      ok: {
        updatedOrganization: await this.storage.getOrganization({
          organizationId: input.organizationId,
        }),
        createdRole: role,
      },
    };
  }

  async deleteMemberRole(input: { organizationId: string; roleId: string }) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: input.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });

    const role = await this.storage.getOrganizationMemberRole({
      organizationId: input.organizationId,
      roleId: input.roleId,
    });

    if (!role) {
      return {
        error: {
          message: 'Role not found',
        },
      };
    }

    const currentUser = await this.authManager.getCurrentUser();
    const currentUserAsMember = await this.getOrganizationMember({
      organizationId: input.organizationId,
      userId: currentUser.id,
    });

    const accessCheckResult = await this.canDeleteRole(role, currentUserAsMember.scopes);

    if (!accessCheckResult.ok) {
      return {
        error: {
          message: accessCheckResult.message,
        },
      };
    }

    // delete the role
    await this.storage.deleteOrganizationMemberRole({
      organizationId: input.organizationId,
      roleId: input.roleId,
    });

    return {
      ok: {
        updatedOrganization: await this.storage.getOrganization({
          organizationId: input.organizationId,
        }),
      },
    };
  }

  async assignMemberRole(input: { organizationId: string; userId: string; roleId: string }) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: input.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });

    // Ensure selected member is part of the organization
    const member = await this.storage.getOrganizationMember({
      organizationId: input.organizationId,
      userId: input.userId,
    });

    if (!member) {
      throw new Error(`Member is not part of the organization`);
    }

    const currentUser = await this.authManager.getCurrentUser();
    const [currentUserAsMember, newRole] = await Promise.all([
      this.getOrganizationMember({
        organizationId: input.organizationId,
        userId: currentUser.id,
      }),
      this.storage.getOrganizationMemberRole({
        organizationId: input.organizationId,
        roleId: input.roleId,
      }),
    ]);

    if (!newRole) {
      return {
        error: {
          message: 'Role not found',
        },
      };
    }

    // Ensure user has access to all scopes in the new role
    const currentUserMissingScopesInNewRole = newRole.scopes.filter(
      scope => !currentUserAsMember.scopes.includes(scope),
    );
    if (currentUserMissingScopesInNewRole.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserAsMember.scopes.join(', '));
      this.logger.debug(`No access to scopes: %s`, currentUserMissingScopesInNewRole.join(', '));

      return {
        error: {
          message: `Missing access to some of the scopes of the new role`,
        },
      };
    }

    // Ensure user has access to all scopes in the old role
    const currentUserMissingScopesInOldRole = member.scopes.filter(
      scope => !currentUserAsMember.scopes.includes(scope),
    );

    if (currentUserMissingScopesInOldRole.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserAsMember.scopes.join(', '));
      this.logger.debug(`No access to scopes: %s`, currentUserMissingScopesInOldRole.join(', '));

      return {
        error: {
          message: `Missing access to some of the scopes of the existing role`,
        },
      };
    }

    const memberMissingScopesInNewRole = member.scopes.filter(
      scope => !newRole.scopes.includes(scope),
    );

    // Ensure new role has at least the same access scopes as the old role, to avoid downgrading members
    if (memberMissingScopesInNewRole.length > 0) {
      // Admin role is an exception, admin can downgrade members
      if (!this.isAdminRole(currentUserAsMember.role)) {
        this.logger.debug(`New role scopes: %s`, newRole.scopes.join(', '));
        this.logger.debug(`Old role scopes: %s`, member.scopes.join(', '));
        return {
          error: {
            message: `Cannot downgrade member to a role with less access scopes`,
          },
        };
      }
    }

    // Assign the role to the member
    await this.storage.assignOrganizationMemberRole({
      organizationId: input.organizationId,
      userId: input.userId,
      roleId: input.roleId,
    });

    // Access cache is stale by now
    this.authManager.resetAccessCache();

    return {
      ok: {
        updatedMember: await this.getOrganizationMember({
          organizationId: input.organizationId,
          userId: input.userId,
        }),
        previousMemberRole: member.role,
      },
    };
  }

  async updateMemberRole(input: {
    organizationId: string;
    roleId: string;
    name: string;
    description: string;
    organizationAccessScopes: readonly OrganizationAccessScope[];
    projectAccessScopes: readonly ProjectAccessScope[];
    targetAccessScopes: readonly TargetAccessScope[];
  }) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: input.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });

    const currentUser = await this.authManager.getCurrentUser();
    const [role, currentUserAsMember] = await Promise.all([
      this.storage.getOrganizationMemberRole({
        organizationId: input.organizationId,
        roleId: input.roleId,
      }),
      this.getOrganizationMember({
        organizationId: input.organizationId,
        userId: currentUser.id,
      }),
    ]);

    if (!role) {
      return {
        error: {
          message: 'Role not found',
        },
      };
    }

    const newScopes = ensureReadAccess([
      ...input.organizationAccessScopes,
      ...input.projectAccessScopes,
      ...input.targetAccessScopes,
    ]);

    const accessCheckResult = this.canUpdateRole(role, currentUserAsMember.scopes);

    if (!accessCheckResult.ok) {
      return {
        error: {
          message: accessCheckResult.message,
        },
      };
    }

    // Ensure name is unique in the organization
    const roleName = input.name.trim();
    const nameExists = await this.storage.hasOrganizationMemberRoleName({
      organizationId: input.organizationId,
      roleName,
      excludeRoleId: input.roleId,
    });

    if (nameExists) {
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

    const existingRoleScopes = role.scopes;
    const hasAssignedMembers = role.membersCount > 0;

    // Ensure user has access to all new scopes in the role
    const currentUserMissingAccessInNewRole = newScopes.filter(
      scope => !currentUserAsMember.scopes.includes(scope),
    );

    if (currentUserMissingAccessInNewRole.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserAsMember.scopes.join(', '));
      this.logger.debug(`No access to scopes: %s`, currentUserMissingAccessInNewRole.join(', '));

      return {
        error: {
          message: `Missing access to some of the selected scopes`,
        },
      };
    }

    const missingOldRoleScopesInNewRole = existingRoleScopes.filter(
      scope => !newScopes.includes(scope),
    );

    // Ensure new role has at least the same access scopes as the old role, to avoid downgrading members
    if (hasAssignedMembers && missingOldRoleScopesInNewRole.length > 0) {
      // Admin role is an exception, admin can downgrade members
      if (!this.isAdminRole(currentUserAsMember.role)) {
        this.logger.debug(`New role scopes: %s`, newScopes.join(', '));
        this.logger.debug(`Old role scopes: %s`, existingRoleScopes.join(', '));
        return {
          error: {
            message: `Cannot downgrade member to a role with less access scopes`,
          },
        };
      }
    }

    // Update the role
    const updatedRole = await this.storage.updateOrganizationMemberRole({
      organizationId: input.organizationId,
      roleId: input.roleId,
      name: roleName,
      description: input.description,
      scopes: newScopes,
    });

    // Access cache is stale by now
    this.authManager.resetAccessCache();

    return {
      ok: {
        updatedRole,
      },
    };
  }

  async getMembersWithoutRole(selector: { organizationId: string }) {
    if (
      await this.authManager.checkOrganizationAccess({
        organizationId: selector.organizationId,
        scope: OrganizationAccessScope.MEMBERS,
      })
    ) {
      return this.storage.getMembersWithoutRole({
        organizationId: selector.organizationId,
      });
    }

    // if user doesn't have access to members, return empty list
    return [];
  }

  async getMemberRoles(selector: { organizationId: string }) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: selector.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });

    return this.storage.getOrganizationMemberRoles({
      organizationId: selector.organizationId,
    });
  }

  async getMemberRole(selector: { organizationId: string; roleId: string }) {
    await this.authManager.ensureOrganizationAccess({
      organizationId: selector.organizationId,
      scope: OrganizationAccessScope.MEMBERS,
    });

    return this.storage.getOrganizationMemberRole({
      organizationId: selector.organizationId,
      roleId: selector.roleId,
    });
  }

  async canDeleteRole(
    role: OrganizationMemberRole,
    currentUserScopes: readonly (
      | OrganizationAccessScope
      | ProjectAccessScope
      | TargetAccessScope
    )[],
  ): Promise<
    | {
        ok: false;
        message: string;
      }
    | {
        ok: true;
      }
  > {
    // Ensure role is not locked (can't be deleted)
    if (role.locked) {
      return {
        ok: false,
        message: `Cannot delete a built-in role`,
      };
    }
    // Ensure role has no members
    let membersCount: number | undefined = role.membersCount;

    if (typeof membersCount !== 'number') {
      const freshRole = await this.storage.getOrganizationMemberRole({
        organizationId: role.organizationId,
        roleId: role.id,
      });

      if (!freshRole) {
        throw new Error('Role not found');
      }

      membersCount = freshRole.membersCount;
    }

    if (membersCount > 0) {
      return {
        ok: false,
        message: `Cannot delete a role with members`,
      };
    }

    // Ensure user has access to all scopes in the role
    const currentUserMissingScopes = role.scopes.filter(
      scope => !currentUserScopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserScopes.join(', '));
      this.logger.debug(`No access to scopes: %s`, currentUserMissingScopes.join(', '));

      return {
        ok: false,
        message: `Missing access to some of the scopes of the role`,
      };
    }

    return {
      ok: true,
    };
  }

  canUpdateRole(
    role: OrganizationMemberRole,
    currentUserScopes: readonly (
      | OrganizationAccessScope
      | ProjectAccessScope
      | TargetAccessScope
    )[],
  ):
    | {
        ok: false;
        message: string;
      }
    | {
        ok: true;
      } {
    // Ensure role is not locked (can't be updated)
    if (role.locked) {
      return {
        ok: false,
        message: `Cannot update a built-in role`,
      };
    }

    // Ensure user has access to all scopes in the role
    const currentUserMissingScopes = role.scopes.filter(
      scope => !currentUserScopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserScopes.join(', '));
      this.logger.debug(`No access to scopes: %s`, currentUserMissingScopes.join(', '));

      return {
        ok: false,
        message: `Missing access to some of the scopes of the role`,
      };
    }

    return {
      ok: true,
    };
  }

  canInviteRole(
    role: OrganizationMemberRole,
    currentUserScopes: readonly (
      | OrganizationAccessScope
      | ProjectAccessScope
      | TargetAccessScope
    )[],
  ):
    | {
        ok: false;
        message: string;
      }
    | {
        ok: true;
      } {
    // Ensure user has access to all scopes in the role
    const currentUserMissingScopes = role.scopes.filter(
      scope => !currentUserScopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %s`, currentUserScopes.join(', '));
      this.logger.debug(`No access to scopes: %s`, currentUserMissingScopes.join(', '));

      return {
        ok: false,
        message: `Missing access to some of the scopes of the role`,
      };
    }

    return {
      ok: true,
    };
  }

  async migrateUnassignedMembers({
    organizationId,
    assignRole,
    createRole,
  }: {
    organizationId: string;
    assignRole?: {
      roleId: string;
      userIds: readonly string[];
    } | null;
    createRole?: {
      name: string;
      description: string;
      organizationScopes: readonly OrganizationAccessScope[];
      projectScopes: readonly ProjectAccessScope[];
      targetScopes: readonly TargetAccessScope[];
      userIds: readonly string[];
    } | null;
  }) {
    const currentUser = await this.authManager.getCurrentUser();
    const currentUserAsMember = await this.getOrganizationMember({
      organizationId: organizationId,
      userId: currentUser.id,
    });

    if (!this.isAdminRole(currentUserAsMember.role)) {
      return {
        error: {
          message: `Only admins can migrate members`,
        },
      };
    }

    if (assignRole) {
      return this.assignRoleToMembersMigration({
        organizationId,
        roleId: assignRole.roleId,
        userIds: assignRole.userIds,
      });
    }

    if (createRole) {
      return this.createRoleWithMembersMigration({
        organizationId,
        ...createRole,
      });
    }

    throw new Error(`Both assignRole and createRole are missing.`);
  }

  private async createRoleWithMembersMigration(input: {
    organizationId: string;
    name: string;
    description: string;
    organizationScopes: readonly OrganizationAccessScope[];
    projectScopes: readonly ProjectAccessScope[];
    targetScopes: readonly TargetAccessScope[];
    userIds: readonly string[];
  }) {
    const result = await this.createMemberRole({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      organizationAccessScopes: input.organizationScopes,
      projectAccessScopes: input.projectScopes,
      targetAccessScopes: input.targetScopes,
    });

    if (result.ok) {
      return this.assignRoleToMembersMigration({
        roleId: result.ok.createdRole.id,
        organizationId: input.organizationId,
        userIds: input.userIds,
      });
    }

    return result;
  }

  private async assignRoleToMembersMigration(input: {
    organizationId: string;
    roleId: string;
    userIds: readonly string[];
  }) {
    await this.storage.assignOrganizationMemberRoleToMany({
      organizationId: input.organizationId,
      roleId: input.roleId,
      userIds: input.userIds,
    });

    return {
      ok: {
        updatedOrganization: await this.storage.getOrganization({
          organizationId: input.organizationId,
        }),
      },
    };
  }

  isAdminRole(role: { name: string; locked: boolean } | null) {
    return role?.name === 'Admin' && role.locked === true;
  }
}
