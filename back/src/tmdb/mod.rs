use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const TMDB_BASE: &str = "https://api.themoviedb.org/3";

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

/// A single item from a popular/search list.
#[derive(Debug, Deserialize)]
pub struct TmdbListItem {
    pub id: i32,
    /// Present on movies.
    pub title: Option<String>,
    /// Present on TV shows.
    pub name: Option<String>,
    pub original_title: Option<String>,
    pub original_name: Option<String>,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    /// Present on movies.
    pub release_date: Option<String>,
    /// Present on TV shows.
    pub first_air_date: Option<String>,
    pub popularity: Option<f64>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub genre_ids: Option<Vec<i32>>,
    pub original_language: Option<String>,
    /// Only set in multi-search results.
    pub media_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TmdbListResponse {
    pub results: Vec<TmdbListItem>,
    pub total_results: Option<i64>,
    pub total_pages: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct TmdbGenreListResponse {
    genres: Vec<TmdbGenre>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TmdbGenre {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TmdbCastMember {
    pub id: i64,
    pub name: String,
    pub character: Option<String>,
    pub profile_path: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TmdbCrewMember {
    pub id: i64,
    pub name: String,
    pub job: String,
    pub department: String,
    pub profile_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TmdbCredits {
    pub cast: Vec<TmdbCastMember>,
    pub crew: Vec<TmdbCrewMember>,
}

/// Full movie/TV detail response (with credits via append_to_response).
#[derive(Debug, Deserialize)]
pub struct TmdbDetail {
    pub id: i32,
    /// Movies.
    pub title: Option<String>,
    /// TV shows.
    pub name: Option<String>,
    pub original_title: Option<String>,
    pub original_name: Option<String>,
    pub overview: Option<String>,
    pub tagline: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub homepage: Option<String>,
    /// Movies.
    pub release_date: Option<String>,
    /// TV shows.
    pub first_air_date: Option<String>,
    pub status: Option<String>,
    pub genres: Vec<TmdbGenre>,
    pub original_language: Option<String>,
    /// Movie runtime in minutes.
    pub runtime: Option<i32>,
    /// TV average episode runtime(s).
    pub episode_run_time: Option<Vec<i32>>,
    pub popularity: Option<f64>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub credits: Option<TmdbCredits>,
}

// ─────────────────────────────────────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────────────────────────────────────

/// Fetch one page of popular movies or TV shows.
/// `media_type` must be `"movie"` or `"tv"`.
pub async fn fetch_popular(
    client: &reqwest::Client,
    api_key: &str,
    media_type: &str,
    page: u32,
) -> Result<TmdbListResponse> {
    let url = format!("{TMDB_BASE}/{media_type}/popular");
    let resp = client
        .get(&url)
        .query(&[
            ("api_key", api_key),
            ("language", "en-US"),
            ("page", &page.to_string()),
        ])
        .send()
        .await?
        .error_for_status()?
        .json::<TmdbListResponse>()
        .await?;
    Ok(resp)
}

/// Fetch full detail for a single movie or TV show, including credits.
pub async fn fetch_detail(
    client: &reqwest::Client,
    api_key: &str,
    media_type: &str,
    tmdb_id: i32,
) -> Result<TmdbDetail> {
    let url = format!("{TMDB_BASE}/{media_type}/{tmdb_id}");
    let resp = client
        .get(&url)
        .query(&[
            ("api_key", api_key),
            ("language", "en-US"),
            ("append_to_response", "credits"),
        ])
        .send()
        .await?
        .error_for_status()?
        .json::<TmdbDetail>()
        .await?;
    Ok(resp)
}

/// Multi-search across movies, TV shows, and people.
pub async fn search_multi(
    client: &reqwest::Client,
    api_key: &str,
    query: &str,
    page: u32,
) -> Result<TmdbListResponse> {
    let url = format!("{TMDB_BASE}/search/multi");
    let resp = client
        .get(&url)
        .query(&[
            ("api_key", api_key),
            ("language", "en-US"),
            ("query", query),
            ("page", &page.to_string()),
        ])
        .send()
        .await?
        .error_for_status()?
        .json::<TmdbListResponse>()
        .await?;
    Ok(resp)
}

/// Fetch the genre name map for movies or TV (`id → name`).
pub async fn fetch_genre_map(
    client: &reqwest::Client,
    api_key: &str,
    media_type: &str,
) -> Result<HashMap<i32, String>> {
    let url = format!("{TMDB_BASE}/genre/{media_type}/list");
    let resp = client
        .get(&url)
        .query(&[("api_key", api_key), ("language", "en-US")])
        .send()
        .await?
        .error_for_status()?
        .json::<TmdbGenreListResponse>()
        .await?;
    Ok(resp.genres.into_iter().map(|g| (g.id, g.name)).collect())
}
