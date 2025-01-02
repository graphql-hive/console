use apollo_router::graphql;
use apollo_router::graphql::Error;
use apollo_router::layers::ServiceBuilderExt;
use apollo_router::plugin::Plugin;
use apollo_router::plugin::PluginInit;
use apollo_router::services::router;
use apollo_router::services::router::Body;
use apollo_router::Context;
use core::ops::Drop;
use std::env;
use futures::FutureExt;
use http::StatusCode;
use lru::LruCache;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::num::NonZeroUsize;
use std::ops::ControlFlow;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tower::{BoxError, ServiceBuilder, ServiceExt};
use tracing::{debug, info, warn};
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{RetryTransientMiddleware, policies::ExponentialBackoff};

pub struct PersistedDocumentsPlugin {
    persisted_documents_manager: Arc<PersistedDocumentsManager>,
    configuration: Config,
}

pub(crate) static PERSISTED_DOCUMENT_HASH_KEY: &str = "hive::persisted_document_hash";

#[derive(Clone, Debug, Deserialize, JsonSchema, Default)]
pub struct Config {
    enabled: Option<bool>,
    /// GraphQL Hive persisted documents CDN endpoint URL.
    endpoint: Option<String>,
    /// GraphQL Hive persisted documents CDN access token.
    key: Option<String>,
    /// Whether arbitrary documents should be allowed along-side persisted documents.
    /// default: false
    allow_arbitrary_documents: Option<bool>,
    /// A timeout for only the connect phase of a request to GraphQL Hive
    /// Unit: seconds
    /// Default: 5
    connect_timeout: Option<u64>,
    /// Retry count for the request to CDN request
    /// Default: 3
    retry_count: Option<u32>,
    /// A timeout for the entire request to GraphQL Hive
    /// Unit: seconds
    /// Default: 15
    request_timeout: Option<u64>,
    /// Accept invalid SSL certificates
    /// default: false
    accept_invalid_certs: Option<bool>,
    /// Configuration for the size of the in-memory caching of persisted documents.
    /// Default: 1000
    cache_size: Option<usize>,
}

impl PersistedDocumentsPlugin {
    #[cfg(test)]
    fn new(config: Config) -> Self {
        PersistedDocumentsPlugin {
            configuration: config.clone(),
            persisted_documents_manager: Arc::new(PersistedDocumentsManager::new(&config)),
        }
    }
}

#[async_trait::async_trait]
impl Plugin for PersistedDocumentsPlugin {
    type Config = Config;

    async fn new(init: PluginInit<Config>) -> Result<Self, BoxError> {
        let mut config = init.config.clone();
        if init.config.endpoint.is_none() {
            if let Ok(endpoint) = env::var("HIVE_CDN_ENDPOINT") {
                config.endpoint = Some(str::replace(&endpoint, "/supergraph", ""));
            }
        }

        if init.config.key.is_none() {
            if let Ok(key) = env::var("HIVE_CDN_KEY") {
                config.key = Some(key);
            }
        }

        Ok(PersistedDocumentsPlugin {
            configuration: config.clone(),
            persisted_documents_manager: Arc::new(PersistedDocumentsManager::new(&config)),
        })
    }

