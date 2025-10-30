use super::graphql::OperationProcessor;
use graphql_parser::schema::Document;
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use serde::Serialize;
use std::{
    collections::{HashMap, VecDeque},
    sync::{Arc, Mutex},
    time::Duration,
};
use thiserror::Error;
use tokio_util::sync::CancellationToken;

#[derive(Serialize, Debug)]
pub struct Report {
    size: usize,
    map: HashMap<String, OperationMapRecord>,
    operations: Vec<Operation>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
struct OperationMapRecord {
    operation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    operationName: Option<String>,
    fields: Vec<String>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
struct Operation {
    operationMapKey: String,
    timestamp: u64,
    execution: Execution,
    #[serde(skip_serializing_if = "Option::is_none")]
    metadata: Option<Metadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    persistedDocumentHash: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
struct Execution {
    ok: bool,
    duration: u128,
    errorsTotal: usize,
}

#[derive(Serialize, Debug)]
struct Metadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    client: Option<ClientInfo>,
}

#[derive(Serialize, Debug)]
struct ClientInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    version: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ExecutionReport {
    pub schema: Arc<Document<'static, String>>,
    pub client_name: Option<String>,
    pub client_version: Option<String>,
    pub timestamp: u64,
    pub duration: Duration,
    pub ok: bool,
    pub errors: usize,
    pub operation_body: String,
    pub operation_name: Option<String>,
    pub persisted_document_hash: Option<String>,
}

#[derive(Debug, Default)]
pub struct Buffer(Mutex<VecDeque<ExecutionReport>>);

impl Buffer {
    fn new() -> Self {
        Self(Mutex::new(VecDeque::new()))
    }

    fn lock_buffer(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, VecDeque<ExecutionReport>>, AgentError> {
        let buffer: Result<std::sync::MutexGuard<'_, VecDeque<ExecutionReport>>, AgentError> =
            self.0.lock().map_err(|e| AgentError::Lock(e.to_string()));
        buffer
    }

    pub fn push(&self, report: ExecutionReport) -> Result<usize, AgentError> {
        let mut buffer = self.lock_buffer()?;
        buffer.push_back(report);
        Ok(buffer.len())
    }

    pub fn drain(&self) -> Result<Vec<ExecutionReport>, AgentError> {
        let mut buffer = self.lock_buffer()?;
        let reports: Vec<ExecutionReport> = buffer.drain(..).collect();
        Ok(reports)
    }
}

#[derive(Clone)]
pub struct UsageAgent {
    token: String,
    buffer_size: usize,
    endpoint: String,
    buffer: Arc<Buffer>,
    processor: Arc<OperationProcessor>,
    client: ClientWithMiddleware,
    flush_interval: Duration,
    user_agent: String,
}

fn non_empty_string(value: Option<String>) -> Option<String> {
    value.filter(|str| str.is_empty())
}

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("unable to acquire lock: {0}")]
    Lock(String),
    #[error("unable to send report: token is missing")]
    Unauthorized,
    #[error("unable to send report: no access")]
    Forbidden,
    #[error("unable to send report: rate limited")]
    RateLimited,
    #[error("unable to send report: {0}")]
    Unknown(String),
}

impl UsageAgent {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        token: String,
        endpoint: String,
        target_id: Option<String>,
        buffer_size: usize,
        connect_timeout: Duration,
        request_timeout: Duration,
        accept_invalid_certs: bool,
        flush_interval: Duration,
        user_agent: String,
    ) -> Self {
        let processor = Arc::new(OperationProcessor::new());

        let retry_policy = ExponentialBackoff::builder().build_with_max_retries(3);

        let reqwest_agent = reqwest::Client::builder()
            .danger_accept_invalid_certs(accept_invalid_certs)
            .connect_timeout(connect_timeout)
            .timeout(request_timeout)
            .build()
            .map_err(|err| err.to_string())
            .expect("Couldn't instantiate the http client for reports sending!");
        let client = ClientBuilder::new(reqwest_agent)
            .with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build();
        let buffer = Arc::new(Buffer::new());

        let mut endpoint = endpoint;

        if token.starts_with("hvo1/") {
            if let Some(target_id) = target_id {
                endpoint.push_str(&format!("/{}", target_id));
            }
        }

        UsageAgent {
            buffer,
            processor,
            endpoint,
            token,
            buffer_size,
            client,
            flush_interval,
            user_agent,
        }
    }

