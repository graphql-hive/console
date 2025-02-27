variable "RELEASE" {
  default = "dev"
}

variable "PWD" {
  default = "."
}

variable "DOCKER_REGISTRY" {
  default = ""
}

variable "COMMIT_SHA" {
  default = ""
}

variable "BRANCH_NAME" {
  default = ""
}

variable "BUILD_TYPE" {
  # Can be "", "ci" or "publish"
  default = ""
}

variable "BUILD_STABLE" {
  # Can be "" or "1"
  default = ""
}

variable "IMAGE_SUFFIX" {
  default = ""
}

variable "BUILD_PLATFORM" {
  default = "linux/amd64,linux/arm64"
}

function "get_target" {
  params = []
  result = notequal("", BUILD_TYPE) ? notequal("ci", BUILD_TYPE) ? "target-publish" : "target-ci" : "target-dev"
}

function "get_platform" {
  params = []
  result = "${BUILD_PLATFORM}"
}

function "local_image_tag" {
  params = [name]
  result = equal("", BUILD_TYPE) ? "${DOCKER_REGISTRY}${name}:latest${IMAGE_SUFFIX}" : ""
}

function "stable_image_tag" {
  params = [name]
  result = equal("1", BUILD_STABLE) ? "${DOCKER_REGISTRY}${name}:latest${IMAGE_SUFFIX}" : ""
}

function "image_tag" {
  params = [name, tag]
  result = notequal("", tag) ? "${DOCKER_REGISTRY}${name}:${tag}${IMAGE_SUFFIX}" : ""
}

target "migrations-base" {
  dockerfile = "${PWD}/docker/migrations.dockerfile"
  args = {
    RELEASE = "${RELEASE}"
  }
}

target "service-base" {
  dockerfile = "${PWD}/docker/services.dockerfile"
  args = {
    RELEASE = "${RELEASE}"
  }
}

target "router-base" {
  dockerfile = "${PWD}/docker/router.dockerfile"
  args = {
    RELEASE = "${RELEASE}"
  }
}

target "otel-collector-base" {
  dockerfile = "${PWD}/docker/otel-collector.dockerfile"
  args = {
    RELEASE = "${RELEASE}"
  }
}

target "cli-base" {
  dockerfile = "${PWD}/docker/cli.dockerfile"
  args = {
    RELEASE = "${RELEASE}"
  }
}

target "target-dev" {}

target "target-ci" {
  cache-from = ["type=gha,ignore-error=true"]
  cache-to = ["type=gha,mode=max,ignore-error=true"]
}

target "target-publish" {
  platforms = [get_platform()]
  cache-from = ["type=gha,ignore-error=true"]
  cache-to = ["type=gha,mode=max,ignore-error=true"]
}

target "emails" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/emails/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/emails"
    IMAGE_TITLE = "graphql-hive/emails"
    IMAGE_DESCRIPTION = "The emails service of the GraphQL Hive project."
    PORT = "3006"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("emails"),
    stable_image_tag("emails"),
    image_tag("emails", COMMIT_SHA),
    image_tag("emails", BRANCH_NAME)
  ]
}

target "schema" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/schema/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/schema"
    IMAGE_TITLE = "graphql-hive/schema"
    IMAGE_DESCRIPTION = "The schema service of the GraphQL Hive project."
    PORT = "3002"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("schema"),
    stable_image_tag("schema"),
    image_tag("schema", COMMIT_SHA),
    image_tag("schema", BRANCH_NAME)
  ]
}

target "policy" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/policy/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/policy"
    IMAGE_TITLE = "graphql-hive/policy"
    IMAGE_DESCRIPTION = "The policy service of the GraphQL Hive project."
    PORT = "3012"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("policy"),
    stable_image_tag("policy"),
    image_tag("policy", COMMIT_SHA),
    image_tag("policy", BRANCH_NAME)
  ]
}

target "server" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/server/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/server"
    IMAGE_TITLE = "graphql-hive/server"
    IMAGE_DESCRIPTION = "The server service of the GraphQL Hive project."
    PORT = "3001"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("server"),
    stable_image_tag("server"),
    image_tag("server", COMMIT_SHA),
    image_tag("server", BRANCH_NAME)
  ]
}

target "storage" {
  inherits = ["migrations-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/migrations/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    IMAGE_TITLE = "graphql-hive/storage"
    IMAGE_DESCRIPTION = "The migrations service of the GraphQL Hive project."
  }
  tags = [
    local_image_tag("storage"),
    stable_image_tag("storage"),
    image_tag("storage", COMMIT_SHA),
    image_tag("storage", BRANCH_NAME)
  ]
}

target "commerce" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/commerce/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/commerce"
    IMAGE_TITLE = "graphql-hive/commerce"
    IMAGE_DESCRIPTION = "The commerce service of the GraphQL Hive project."
    PORT = "3010"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("commerce"),
    stable_image_tag("commerce"),
    image_tag("commerce", COMMIT_SHA),
    image_tag("commerce", BRANCH_NAME)
  ]
}

target "tokens" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/tokens/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/tokens"
    IMAGE_TITLE = "graphql-hive/tokens"
    IMAGE_DESCRIPTION = "The tokens service of the GraphQL Hive project."
    PORT = "3003"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("tokens"),
    stable_image_tag("tokens"),
    image_tag("tokens", COMMIT_SHA),
    image_tag("tokens", BRANCH_NAME)
  ]
}

