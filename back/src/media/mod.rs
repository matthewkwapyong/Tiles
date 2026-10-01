pub mod routes;

use anyhow::Result;
use serde_json::json;
use sqlx::PgPool;
use std::collections::HashMap;

use crate::tmdb::{TmdbDetail, TmdbListItem, fetch_genre_map, fetch_popular};

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Insert or update a media_items row from a TMDB list item (popular/search).
/// Genre names are resolved from `genre_map` (id → name).
pub async fn upsert_from_list(
    db: &PgPool,
    item: &TmdbListItem,
    media_type: &str,
    genre_map: &HashMap<i32, String>,
) -> Result<()> {
    let title = item
        .title
        .as_deref()
        .or(item.name.as_deref())
        .unwrap_or("Unknown");

    let original_title = item
        .original_title
        .as_deref()
        .or(item.original_name.as_deref());

    let release_date: Option<chrono::NaiveDate> = item
        .release_date
        .as_deref()
        .or(item.first_air_date.as_deref())
        .filter(|s| !s.is_empty())
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    let genres: Vec<String> = item
        .genre_ids
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .filter_map(|id| genre_map.get(id).cloned())
        .collect();

    sqlx::query(
        r#"
        INSERT INTO media_items (
            tmdb_id, media_type, title, original_title, overview,
            poster_path, backdrop_path, release_date, genres, language,
            popularity, vote_average, vote_count, cast_crew
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10,
            CAST($11 AS NUMERIC), CAST($12 AS NUMERIC), $13,
            '{}'::JSONB
        )
        ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
            title         = EXCLUDED.title,
            overview      = EXCLUDED.overview,
            poster_path   = EXCLUDED.poster_path,
            backdrop_path = EXCLUDED.backdrop_path,
            release_date  = EXCLUDED.release_date,
            genres        = EXCLUDED.genres,
            popularity    = EXCLUDED.popularity,
            vote_average  = EXCLUDED.vote_average,
            vote_count    = EXCLUDED.vote_count,
            fetched_at    = NOW()
        "#,
    )
    .bind(item.id)
    .bind(media_type)
    .bind(title)
    .bind(original_title)
    .bind(item.overview.as_deref())
    .bind(item.poster_path.as_deref())
    .bind(item.backdrop_path.as_deref())
    .bind(release_date)
    .bind(&genres)
    .bind(item.original_language.as_deref())
    .bind(item.popularity)
    .bind(item.vote_average)
    .bind(item.vote_count)
    .execute(db)
    .await?;

    Ok(())
}

