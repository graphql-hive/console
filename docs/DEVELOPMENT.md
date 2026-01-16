# Development

## Prerequisites

Developing Hive locally requires you to have the following software installed locally:

- Node.js >=22 (or `nvm` or `fnm`)
- pnpm >=10.16.0
- Docker version 26.1.1 or later(previous versions will not work correctly on arm64)
- make sure these ports are free: 5432, 6379, 9000, 9001, 8123, 9092, 8081, 8082, 9644, 3567, 7043

## Setup Instructions

- Clone the repository locally
- Make sure to install the recommended VSCode extensions (defined in `.vscode/extensions.json`)
- In the root of the repo, run `nvm use` to use the same version of node as mentioned above
- Create `.env` file in the root, and use the following:

```dotenv
ENVIRONMENT=local
```

- Run `pnpm i` at the root to install all the dependencies and run the hooks
- Run `pnpm local:setup` to run Docker compose dependencies, create databases and migrate database

Solving permission problems on this step:

```bash
export UID=$(id -u)
export GID=$(id -g)
```

Add "user" field to ./docker/docker-compose.dev.yml

```
  clickhouse:
    user: '${UID}:${GID}'
  db:
    user: '${UID}:${GID}'
```

- Run `pnpm generate` to generate the typings from the graphql files (use `pnpm graphql:generate` if
  you only need to run GraphQL Codegen)
- Run `pnpm build` to build all services
- Click on `Start Hive` in the bottom bar of VSCode
- Open the UI (`http://localhost:3000` by default) and Sign in with any of the identity provider
- Once this is done, you should be able to log in and use the project

#### Possible Issues During Setup

If you encounter an error such as:

```
error: relation "supertokens_*" does not exist
```

it usually means that the **Supertokens database tables** were not initialized correctly.

##### Steps to fix it

1. **Ensure no local PostgreSQL instance is running**

   - The local PostgreSQL service on your machine might conflict with the one running in Docker.
   - Stop any locally running PostgreSQL service and make sure the database used by Hive is the one
     from Docker Compose.

2. **Handle possible race conditions between `db` and `supertokens` containers**

   - This issue may occur if `supertokens` starts before the `db` container is fully initialized.
   - To fix:
     1. Stop all running containers:
        ```bash
        docker compose -f ./docker/docker-compose.dev.yml down
        ```
     2. Start only the database:
        ```bash
        docker compose -f ./docker/docker-compose.dev.yml up db
        ```
     3. Wait until the database is ready (you should see “database system is ready to accept
        connections” in logs).
     4. Start the `supertokens` service:
        ```bash
        docker compose -f ./docker/docker-compose.dev.yml up supertokens
        ```
     5. Once `supertokens` successfully creates all the tables, start the rest of the containers:
        ```bash
        docker compose -f ./docker/docker-compose.dev.yml up -d
        ```

3. **If only Supertokens tables were created**
   - Run the setup command again to ensure all services are initialized properly:
     ```bash
     pnpm local:setup
     ```
   - Then restart the Hive Console using the VSCode “Start Hive” button.

After completing these steps, reload the Hive UI at [http://localhost:3000](http://localhost:3000),
and you should be able to log in successfully.

- Once you generate the token against your organization/personal account in hive, the same can be
  added locally to `hive.json` within `packages/libraries/cli` which can be used to interact via the
  hive cli with the registry (Use `http://localhost:3001/graphql` as the `registry.endpoint` value
  in `hive.json`)
- Now you can use Hive locally. All other steps in this document are optional and only necessary if
  you work on specific features.

## Development Seed

We have a script to feed your local instance of Hive with initial seed data. This step is optional.

1. Use `Start Hive` to run your local Hive instance
2. Make sure `usage` and `usage-ingestor` are running as well (with `pnpm dev`)
3. (Optional) Seed a organization with many projects and users `pnpm seed:org`
4. Open Hive app, create a project and a target, then create a token (or use the previously created
   one)
5. Run the seed script: `FEDERATION=<0|1> TOKEN=<access_token> TARGET=<target_id> pnpm seed:schemas`
6. This should report a dummy schema
7. Run the usage seed to generate some dummy usage data to your local instance of Hive, allowing you
   to test features e2e: `FEDERATION=<0|1> TOKEN=<access_token> TARGET=<target_id> pnpm seed:usage`

> Note: You can set `STAGE=<dev|staging|local>` in order to target a specific Hive environment and
> seed a target there. `TARGET=<target_id>` can be obtained via target's Settings page → General →
> Resource ID. `TOKEN=<access_token>` is created on organization's Setting's page → Access Tokens

> To send more operations with `seed:usage`, and test heavy load on Hive instance, you can also set
> `OPERATIONS` (amount of operations in each interval round, default is `10`) and `INTERVAL`
> (frequency of sending operations, default: `1000`ms). For example, using
> `INTERVAL=1000 OPERATIONS=1000` will send 1000 requests per second. And set `BATCHES` to set the
> total number of batches to run before the seed exits. Default: 10.

### Troubleshooting

We recommend the following flow if you are having issues with running Hive locally:

1. Stop all Docker containers: `docker kill $(docker ps -q)`
2. Clear all local Docker environment: `docker system prune --all --force --volumes`
3. Delete all generated local `.env` files: `find . -name '.env' | xargs rm`
4. Delete local `docker/.hive` and `docker/.hive-dev` dir used by Docker volumes.
5. Reinstall dependencies using `pnpm install`
6. Force-generate new `.env` files: `pnpm env:sync --force`

## Publish your first schema (manually)

1. Start Hive locally
2. Create a project and a target
3. Create a token from that target
4. Go to `packages/libraries/cli` and run `pnpm build`
5. Inside `packages/libraries/cli`, run:

   ```sh
   pnpm start schema:publish --registry.accessToken "YOUR_TOKEN_HERE" --registry.endpoint "http://localhost:3001/graphql" examples/single.graphql
   ```

   The registry endpoint is the GraphQL endpoint of your local `server` service. You can also edit
   the `hive.json` file in the `cli` package to avoid passing the `accessToken` and `endpoint` every
   time.

### Setting up Slack App for developing

1. [Download](https://loophole.cloud/download) Loophole CLI (same as ngrok but supports non-random
   urls)
2. Log in to Loophole `$ loophole account login`
3. Start the proxy by running `$ loophole http 3000 --hostname hive-<your-name>` (@kamilkisiela I
   use `hive-kamil`). It creates `https://hive-<your-name>.loophole.site` endpoint.
4. Message @kamilkisiela and send him the url (He will update the list of accepted redirect urls in
   Slack App).
5. Update `APP_BASE_URL` in [`packages/web/app/.env`](./packages/web/app/.env) to the proxy URL
   (e.g. `https://hive-<your-name>.loophole.site`)
6. Run `packages/web/app` and open `https://hive-<your-name>.loophole.site`.

> We have a special Slack channel called `#hive-tests` to not spam people :)