target "usage-ingestor" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/usage-ingestor/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/usage-ingestor"
    IMAGE_TITLE = "graphql-hive/usage-ingestor"
    IMAGE_DESCRIPTION = "The usage ingestor service of the GraphQL Hive project."
    PORT = "3007"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("usage-ingestor"),
    stable_image_tag("usage-ingestor"),
    image_tag("usage-ingestor", COMMIT_SHA),
    image_tag("usage-ingestor", BRANCH_NAME)
  ]
}

target "usage" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/usage/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/usage"
    IMAGE_TITLE = "graphql-hive/usage"
    IMAGE_DESCRIPTION = "The usage ingestor service of the GraphQL Hive project."
    PORT = "3006"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("usage"),
    stable_image_tag("usage"),
    image_tag("usage", COMMIT_SHA),
    image_tag("usage", BRANCH_NAME)
  ]
}

target "webhooks" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/webhooks/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/webhooks"
    IMAGE_TITLE = "graphql-hive/webhooks"
    IMAGE_DESCRIPTION = "The webhooks ingestor service of the GraphQL Hive project."
    PORT = "3005"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("webhooks"),
    stable_image_tag("webhooks"),
    image_tag("webhooks", COMMIT_SHA),
    image_tag("webhooks", BRANCH_NAME)
  ]
}

target "composition-federation-2" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/services/external-composition/federation-2/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/external-composition"
    IMAGE_TITLE = "graphql-hive/composition-federation-2"
    IMAGE_DESCRIPTION = "Federation 2 Composition Service for GraphQL Hive."
    PORT = "3069"
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/_readiness"
  }
  tags = [
    local_image_tag("composition-federation-2"),
    stable_image_tag("composition-federation-2"),
    image_tag("composition-federation-2", COMMIT_SHA),
    image_tag("composition-federation-2", BRANCH_NAME)
  ]
}

target "app" {
  inherits = ["service-base", get_target()]
  contexts = {
    dist = "${PWD}/packages/web/app/dist"
    shared = "${PWD}/docker/shared"
  }
  args = {
    SERVICE_DIR_NAME = "@hive/app"
    IMAGE_TITLE = "graphql-hive/app"
    PORT = "3000"
    IMAGE_DESCRIPTION = "The app of the GraphQL Hive project."
    HEALTHCHECK_CMD = "wget --spider -q http://127.0.0.1:$${PORT}/api/health"
  }
  tags = [
    local_image_tag("app"),
    stable_image_tag("app"),
    image_tag("app", COMMIT_SHA),
    image_tag("app", BRANCH_NAME)
  ]
}

target "apollo-router" {
  inherits = ["router-base", get_target()]
  contexts = {
    pkg = "${PWD}/packages/libraries/router"
    config = "${PWD}/configs/cargo"
  }
  args = {
    IMAGE_TITLE = "graphql-hive/apollo-router"
    PORT = "4000"
    IMAGE_DESCRIPTION = "Apollo Router for GraphQL Hive."
  }
  tags = [
    local_image_tag("apollo-router"),
    stable_image_tag("apollo-router"),
    image_tag("apollo-router", COMMIT_SHA),
    image_tag("apollo-router", BRANCH_NAME)
  ]
}

target "otel-collector" {
  inherits = ["otel-collector-base", get_target()]
  contexts = {
    config = "${PWD}/docker/configs/otel-collector"
  }
  args = {
    IMAGE_TITLE = "graphql-hive/otel-collector"
    IMAGE_DESCRIPTION = "OTEL Collector for GraphQL Hive."
  }
  tags = [
    local_image_tag("otel-collector"),
    stable_image_tag("otel-collector"),
    image_tag("otel-collector", COMMIT_SHA),
    image_tag("otel-collector", BRANCH_NAME)
  ]
}

target "cli" {
  inherits = ["cli-base", get_target()]
  context = "${PWD}/packages/libraries/cli"
  args = {
    IMAGE_TITLE = "graphql-hive/cli"
    IMAGE_DESCRIPTION = "GraphQL Hive CLI"
    # note that for CLI we always pass the npm version ! ! !
    CLI_VERSION = "${COMMIT_SHA}"
  }
  tags = [
    local_image_tag("cli"),
    stable_image_tag("cli"),
    image_tag("cli", COMMIT_SHA),
    image_tag("cli", BRANCH_NAME)
  ]
}

group "build" {
  targets = [
    "emails",
    "schema",
    "policy",
    "storage",
    "tokens",
    "usage-ingestor",
    "usage",
    "webhooks",
    "server",
    "commerce",
    "composition-federation-2",
    "app"
  ]
}

group "integration-tests" {
  targets = [
    "commerce",
    "emails",
    "schema",
    "policy",
    "storage",
    "tokens",
    "usage-ingestor",
    "usage",
    "webhooks",
    "server",
    "composition-federation-2"
  ]
}

group "apollo-router-hive-build" {
  targets = [
    "apollo-router"
  ]
}

group "otel-collector-hive-build" {
  targets = [
    "otel-collector"
  ]
}

group "cli" {
  targets = [
    "cli"
  ]
}
