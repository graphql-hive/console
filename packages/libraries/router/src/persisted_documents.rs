use apollo_router::graphql;
use apollo_router::graphql::Error;
use apollo_router::layers::ServiceBuilderExt;
use apollo_router::plugin::Plugin;
use apollo_router::plugin::PluginInit;
use apollo_router::services::router;
use apollo_router::services::router::Body;
use apollo_router::Context;
use bytes::Bytes;
use core::ops::Drop;
use futures::FutureExt;
use hive_console_sdk::persisted_documents::PersistedDocumentsError;
use hive_console_sdk::persisted_documents::PersistedDocumentsManager;
use http::StatusCode;
use http_body_util::combinators::UnsyncBoxBody;
use http_body_util::BodyExt;
use http_body_util::Full;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::env;
use std::ops::ControlFlow;
use std::sync::Arc;
use std::time::Duration;
use tower::{BoxError, ServiceBuilder, ServiceExt};
use tracing::{debug, info, warn};

use crate::consts::PLUGIN_VERSION;

pub static PERSISTED_DOCUMENT_HASH_KEY: &str = "hive::persisted_document_hash";

#[derive(Clone, Debug, Deserialize, JsonSchema, Default)]
pub struct Config {
    pub enabled: Option<bool>,
    /// GraphQL Hive persisted documents CDN endpoint URL.
    pub endpoint: Option<String>,
    /// GraphQL Hive persisted documents CDN access token.
    pub key: Option<String>,
    /// Whether arbitrary documents should be allowed along-side persisted documents.
    /// default: false
    pub allow_arbitrary_documents: Option<bool>,
    /// A timeout for only the connect phase of a request to GraphQL Hive
    /// Unit: seconds
    /// Default: 5
    pub connect_timeout: Option<u64>,
    /// Retry count for the request to CDN request
    /// Default: 3
    pub retry_count: Option<u32>,
    /// A timeout for the entire request to GraphQL Hive
    /// Unit: seconds
    /// Default: 15
    pub request_timeout: Option<u64>,
    /// Accept invalid SSL certificates
    /// default: false
    pub accept_invalid_certs: Option<bool>,
    /// Configuration for the size of the in-memory caching of persisted documents.
    /// Default: 1000
    pub cache_size: Option<u64>,
}

pub struct PersistedDocumentsPlugin {
    persisted_documents_manager: Option<Arc<PersistedDocumentsManager>>,
    allow_arbitrary_documents: bool,
}

impl PersistedDocumentsPlugin {
    fn from_config(config: Config) -> Result<Self, BoxError> {
        let enabled = config.enabled.unwrap_or(true);
        let allow_arbitrary_documents = config.allow_arbitrary_documents.unwrap_or(false);
        if !enabled {
            return Ok(PersistedDocumentsPlugin {
                persisted_documents_manager: None,
                allow_arbitrary_documents,
            });
        }
        let endpoint = match &config.endpoint {
            Some(ep) => ep.clone(),
            None => {
                if let Ok(ep) = env::var("HIVE_CDN_ENDPOINT") {
                    ep
                } else {
                    return Err(
                        "Endpoint for persisted documents CDN is not configured. Please set it via the plugin configuration or HIVE_CDN_ENDPOINT environment variable."
                            .into(),
                    );
                }
            }
        };

        let key = match &config.key {
            Some(k) => k.clone(),
            None => {
                if let Ok(key) = env::var("HIVE_CDN_KEY") {
                    key
                } else {
                    return Err(
                        "Access token for persisted documents CDN is not configured. Please set it via the plugin configuration or HIVE_CDN_KEY environment variable."
                            .into(),
                    );
                }
            }
        };

        Ok(PersistedDocumentsPlugin {
            persisted_documents_manager: Some(Arc::new(PersistedDocumentsManager::new(
                key,
                endpoint,
                config.accept_invalid_certs.unwrap_or(false),
                Duration::from_secs(config.connect_timeout.unwrap_or(5)),
                Duration::from_secs(config.request_timeout.unwrap_or(15)),
                config.retry_count.unwrap_or(3),
                config.cache_size.unwrap_or(1000),
                format!("hive-apollo-router/{}", PLUGIN_VERSION),
            ))),
            allow_arbitrary_documents,
        })
    }
}

#[async_trait::async_trait]
impl Plugin for PersistedDocumentsPlugin {
    type Config = Config;

