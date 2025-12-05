use std::{sync::Arc, time::Duration};

use reqwest::header::{HeaderMap, HeaderValue};
use reqwest_middleware::ClientBuilder;
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};

use crate::agent::usage_agent::{non_empty_string, AgentError, Buffer, UsageAgent};
use crate::agent::utils::OperationProcessor;

pub struct UsageAgentBuilder {
    _token: Option<String>,
    _endpoint: String,
    _target_id: Option<String>,
    _buffer_size: usize,
    _connect_timeout: Duration,
    _request_timeout: Duration,
    _accept_invalid_certs: bool,
    _flush_interval: Duration,
    _retry_policy: ExponentialBackoff,
    _user_agent: Option<String>,
}

pub static DEFAULT_HIVE_USAGE_ENDPOINT: &str = "https://app.graphql-hive.com/usage";

impl Default for UsageAgentBuilder {
    fn default() -> Self {
        Self {
            _endpoint: DEFAULT_HIVE_USAGE_ENDPOINT.to_string(),
            _token: None,
            _target_id: None,
            _buffer_size: 1000,
            _connect_timeout: Duration::from_secs(5),
            _request_timeout: Duration::from_secs(15),
            _accept_invalid_certs: false,
            _flush_interval: Duration::from_secs(5),
            _retry_policy: ExponentialBackoff::builder().build_with_max_retries(3),
            _user_agent: None,
        }
    }
}

fn is_legacy_token(token: &str) -> bool {
    !token.starts_with("hvo1/") && !token.starts_with("hvu1/") && !token.starts_with("hvp1/")
}

