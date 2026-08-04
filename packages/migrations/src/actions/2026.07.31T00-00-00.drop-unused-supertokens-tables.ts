import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.07.31T00-00-00.drop-unused-supertokens-tables.ts',
  run: ({ psql }) => psql`
    DROP TABLE IF EXISTS
      "supertokens_userid_mapping"
      , "supertokens_user_roles"
      , "supertokens_user_metadata"
      , "supertokens_user_last_active"
      , "supertokens_totp_users"
      , "supertokens_totp_user_devices"
      , "supertokens_totp_used_codes"
      , "supertokens_tenant_thirdparty_providers"
      , "supertokens_tenant_thirdparty_provider_clients"
      , "supertokens_tenant_required_secondary_factors"
      , "supertokens_tenant_first_factors"
      , "supertokens_session_access_token_signing_keys"
      , "supertokens_roles"
      , "supertokens_role_permissions"
      , "supertokens_passwordless_users"
      , "supertokens_passwordless_user_to_tenant"
      , "supertokens_passwordless_devices"
      , "supertokens_passwordless_codes"
      , "supertokens_oauth_sessions"
      , "supertokens_oauth_m2m_tokens"
      , "supertokens_oauth_logout_challenges"
      , "supertokens_oauth_clients"
      , "supertokens_key_value"
      , "supertokens_jwt_signing_keys"
      , "supertokens_emailverification_tokens"
      , "supertokens_emailverification_verified_emails"
      , "supertokens_dashboard_users"
      , "supertokens_dashboard_user_sessions"
    ;
  `,
} satisfies MigrationExecutor;