    async fn new(init: PluginInit<Config>) -> Result<Self, BoxError> {
        PersistedDocumentsPlugin::from_config(init.config)
    }

    fn router_service(&self, service: router::BoxService) -> router::BoxService {
        if let Some(mgr) = &self.persisted_documents_manager {
            let mgr = mgr.clone();
            let allow_arbitrary_documents = self.allow_arbitrary_documents;
            ServiceBuilder::new()
                .checkpoint_async(move |req: router::Request| {
                    let mgr = mgr.clone();
                    async move {
                        let (parts, body) = req.router_request.into_parts();
                        let bytes = body
                            .collect()
                            .await
                            .map_err(|err| PersistedDocumentsError::FailedToReadBody(err.to_string()))?
                            .to_bytes();

                        let payload = extract_document_id(&bytes);

                        let mut payload = match payload {
                            Ok(payload) => payload,
                            Err(e) => {
                                return Ok(ControlFlow::Break(
                                    to_router_response(e, req.context),
                                ));
                            }
                        };

                        if payload.original_req.query.is_some() {
                            if allow_arbitrary_documents {
                                let roll_req: router::Request = (
                                    http::Request::<Body>::from_parts(
                                        parts,
                                        body_from_bytes(bytes),
                                    ),
                                    req.context,
                                )
                                    .into();

                                return Ok(ControlFlow::Continue(roll_req));
                            } else {
                                return Ok(ControlFlow::Break(
                                    to_router_response(PersistedDocumentsError::PersistedDocumentRequired, req.context)
                                ));
                            }
                        }

                        if payload.document_id.is_none() {
                            return Ok(ControlFlow::Break(
                                    to_router_response(PersistedDocumentsError::KeyNotFound, req.context)
                            ));
                        }

                        match payload.document_id.as_ref() {
                            None => {
                                Ok(ControlFlow::Break(
                                    to_router_response(PersistedDocumentsError::PersistedDocumentRequired, req.context)
                                ))
                            }
                            Some(document_id) => match mgr.resolve_document(document_id).await {
                                Ok(document) => {
                                    info!("Document found in persisted documents: {}", document);

                                    if req
                                        .context
                                        .insert(PERSISTED_DOCUMENT_HASH_KEY, document_id.clone())
                                        .is_err()
                                    {
                                        warn!("failed to extend router context with persisted document hash key");
                                    }

                                    payload.original_req.query = Some(document);

                                    let mut bytes: Vec<u8> = Vec::new();
                                    serde_json::to_writer(&mut bytes, &payload).unwrap();

                                    let roll_req: router::Request = (
                                        http::Request::<Body>::from_parts(parts, body_from_bytes(bytes)),
                                        req.context,
                                    )
                                        .into();

                                    Ok(ControlFlow::Continue(roll_req))
                                }
                                Err(e) => {
                                    Ok(ControlFlow::Break(
                                        to_router_response(e, req.context),
                                    ))
                                }
                            },
                        }
                    }
                    .boxed()
                })
                .buffered()
                .service(service)
                .boxed()
        } else {
            service
        }
    }
}

fn body_from_bytes<T: Into<Bytes>>(chunk: T) -> UnsyncBoxBody<Bytes, axum_core::Error> {
    Full::new(chunk.into())
        .map_err(|never| match never {})
        .boxed_unsync()
}

impl Drop for PersistedDocumentsPlugin {
    fn drop(&mut self) {
        debug!("PersistedDocumentsPlugin has been dropped!");
    }
}

fn to_router_response(err: PersistedDocumentsError, ctx: Context) -> router::Response {
    let errors = vec![Error::builder()
        .message(err.message())
        .extension_code(err.code())
        .build()];

    router::Response::error_builder()
        .errors(errors)
        .status_code(StatusCode::OK)
        .context(ctx)
        .build()
        .unwrap()
}

/// Expected body structure for the router incoming requests
/// This is used to extract the document id and the original request as-is (see `flatten` attribute)
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ExpectedBodyStructure {
    /// This field is set to optional in order to prevent parsing errors
    /// At runtime later, the plugin will double check the value.
    #[serde(rename = "documentId")]
    #[serde(skip_serializing)]
    document_id: Option<String>,
    /// The rest of the GraphQL request, flattened to keep the original structure.
    #[serde(flatten)]
    original_req: graphql::Request,
}

fn extract_document_id(
    body: &bytes::Bytes,
) -> Result<ExpectedBodyStructure, PersistedDocumentsError> {
    serde_json::from_slice::<ExpectedBodyStructure>(body)
        .map_err(PersistedDocumentsError::FailedToParseBody)
}

