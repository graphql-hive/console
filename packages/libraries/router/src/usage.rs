use crate::consts::PLUGIN_VERSION;
use apollo_router::layers::ServiceBuilderExt;
use apollo_router::plugin::Plugin;
use apollo_router::plugin::PluginInit;
use apollo_router::services::*;
use apollo_router::Context;
use core::ops::Drop;
use futures::StreamExt;
use graphql_tools::parser::parse_schema;
use graphql_tools::parser::schema::Document;
use hive_console_sdk::agent::usage_agent::UsageAgentExt;
use hive_console_sdk::agent::usage_agent::{ExecutionReport, UsageAgent};
use http::HeaderValue;
use rand::Rng;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio_util::sync::CancellationToken;
use tower::BoxError;
use tower::ServiceBuilder;
use tower::ServiceExt;

use crate::persisted_documents::PERSISTED_DOCUMENT_HASH_KEY;

pub(crate) static OPERATION_CONTEXT: &str = "hive::operation_context";

#[derive(Serialize, Deserialize, Debug)]
struct OperationContext {
    pub(crate) client_name: Option<String>,
    pub(crate) client_version: Option<String>,
    pub(crate) timestamp: u64,
    pub(crate) operation_body: String,
    pub(crate) operation_name: Option<String>,
    pub(crate) dropped: bool,
}

#[derive(Clone, Debug)]
struct OperationConfig {
    sample_rate: f64,
    exclude: Option<Vec<String>>,
    client_name_header: String,
    client_version_header: String,
}

pub struct UsagePlugin {
    config: OperationConfig,
    agent: Option<UsageAgent>,
    schema: Arc<Document<'static, String>>,
    cancellation_token: Arc<CancellationToken>,
}

#[derive(Clone, Debug, Deserialize, JsonSchema, Default)]
pub struct Config {
    /// Default: true
    enabled: Option<bool>,
    /// Hive token, can also be set using the HIVE_TOKEN environment variable.
    /// The token can be a registry access token, or a organization access token.
    registry_token: Option<String>,
    /// Hive registry token. Set to your `/usage` endpoint if you are self-hosting.
    /// Default: https://app.graphql-hive.com/usage
    /// When `target` is set and organization access token is in use, the target ID is appended to the endpoint,
    /// so usage endpoint becomes `https://app.graphql-hive.com/usage/<target_id>`
    registry_usage_endpoint: Option<String>,
    /// The target to which the usage data should be reported to.
    /// This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")
    /// or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").
    target: Option<String>,
    /// Sample rate to determine sampling.
    /// 0.0 = 0% chance of being sent
    /// 1.0 = 100% chance of being sent.
    /// Default: 1.0
    sample_rate: Option<f64>,
    /// A list of operations (by name) to be ignored by GraphQL Hive.
    exclude: Option<Vec<String>>,
    client_name_header: Option<String>,
    client_version_header: Option<String>,
    /// A maximum number of operations to hold in a buffer before sending to GraphQL Hive
    /// Default: 1000
    buffer_size: Option<usize>,
    /// A timeout for only the connect phase of a request to GraphQL Hive
    /// Unit: seconds
    /// Default: 5 (s)
    connect_timeout: Option<u64>,
    /// A timeout for the entire request to GraphQL Hive
    /// Unit: seconds
    /// Default: 15 (s)
    request_timeout: Option<u64>,
    /// Accept invalid SSL certificates
    /// Default: false
    accept_invalid_certs: Option<bool>,
    /// Frequency of flushing the buffer to the server
    /// Default: 5 seconds
    flush_interval: Option<u64>,
}

