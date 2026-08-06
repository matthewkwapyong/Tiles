use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
mod app;
mod auth;
mod config;
mod interactions;
mod media;
mod onboarding;
mod state;
mod tmdb;
use state::AppState;
use config::Config;
use app::app;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // Create a connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    println!("Connected to database successfully!");

    let config = Config::new();
    let app_state = Arc::new(AppState {
        db: pool,
        config,
        http_client: reqwest::Client::new(),
    });

    let app = app(app_state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