/// To test this plugin, we do the following:
/// 1. Create the plugin instance
/// 2. Link it to a mocked router service that reflects
///    back the body (to validate that the plugin is working and passes the body correctly)
/// 3. Run HTTP mock to create a mock Hive CDN server
#[cfg(test)]
mod hive_persisted_documents_tests {
    use apollo_router::plugin::test::MockRouterService;
    use futures::executor::block_on;
    use http::Method;
    use httpmock::{Method::GET, Mock, MockServer};
    use serde_json::json;

    use super::*;

    /// Creates a regular GraphQL request with a very simple GraphQL query:
    /// { "query": "query { __typename }" }
    fn create_regular_request() -> router::Request {
        let mut r = graphql::Request::default();

        r.query = Some("query { __typename }".into());

        router::Request::fake_builder()
            .method(Method::POST)
            .body(serde_json::to_string(&r).unwrap())
            .header("content-type", "application/json")
            .build()
            .unwrap()
    }

    /// Creates a persisted document request with a document id and optional variables.
    /// The document id is used to fetch the persisted document from the CDN.
    /// { "documentId": "123", "variables": { ... } }
    fn create_persisted_request(
        document_id: &str,
        variables: Option<serde_json::Value>,
    ) -> router::Request {
        let body = json!({
            "documentId": document_id,
            "variables": variables,
        });

        let body_str = serde_json::to_string(&body).unwrap();

        router::Request::fake_builder()
            .body(body_str)
            .header("content-type", "application/json")
            .build()
            .unwrap()
    }

    /// Creates an "invalid" persisted request with an empty JSON object body.
    fn create_invalid_req() -> router::Request {
        router::Request::fake_builder()
            .method(Method::POST)
            .body(serde_json::to_string(&json!({})).unwrap())
            .header("content-type", "application/json")
            .build()
            .unwrap()
    }

    struct PersistedDocumentsCDNMock {
        server: MockServer,
    }

    impl PersistedDocumentsCDNMock {
        fn new() -> Self {
            let server = MockServer::start();

            Self { server }
        }

        fn endpoint(&self) -> String {
            self.server.url("")
        }

        /// Registers a valid artifact URL with an actual GraphQL document
        fn add_valid(&'_ self, document_id: &str) -> Mock<'_> {
            let valid_artifact_url = format!("/apps/{}", str::replace(document_id, "~", "/"));
            let document = "query { __typename }";
            let mock = self.server.mock(|when, then| {
                when.method(GET).path(valid_artifact_url);
                then.status(200)
                    .header("content-type", "text/plain")
                    .body(document);
            });

            mock
        }
    }

    async fn get_body(router_req: router::Request) -> String {
        let (_parts, body) = router_req.router_request.into_parts();
        let body = body.collect().await.unwrap().to_bytes();
        String::from_utf8(body.to_vec()).unwrap()
    }

    /// Creates a mocked router service that reflects the incoming body
    /// back to the client.
    /// We are using this mocked router in order to make sure that the Persisted Documents layer
    /// is able to resolve, fetch and pass the document to the next layer.
    fn create_reflecting_mocked_router() -> MockRouterService {
        let mut mocked_execution: MockRouterService = MockRouterService::new();

        mocked_execution
            .expect_call()
            .times(1)
            .returning(move |req| {
                let incoming_body = block_on(get_body(req));
                Ok(router::Response::fake_builder()
                    .data(json!({
                        "incomingBody": incoming_body,
                    }))
                    .build()
                    .unwrap())
            });

        mocked_execution
    }

    /// Creates a mocked router service that returns a fake GraphQL response.
    fn create_dummy_mocked_router() -> MockRouterService {
        let mut mocked_execution = MockRouterService::new();

        mocked_execution.expect_call().times(1).returning(move |_| {
            Ok(router::Response::fake_builder()
                .data(json!({
                    "__typename": "Query"
                }))
                .build()
                .unwrap())
        });

        mocked_execution
    }