    fn router_service(&self, service: router::BoxService) -> router::BoxService {
        let enabled = self.configuration.enabled.unwrap_or(true);
        let allow_arbitrary_documents = self
            .configuration
            .allow_arbitrary_documents
            .unwrap_or(false);
        let mgr_ref = self.persisted_documents_manager.clone();

        if enabled {
            ServiceBuilder::new()
                .oneshot_checkpoint_async(move |req: router::Request| {
                    let mgr = mgr_ref.clone();

                    async move {
                        let (parts, body) = req.router_request.into_parts();
                        let bytes: hyper::body::Bytes = hyper::body::to_bytes(body)
                            .await
                            .map_err(PersistedDocumentsError::FailedToReadBody)?;

                        let payload = PersistedDocumentsManager::extract_document_id(&bytes);

                        let mut payload = match payload {
                            Ok(payload) => payload,
                            Err(e) => {
                                return Ok(ControlFlow::Break(e.to_router_response(req.context)));
                            }
                        };

                        if payload.original_req.query.is_some() {
                            if allow_arbitrary_documents {
                                let roll_req: router::Request = (
                                    http::Request::<Body>::from_parts(parts, bytes.into()),
                                    req.context,
                                )
                                    .into();

                                return Ok(ControlFlow::Continue(roll_req));
                            } else {
                                return Ok(ControlFlow::Break(
                                    PersistedDocumentsError::PersistedDocumentRequired
                                        .to_router_response(req.context),
                                ));
                            }
                        }

                        if payload.document_id.is_none() {
                            return Ok(ControlFlow::Break(
                                PersistedDocumentsError::KeyNotFound
                                    .to_router_response(req.context),
                            ));
                        }

                        match payload.document_id.as_ref() {
                            None => {
                                return Ok(ControlFlow::Break(
                                    PersistedDocumentsError::PersistedDocumentRequired
                                        .to_router_response(req.context),
                                ));
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
                                        http::Request::<Body>::from_parts(parts, bytes.into()),
                                        req.context,
                                    )
                                        .into();

                                    Ok(ControlFlow::Continue(roll_req))
                                }
                                Err(e) => {
                                    return Ok(ControlFlow::Break(
                                        e.to_router_response(req.context),
                                    ));
                                }
                            },
                        }
                    }
                    .boxed()
                })
                .service(service)
                .boxed()
        } else {
            service
        }
    }
}

impl Drop for PersistedDocumentsPlugin {
    fn drop(&mut self) {
        debug!("PersistedDocumentsPlugin has been dropped!");
    }
}

#[derive(Debug)]
struct PersistedDocumentsManager {
    agent: ClientWithMiddleware,
    cache: Arc<Mutex<LruCache<String, String>>>,
    config: Config,
}

#[derive(Debug, thiserror::Error)]
pub enum PersistedDocumentsError {
    #[error("Failed to read body: {0}")]
    FailedToReadBody(hyper::Error),
    #[error("Failed to parse body: {0}")]
    FailedToParseBody(serde_json::Error),
    #[error("Persisted document not found.")]
    DocumentNotFound,
    #[error("Failed to locate the persisted document key in request.")]
    KeyNotFound,
    #[error("Failed to validate persisted document")]
    FailedToFetchFromCDN(reqwest_middleware::Error),
    #[error("Failed to read CDN response body")]
    FailedToReadCDNResponse(reqwest::Error),
    #[error("No persisted document provided, or document id cannot be resolved.")]
    PersistedDocumentRequired,
}

impl PersistedDocumentsError {
    fn message(&self) -> String {
        self.to_string()
    }

    fn code(&self) -> String {
        match self {
            PersistedDocumentsError::FailedToReadBody(_) => "FAILED_TO_READ_BODY".into(),
            PersistedDocumentsError::FailedToParseBody(_) => "FAILED_TO_PARSE_BODY".into(),
            PersistedDocumentsError::DocumentNotFound => "PERSISTED_DOCUMENT_NOT_FOUND".into(),
            PersistedDocumentsError::KeyNotFound => "PERSISTED_DOCUMENT_KEY_NOT_FOUND".into(),
            PersistedDocumentsError::FailedToFetchFromCDN(_) => "FAILED_TO_FETCH_FROM_CDN".into(),
            PersistedDocumentsError::FailedToReadCDNResponse(_) => "FAILED_TO_READ_CDN_RESPONSE".into(),
            PersistedDocumentsError::PersistedDocumentRequired => {
                "PERSISTED_DOCUMENT_REQUIRED".into()
            }
        }
    }

    fn to_router_response(&self, ctx: Context) -> router::Response {
        let errors = vec![Error::builder()
            .message(self.message())
            .extension_code(self.code())
            .build()];

        router::Response::error_builder()
            .errors(errors)
            .status_code(StatusCode::OK)
            .context(ctx)
            .build()
            .unwrap()
    }
}

impl PersistedDocumentsManager {
    fn new(config: &Config) -> Self {
        let retry_policy = ExponentialBackoff::builder().build_with_max_retries(config.retry_count.unwrap_or(3));

        let reqwest_agent = reqwest::Client::builder()
        .danger_accept_invalid_certs(config.accept_invalid_certs.unwrap_or(false))
        .connect_timeout(Duration::from_secs(config.connect_timeout.unwrap_or(5)))
        .timeout(Duration::from_secs(config.request_timeout.unwrap_or(15))).build().expect("Failed to create reqwest client");
        let agent = ClientBuilder::new(reqwest_agent).with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build();

        let cache_size = config.cache_size.unwrap_or(1000);
        let cache = Arc::new(Mutex::new(LruCache::<String, String>::new(
            NonZeroUsize::new(cache_size).unwrap(),
        )));

        Self {
            agent,
            cache,
            config: config.clone(),
        }
    }

