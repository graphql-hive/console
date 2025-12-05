use crate::consts::PLUGIN_VERSION;
use crate::registry_logger::Logger;
use anyhow::{anyhow, Result};
use hive_console_sdk::supergraph_fetcher::sync::SupergraphFetcherSyncState;
use hive_console_sdk::supergraph_fetcher::SupergraphFetcher;
use sha2::Digest;
use sha2::Sha256;
use std::env;
use std::io::Write;
use std::thread;

#[derive(Debug)]
pub struct HiveRegistry {
    file_name: String,
    fetcher: SupergraphFetcher<SupergraphFetcherSyncState>,
    pub logger: Logger,
}

pub struct HiveRegistryConfig {
    endpoints: Vec<String>,
    key: Option<String>,
    poll_interval: Option<u64>,
    accept_invalid_certs: Option<bool>,
    schema_file_path: Option<String>,
}

impl HiveRegistry {
    #[allow(clippy::new_ret_no_self)]
    pub fn new(user_config: Option<HiveRegistryConfig>) -> Result<()> {
        let mut config = HiveRegistryConfig {
            endpoints: vec![],
            key: None,
            poll_interval: None,
            accept_invalid_certs: Some(true),
            schema_file_path: None,
        };

        // Pass values from user's config
        if let Some(user_config) = user_config {
            config.endpoints = user_config.endpoints;
            config.key = user_config.key;
            config.poll_interval = user_config.poll_interval;
            config.accept_invalid_certs = user_config.accept_invalid_certs;
            config.schema_file_path = user_config.schema_file_path;
        }

        // Pass values from environment variables if they are not set in the user's config

        if config.endpoints.is_empty() {
            if let Ok(endpoint) = env::var("HIVE_CDN_ENDPOINT") {
                config.endpoints.push(endpoint);
            }
        }

        if config.key.is_none() {
            if let Ok(key) = env::var("HIVE_CDN_KEY") {
                config.key = Some(key);
            }
        }

        if config.poll_interval.is_none() {
            if let Ok(poll_interval) = env::var("HIVE_CDN_POLL_INTERVAL") {
                config.poll_interval = Some(
                    poll_interval
                        .parse()
                        .expect("failed to parse HIVE_CDN_POLL_INTERVAL"),
                );
            }
        }

        if config.accept_invalid_certs.is_none() {
            if let Ok(accept_invalid_certs) = env::var("HIVE_CDN_ACCEPT_INVALID_CERTS") {
                config.accept_invalid_certs = Some(
                    accept_invalid_certs.eq("1")
                        || accept_invalid_certs.to_lowercase().eq("true")
                        || accept_invalid_certs.to_lowercase().eq("on"),
                );
            }
        }

        if config.schema_file_path.is_none() {
            if let Ok(schema_file_path) = env::var("HIVE_CDN_SCHEMA_FILE_PATH") {
                config.schema_file_path = Some(schema_file_path);
            }
        }

        // Resolve values
        let endpoint = config.endpoints;
        let key = config.key.unwrap_or_default();
        let poll_interval: u64 = config.poll_interval.unwrap_or(10);
        let accept_invalid_certs = config.accept_invalid_certs.unwrap_or(false);
        let logger = Logger::new();

        // In case of an endpoint and an key being empty, we don't start the polling and skip the registry
        if endpoint.is_empty() && key.is_empty() {
            logger.info("You're not using GraphQL Hive as the source of schema.");
            logger.info(
                "Reason: could not find HIVE_CDN_KEY and HIVE_CDN_ENDPOINT environment variables.",
            );
            return Ok(());
        }

        // Throw if endpoint is empty
        if endpoint.is_empty() {
            return Err(anyhow!("environment variable HIVE_CDN_ENDPOINT not found",));
        }

        // Throw if key is empty
        if key.is_empty() {
            return Err(anyhow!("environment variable HIVE_CDN_KEY not found"));
        }

        // A hacky way to force the router to use GraphQL Hive CDN as the source of schema.
        // Our plugin does the polling and saves the supergraph to a file.
        // It also enables hot-reloading to makes sure Apollo Router watches the file.
        let file_name = config.schema_file_path.unwrap_or(
            env::temp_dir()
                .join("supergraph-schema.graphql")
                .to_string_lossy()
                .to_string(),
        );
        unsafe {
            env::set_var("APOLLO_ROUTER_SUPERGRAPH_PATH", file_name.clone());
            env::set_var("APOLLO_ROUTER_HOT_RELOAD", "true");
        }

        let mut fetcher = SupergraphFetcher::builder()
            .key(key)
            .user_agent(format!("hive-apollo-router/{}", PLUGIN_VERSION))
            .accept_invalid_certs(accept_invalid_certs);

        for ep in endpoint {
            fetcher = fetcher.add_endpoint(ep);
        }

        let fetcher = fetcher
            .build_sync()
            .map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

        let registry = HiveRegistry {
            fetcher,
            file_name,
            logger,
        };

        match registry.initial_supergraph() {
            Ok(_) => {
                registry
                    .logger
                    .info("Successfully fetched and saved supergraph from GraphQL Hive");
            }
            Err(e) => {
                registry.logger.error(&e);
                std::process::exit(1);
            }
        }

        thread::spawn(move || loop {
            thread::sleep(std::time::Duration::from_secs(poll_interval));
            registry.poll()
        });

        Ok(())
    }

    fn initial_supergraph(&self) -> Result<(), String> {
        let mut file = std::fs::File::create(self.file_name.clone()).map_err(|e| e.to_string())?;
        let resp = self
            .fetcher
            .fetch_supergraph()
            .map_err(|err| err.to_string())?;

        match resp {
            Some(supergraph) => {
                file.write_all(supergraph.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            None => {
                return Err("Failed to fetch supergraph".to_string());
            }
        }

        Ok(())
    }

    fn poll(&self) {
        match self.fetcher.fetch_supergraph() {
            Ok(new_supergraph) => {
                if let Some(new_supergraph) = new_supergraph {
                    let current_file = std::fs::read_to_string(self.file_name.clone())
                        .expect("Could not read file");
                    let current_supergraph_hash = hash(current_file.as_bytes());

                    let new_supergraph_hash = hash(new_supergraph.as_bytes());

                    if current_supergraph_hash != new_supergraph_hash {
                        self.logger.info("New supergraph detected!");
                        std::fs::write(self.file_name.clone(), new_supergraph)
                            .expect("Could not write file");
                    }
                }
            }
            Err(e) => self.logger.error(&e.to_string()),
        }
    }
}

fn hash(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:X}", hasher.finalize())
}