    #[tokio::test]
    async fn should_allow_arbitrary_when_regular_req_is_sent() {
        let service = create_reflecting_mocked_router();
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some("https://cdn.example.com".into()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(true),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(service.boxed());

        let request = create_regular_request();
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "data": {
                    "incomingBody": "{\"query\":\"query { __typename }\"}"
                }
            })
            .to_string()
            .as_bytes()
        );
    }

    #[tokio::test]
    async fn should_disallow_arbitrary_when_regular_req_sent() {
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some("https://cdn.example.com".into()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(MockRouterService::new().boxed());

        let request = create_regular_request();
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "errors": [
                    {
                        "message": "No persisted document provided, or document id cannot be resolved.",
                        "extensions": {
                            "code": "PERSISTED_DOCUMENT_REQUIRED"
                        }
                    }
                ]
            })
            .to_string()
            .as_bytes()
        );
    }

    #[tokio::test]
    async fn returns_not_found_error_for_missing_persisted_query() {
        let cdn_mock = PersistedDocumentsCDNMock::new();
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(true),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(MockRouterService::new().boxed());

        let request = create_persisted_request("123", None);
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "errors": [
                    {
                        "message": "Persisted document not found.",
                        "extensions": {
                            "code": "PERSISTED_DOCUMENT_NOT_FOUND"
                        }
                    }
                ]
            })
            .to_string()
            .as_bytes()
        );
    }

    #[tokio::test]
    async fn returns_key_not_found_error_for_missing_input() {
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some("https://cdn.example.com".into()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(true),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(MockRouterService::new().boxed());

        let request = create_invalid_req();
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "errors": [
                    {
                        "message": "Failed to locate the persisted document key in request.",
                        "extensions": {
                            "code": "PERSISTED_DOCUMENT_KEY_NOT_FOUND"
                        }
                    }
                ]
            })
            .to_string()
            .as_bytes()
        );
    }

    #[tokio::test]
    async fn rejects_req_when_cdn_not_available() {
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some("https://127.0.0.1:9999".into()), // Invalid endpoint
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(MockRouterService::new().boxed());

        let request = create_persisted_request("123", None);
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "errors": [
                    {
                        "message": "Failed to validate persisted document",
                        "extensions": {
                            "code": "FAILED_TO_FETCH_FROM_CDN"
                        }
                    }
                ]
            })
            .to_string()
            .as_bytes()
        );
    }

    #[tokio::test]
    async fn should_return_valid_response() {
        let cdn_mock = PersistedDocumentsCDNMock::new();
        cdn_mock.add_valid("my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f");
        let upstream = create_dummy_mocked_router();
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(upstream.boxed());

        let request = create_persisted_request(
            "my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f",
            None,
        );
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "data": {
                    "__typename": "Query"
                }
            })
            .to_string()
            .as_bytes()
        );
    }

    #[tokio::test]
    async fn should_passthrough_additional_req_params() {
        let cdn_mock = PersistedDocumentsCDNMock::new();
        cdn_mock.add_valid("my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f");
        let upstream = create_reflecting_mocked_router();
        let service_stack = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin")
        .router_service(upstream.boxed());

        let request = create_persisted_request(
            "my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f",
            Some(json!({"var": "value"})),
        );
        let mut response = service_stack.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();

        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            "{\"data\":{\"incomingBody\":\"{\\\"query\\\":\\\"query { __typename }\\\",\\\"variables\\\":{\\\"var\\\":\\\"value\\\"}}\"}}"
        );
    }

    #[tokio::test]
    async fn should_use_caching_for_documents() {
        let cdn_mock = PersistedDocumentsCDNMock::new();
        let cdn_req_mock = cdn_mock.add_valid("my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f");

        let p = PersistedDocumentsPlugin::from_config(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .expect("Failed to create PersistedDocumentsPlugin");
        let s1 = p.router_service(create_dummy_mocked_router().boxed());
        let s2 = p.router_service(create_dummy_mocked_router().boxed());

        // first call
        let request = create_persisted_request(
            "my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f",
            None,
        );

        let mut response = s1.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();
        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "data": {
                    "__typename": "Query"
                }
            })
            .to_string()
            .as_bytes()
        );

        // second call
        let request = create_persisted_request(
            "my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f",
            None,
        );
        let mut response = s2.oneshot(request).await.unwrap();
        let response_inner = response.next_response().await.unwrap().unwrap();
        assert_eq!(response.response.status(), StatusCode::OK);
        assert_eq!(
            response_inner,
            json!({
                "data": {
                    "__typename": "Query"
                }
            })
            .to_string()
            .as_bytes()
        );

        // makes sure cdn called only once. If called more than once, it will fail with 404 -> leading to error (and the above assertion will fail...)
        cdn_req_mock.assert();
    }
}