    /// Extracts the document id from the request body.
    /// In case of a parsing error, it returns the error.
    /// This will also try to parse other GraphQL-related (see `original_req`) fields in order to 
    /// pass it to the next layer.
    fn extract_document_id(
        body: &hyper::body::Bytes,
    ) -> Result<ExpectedBodyStructure, PersistedDocumentsError> {
        serde_json::from_slice::<ExpectedBodyStructure>(&body)
            .map_err(PersistedDocumentsError::FailedToParseBody)
    }

    /// Resolves the document from the cache, or from the CDN
    async fn resolve_document(&self, document_id: &str) -> Result<String, PersistedDocumentsError> {
        let cached_record = self.cache.lock().await.get(document_id).cloned();

        match cached_record {
            Some(document) => {
                debug!("Document {} found in cache: {}", document_id, document);

                return Ok(document);
            }
            None => {
                debug!(
                    "Document {} not found in cache. Fetching from CDN",
                    document_id
                );
                let cdn_document_id = str::replace(document_id, "~", "/");
                let cdn_artifact_url = format!("{}/apps/{}", self.config.endpoint.as_ref().unwrap(), cdn_document_id);
                info!(
                    "Fetching document {} from CDN: {}",
                    document_id, cdn_artifact_url
                );
                let cdn_response = self
                    .agent
                    .get(cdn_artifact_url)
                    .header("X-Hive-CDN-Key", self.config.key.as_ref().unwrap())
                    .send()
                    .await;

                match cdn_response {
                    Ok(response) => {
                        if response.status().is_success() {
                            let document = response.text().await.map_err(PersistedDocumentsError::FailedToReadCDNResponse)?;
                            debug!(
                                "Document fetched from CDN: {}, storing in local cache",
                                document
                            );
                            self.cache
                                .lock()
                                .await
                                .put(document_id.into(), document.clone());

                            return Ok(document);
                        }

                        warn!(
                            "Document fetch from CDN failed: HTTP {}, Body: {:?}",
                            response.status(),
                            response.text().await.unwrap_or_else(|_| "Unavailable".to_string())
                        );

                        return Err(PersistedDocumentsError::DocumentNotFound);
                    }
                    Err(e) => {
                        warn!("Failed to fetch document from CDN: {:?}", e);

                        return Err(PersistedDocumentsError::FailedToFetchFromCDN(e));
                    }
                }
            }
        }
    }
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
            .body(Body::from(serde_json::to_string(&r).unwrap()))
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
        fn add_valid(&self, document_id: &str) -> Mock {
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
        let body = hyper::body::to_bytes(body).await.unwrap();
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some("https://cdn.example.com".into()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(true),
            ..Default::default()
        })
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some("https://cdn.example.com".into()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(true),
            ..Default::default()
        })
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some("https://cdn.example.com".into()),
            key: Some("123".into()),
            allow_arbitrary_documents: Some(true),
            ..Default::default()
        })
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some("https://127.0.0.1:9999".into()), // Invalid endpoint
            key: Some("123".into()),
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),           
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .router_service(upstream.boxed());

        let request = create_persisted_request("my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f", None);
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
        let service_stack = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),           
            allow_arbitrary_documents: Some(false),
            ..Default::default()
        })
        .router_service(upstream.boxed());

        let request = create_persisted_request(
            "my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f", 
            Some(json!({"var": "value"}))
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

        let p = PersistedDocumentsPlugin::new(Config {
            enabled: Some(true),
            endpoint: Some(cdn_mock.endpoint()),
            key: Some("123".into()),            allow_arbitrary_documents: Some(false),
            ..Default::default()
        });
        let s1 = p.router_service(create_dummy_mocked_router().boxed());
        let s2 = p.router_service(create_dummy_mocked_router().boxed());

        // first call
        let request = create_persisted_request("my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f", None);

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
        let request = create_persisted_request("my-app~cacb95c69ba4684aec972777a38cd106740c6453~04bfa72dfb83b297dd8a5b6fed9bafac2b395a0f", None);
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
