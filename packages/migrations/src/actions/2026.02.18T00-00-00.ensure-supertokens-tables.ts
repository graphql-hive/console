import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.02.18T00-00-00.ensure-supertokens-tables.ts',
  run: ({ sql }) => [
    {
      name: 'seed required tables',
      query: sql`

CREATE TABLE IF NOT EXISTS supertokens_apps (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	created_at_time int8 NULL,
	CONSTRAINT supertokens_apps_pkey PRIMARY KEY (app_id)
);

CREATE TABLE IF NOT EXISTS supertokens_tenants (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	tenant_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	created_at_time int8 NULL,
	CONSTRAINT supertokens_tenants_pkey PRIMARY KEY (app_id, tenant_id),
	CONSTRAINT supertokens_tenants_app_id_fkey FOREIGN KEY (app_id) REFERENCES supertokens_apps(app_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS tenants_app_id_index ON supertokens_tenants USING btree (app_id);

CREATE TABLE IF NOT EXISTS supertokens_session_info (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	tenant_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	session_handle varchar(255) NOT NULL,
	user_id varchar(128) NOT NULL,
	refresh_token_hash_2 varchar(128) NOT NULL,
	session_data text NULL,
	expires_at int8 NOT NULL,
	created_at_time int8 NOT NULL,
	jwt_user_payload text NULL,
	use_static_key bool NOT NULL,
	CONSTRAINT supertokens_session_info_pkey PRIMARY KEY (app_id, tenant_id, session_handle),
	CONSTRAINT supertokens_session_info_tenant_id_fkey FOREIGN KEY (app_id, tenant_id) REFERENCES supertokens_tenants(app_id,tenant_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_expiry_index ON supertokens_session_info USING btree (expires_at);
CREATE INDEX IF NOT EXISTS session_info_tenant_id_index ON supertokens_session_info USING btree (app_id, tenant_id);

CREATE TABLE IF NOT EXISTS supertokens_app_id_to_user_id (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	user_id bpchar(36) NOT NULL,
	recipe_id varchar(128) NOT NULL,
	primary_or_recipe_user_id bpchar(36) NOT NULL,
	is_linked_or_is_a_primary_user bool DEFAULT false NOT NULL,
	CONSTRAINT supertokens_app_id_to_user_id_pkey PRIMARY KEY (app_id, user_id),
	CONSTRAINT supertokens_app_id_to_user_id_app_id_fkey FOREIGN KEY (app_id) REFERENCES supertokens_apps(app_id) ON DELETE CASCADE,
	CONSTRAINT supertokens_app_id_to_user_id_primary_or_recipe_user_id_fkey FOREIGN KEY (app_id,primary_or_recipe_user_id) REFERENCES supertokens_app_id_to_user_id(app_id,user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS app_id_to_user_id_app_id_index ON supertokens_app_id_to_user_id USING btree (app_id);
CREATE INDEX IF NOT EXISTS app_id_to_user_id_primary_user_id_index ON supertokens_app_id_to_user_id USING btree (primary_or_recipe_user_id, app_id);

CREATE TABLE IF NOT EXISTS supertokens_emailpassword_users (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	user_id bpchar(36) NOT NULL,
	email varchar(256) NOT NULL,
	password_hash varchar(256) NOT NULL,
	time_joined int8 NOT NULL,
	CONSTRAINT supertokens_emailpassword_users_pkey PRIMARY KEY (app_id, user_id),
	CONSTRAINT supertokens_emailpassword_users_user_id_fkey FOREIGN KEY (app_id,user_id) REFERENCES supertokens_app_id_to_user_id(app_id,user_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS supertokens_thirdparty_users (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	third_party_id varchar(28) NOT NULL,
	third_party_user_id varchar(256) NOT NULL,
	user_id bpchar(36) NOT NULL,
	email varchar(256) NOT NULL,
	time_joined int8 NOT NULL,
	CONSTRAINT supertokens_thirdparty_users_pkey PRIMARY KEY (app_id, user_id),
	CONSTRAINT supertokens_thirdparty_users_user_id_fkey FOREIGN KEY (app_id,user_id) REFERENCES supertokens_app_id_to_user_id(app_id,user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS thirdparty_users_email_index ON supertokens_thirdparty_users USING btree (app_id, email);
CREATE INDEX IF NOT EXISTS thirdparty_users_thirdparty_user_id_index ON supertokens_thirdparty_users USING btree (app_id, third_party_id, third_party_user_id);

CREATE TABLE IF NOT EXISTS supertokens_all_auth_recipe_users (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	tenant_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	user_id bpchar(36) NOT NULL,
	primary_or_recipe_user_id bpchar(36) NOT NULL,
	is_linked_or_is_a_primary_user bool DEFAULT false NOT NULL,
	recipe_id varchar(128) NOT NULL,
	time_joined int8 NOT NULL,
	primary_or_recipe_user_time_joined int8 NOT NULL,
	CONSTRAINT supertokens_all_auth_recipe_users_pkey PRIMARY KEY (app_id, tenant_id, user_id),
	CONSTRAINT supertokens_all_auth_recipe_users_primary_or_recipe_user_id_fke FOREIGN KEY (app_id,primary_or_recipe_user_id) REFERENCES supertokens_app_id_to_user_id(app_id,user_id) ON DELETE CASCADE,
	CONSTRAINT supertokens_all_auth_recipe_users_tenant_id_fkey FOREIGN KEY (app_id,tenant_id) REFERENCES supertokens_tenants(app_id,tenant_id) ON DELETE CASCADE,
	CONSTRAINT supertokens_all_auth_recipe_users_user_id_fkey FOREIGN KEY (app_id,user_id) REFERENCES supertokens_app_id_to_user_id(app_id,user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS all_auth_recipe_tenant_id_index ON supertokens_all_auth_recipe_users USING btree (app_id, tenant_id);
CREATE INDEX IF NOT EXISTS all_auth_recipe_user_id_index ON supertokens_all_auth_recipe_users USING btree (app_id, user_id);
CREATE INDEX IF NOT EXISTS all_auth_recipe_users_pagination_index1 ON supertokens_all_auth_recipe_users USING btree (app_id, tenant_id, primary_or_recipe_user_time_joined DESC, primary_or_recipe_user_id DESC);
CREATE INDEX IF NOT EXISTS all_auth_recipe_users_pagination_index2 ON supertokens_all_auth_recipe_users USING btree (app_id, tenant_id, primary_or_recipe_user_time_joined, primary_or_recipe_user_id DESC);
CREATE INDEX IF NOT EXISTS all_auth_recipe_users_pagination_index3 ON supertokens_all_auth_recipe_users USING btree (recipe_id, app_id, tenant_id, primary_or_recipe_user_time_joined DESC, primary_or_recipe_user_id DESC);
CREATE INDEX IF NOT EXISTS all_auth_recipe_users_pagination_index4 ON supertokens_all_auth_recipe_users USING btree (recipe_id, app_id, tenant_id, primary_or_recipe_user_time_joined, primary_or_recipe_user_id DESC);
CREATE INDEX IF NOT EXISTS all_auth_recipe_users_primary_user_id_index ON supertokens_all_auth_recipe_users USING btree (primary_or_recipe_user_id, app_id);
CREATE INDEX IF NOT EXISTS all_auth_recipe_users_recipe_id_index ON supertokens_all_auth_recipe_users USING btree (app_id, recipe_id, tenant_id);

CREATE TABLE IF NOT EXISTS supertokens_thirdparty_user_to_tenant (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	tenant_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	user_id bpchar(36) NOT NULL,
	third_party_id varchar(28) NOT NULL,
	third_party_user_id varchar(256) NOT NULL,
	CONSTRAINT supertokens_thirdparty_user_to_tenant_pkey PRIMARY KEY (app_id, tenant_id, user_id),
	CONSTRAINT supertokens_thirdparty_user_to_tenant_third_party_user_id_key UNIQUE (app_id, tenant_id, third_party_id, third_party_user_id),
	CONSTRAINT supertokens_thirdparty_user_to_tenant_user_id_fkey FOREIGN KEY (app_id,tenant_id,user_id) REFERENCES supertokens_all_auth_recipe_users(app_id,tenant_id,user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supertokens_emailpassword_user_to_tenant (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	tenant_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	user_id bpchar(36) NOT NULL,
	email varchar(256) NOT NULL,
	CONSTRAINT supertokens_emailpassword_user_to_tenant_email_key UNIQUE (app_id, tenant_id, email),
	CONSTRAINT supertokens_emailpassword_user_to_tenant_pkey PRIMARY KEY (app_id, tenant_id, user_id),
	CONSTRAINT supertokens_emailpassword_user_to_tenant_user_id_fkey FOREIGN KEY (app_id,tenant_id,user_id) REFERENCES supertokens_all_auth_recipe_users(app_id,tenant_id,user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supertokens_emailpassword_pswd_reset_tokens (
	app_id varchar(64) DEFAULT 'public'::character varying NOT NULL,
	user_id bpchar(36) NOT NULL,
	"token" varchar(128) NOT NULL,
	email varchar(256) NULL,
	token_expiry int8 NOT NULL,
	CONSTRAINT supertokens_emailpassword_pswd_reset_tokens_pkey PRIMARY KEY (app_id, user_id, token),
	CONSTRAINT supertokens_emailpassword_pswd_reset_tokens_token_key UNIQUE (token),
	CONSTRAINT supertokens_emailpassword_pswd_reset_tokens_user_id_fkey FOREIGN KEY (app_id,user_id) REFERENCES supertokens_app_id_to_user_id(app_id,user_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS emailpassword_password_reset_token_expiry_index ON supertokens_emailpassword_pswd_reset_tokens USING btree (token_expiry);
CREATE INDEX IF NOT EXISTS emailpassword_pswd_reset_tokens_user_id_index ON supertokens_emailpassword_pswd_reset_tokens USING btree (app_id, user_id);

`,
    },
    {
      name: 'ensure app exists',
      query: sql`
        INSERT INTO "supertokens_apps" (
          app_id
          , created_at_time
        ) VALUES (
          'public'
          , ${Date.now()}
        )
        ON CONFLICT (app_id) DO NOTHING
`,
    },
    {
      name: 'ensure app exists',
      query: sql`
        INSERT INTO "supertokens_tenants" (
          app_id
          , tenant_id
        , created_at_time
        ) VALUES (
          'public'
          , 'public'
          , ${Date.now()}
        )
        ON CONFLICT (app_id, tenant_id) DO NOTHING;
`,
    },
  ],
} satisfies MigrationExecutor;
