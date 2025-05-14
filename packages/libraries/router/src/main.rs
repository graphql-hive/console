// Specify the modules our binary should include -- https://twitter.com/YassinEldeeb7/status/1468680104243077128
mod agent;
mod graphql;
mod persisted_documents;
mod registry;
mod registry_logger;
mod usage;

use apollo_router::register_plugin;
use persisted_documents::PersistedDocumentsPlugin;
use registry::HiveRegistry;
use usage::UsagePlugin;

// Register the Hive plugin
pub fn register_plugins() {
    register_plugin!("hive", "usage", UsagePlugin);
    register_plugin!("hive", "persisted_documents", PersistedDocumentsPlugin);
}

fn main() {
    // Register the Hive plugins in Apollo Router
    register_plugins();

    // Initialize the Hive Registry and start the Apollo Router
    match HiveRegistry::new(None).and(apollo_router::main()) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("{}", e);
            std::process::exit(1);
        }
    }
}
