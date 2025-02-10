/* tslint:disable */

/**
 * AUTO-GENERATED FILE - DO NOT EDIT!
 *
 * This file was automatically generated by schemats v.9.0.1
 *
 */

export type alert_channel_type = 'MSTEAMS_WEBHOOK' | 'SLACK' | 'WEBHOOK';
export type alert_type = 'SCHEMA_CHANGE_NOTIFICATIONS';
export type breaking_change_formula = 'PERCENTAGE' | 'REQUEST_COUNT';
export type schema_policy_resource = 'ORGANIZATION' | 'PROJECT';
export type user_role = 'ADMIN' | 'MEMBER';

export interface alert_channels {
  created_at: Date;
  id: string;
  name: string;
  project_id: string;
  slack_channel: string | null;
  type: alert_channel_type;
  webhook_endpoint: string | null;
}

export interface alerts {
  alert_channel_id: string;
  created_at: Date;
  id: string;
  project_id: string;
  target_id: string;
  type: alert_type;
}

export interface app_deployments {
  activated_at: Date | null;
  created_at: Date;
  id: string;
  name: string;
  retired_at: Date | null;
  target_id: string;
  version: string;
}

export interface cdn_access_tokens {
  alias: string;
  created_at: Date;
  first_characters: string;
  id: string;
  last_characters: string;
  s3_key: string;
  target_id: string;
}

export interface contract_checks {
  breaking_schema_changes: any | null;
  compared_contract_version_id: string | null;
  composite_schema_sdl_store_id: string | null;
  contract_id: string;
  id: string;
  is_success: boolean;
  safe_schema_changes: any | null;
  schema_check_id: string;
  schema_composition_errors: any | null;
  supergraph_sdl_store_id: string | null;
}

export interface contract_schema_change_approvals {
  context_id: string;
  contract_id: string;
  created_at: Date;
  schema_change: any;
  schema_change_id: string;
}

export interface contract_version_changes {
  change_type: string;
  contract_version_id: string;
  id: string;
  is_safe_based_on_usage: boolean;
  meta: any;
  severity_level: string;
}

export interface contract_versions {
  composite_schema_sdl: string | null;
  contract_id: string;
  contract_name: string;
  created_at: Date;
  id: string;
  schema_composition_errors: any | null;
  schema_version_id: string;
  supergraph_sdl: string | null;
}

export interface contracts {
  contract_name: string;
  created_at: Date;
  exclude_tags: Array<string> | null;
  id: string;
  include_tags: Array<string> | null;
  is_disabled: boolean;
  remove_unreachable_types_from_public_api_schema: boolean;
  target_id: string;
}

export interface document_collection_documents {
  contents: string;
  created_at: Date;
  created_by_user_id: string | null;
  document_collection_id: string;
  headers: string | null;
  id: string;
  title: string;
  updated_at: Date;
  variables: string | null;
}

export interface document_collections {
  created_at: Date;
  created_by_user_id: string | null;
  description: string | null;
  id: string;
  target_id: string;
  title: string;
  updated_at: Date;
}

export interface document_preflight_scripts {
  created_at: Date;
  created_by_user_id: string | null;
  id: string;
  source_code: string;
  target_id: string;
  updated_at: Date;
}

export interface migration {
  date: Date;
  hash: string;
  name: string;
}

export interface oidc_integrations {
  authorization_endpoint: string | null;
  client_id: string;
  client_secret: string;
  created_at: Date;
  default_role_id: string | null;
  id: string;
  linked_organization_id: string;
  oauth_api_url: string | null;
  oidc_user_access_only: boolean;
  token_endpoint: string | null;
  updated_at: Date;
  userinfo_endpoint: string | null;
}

export interface organization_access_tokens {
  assigned_resources: any | null;
  created_at: Date;
  description: string;
  first_characters: string | null;
  hash: string | null;
  id: string;
  organization_id: string;
  permissions: Array<string>;
  title: string;
}

export interface organization_invitations {
  code: string;
  created_at: Date;
  email: string;
  expires_at: Date;
  organization_id: string;
  role_id: string;
}

export interface organization_member {
  assigned_resources: any | null;
  connected_to_zendesk: boolean;
  organization_id: string;
  role: user_role;
  role_id: string | null;
  scopes: Array<string> | null;
  user_id: string;
}

export interface organization_member_roles {
  description: string;
  id: string;
  locked: boolean;
  name: string;
  organization_id: string;
  permissions: Array<string> | null;
  scopes: Array<string> | null;
}

export interface organizations {
  clean_id: string;
  created_at: Date;
  feature_flags: any | null;
  get_started_checking_schema: boolean;
  get_started_creating_project: boolean;
  get_started_inviting_members: boolean;
  get_started_publishing_schema: boolean;
  get_started_reporting_operations: boolean;
  get_started_usage_breaking: boolean;
  github_app_installation_id: string | null;
  id: string;
  limit_operations_monthly: string;
  limit_retention_days: string;
  name: string;
  ownership_transfer_code: string | null;
  ownership_transfer_expires_at: Date | null;
  ownership_transfer_user_id: string | null;
  plan_name: string;
  slack_token: string | null;
  user_id: string;
  zendesk_organization_id: string | null;
}

export interface organizations_billing {
  billing_email_address: string | null;
  external_billing_reference_id: string;
  organization_id: string;
}

export interface projects {
  build_url: string | null;
  clean_id: string;
  created_at: Date;
  external_composition_enabled: boolean;
  external_composition_endpoint: string | null;
  external_composition_secret: string | null;
  git_repository: string | null;
  github_check_with_project_name: boolean;
  id: string;
  name: string;
  native_federation: boolean | null;
  org_id: string;
  type: string;
  validation_url: string | null;
}