### Setting up GitHub App for developing

#### Starting a proxy for GitHub App

1. Follow first two steps from `Setting up Slack App for developing` (download loophole and log in).
2. Start web app proxy: `$ loophole http 3000 --hostname hive-<your-name>`
3. Start server proxy: `$ loophole http 3001 --hostname hive-<your-name>`

#### Creating a GitHub App

1. Go to `Settings` -> `Developer settings` -> `GitHub Apps`, and click on the `New GitHub App`
   button.
2. Provide a name for your app, and set the `Homepage URL` to
   `https://hive-<your-name>.loophole.site`. Then set the callback URL to
   `https://hive-<your-name>.loophole.site/api/github/callback`, and post installation's callback
   URL to `https://hive-<your-name>.loophole.site/api/github/setup-callback`.
3. Click on `Create GitHub App`.

#### Setting up env variables

1. Server: Set the following env variables in `packages/services/server/.env`:

   ```dotenv
   INTEGRATION_GITHUB=1
   INTEGRATION_GITHUB_GITHUB_APP_ID=<your-github-app-id>
   ```

   You'll find the GitHub App ID and private key in the `General` tab of your GitHub App.

   Store the Github private key next to the `.env` file with the name `github-app.pem`
   (`packages/services/server/github-app.pem`)

2. Web App: Set the following in `packages/web/app/.env`:
   ```dotenv
   INTEGRATION_GITHUB_APP_NAME=<your-github-app-name>
   ```

#### Installing the GitHub App

Open Hive UI and go to your organization's settings page. Find `Integrations` section and click on
`Connect GitHub`. You should be redirected to GitHub where you can grant repository access. After
installing the app, you should be redirected back to Hive.

#### Testing

1. Create a project and a target.
2. Create a token from that target.
3. Setup a GitHub repo with CI/CD actions like this one:
   https://github.com/n1ru4l/hive-federation-subgraph/.
4. Add the token to the repo's secrets as `HIVE_TOKEN`.
5. Add Hive endpoint to the repo's secrets as `HIVE_ENDPOINT`
   (`https://hive-<your-name>.loophole.site/graphql`).
6. Make sure your GitHub app is installed on that repo.
7. Push a commit to the repo and check if the CI/CD action is triggered.

### Local OIDC Testing

The `docker-compose.dev.yml` files includes a mock OIDC server that can be used for testing the OIDC
login/logout flow locally. The server tuns on port `7043`.

Please make sure to set the `AUTH_ORGANIZATION_OIDC` environment variables for the `server` and
`app` to `"1"`.

You can use the following values for connecting an integration to an OIDC provider.

```
# Token Endpoint
http://localhost:7043/connect/token
# User Info Endpoint
http://localhost:7043/connect/userinfo
# Authorization Endpoint
http://localhost:7043/connect/authorize
# Client ID
implicit-mock-client
# Client Secret
client-credentials-mock-client-secret
```

For login use the following credentials.

```
# Username
test-user
# Password
password
```

### Run Hive

1. Click on Start Hive in the bottom bar of VSCode
2. Open the UI (`http://localhost:3000` by default) and register any email and password
3. Sending e-mails is mocked out during local development, so in order to verify the account find
   the verification link by visiting the workflow server's `/_history` endpoint -
   `http://localhost:3014/_history` by default.
   - Searching for `token` should help you find the link.