/// Insert or update a media_items row from a full TMDB detail response.
/// Returns the internal DB `id`.
pub async fn upsert_from_detail(db: &PgPool, detail: &TmdbDetail, media_type: &str) -> Result<i64> {
    let title = detail
        .title
        .as_deref()
        .or(detail.name.as_deref())
        .unwrap_or("Unknown");

    let original_title = detail
        .original_title
        .as_deref()
        .or(detail.original_name.as_deref());

    let release_date: Option<chrono::NaiveDate> = detail
        .release_date
        .as_deref()
        .or(detail.first_air_date.as_deref())
        .filter(|s| !s.is_empty())
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    let genres: Vec<String> = detail.genres.iter().map(|g| g.name.clone()).collect();

    // For TV, take the first episode runtime if movie runtime is absent.
    let runtime = detail.runtime.or_else(|| {
        detail
            .episode_run_time
            .as_deref()
            .and_then(|r| r.first().copied())
    });

    let cast_crew = json!({
        "cast": detail.credits.as_ref().map(|c| &c.cast).unwrap_or(&vec![]),
        "crew": detail.credits.as_ref().map(|c| &c.crew).unwrap_or(&vec![]),
    });

    let row = sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO media_items (
            tmdb_id, media_type, title, original_title, overview, tagline,
            poster_path, backdrop_path, homepage, release_date, status,
            genres, language, runtime, cast_crew,
            popularity, vote_average, vote_count
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            CAST($16 AS NUMERIC), CAST($17 AS NUMERIC), $18
        )
        ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
            title         = EXCLUDED.title,
            overview      = EXCLUDED.overview,
            tagline       = EXCLUDED.tagline,
            poster_path   = EXCLUDED.poster_path,
            backdrop_path = EXCLUDED.backdrop_path,
            homepage      = EXCLUDED.homepage,
            release_date  = EXCLUDED.release_date,
            status        = EXCLUDED.status,
            genres        = EXCLUDED.genres,
            runtime       = EXCLUDED.runtime,
            cast_crew     = EXCLUDED.cast_crew,
            popularity    = EXCLUDED.popularity,
            vote_average  = EXCLUDED.vote_average,
            vote_count    = EXCLUDED.vote_count,
            fetched_at    = NOW()
        RETURNING id
        "#,
    )
    .bind(detail.id)
    .bind(media_type)
    .bind(title)
    .bind(original_title)
    .bind(detail.overview.as_deref())
    .bind(detail.tagline.as_deref())
    .bind(detail.poster_path.as_deref())
    .bind(detail.backdrop_path.as_deref())
    .bind(detail.homepage.as_deref())
    .bind(release_date)
    .bind(detail.status.as_deref())
    .bind(&genres)
    .bind(detail.original_language.as_deref())
    .bind(runtime)
    .bind(serde_json::to_value(&cast_crew)?)
    .bind(detail.popularity)
    .bind(detail.vote_average)
    .bind(detail.vote_count)
    .fetch_one(db)
    .await?;
    let media_item_id = row;
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let sidecar_base = std::env::var("SIDECAR_URL")
            .or_else(|_| std::env::var("PYTHON_SIDECAR_URL"))
            .unwrap_or_else(|_| "http://localhost:8080".to_string());
        let sidecar_url = format!("{sidecar_base}/vectorize-movie/{media_item_id}");
        match client.post(&sidecar_url).send().await {
            Ok(res) => tracing::info!("ML Sidecar single movie vectorize for media_item_id={media_item_id}: status={}", res.status()),
            Err(e) => tracing::warn!("ML Sidecar not reachable during single movie vectorize (non-fatal): {e}"),
        }
    });

    Ok(row)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync
// ─────────────────────────────────────────────────────────────────────────────

/// Pull `pages` pages of popular movies + TV from TMDB and upsert all into
/// the local `media_items` cache.  Returns the total number of rows upserted.
pub async fn sync_popular(
    db: &PgPool,
    client: &reqwest::Client,
    api_key: &str,
    pages: u32,
) -> Result<u64> {
    let (movie_genres, tv_genres) = tokio::try_join!(
        fetch_genre_map(client, api_key, "movie"),
        fetch_genre_map(client, api_key, "tv"),
    )?;

    let mut total: u64 = 0;
    let mut movie_ids: Vec<i32> = Vec::new();
    let mut tv_ids: Vec<i32> = Vec::new();

    for page in 1..=pages {
        let (movies, shows) = tokio::try_join!(
            fetch_popular(client, api_key, "movie", page),
            fetch_popular(client, api_key, "tv", page),
        )?;

        for item in &movies.results {
            upsert_from_list(db, item, "movie", &movie_genres).await?;
            movie_ids.push(item.id);
            total += 1;
        }
        for item in &shows.results {
            upsert_from_list(db, item, "tv", &tv_genres).await?;
            tv_ids.push(item.id);
            total += 1;
        }
        let combined = movie_ids.append(&mut tv_ids);
        let val = json!({
            "ids":combined
        });


        tokio::spawn(async move {
            let client = reqwest::Client::new();

            let sidecar_url = format!("http://localhost:8080/vectorize_movie_batch");
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

        tracing::info!(page, total, "sync_popular: page done");
    }

    Ok(total)
}