impl UsagePlugin {
    fn populate_context(config: OperationConfig, req: &supergraph::Request) {
        let context = &req.context;
        let http_request = &req.supergraph_request;
        let headers = http_request.headers();

        let get_header_value = |key: &str| {
            headers
                .get(key)
                .cloned()
                .unwrap_or_else(|| HeaderValue::from_static(""))
                .to_str()
                .ok()
                .map(|v| v.to_string())
        };

        let client_name = get_header_value(&config.client_name_header);
        let client_version = get_header_value(&config.client_version_header);

        let operation_name = req.supergraph_request.body().operation_name.clone();
        let operation_body = req
            .supergraph_request
            .body()
            .query
            .clone()
            .expect("operation body should not be empty");

        let excluded_operation_names: HashSet<String> = config
            .exclude
            .unwrap_or_default()
            .clone()
            .into_iter()
            .collect();

        let mut rng = rand::rng();
        let sampled = rng.random::<f64>() < config.sample_rate;
        let mut dropped = !sampled;

        if !dropped {
            if let Some(name) = &operation_name {
                if excluded_operation_names.contains(name) {
                    dropped = true;
                }
            }
        }

        let _ = context.insert(
            OPERATION_CONTEXT,
            OperationContext {
                dropped,
                client_name,
                client_version,
                operation_name,
                operation_body,
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    * 1000,
            },
        );
    }
}

#[async_trait::async_trait]
impl Plugin for UsagePlugin {
    type Config = Config;

    async fn new(init: PluginInit<Config>) -> Result<Self, BoxError> {
        let user_config = init.config;

        let enabled = user_config.enabled.unwrap_or(true);

        if enabled {
            tracing::info!("Starting GraphQL Hive Usage plugin");
        }

        let cancellation_token = Arc::new(CancellationToken::new());

        let agent = if enabled {
            let mut agent =
                UsageAgent::builder().user_agent(format!("hive-apollo-router/{}", PLUGIN_VERSION));

            if let Some(endpoint) = user_config.registry_usage_endpoint {
                agent = agent.endpoint(endpoint);
            } else if let Ok(env_endpoint) = env::var("HIVE_ENDPOINT") {
                agent = agent.endpoint(env_endpoint);
            }

            if let Some(token) = user_config.registry_token {
                agent = agent.token(token);
            } else if let Ok(env_token) = env::var("HIVE_TOKEN") {
                agent = agent.token(env_token);
            }

            if let Some(target_id) = user_config.target {
                agent = agent.target_id(target_id);
            } else if let Ok(env_target) = env::var("HIVE_TARGET_ID") {
                agent = agent.target_id(env_target);
            }

            if let Some(buffer_size) = user_config.buffer_size {
                agent = agent.buffer_size(buffer_size);
            }

            if let Some(connect_timeout) = user_config.connect_timeout {
                agent = agent.connect_timeout(Duration::from_secs(connect_timeout));
            }

            if let Some(request_timeout) = user_config.request_timeout {
                agent = agent.request_timeout(Duration::from_secs(request_timeout));
            }

            if let Some(accept_invalid_certs) = user_config.accept_invalid_certs {
                agent = agent.accept_invalid_certs(accept_invalid_certs);
            }

            if let Some(flush_interval) = user_config.flush_interval {
                agent = agent.flush_interval(Duration::from_secs(flush_interval));
            }

            let agent = agent.build().map_err(Box::new)?;

            let cancellation_token_for_interval = cancellation_token.clone();
            let agent_for_interval = agent.clone();
            tokio::task::spawn(async move {
                agent_for_interval
                    .start_flush_interval(&cancellation_token_for_interval)
                    .await;
            });
            Some(agent)
        } else {
            None
        };

        let schema = parse_schema(&init.supergraph_sdl)
            .expect("Failed to parse schema")
            .into_static();

        Ok(UsagePlugin {
            schema: Arc::new(schema),
            config: OperationConfig {
                sample_rate: user_config.sample_rate.unwrap_or(1.0),
                exclude: user_config.exclude,
                client_name_header: user_config
                    .client_name_header
                    .unwrap_or("graphql-client-name".to_string()),
                client_version_header: user_config
                    .client_version_header
                    .unwrap_or("graphql-client-version".to_string()),
            },
            agent,
            cancellation_token,
        })
    }