impl UsageAgentBuilder {
    /// Your [Registry Access Token](https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens) with write permission.
    pub fn token(mut self, token: String) -> Self {
        self._token = non_empty_string(Some(token));
        self
    }
    /// For self-hosting, you can override `/usage` endpoint (defaults to `https://app.graphql-hive.com/usage`).
    pub fn endpoint(mut self, endpoint: String) -> Self {
        if let Some(endpoint) = non_empty_string(Some(endpoint)) {
            self._endpoint = endpoint;
        }
        self
    }
    /// A target ID, this can either be a slug following the format “$organizationSlug/$projectSlug/$targetSlug” (e.g “the-guild/graphql-hive/staging”) or an UUID (e.g. “a0f4c605-6541-4350-8cfe-b31f21a4bf80”). To be used when the token is configured with an organization access token.
    pub fn target_id(mut self, target_id: String) -> Self {
        self._target_id = non_empty_string(Some(target_id));
        self
    }
    /// A maximum number of operations to hold in a buffer before sending to Hive Console
    /// Default: 1000
    pub fn buffer_size(mut self, buffer_size: usize) -> Self {
        self._buffer_size = buffer_size;
        self
    }
    /// A timeout for only the connect phase of a request to Hive Console
    /// Default: 5 seconds
    pub fn connect_timeout(mut self, connect_timeout: Duration) -> Self {
        self._connect_timeout = connect_timeout;
        self
    }
    /// A timeout for the entire request to Hive Console
    /// Default: 15 seconds
    pub fn request_timeout(mut self, request_timeout: Duration) -> Self {
        self._request_timeout = request_timeout;
        self
    }
    /// Accepts invalid SSL certificates
    /// Default: false
    pub fn accept_invalid_certs(mut self, accept_invalid_certs: bool) -> Self {
        self._accept_invalid_certs = accept_invalid_certs;
        self
    }
    /// Frequency of flushing the buffer to the server
    /// Default: 5 seconds
    pub fn flush_interval(mut self, flush_interval: Duration) -> Self {
        self._flush_interval = flush_interval;
        self
    }
    /// User-Agent header to be sent with each request
    pub fn user_agent(mut self, user_agent: String) -> Self {
        self._user_agent = non_empty_string(Some(user_agent));
        self
    }
    /// Retry policy for sending reports
    /// Default: ExponentialBackoff with max 3 retries
    pub fn retry_policy(mut self, retry_policy: ExponentialBackoff) -> Self {
        self._retry_policy = retry_policy;
        self
    }
    /// Maximum number of retries for sending reports
    /// Default: ExponentialBackoff with max 3 retries
    pub fn max_retries(mut self, max_retries: u32) -> Self {
        self._retry_policy = ExponentialBackoff::builder().build_with_max_retries(max_retries);
        self
    }
    pub fn build(self) -> Result<Arc<UsageAgent>, AgentError> {
        let mut default_headers = HeaderMap::new();

        default_headers.insert("X-Usage-API-Version", HeaderValue::from_static("2"));

        if let Some(token) = self._token {
            let mut authorization_header = HeaderValue::from_str(&format!("Bearer {}", token))
                .map_err(|_| AgentError::InvalidToken)?;

            authorization_header.set_sensitive(true);

            default_headers.insert(reqwest::header::AUTHORIZATION, authorization_header);

            default_headers.insert(
                reqwest::header::CONTENT_TYPE,
                HeaderValue::from_static("application/json"),
            );

            let mut reqwest_agent = reqwest::Client::builder()
                .danger_accept_invalid_certs(self._accept_invalid_certs)
                .connect_timeout(self._connect_timeout)
                .timeout(self._request_timeout)
                .default_headers(default_headers);

            if let Some(user_agent) = &self._user_agent {
                reqwest_agent = reqwest_agent.user_agent(user_agent);
            }

            let reqwest_agent = reqwest_agent
                .build()
                .map_err(AgentError::HTTPClientCreationError)?;
            let client = ClientBuilder::new(reqwest_agent)
                .with(RetryTransientMiddleware::new_with_policy(
                    self._retry_policy,
                ))
                .build();

            let mut endpoint = self._endpoint;

            match self._target_id {
                Some(_) if is_legacy_token(&token) => {
                    return Err(AgentError::TargetIdWithLegacyToken)
                }
                Some(target_id) if !is_legacy_token(&token) => {
                    let target_id = validate_target_id(&target_id)?;
                    endpoint.push_str(&format!("/{}", target_id));
                }
                None if !is_legacy_token(&token) => return Err(AgentError::MissingTargetId),
                _ => {}
            }

            Ok(Arc::new(UsageAgent {
                endpoint,
                buffer: Buffer::new(self._buffer_size),
                processor: OperationProcessor::new(),
                client,
                flush_interval: self._flush_interval,
            }))
        } else {
            Err(AgentError::MissingToken)
        }
    }
}

// Target ID regexp for validation: slug format
const TARGET_ID_SLUG_REGEX: &str = r"^[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$";
// Target ID regexp for validation: UUID format
const TARGET_ID_UUID_REGEX: &str =
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

fn validate_target_id(target_id: &str) -> Result<&str, AgentError> {
    let trimmed_s = target_id.trim();
    if trimmed_s.is_empty() {
        Err(AgentError::InvalidTargetId("<empty>".to_string()))
    } else {
        let slug_regex = regex_automata::meta::Regex::new(TARGET_ID_SLUG_REGEX).map_err(|err| {
            AgentError::TargetIdRegexError(format!(
                "Failed to compile target_id slug regex: {}",
                err
            ))
        })?;
        if slug_regex.is_match(trimmed_s) {
            return Ok(trimmed_s);
        }
        let uuid_regex = regex_automata::meta::Regex::new(TARGET_ID_UUID_REGEX).map_err(|err| {
            AgentError::TargetIdRegexError(format!(
                "Failed to compile target_id UUID regex: {}",
                err
            ))
        })?;
        if uuid_regex.is_match(trimmed_s) {
            return Ok(trimmed_s);
        }
        Err(AgentError::InvalidTargetId(format!(
            "Invalid target_id format: '{}'. It must be either in slug format '$organizationSlug/$projectSlug/$targetSlug' or UUID format 'a0f4c605-6541-4350-8cfe-b31f21a4bf80'",
            trimmed_s
        )))
    }
}
