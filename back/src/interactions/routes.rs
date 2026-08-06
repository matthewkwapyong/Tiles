use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{auth::AuthSession, media::routes::MediaItemSummary, state::AppState};

// ─────────────────────────────────────────────────────────────────────────────
// Error type
// ─────────────────────────────────────────────────────────────────────────────

pub struct ApiError(anyhow::Error);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        tracing::error!("API error: {:?}", self.0);
        (StatusCode::INTERNAL_SERVER_ERROR, self.0.to_string()).into_response()
    }
}

impl<E: Into<anyhow::Error>> From<E> for ApiError {
    fn from(err: E) -> Self {
        ApiError(err.into())
    }
}

type ApiResult<T> = Result<T, ApiError>;

// ─────────────────────────────────────────────────────────────────────────────
// Rating Types & Handlers
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct RatingResponse {
    pub rating: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct SetRatingRequest {
    pub rating: f64,
}

/// GET /api/media/:id/rating
pub async fn get_user_rating(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<Json<RatingResponse>> {
    let rating = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT CAST(rating AS FLOAT8)
        FROM ratings
        WHERE user_id = $1 AND media_item_id = $2
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .fetch_optional(&state.db)
    .await?;

    Ok(Json(RatingResponse { rating }))
}

/// POST /api/media/:id/rating
pub async fn set_user_rating(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
    Json(body): Json<SetRatingRequest>,
) -> ApiResult<Response> {
    println!("i was touched");
    // Validate rating value: must be between 1.0 and 10.0 in 0.5 increments
    if body.rating < 1.0 || body.rating > 10.0 {
        return Ok((StatusCode::BAD_REQUEST, "Rating must be between 1.0 and 10.0").into_response());
    }
    if (body.rating * 2.0).fract() != 0.0 {
        return Ok((StatusCode::BAD_REQUEST, "Rating must be in increments of 0.5").into_response());
    }

    sqlx::query(
        r#"
        INSERT INTO ratings (user_id, media_item_id, rating)
        VALUES ($1, $2, CAST($3 AS NUMERIC))
        ON CONFLICT (user_id, media_item_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            updated_at = NOW()
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .bind(body.rating)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::OK, Json(RatingResponse { rating: Some(body.rating) })).into_response())
}

/// DELETE /api/media/:id/rating
pub async fn delete_user_rating(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<StatusCode> {
    sqlx::query(
        r#"
        DELETE FROM ratings
        WHERE user_id = $1 AND media_item_id = $2
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Types & Handlers
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ReviewItem {
    pub id: i64,
    pub user_id: String,
    pub user_name: Option<String>,
    pub user_image: Option<String>,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveReviewRequest {
    pub body: String,
}

/// GET /api/media/:id/reviews — List all reviews for a media item
pub async fn list_media_reviews(
    State(state): State<Arc<AppState>>,
    Path(media_id): Path<i64>,
) -> ApiResult<Json<Vec<ReviewItem>>> {
    let reviews = sqlx::query_as::<_, ReviewItem>(
        r#"
        SELECT
            r.id,
            r.user_id,
            u.name AS user_name,
            u.image AS user_image,
            r.body,
            TO_CHAR(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            TO_CHAR(r.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.media_item_id = $1
        ORDER BY r.updated_at DESC
        "#,
    )
    .bind(media_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(reviews))
}

/// GET /api/media/:id/review/me — Get current user's review for a media item
pub async fn get_my_review(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<Json<Option<ReviewItem>>> {
    let review = sqlx::query_as::<_, ReviewItem>(
        r#"
        SELECT
            r.id,
            r.user_id,
            u.name AS user_name,
            u.image AS user_image,
            r.body,
            TO_CHAR(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            TO_CHAR(r.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.user_id = $1 AND r.media_item_id = $2
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .fetch_optional(&state.db)
    .await?;

    Ok(Json(review))
}

/// POST /api/media/:id/review — Upsert user review
pub async fn save_user_review(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
    Json(body): Json<SaveReviewRequest>,
) -> ApiResult<Response> {
    let text = body.body.trim();
    if text.is_empty() {
        return Ok((StatusCode::BAD_REQUEST, "Review body cannot be empty").into_response());
    }

    sqlx::query(
        r#"
        INSERT INTO reviews (user_id, media_item_id, body)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, media_item_id) DO UPDATE SET
            body = EXCLUDED.body,
            updated_at = NOW()
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .bind(text)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::OK, "Review saved").into_response())
}

/// DELETE /api/media/:id/review — Delete user review
pub async fn delete_user_review(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<StatusCode> {
    sqlx::query(
        r#"
        DELETE FROM reviews
        WHERE user_id = $1 AND media_item_id = $2
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// ─────────────────────────────────────────────────────────────────────────────
// Watchlist Types & Handlers
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct WatchlistStatusResponse {
    pub in_watchlist: bool,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WatchlistItem {
    pub id: i64,
    pub tmdb_id: i32,
    pub media_type: String,
    pub title: String,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub genres: Vec<String>,
    pub popularity: Option<f64>,
    pub added_at: String,
}

/// GET /api/media/:id/watchlist — Check watchlist status for single item
pub async fn get_watchlist_status(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<Json<WatchlistStatusResponse>> {
    let count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM watchlist
        WHERE user_id = $1 AND media_item_id = $2
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(WatchlistStatusResponse {
        in_watchlist: count > 0,
    }))
}

/// POST /api/media/:id/watchlist — Add to watchlist
pub async fn add_to_watchlist(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<Response> {
    sqlx::query(
        r#"
        INSERT INTO watchlist (user_id, media_item_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, media_item_id) DO NOTHING
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::OK, Json(WatchlistStatusResponse { in_watchlist: true })).into_response())
}

/// DELETE /api/media/:id/watchlist — Remove from watchlist
pub async fn remove_from_watchlist(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<Response> {
    sqlx::query(
        r#"
        DELETE FROM watchlist
        WHERE user_id = $1 AND media_item_id = $2
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::OK, Json(WatchlistStatusResponse { in_watchlist: false })).into_response())
}

/// GET /api/watchlist — List user's watchlist
pub async fn list_user_watchlist(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
) -> ApiResult<Json<Vec<WatchlistItem>>> {
    let items = sqlx::query_as::<_, WatchlistItem>(
        r#"
        SELECT
            m.id, m.tmdb_id, m.media_type, m.title,
            m.poster_path, m.backdrop_path,
            TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
            CAST(m.vote_average AS FLOAT8)         AS vote_average,
            m.vote_count,
            m.genres,
            CAST(m.popularity AS FLOAT8)           AS popularity,
            TO_CHAR(w.added_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS added_at
        FROM watchlist w
        JOIN media_items m ON m.id = w.media_item_id
        WHERE w.user_id = $1
        ORDER BY w.added_at DESC
        "#,
    )
    .bind(&session.user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(items))
}

// ─────────────────────────────────────────────────────────────────────────────
// Watched Log Types & Handlers
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WatchedLogEntry {
    pub id: i64,
    pub media_item_id: i64,
    pub watched_at: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct HistoryItem {
    pub log_id: i64,
    pub watched_at: String,
    pub notes: Option<String>,
    pub media: MediaItemSummary,
}

#[derive(Debug, Deserialize)]
pub struct AddWatchedLogRequest {
    pub watched_at: Option<String>,
    pub notes: Option<String>,
}

/// GET /api/media/:id/watched — List watch logs for a media item
pub async fn get_media_watch_logs(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
) -> ApiResult<Json<Vec<WatchedLogEntry>>> {
    let logs = sqlx::query_as::<_, WatchedLogEntry>(
        r#"
        SELECT
            id,
            media_item_id,
            TO_CHAR(watched_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS watched_at,
            notes
        FROM watched_log
        WHERE user_id = $1 AND media_item_id = $2
        ORDER BY watched_at DESC
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(logs))
}

/// POST /api/media/:id/watched — Add a watch log entry
pub async fn log_watch_event(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(media_id): Path<i64>,
    Json(body): Json<AddWatchedLogRequest>,
) -> ApiResult<Response> {
    let watched_at = match &body.watched_at {
        Some(s) if !s.trim().is_empty() => {
            chrono::NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d")
                .map(|d| d.and_hms_opt(12, 0, 0).unwrap().and_utc())
                .unwrap_or_else(|_| chrono::Utc::now())
        }
        _ => chrono::Utc::now(),
    };

    let notes = body.notes.as_deref().map(|n| n.trim()).filter(|n| !n.is_empty());

    let log_id = sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO watched_log (user_id, media_item_id, watched_at, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(&session.user_id)
    .bind(media_id)
    .bind(watched_at)
    .bind(notes)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(serde_json::json!({ "id": log_id }))).into_response())
}

/// DELETE /api/watched/:log_id — Delete a specific watch log entry
pub async fn delete_watch_log_entry(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Path(log_id): Path<i64>,
) -> ApiResult<StatusCode> {
    sqlx::query(
        r#"
        DELETE FROM watched_log
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(log_id)
    .bind(&session.user_id)
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// GET /api/history — List overall watch log history for current user
pub async fn list_user_history(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
) -> ApiResult<Json<Vec<HistoryItem>>> {
    struct RawHistoryRow {
        log_id: i64,
        watched_at: String,
        notes: Option<String>,
        id: i64,
        tmdb_id: i32,
        media_type: String,
        title: String,
        poster_path: Option<String>,
        backdrop_path: Option<String>,
        release_date: Option<String>,
        vote_average: Option<f64>,
        vote_count: Option<i32>,
        genres: Vec<String>,
        popularity: Option<f64>,
    }

    let rows = sqlx::query_as!(
        RawHistoryRow,
        r#"
        SELECT
            wl.id AS log_id,
            TO_CHAR(wl.watched_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "watched_at!",
            wl.notes,
            m.id AS "id!",
            m.tmdb_id AS "tmdb_id!",
            m.media_type AS "media_type!",
            m.title AS "title!",
            m.poster_path,
            m.backdrop_path,
            TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
            CAST(m.vote_average AS FLOAT8)        AS vote_average,
            m.vote_count,
            m.genres AS "genres!",
            CAST(m.popularity AS FLOAT8)          AS popularity
        FROM watched_log wl
        JOIN media_items m ON m.id = wl.media_item_id
        WHERE wl.user_id = $1
        ORDER BY wl.watched_at DESC
        "#,
        session.user_id
    )
    .fetch_all(&state.db)
    .await?;

    let items = rows
        .into_iter()
        .map(|r| HistoryItem {
            log_id: r.log_id,
            watched_at: r.watched_at,
            notes: r.notes,
            media: MediaItemSummary {
                id: r.id,
                tmdb_id: r.tmdb_id,
                media_type: r.media_type,
                title: r.title,
                poster_path: r.poster_path,
                backdrop_path: r.backdrop_path,
                release_date: r.release_date,
                vote_average: r.vote_average,
                vote_count: r.vote_count,
                genres: r.genres,
                popularity: r.popularity,
            },
        })
        .collect();

    Ok(Json(items))
}