export interface schema_change_approvals {
  context_id: string;
  created_at: Date;
  schema_change: any;
  schema_change_id: string;
  target_id: string;
}

export interface schema_checks {
  breaking_schema_changes: any | null;
  composite_schema_sdl: string | null;
  composite_schema_sdl_store_id: string | null;
  conditional_breaking_change_metadata: any | null;
  context_id: string | null;
  created_at: Date;
  expires_at: Date | null;
  github_check_run_id: string | null;
  github_repository: string | null;
  github_sha: string | null;
  has_contract_schema_changes: boolean | null;
  id: string;
  is_manually_approved: boolean | null;
  is_success: boolean;
  manual_approval_comment: string | null;
  manual_approval_user_id: string | null;
  meta: any | null;
  safe_schema_changes: any | null;
  schema_composition_errors: any | null;
  schema_policy_errors: any | null;
  schema_policy_warnings: any | null;
  schema_sdl: string | null;
  schema_sdl_store_id: string | null;
  schema_version_id: string | null;
  service_name: string | null;
  supergraph_sdl: string | null;
  supergraph_sdl_store_id: string | null;
  target_id: string;
  updated_at: Date;
}

export interface schema_coordinate_status {
  coordinate: string;
  created_at: Date;
  created_in_version_id: string;
  deprecated_at: Date | null;
  deprecated_in_version_id: string | null;
  target_id: string;
}

export interface schema_log {
  action: string;
  author: string;
  commit: string;
  created_at: Date;
  id: string;
  metadata: string | null;
  project_id: string;
  sdl: string | null;
  service_name: string | null;
  service_url: string | null;
  target_id: string;
}

export interface schema_policy_config {
  allow_overriding: boolean;
  config: any;
  created_at: Date;
  resource_id: string;
  resource_type: schema_policy_resource;
  updated_at: Date;
}

export interface schema_version_changes {
  change_type: string;
  id: string;
  is_safe_based_on_usage: boolean;
  meta: any;
  schema_version_id: string;
  severity_level: string;
}

export interface schema_version_to_log {
  action_id: string;
  version_id: string;
}

export interface schema_versions {
  action_id: string;
  base_schema: string | null;
  composite_schema_sdl: string | null;
  conditional_breaking_change_metadata: any | null;
  created_at: Date;
  diff_schema_version_id: string | null;
  github_repository: string | null;
  github_sha: string | null;
  has_contract_composition_errors: boolean | null;
  has_persisted_schema_changes: boolean | null;
  id: string;
  is_composable: boolean;
  previous_schema_version_id: string | null;
  record_version: string | null;
  schema_composition_errors: any | null;
  supergraph_sdl: string | null;
  tags: Array<string> | null;
  target_id: string;
}

export interface sdl_store {
  id: string;
  sdl: string;
}

export interface target_validation {
  destination_target_id: string;
  target_id: string;
}

export interface targets {
  base_schema: string | null;
  clean_id: string;
  created_at: Date;
  graphql_endpoint_url: string | null;
  id: string;
  name: string;
  project_id: string;
  validation_breaking_change_formula: breaking_change_formula;
  validation_enabled: boolean;
  validation_excluded_clients: Array<string> | null;
  validation_percentage: number;
  validation_period: number;
  validation_request_count: number;
}

export interface tokens {
  created_at: Date;
  deleted_at: Date | null;
  id: string;
  last_used_at: Date | null;
  name: string;
  organization_id: string;
  project_id: string;
  scopes: Array<string> | null;
  target_id: string;
  token: string;
  token_alias: string;
}

export interface users {
  created_at: Date;
  display_name: string;
  email: string;
  external_auth_user_id: string | null;
  full_name: string;
  id: string;
  is_admin: boolean | null;
  oidc_integration_id: string | null;
  supertoken_user_id: string | null;
  zendesk_user_id: string | null;
}

export interface version_commit {
  commit_id: string;
  url: string | null;
  version_id: string;
}

export interface versions {
  base_schema: string | null;
  commit_id: string;
  created_at: Date;
  id: string;
  target_id: string;
  valid: boolean;
}

export interface DBTables {
  alert_channels: alert_channels;
  alerts: alerts;
  app_deployments: app_deployments;
  cdn_access_tokens: cdn_access_tokens;
  contract_checks: contract_checks;
  contract_schema_change_approvals: contract_schema_change_approvals;
  contract_version_changes: contract_version_changes;
  contract_versions: contract_versions;
  contracts: contracts;
  document_collection_documents: document_collection_documents;
  document_collections: document_collections;
  document_preflight_scripts: document_preflight_scripts;
  migration: migration;
  oidc_integrations: oidc_integrations;
  organization_access_tokens: organization_access_tokens;
  organization_invitations: organization_invitations;
  organization_member: organization_member;
  organization_member_roles: organization_member_roles;
  organizations: organizations;
  organizations_billing: organizations_billing;
  projects: projects;
  schema_change_approvals: schema_change_approvals;
  schema_checks: schema_checks;
  schema_coordinate_status: schema_coordinate_status;
  schema_log: schema_log;
  schema_policy_config: schema_policy_config;
  schema_version_changes: schema_version_changes;
  schema_version_to_log: schema_version_to_log;
  schema_versions: schema_versions;
  sdl_store: sdl_store;
  target_validation: target_validation;
  targets: targets;
  tokens: tokens;
  users: users;
  version_commit: version_commit;
  versions: versions;
}
