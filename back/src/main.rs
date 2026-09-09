use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod app;
mod auth;
mod config;
mod interactions;
mod media;
mod onboarding;
mod state;
mod tmdb;

use app::app;
use config::Config;
use state::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    // Initialize tracing subscriber
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,tower_http=debug")),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting server...");

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    info!("Connecting to database...");

    // Create a connection pool
    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            info!("Connected to database successfully!");
            pool
        }
        Err(e) => {
            error!("Failed to connect to database at {database_url}: {e}");
            return Err(e.into());
        }
    };

    let config = Config::new();
    let app_state = Arc::new(AppState {
        db: pool,
        config,
        http_client: reqwest::Client::new(),
    });

    let app = app(app_state);
    let addr = "0.0.0.0:8000";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    info!("Server listening on http://{}", addr);

    axum::serve(listener, app).await.unwrap();

    Ok(())
}

