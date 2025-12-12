use graphql_parser::schema::Document;
use recloser::AsyncRecloser;
use reqwest_middleware::ClientWithMiddleware;
use std::{
    collections::{hash_map::Entry, HashMap, VecDeque},
    sync::{Arc, Mutex},
    time::Duration,
};
use thiserror::Error;
use tokio_util::sync::CancellationToken;

use crate::agent::builder::UsageAgentBuilder;
use crate::agent::utils::OperationProcessor;

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

typify::import_types!(schema = "./usage-report-v2.schema.json");

#[derive(Debug, Default)]
pub struct Buffer {
    queue: Mutex<VecDeque<ExecutionReport>>,
    size: usize,
}

impl Buffer {
    pub fn new(size: usize) -> Self {
        Self {
            queue: Mutex::new(VecDeque::new()),
            size,
        }
    }

    fn lock_buffer(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, VecDeque<ExecutionReport>>, AgentError> {
        let buffer: Result<std::sync::MutexGuard<'_, VecDeque<ExecutionReport>>, AgentError> = self
            .queue
            .lock()
            .map_err(|e| AgentError::Lock(e.to_string()));
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
pub struct UsageAgent {
    pub(crate) endpoint: String,
    pub(crate) buffer: Buffer,
    pub(crate) processor: OperationProcessor,
    pub(crate) client: ClientWithMiddleware,
    pub(crate) flush_interval: Duration,
    pub(crate) circuit_breaker: AsyncRecloser,
}

pub fn non_empty_string(value: Option<String>) -> Option<String> {
    value.filter(|str| !str.is_empty())
}

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("unable to acquire lock: {0}")]
    Lock(String),
    #[error("unable to send report: unauthorized")]
    Unauthorized,
    #[error("unable to send report: no access")]
    Forbidden,
    #[error("unable to send report: rate limited")]
    RateLimited,
    #[error("missing token")]
    MissingToken,
    #[error("your access token requires providing a 'target_id' option.")]
    MissingTargetId,
    #[error("using 'target_id' with legacy tokens is not supported")]
    TargetIdWithLegacyToken,
    #[error("invalid token provided")]
    InvalidToken,
    #[error("invalid target id provided: {0}, it should be either a slug like \"$organizationSlug/$projectSlug/$targetSlug\" or an UUID")]
    InvalidTargetId(String),
    #[error("unable to instantiate the http client for reports sending: {0}")]
    HTTPClientCreationError(reqwest::Error),
    #[error("unable to create circuit breaker: {0}")]
    CircuitBreakerCreationError(#[from] crate::circuit_breaker::CircuitBreakerError),
    #[error("rejected by the circuit breaker")]
    CircuitBreakerRejected,
    #[error("unable to send report: {0}")]
    Unknown(String),
}

impl UsageAgent {
    pub fn builder() -> UsageAgentBuilder {
        UsageAgentBuilder::default()
    }
    fn produce_report(&self, reports: Vec<ExecutionReport>) -> Result<Report, AgentError> {
        let mut report = Report {
            size: 0,
            map: HashMap::new(),
            operations: Vec::new(),
            subscription_operations: Vec::new(),
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
                                    client: Some(Client {
                                        name: client_name.unwrap_or_default(),
                                        version: client_version.unwrap_or_default(),
                                    }),
                                })
                            } else {
                                None
                            };
                        report.operations.push(RequestOperation {
                            operation_map_key: hash.clone(),
                            timestamp: op.timestamp,
                            execution: Execution {
                                ok: op.ok,
                                /*
                                    The conversion from u128 (from op.duration.as_nanos()) to u64 using try_into().unwrap() can panic if the duration is longer than u64::MAX nanoseconds (over 584 years).
                                    While highly unlikely, it's safer to handle this potential overflow gracefully in library code to prevent panics.
                                    A safe alternative is to convert the Result to an Option and provide a fallback value on failure,
                                    effectively saturating at u64::MAX.
                                */
                                duration: op
                                    .duration
                                    .as_nanos()
                                    .try_into()
                                    .ok()
                                    .unwrap_or(u64::MAX),
                                errors_total: op.errors.try_into().unwrap(),
                            },
                            persisted_document_hash: op
                                .persisted_document_hash
                                .map(PersistedDocumentHash),
                            metadata,
                        });
                        if let Entry::Vacant(e) = report.map.entry(ReportMapKey(hash)) {
                            e.insert(OperationMapRecord {
                                operation: operation.operation,
                                operation_name: non_empty_string(op.operation_name),
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

    async fn send_report(&self, report: Report) -> Result<(), AgentError> {
        if report.size == 0 {
            return Ok(());
        }
        let report_body =
            serde_json::to_vec(&report).map_err(|e| AgentError::Unknown(e.to_string()))?;
        // Based on https://the-guild.dev/graphql/hive/docs/specs/usage-reports#data-structure
        let resp_fut = self
            .client
            .post(&self.endpoint)
            .header(reqwest::header::CONTENT_LENGTH, report_body.len())
            .body(report_body)
            .send();

        let resp = self
            .circuit_breaker
            .call(resp_fut)
            .await
            .map_err(|e| match e {
                recloser::Error::Inner(e) => AgentError::Unknown(e.to_string()),
                recloser::Error::Rejected => AgentError::CircuitBreakerRejected,
            })?;

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

pub trait UsageAgentExt {
    fn add_report(&self, execution_report: ExecutionReport) -> Result<(), AgentError>;
    fn flush_if_full(&self, size: usize) -> ();
}

impl UsageAgentExt for Arc<UsageAgent> {
    fn flush_if_full(&self, size: usize) {
        if size >= self.buffer.size {
            let cloned_self = self.clone();
            tokio::task::spawn(async move {
                cloned_self.flush().await;
            });
        }
    }

    fn add_report(&self, execution_report: ExecutionReport) -> Result<(), AgentError> {
        let size = self.buffer.push(execution_report)?;

        self.flush_if_full(size);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::{sync::Arc, time::Duration};

    use graphql_parser::{parse_query, parse_schema};
    use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};

    use crate::agent::usage_agent::{ExecutionReport, Report, UsageAgent, UsageAgentExt};

    const CONTENT_TYPE_VALUE: &'static str = "application/json";
    const GRAPHQL_CLIENT_NAME: &'static str = "Hive Client";
    const GRAPHQL_CLIENT_VERSION: &'static str = "1.0.0";

    #[tokio::test]
    async fn should_send_data_to_hive() {
        let token = "Token";

        let mut server = mockito::Server::new_async().await;

        let server_url = server.url();

        let timestamp = 1625247600;
        let duration = Duration::from_millis(20);
        let user_agent = "hive-router-sdk-test";

        let mock = server
            .mock("POST", "/200")
            .match_header(AUTHORIZATION, format!("Bearer {}", token).as_str())
            .match_header(CONTENT_TYPE, CONTENT_TYPE_VALUE)
            .match_header(USER_AGENT, user_agent)
            .match_header("X-Usage-API-Version", "2")
            .match_request(move |request| {
                let request_body = request.body().expect("Failed to extract body");
                let report: Report = serde_json::from_slice(request_body)
                    .expect("Failed to parse request body as JSON");
                assert_eq!(report.size, 1);
                let record = report.map.values().next().expect("No operation record");
                // operation
                assert!(record.operation.contains("mutation deleteProject"));
                assert_eq!(record.operation_name.as_deref(), Some("deleteProject"));
                // fields
                let expected_fields = vec![
                    "Mutation.deleteProject",
                    "Mutation.deleteProject.selector",
                    "Mutation.deleteProject.selector!",
                    "DeleteProjectPayload.selector",
                    "ProjectSelector.organization",
                    "ProjectSelector.project",
                    "DeleteProjectPayload.deletedProject",
                    "Project.id",
                    "Project.cleanId",
                    "Project.name",
                    "Project.type",
                    "ProjectType.FEDERATION",
                    "ProjectType.STITCHING",
                    "ProjectType.SINGLE",
                    "ProjectType.CUSTOM",
                    "ProjectSelectorInput.organization",
                    "ID",
                    "ProjectSelectorInput.project",
                ];
                for field in &expected_fields {
                    assert!(record.fields.contains(&field.to_string()));
                }
                assert_eq!(record.fields.len(), expected_fields.len());

                // Operations
                let operations = report.operations;
                assert_eq!(operations.len(), 1); // one operation

                let operation = &operations[0];
                let key = report.map.keys().next().expect("No operation key");
                assert_eq!(operation.operation_map_key, key.0);
                assert_eq!(operation.timestamp, timestamp);
                assert_eq!(operation.execution.duration, duration.as_nanos() as u64);
                assert_eq!(operation.execution.ok, true);
                assert_eq!(operation.execution.errors_total, 0);
                true
            })
            .expect(1)
            .with_status(200)
            .create_async()
            .await;
        let schema: graphql_tools::static_graphql::schema::Document = parse_schema(
            r#"
                type Query {
                    project(selector: ProjectSelectorInput!): Project
                    projectsByType(type: ProjectType!): [Project!]!
                    projects(filter: FilterInput): [Project!]!
                }

                type Mutation {
                    deleteProject(selector: ProjectSelectorInput!): DeleteProjectPayload!
                }

                input ProjectSelectorInput {
                    organization: ID!
                    project: ID!
                }

                input FilterInput {
                    type: ProjectType
                    pagination: PaginationInput
                }

                input PaginationInput {
                    limit: Int
                    offset: Int
                }

                type ProjectSelector {
                    organization: ID!
                    project: ID!
                }

                type DeleteProjectPayload {
                    selector: ProjectSelector!
                    deletedProject: Project!
                }

                type Project {
                    id: ID!
                    cleanId: ID!
                    name: String!
                    type: ProjectType!
                    buildUrl: String
                    validationUrl: String
                }

                enum ProjectType {
                    FEDERATION
                    STITCHING
                    SINGLE
                    CUSTOM
                }
        "#,
        )
        .expect("Failed to parse schema");

        let op: graphql_tools::static_graphql::query::Document = parse_query(
            r#"
                mutation deleteProject($selector: ProjectSelectorInput!) {
                    deleteProject(selector: $selector) {
                    selector {
                        organization
                        project
                    }
                    deletedProject {
                        ...ProjectFields
                    }
                    }
                }

                fragment ProjectFields on Project {
                    id
                    cleanId
                    name
                    type
                }
        "#,
        )
        .expect("Failed to parse query");

        let usage_agent = UsageAgent::builder()
            .token(token.into())
            .endpoint(format!("{}/200", server_url))
            .user_agent(user_agent.into())
            .build()
            .expect("Failed to create UsageAgent");

        usage_agent
            .add_report(ExecutionReport {
                schema: Arc::new(schema),
                operation_body: op.to_string(),
                operation_name: Some("deleteProject".to_string()),
                client_name: Some(GRAPHQL_CLIENT_NAME.to_string()),
                client_version: Some(GRAPHQL_CLIENT_VERSION.to_string()),
                timestamp,
                duration,
                ok: true,
                errors: 0,
                persisted_document_hash: None,
            })
            .expect("Failed to add report");

        usage_agent.flush().await;

        mock.assert_async().await;
    }
}