    fn supergraph_service(&self, service: supergraph::BoxService) -> supergraph::BoxService {
        let config = self.config.clone();
        let schema = self.schema.clone();
        match self.agent.clone() {
            None => ServiceBuilder::new().service(service).boxed(),
            Some(agent) => {
                ServiceBuilder::new()
                    .map_future_with_request_data(
                        move |req: &supergraph::Request| {
                            Self::populate_context(config.clone(), req);
                            req.context.clone()
                        },
                        move |ctx: Context, fut| {
                            let agent = agent.clone();
                            let schema = schema.clone();
                            async move {
                                let start: Instant = Instant::now();

                                // nested async block, bc async is unstable with closures that receive arguments
                                let operation_context = ctx
                                    .get::<_, OperationContext>(OPERATION_CONTEXT)
                                    .unwrap_or_default()
                                    .unwrap();

                                // Injected by the persisted document plugin, if it was activated
                                // and discovered document id
                                let persisted_document_hash = ctx
                                    .get::<_, String>(PERSISTED_DOCUMENT_HASH_KEY)
                                    .ok()
                                    .unwrap();

                                let result: supergraph::ServiceResult = fut.await;

                                if operation_context.dropped {
                                    tracing::debug!(
                                        "Dropping operation (phase: SAMPLING): {}",
                                        operation_context
                                            .operation_name
                                            .clone()
                                            .or_else(|| Some("anonymous".to_string()))
                                            .unwrap()
                                    );
                                    return result;
                                }

                                let OperationContext {
                                    client_name,
                                    client_version,
                                    operation_name,
                                    timestamp,
                                    operation_body,
                                    ..
                                } = operation_context;

                                let duration = start.elapsed();

                                match result {
                                    Err(e) => {
                                        tokio::spawn(async move {
                                            let res = agent
                                                .add_report(ExecutionReport {
                                                    schema,
                                                    client_name,
                                                    client_version,
                                                    timestamp,
                                                    duration,
                                                    ok: false,
                                                    errors: 1,
                                                    operation_body,
                                                    operation_name,
                                                    persisted_document_hash,
                                                })
                                                .await;
                                            if let Err(e) = res {
                                                tracing::error!("Error adding report: {}", e);
                                            }
                                        });
                                        Err(e)
                                    }
                                    Ok(router_response) => {
                                        let is_failure =
                                            !router_response.response.status().is_success();
                                        Ok(router_response.map(move |response_stream| {
                                            let res = response_stream
                                                .map(move |response| {
                                                    // make sure we send a single report, not for each chunk
                                                    let response_has_errors =
                                                        !response.errors.is_empty();
                                                    let agent = agent.clone();
                                                    let execution_report = ExecutionReport {
                                                        schema: schema.clone(),
                                                        client_name: client_name.clone(),
                                                        client_version: client_version.clone(),
                                                        timestamp,
                                                        duration,
                                                        ok: !is_failure && !response_has_errors,
                                                        errors: response.errors.len(),
                                                        operation_body: operation_body.clone(),
                                                        operation_name: operation_name.clone(),
                                                        persisted_document_hash:
                                                            persisted_document_hash.clone(),
                                                    };
                                                    tokio::spawn(async move {
                                                        let res = agent
                                                            .add_report(execution_report)
                                                            .await;
                                                        if let Err(e) = res {
                                                            tracing::error!(
                                                                "Error adding report: {}",
                                                                e
                                                            );
                                                        }
                                                    });

                                                    response
                                                })
                                                .boxed();

                                            res
                                        }))
                                    }
                                }
                            }
                        },
                    )
                    .service(service)
                    .boxed()
            }
        }
    }
}

impl Drop for UsagePlugin {
    fn drop(&mut self) {
        self.cancellation_token.cancel();
        // Flush already done by UsageAgent's Drop impl
    }
}

#[cfg(test)]
mod hive_usage_tests {
    use apollo_router::{
        plugin::{test::MockSupergraphService, Plugin, PluginInit},
        services::supergraph,
    };
    use http::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
    use httpmock::{Method::POST, Mock, MockServer};
    use jsonschema::Validator;
    use serde_json::json;
    use tower::ServiceExt;