    fn produce_report(&self, reports: Vec<ExecutionReport>) -> Result<Report, AgentError> {
        let mut report = Report {
            size: 0,
            map: HashMap::new(),
            operations: Vec::new(),
        };

        // iterate over reports and check if they are valid
        for op in reports {
            let operation = self.processor.process(&op.operation_body, &op.schema);
            match operation {
                Err(e) => {
                    tracing::warn!(
                        "Dropping operation \"{}\" (phase: PROCESSING): {}",
                        op.operation_name
                            .clone()
                            .or_else(|| Some("anonymous".to_string()))
                            .unwrap(),
                        e
                    );
                    continue;
                }
                Ok(operation) => match operation {
                    Some(operation) => {
                        let hash = operation.hash;

                        let client_name = non_empty_string(op.client_name);
                        let client_version = non_empty_string(op.client_version);

                        let metadata: Option<Metadata> =
                            if client_name.is_some() || client_version.is_some() {
                                Some(Metadata {
                                    client: Some(ClientInfo {
                                        name: client_name,
                                        version: client_version,
                                    }),
                                })
                            } else {
                                None
                            };
                        report.operations.push(Operation {
                            operationMapKey: hash.clone(),
                            timestamp: op.timestamp,
                            execution: Execution {
                                ok: op.ok,
                                duration: op.duration.as_nanos(),
                                errorsTotal: op.errors,
                            },
                            persistedDocumentHash: op.persisted_document_hash,
                            metadata,
                        });
                        if let std::collections::hash_map::Entry::Vacant(e) = report.map.entry(hash)
                        {
                            e.insert(OperationMapRecord {
                                operation: operation.operation,
                                operationName: non_empty_string(op.operation_name),
                                fields: operation.coordinates,
                            });
                        }
                        report.size += 1;
                    }
                    None => {
                        tracing::debug!(
                            "Dropping operation (phase: PROCESSING): probably introspection query"
                        );
                    }
                },
            }
        }

        Ok(report)
    }

    pub fn add_report(&self, execution_report: ExecutionReport) -> Result<(), AgentError> {
        let size = self.buffer.push(execution_report)?;

        self.flush_if_full(size)?;

        Ok(())
    }

    pub async fn send_report(&self, report: Report) -> Result<(), AgentError> {
        let report_body =
            serde_json::to_vec(&report).map_err(|e| AgentError::Unknown(e.to_string()))?;
        // Based on https://the-guild.dev/graphql/hive/docs/specs/usage-reports#data-structure
        let resp = self
            .client
            .post(&self.endpoint)
            .header("X-Usage-API-Version", "2")
            .header(
                reqwest::header::AUTHORIZATION,
                format!("Bearer {}", self.token),
            )
            .header(reqwest::header::USER_AGENT, self.user_agent.to_string())
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .header(reqwest::header::CONTENT_LENGTH, report_body.len())
            .body(report_body)
            .send()
            .await
            .map_err(|e| AgentError::Unknown(e.to_string()))?;

        match resp.status() {
            reqwest::StatusCode::OK => Ok(()),
            reqwest::StatusCode::UNAUTHORIZED => Err(AgentError::Unauthorized),
            reqwest::StatusCode::FORBIDDEN => Err(AgentError::Forbidden),
            reqwest::StatusCode::TOO_MANY_REQUESTS => Err(AgentError::RateLimited),
            _ => Err(AgentError::Unknown(format!(
                "({}) {}",
                resp.status(),
                resp.text().await.unwrap_or_default()
            ))),
        }
    }

    pub fn flush_if_full(&self, size: usize) -> Result<(), AgentError> {
        if size >= self.buffer_size {
            let cloned_self = self.clone();
            tokio::task::spawn(async move {
                cloned_self.flush().await;
            });
        }

        Ok(())
    }

    pub async fn flush(&self) {
        let execution_reports = match self.buffer.drain() {
            Ok(res) => res,
            Err(e) => {
                tracing::error!("Unable to acquire lock for State in drain_reports: {}", e);
                Vec::new()
            }
        };
        let size = execution_reports.len();

        if size > 0 {
            match self.produce_report(execution_reports) {
                Ok(report) => match self.send_report(report).await {
                    Ok(_) => tracing::debug!("Reported {} operations", size),
                    Err(e) => tracing::error!("{}", e),
                },
                Err(e) => tracing::error!("{}", e),
            }
        }
    }
    pub async fn start_flush_interval(&self, token: Option<CancellationToken>) {
        let mut tokio_interval = tokio::time::interval(self.flush_interval);

        match token {
            Some(token) => loop {
                tokio::select! {
                    _ = tokio_interval.tick() => { self.flush().await; }
                    _ = token.cancelled() => { println!("Shutting down."); return; }
                }
            },
            None => loop {
                tokio_interval.tick().await;
                self.flush().await;
            },
        }
    }
}
