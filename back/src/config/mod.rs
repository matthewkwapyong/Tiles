pub struct Config {
    pub db_url: String,
    pub tmdb_api_key: String,
    pub frontend_url: String,
    pub sidecar_url: String,
}

impl Config {
    pub fn new() -> Self {
        Self {
            db_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            tmdb_api_key: std::env::var("TMDB_API_KEY").expect("TMDB_API_KEY must be set"),
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:4000".to_string()),
            sidecar_url: std::env::var("SIDECAR_URL")
                .or_else(|_| std::env::var("PYTHON_SIDECAR_URL"))
                .unwrap_or_else(|_| "http://localhost:8080".to_string()),
        }
    }
}