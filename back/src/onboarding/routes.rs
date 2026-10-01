use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{
    auth::AuthSession,
    media::routes::MediaItemSummary,
    onboarding::seed_curated_onboarding_items,
    state::AppState,
};

pub const MIN_ONBOARDING_RATINGS: usize = 10;


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
// Request & Response Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct OnboardingStatusResponse {
    pub onboarding_completed: bool,
    pub onboarding_completed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OnboardingRatingItem {
    pub media_item_id: i64,
    pub rating: f64,
}

#[derive(Debug, Deserialize)]
pub struct BatchOnboardingRatingsRequest {
    pub ratings: Vec<OnboardingRatingItem>,
}

#[derive(Debug, Serialize)]
pub struct BatchOnboardingRatingsResponse {
    pub onboarding_complete: bool,
    pub ratings_saved: usize,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /api/onboarding/status
/// Returns current user's onboarding completion status.
pub async fn get_onboarding_status(
    session: AuthSession,
) -> Json<OnboardingStatusResponse> {
    let completed = session.onboarding_completed_at.is_some();
    let completed_at_str = session
        .onboarding_completed_at
        .map(|dt| dt.to_rfc3339());

    Json(OnboardingStatusResponse {
        onboarding_completed: completed,
        onboarding_completed_at: completed_at_str,
    })
}

/// GET /api/onboarding/curated
/// Returns the curated list of ~40-50 media items for onboarding selection.
pub async fn get_curated_onboarding(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<Vec<MediaItemSummary>>> {
    // Seed curated onboarding table if empty
    let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM curated_onboarding_items")
        .fetch_one(&state.db)
        .await?;

    if count == 0 {
        if let Err(e) = seed_curated_onboarding_items(&state.db).await {
            tracing::warn!("Failed seeding curated onboarding items: {e}");
        }
    }

        // Backfill media_item_id if any rows are missing it
        let _ = sqlx::query(
            r#"
            UPDATE curated_onboarding_items c
            SET media_item_id = m.id
            FROM media_items m
            WHERE c.media_item_id IS NULL AND c.tmdb_id = m.tmdb_id AND c.media_type = m.media_type
            "#,
        )
        .execute(&state.db)
        .await;

        // Query curated active items joined with media_items
        let items = sqlx::query_as::<_, MediaItemSummary>(
            r#"
            SELECT
                m.id,
                m.tmdb_id,
                m.media_type,
                m.title,
                m.poster_path,
                m.backdrop_path,
                TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
                CAST(m.vote_average AS FLOAT8)         AS vote_average,
                m.vote_count,
                m.genres,
                CAST(m.popularity AS FLOAT8)           AS popularity
            FROM curated_onboarding_items c
            JOIN media_items m ON (c.media_item_id IS NOT NULL AND m.id = c.media_item_id)
                               OR (c.media_item_id IS NULL AND m.tmdb_id = c.tmdb_id AND m.media_type = c.media_type)
            WHERE c.is_active = TRUE
            ORDER BY c.display_order ASC
            "#,
        )
        .fetch_all(&state.db)
        .await?;

        // If some curated items are missing from media_items, sync them from TMDB
        if items.len() < 30 {
            #[derive(sqlx::FromRow)]
            struct MissingCuratedRow {
                tmdb_id: i32,
                media_type: String,
            }

            let missing_curated = sqlx::query_as::<_, MissingCuratedRow>(
                r#"
                SELECT c.tmdb_id, c.media_type
                FROM curated_onboarding_items c
                LEFT JOIN media_items m ON (c.media_item_id IS NOT NULL AND m.id = c.media_item_id)
                                        OR (c.media_item_id IS NULL AND m.tmdb_id = c.tmdb_id AND m.media_type = c.media_type)
                WHERE c.is_active = TRUE AND m.id IS NULL
                "#
            )
            .fetch_all(&state.db)
            .await?;

            if !missing_curated.is_empty() {
                let (movie_genres, tv_genres) = tokio::join!(
                    crate::tmdb::fetch_genre_map(&state.http_client, &state.config.tmdb_api_key, "movie"),
                    crate::tmdb::fetch_genre_map(&state.http_client, &state.config.tmdb_api_key, "tv"),
                );

                let _movie_map = movie_genres.unwrap_or_default();
                let _tv_map = tv_genres.unwrap_or_default();

                for row in missing_curated {
                    if let Ok(detail) = crate::tmdb::fetch_detail(
                        &state.http_client,
                        &state.config.tmdb_api_key,
                        &row.media_type,
                        row.tmdb_id,
                    )
                    .await
                    {
                        if let Ok(media_id) = crate::media::upsert_from_detail(&state.db, &detail, &row.media_type).await {
                            let _ = sqlx::query(
                                "UPDATE curated_onboarding_items SET media_item_id = $1 WHERE tmdb_id = $2 AND media_type = $3"
                            )
                            .bind(media_id)
                            .bind(row.tmdb_id)
                            .bind(&row.media_type)
                            .execute(&state.db)
                            .await;
                        }
                    }
                }

                // Re-query after sync
                let refreshed_items = sqlx::query_as::<_, MediaItemSummary>(
                    r#"
                    SELECT
                        m.id,
                        m.tmdb_id,
                        m.media_type,
                        m.title,
                        m.poster_path,
                        m.backdrop_path,
                        TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
                        CAST(m.vote_average AS FLOAT8)         AS vote_average,
                        m.vote_count,
                        m.genres,
                        CAST(m.popularity AS FLOAT8)           AS popularity
                    FROM curated_onboarding_items c
                    JOIN media_items m ON (c.media_item_id IS NOT NULL AND m.id = c.media_item_id)
                                       OR (c.media_item_id IS NULL AND m.tmdb_id = c.tmdb_id AND m.media_type = c.media_type)
                    WHERE c.is_active = TRUE
                    ORDER BY c.display_order ASC
                    "#,
                )
                .fetch_all(&state.db)
                .await?;

                return Ok(Json(refreshed_items));
            }
        }

    Ok(Json(items))
}

/// POST /api/onboarding/ratings
/// Submits a batch of onboarding ratings (minimum 10 required).
pub async fn submit_onboarding_ratings(
    State(state): State<Arc<AppState>>,
    session: AuthSession,
    Json(body): Json<BatchOnboardingRatingsRequest>,
) -> ApiResult<Response> {
    // 1. Enforce minimum server-side rating threshold
    if body.ratings.len() < MIN_ONBOARDING_RATINGS {
        return Ok((
            StatusCode::BAD_REQUEST,
            format!(
                "Please rate at least {} items to complete onboarding.",
                MIN_ONBOARDING_RATINGS
            ),
        )
            .into_response());
    }

    // 2. Validate all ratings in batch
    for item in &body.ratings {
        if item.rating < 1.0 || item.rating > 10.0 {
            return Ok((
                StatusCode::BAD_REQUEST,
                format!("Invalid rating value: {}", item.rating),
            )
                .into_response());
        }
        if (item.rating * 2.0).fract() != 0.0 {
            return Ok((
                StatusCode::BAD_REQUEST,
                "Ratings must be in increments of 0.5.",
            )
                .into_response());
        }
    }

    // 3. Execute DB transaction
    let mut tx = state.db.begin().await?;

    for item in &body.ratings {
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
        .bind(item.media_item_id)
        .bind(item.rating)
        .execute(&mut *tx)
        .await?;
    }

    // Mark onboarding complete on user
    sqlx::query(
        r#"
        UPDATE users
        SET onboarding_completed_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(&session.user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    // 4. Fire-and-forget async task to notify Python ML sidecar
    let user_id = session.user_id.clone();
    let client = state.http_client.clone();
    let sidecar_base = state.config.sidecar_url.clone();
    tokio::spawn(async move {
        let sidecar_url = format!("{}/complete_onboarding/{}", sidecar_base, user_id);
        match client.get(sidecar_url).send().await {
            Ok(res) => tracing::info!("ML Sidecar onboarding for {user_id}: status={}", res.status()),
            Err(e) => tracing::warn!("ML Sidecar not reachable during onboarding (non-fatal): {e}"),
        }
    });

    Ok((
        StatusCode::OK,
        Json(BatchOnboardingRatingsResponse {
            onboarding_complete: true,
            ratings_saved: body.ratings.len(),
        }),
    )
        .into_response())
}