    use crate::consts::PLUGIN_VERSION;

    use super::{Config, UsagePlugin};

    lazy_static::lazy_static! {
        static ref SCHEMA_VALIDATOR: Validator =
                jsonschema::validator_for(&serde_json::from_str(&std::fs::read_to_string("../../services/usage/usage-report-v2.schema.json").expect("can't load json schema file")).expect("failed to parse json schema")).expect("failed to parse schema");
    }

    struct UsageTestHelper {
        mocked_upstream: MockServer,
        plugin: UsagePlugin,
    }

    impl UsageTestHelper {
        async fn new() -> Self {
            let server: MockServer = MockServer::start();
            let usage_endpoint = server.url("/usage");
            let mut config = Config::default();
            config.enabled = Some(true);
            config.registry_usage_endpoint = Some(usage_endpoint.to_string());
            config.registry_token = Some("123".into());
            config.buffer_size = Some(1);
            config.flush_interval = Some(1);

            let plugin_service = UsagePlugin::new(
                PluginInit::fake_builder()
                    .config(config)
                    .supergraph_sdl("type Query { dummy: String! }".to_string().into())
                    .build(),
            )
            .await
            .expect("failed to init plugin");

            UsageTestHelper {
                mocked_upstream: server,
                plugin: plugin_service,
            }
        }

        fn wait_for_processing(&self) -> tokio::time::Sleep {
            tokio::time::sleep(tokio::time::Duration::from_secs(2))
        }

        fn activate_usage_mock(&'_ self) -> Mock<'_> {
            self.mocked_upstream.mock(|when, then| {
                when.method(POST)
                    .path("/usage")
                    .header(CONTENT_TYPE.as_str(), "application/json")
                    .header(
                        USER_AGENT.as_str(),
                        format!("hive-apollo-router/{}", PLUGIN_VERSION),
                    )
                    .header(AUTHORIZATION.as_str(), "Bearer 123")
                    .header("X-Usage-API-Version", "2")
                    .matches(|r| {
                        // This mock also validates that the content of the reported usage is valid
                        // when it comes to the JSON schema validation.
                        // if it does not match, the request matching will fail and this will lead
                        // to a failed assertion
                        let body = r.body.as_ref().unwrap();
                        let body = String::from_utf8(body.to_vec()).unwrap();
                        let body = serde_json::from_str(&body).unwrap();

                        SCHEMA_VALIDATOR.is_valid(&body)
                    });
                then.status(200);
            })
        }

        async fn execute_operation(&self, req: supergraph::Request) -> supergraph::Response {
            let mut supergraph_service_mock = MockSupergraphService::new();

            supergraph_service_mock
                .expect_call()
                .times(1)
                .returning(move |_| {
                    Ok(supergraph::Response::fake_builder()
                        .data(json!({
                            "data": { "hello": "world" },
                        }))
                        .build()
                        .unwrap())
                });

            let tower_service = self
                .plugin
                .supergraph_service(supergraph_service_mock.boxed());

            let response = tower_service
                .oneshot(req)
                .await
                .expect("failed to execute operation");

            response
        }
    }

    #[tokio::test]
    async fn should_work_correctly_for_simple_query() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query test { hello }")
            .operation_name("test")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;

        mock.assert();
        mock.assert_hits(1);
    }

    #[tokio::test]
    async fn without_operation_name() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query { hello }")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;

        mock.assert();
        mock.assert_hits(1);
    }

    #[tokio::test]
    async fn multiple_operations() {
        let instance = UsageTestHelper::new().await;
        let req = supergraph::Request::fake_builder()
            .query("query test { hello } query test2 { hello }")
            .operation_name("test")
            .build()
            .unwrap();
        let mock = instance.activate_usage_mock();

        instance.execute_operation(req).await.next_response().await;

        instance.wait_for_processing().await;
        println!("Waiting done");

        mock.assert();
        mock.assert_hits(1);
    }
}
