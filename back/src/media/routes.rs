use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::QueryBuilder;
use std::sync::Arc;

use crate::{auth::AuthSession, media::sync_popular, state::AppState};

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
// Response types
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE: i64 = 20;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct MediaItemSummary {
    pub id: i64,
    pub tmdb_id: i32,
    pub media_type: String,
    pub title: String,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    /// ISO date string (YYYY-MM-DD) or null.
    pub release_date: Option<String>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub genres: Vec<String>,
    pub popularity: Option<f64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct MediaItemDetail {
    pub id: i64,
    pub tmdb_id: i32,
    pub media_type: String,
    pub title: String,
    pub original_title: Option<String>,
    pub overview: Option<String>,
    pub tagline: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub homepage: Option<String>,
    pub release_date: Option<String>,
    pub status: Option<String>,
    pub genres: Vec<String>,
    pub language: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f64>,
    pub cast_crew: Value,
}

#[derive(Debug, Serialize)]
pub struct BrowseResponse {
    pub items: Vec<MediaItemSummary>,
    pub page: i64,
    pub page_size: i64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Query param types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct BrowseParams {
    pub q: Option<String>,
    #[serde(rename = "type")]
    pub media_type: Option<String>,
    pub genre: Option<String>,
    pub page: Option<i64>,
    /// "db" (default) — local cache only.
    /// "tmdb" — live TMDB multi-search; results are auto-upserted into the DB.
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    /// Number of pages to pull from TMDB (default 5, max 20).
    pub pages: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub synced: u64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /api/media
///
/// Browse or search the local media_items cache (source=db, default)
/// or do a live TMDB multi-search with auto-upsert (source=tmdb).
/// Query params: `q`, `type` (movie|tv), `genre`, `page`, `source` (db|tmdb).
pub async fn browse_media(
    State(state): State<Arc<AppState>>,
    Query(params): Query<BrowseParams>,
) -> ApiResult<Json<BrowseResponse>> {
    let page = params.page.unwrap_or(1).max(1);

    // Live TMDB search path
    if params.source.as_deref() == Some("tmdb") {
        if let Some(q) = &params.q {
            if !q.trim().is_empty() {
                return search_tmdb_live(&*state, q.trim(), page, params.media_type.as_deref())
                    .await;
            }
        }
    }

    // Default: query local DB cache
    let offset = (page - 1) * PAGE_SIZE;

    let mut qb: QueryBuilder<sqlx::Postgres> = QueryBuilder::new(
        r#"
        SELECT
            id, tmdb_id, media_type, title,
            poster_path, backdrop_path,
            TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date,
            CAST(vote_average AS FLOAT8)         AS vote_average,
            vote_count,
            genres,
            CAST(popularity AS FLOAT8)           AS popularity
        FROM media_items
        WHERE 1=1
        "#,
    );

    // if let Some(q) = &params.q {
    //     if !q.trim().is_empty() {
    //         qb.push(" AND title ILIKE  ")
    //             .push_bind(format!("%{}%", q.trim()));
    //     }
    // }
    if let Some(q) = &params.q {
        let clean_q = q.trim();
        if !clean_q.is_empty() {
            qb.push(" AND (title ILIKE ");
            qb.push_bind(format!("%{clean_q}%"));
            qb.push(" OR title % ");
            qb.push_bind(clean_q);
            qb.push(" OR SIMILARITY(title, ");
            qb.push_bind(clean_q);
            qb.push(") > 0.25)");
        }
    }

    if let Some(mt) = &params.media_type {
        if !mt.is_empty() {
            qb.push(" AND media_type = ").push_bind(mt.clone());
        }
    }

    if let Some(genre) = &params.genre {
        if !genre.is_empty() {
            qb.push(" AND ")
                .push_bind(genre.clone())
                .push(" = ANY(genres)");
        }
    }

    qb.push(" ORDER BY popularity DESC NULLS LAST");
    qb.push(" LIMIT ").push_bind(PAGE_SIZE);
    qb.push(" OFFSET ").push_bind(offset);

    let items = qb
        .build_query_as::<MediaItemSummary>()
        .fetch_all(&state.db)
        .await?;
    println!("{:#?}", items);
    Ok(Json(BrowseResponse {
        items,
        page,
        page_size: PAGE_SIZE,
    }))
}

/// Live TMDB multi-search: searches TMDB, upserts results into the local DB,
/// then returns the DB rows so every item has a stable internal `id`.
async fn search_tmdb_live(
    state: &AppState,
    query: &str,
    page: i64,
    media_type_filter: Option<&str>,
) -> ApiResult<Json<BrowseResponse>> {
    let want_movie = media_type_filter.map_or(true, |t| t == "movie");
    let want_tv = media_type_filter.map_or(true, |t| t == "tv");

    // Fetch genre maps and TMDB results concurrently
    let (movie_genres, tv_genres, results) = tokio::try_join!(
        crate::tmdb::fetch_genre_map(&state.http_client, &state.config.tmdb_api_key, "movie"),
        crate::tmdb::fetch_genre_map(&state.http_client, &state.config.tmdb_api_key, "tv"),
        crate::tmdb::search_multi(
            &state.http_client,
            &state.config.tmdb_api_key,
            query,
            page as u32
        ),
    )?;

    let mut movie_ids: Vec<i32> = Vec::new();
    let mut tv_ids: Vec<i32> = Vec::new();

    for item in &results.results {
        match item.media_type.as_deref() {
            Some("movie") if want_movie => {
                if let Err(e) =
                    crate::media::upsert_from_list(&state.db, item, "movie", &movie_genres).await
                {
                    tracing::warn!("upsert movie {}: {e}", item.id);
                }
                movie_ids.push(item.id);
            }
            Some("tv") if want_tv => {
                if let Err(e) =
                    crate::media::upsert_from_list(&state.db, item, "tv", &tv_genres).await
                {
                    tracing::warn!("upsert tv {}: {e}", item.id);
                }
                tv_ids.push(item.id);
            }
            _ => {}
        }
    }

    movie_ids.append(&mut tv_ids);

    let val = json!({
        "ids":movie_ids
    });
    let client = state.http_client.clone();
    let sidecar_base = state.config.sidecar_url.clone();
    tokio::spawn(async move {
        let sidecar_url = format!("{}/vectorize_movie_batch", sidecar_base);
        match client.post(sidecar_url).json(&val).send().await {
            Ok(res) => tracing::info!(
                "ML Sidecar media batch vectorize for status={}",
                res.status()
            ),
            Err(e) => tracing::warn!(
                "ML Sidecar not reachable during media batch vectorize (non-fatal): {e}"
            ),
        }
    });

    // Fetch the just-upserted rows from the DB so they have stable internal IDs
    let items = sqlx::query_as::<_, MediaItemSummary>(
        r#"
        SELECT
            id, tmdb_id, media_type, title,
            poster_path, backdrop_path,
            TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date,
            CAST(vote_average AS FLOAT8)         AS vote_average,
            vote_count,
            genres,
            CAST(popularity AS FLOAT8)           AS popularity
        FROM media_items
        WHERE tmdb_id = ANY($1)
        ORDER BY popularity DESC NULLS LAST
        "#,
    )
    .bind(&movie_ids)
    .fetch_all(&state.db)
    .await?;

    let count = items.len() as i64;

    Ok(Json(BrowseResponse {
        items,
        page,
        page_size: count,
    }))
}

/// GET /api/media/:id
///
/// Return full detail for a single media_item (including cast_crew JSONB).
pub async fn get_media_detail(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> ApiResult<Response> {
    let row = sqlx::query_as::<_, MediaItemDetail>(
        r#"
        SELECT
            id, tmdb_id, media_type, title, original_title, overview, tagline,
            poster_path, backdrop_path, homepage,
            TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date,
            status, genres, language, runtime,
            CAST(vote_average AS FLOAT8) AS vote_average,
            vote_count,
            CAST(popularity AS FLOAT8)   AS popularity,
            cast_crew
        FROM media_items
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;

    match row {
        Some(item) => Ok(Json(item).into_response()),
        None => Ok((StatusCode::NOT_FOUND, "media item not found").into_response()),
    }
}

/// POST /api/sync
///
/// Trigger a TMDB popular sync. Body: `{"pages": 5}` (optional, default 5, max 20).
/// This endpoint is intentionally public (no auth) for dev convenience.
pub async fn trigger_sync(
    State(state): State<Arc<AppState>>,
    body: Option<Json<SyncRequest>>,
) -> ApiResult<Json<SyncResponse>> {
    let pages = body.and_then(|b| b.pages).unwrap_or(5).min(20).max(1);

    tracing::info!(pages, "Starting TMDB popular sync");

    let synced = sync_popular(
        &state.db,
        &state.http_client,
        &state.config.tmdb_api_key,
        pages,
    )
    .await?;

    tracing::info!(synced, "TMDB sync complete");

    Ok(Json(SyncResponse { synced }))
}

pub async fn get_user_recommedations(
    State(state): State<Arc<AppState>>,
    session: AuthSession,

    Query(params): Query<BrowseParams>,
) -> ApiResult<Json<BrowseResponse>> {
    let page = params.page.unwrap_or(1).max(1);

    // Default: query local DB cache
    let offset = (page - 1) * PAGE_SIZE;

    let mut qb: QueryBuilder<sqlx::Postgres> = QueryBuilder::new(
        r#"
       SELECT mt.id, user_id, tmdb_id, media_type, title,
            poster_path, backdrop_path,
            TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date,
            CAST(vote_average AS FLOAT8)         AS vote_average,
            vote_count,
            genres,
            CAST(popularity AS FLOAT8)           AS popularity FROM public.recommendations r
            left join media_items mt on mt.id = r.media_item_id
        "#,
    );
    qb.push(" where user_id = ").push_bind(session.user_id);

    if let Some(q) = &params.q {
        if !q.trim().is_empty() {
            qb.push(" AND title ILIKE ")
                .push_bind(format!("%{}%", q.trim()));
        }
    }

    if let Some(mt) = &params.media_type {
        if !mt.is_empty() {
            qb.push(" AND media_type = ").push_bind(mt.clone());
        }
    }

    if let Some(genre) = &params.genre {
        if !genre.is_empty() {
            qb.push(" AND ")
                .push_bind(genre.clone())
                .push(" = ANY(genres)");
        }
    }

    qb.push(" ORDER BY score DESC NULLS LAST ");
    qb.push(" LIMIT ").push_bind(PAGE_SIZE);
    qb.push(" OFFSET ").push_bind(offset);

    let items = qb
        .build_query_as::<MediaItemSummary>()
        .fetch_all(&state.db)
        .await?;

    Ok(Json(BrowseResponse {
        items,
        page,
        page_size: PAGE_SIZE,
    }))
}
