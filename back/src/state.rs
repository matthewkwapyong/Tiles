use crate::config::Config;
use sqlx::PgPool;

pub struct AppState {
    pub db: PgPool,
    pub config: Config,
    pub http_client: reqwest::Client,
}
