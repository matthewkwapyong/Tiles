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
            // Ensure user_lists and user_list_items tables exist
            if let Err(e) = sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS user_lists (
                    id                  BIGSERIAL   PRIMARY KEY,
                    user_id             TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title               TEXT        NOT NULL,
                    description         TEXT,
                    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_user_lists_user ON user_lists (user_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS user_list_items (
                    id                  BIGSERIAL   PRIMARY KEY,
                    list_id             BIGINT      NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
                    media_item_id       BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
                    added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (list_id, media_item_id)
                );
                CREATE INDEX IF NOT EXISTS idx_user_list_items_list ON user_list_items (list_id, added_at DESC);
                CREATE INDEX IF NOT EXISTS idx_user_list_items_media ON user_list_items (media_item_id);
                "#,
            )
            .execute(&pool)
            .await
            {
                tracing::warn!("Auto-migration for user_lists: {e}");
            }

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

