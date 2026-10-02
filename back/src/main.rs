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
            // Ensure Auth.js adapter tables and core user schema exist
            if let Err(e) = sqlx::query(
                r#"
                CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                CREATE EXTENSION IF NOT EXISTS vector;
                CREATE EXTENSION IF NOT EXISTS pg_trgm;

                CREATE TABLE IF NOT EXISTS users (
                    id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
                    name                TEXT,
                    email               TEXT        UNIQUE,
                    "emailVerified"     TIMESTAMPTZ,
                    image               TEXT,
                    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

                CREATE TABLE IF NOT EXISTS accounts (
                    id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
                    "userId"              TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type                  TEXT        NOT NULL,
                    provider              TEXT        NOT NULL,
                    "providerAccountId"   TEXT        NOT NULL,
                    refresh_token         TEXT,
                    access_token          TEXT,
                    expires_at            BIGINT,
                    token_type            TEXT,
                    scope                 TEXT,
                    id_token              TEXT,
                    session_state         TEXT,
                    UNIQUE (provider, "providerAccountId")
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
                    "sessionToken"  TEXT        NOT NULL UNIQUE,
                    "userId"        TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires         TIMESTAMPTZ NOT NULL
                );

                CREATE TABLE IF NOT EXISTS verification_tokens (
                    identifier  TEXT        NOT NULL,
                    token       TEXT        NOT NULL UNIQUE,
                    expires     TIMESTAMPTZ NOT NULL,
                    PRIMARY KEY (identifier, token)
                );

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
                tracing::warn!("Auto-migration for schema: {e}");
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
    let port = std::env::var("PORT").unwrap_or_else(|_| "8000".to_string());
    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Server listening on http://{}", addr);

    axum::serve(listener, app).await.unwrap();

    Ok(())
}

