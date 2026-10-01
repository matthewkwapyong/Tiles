use crate::auth::{auth_middleware, AuthSession};
use crate::interactions::routes::{
    add_item_to_list, add_to_watchlist, create_user_list, delete_user_list, delete_user_rating,
    delete_user_review, delete_watch_log_entry, get_media_lists_status, get_media_watch_logs,
    get_my_review, get_user_list_detail, get_user_rating, get_user_ratings_paginated,
    get_user_reviews_paginated, get_user_stats, get_user_taste_breakdown, get_user_taste_profile,
    get_watchlist_status, list_media_reviews, list_user_history, list_user_lists,
    list_user_ratings, list_user_watchlist, log_watch_event, remove_from_watchlist,
    remove_item_from_list, save_user_review, set_user_rating, update_user_list,
};
use crate::media::routes::{browse_media, get_media_detail, get_user_recommedations, trigger_sync};
use crate::state::AppState;
use axum::{
    Json, Router,
    http::{
        HeaderValue,
        header::{AUTHORIZATION, COOKIE, CONTENT_TYPE},
        method::Method,
    },
    middleware,
    routing::{delete, get, post, put},
};
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::onboarding::routes::{
    get_curated_onboarding, get_onboarding_status, submit_onboarding_ratings,
};

pub fn app(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(
            state
                .config
                .frontend_url
                .parse::<HeaderValue>()
                .expect("Invalid FRONTEND_URL"),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE, COOKIE, "x-request-id".parse().unwrap()])
        .allow_credentials(true);

    // ── Protected routes — require a valid Auth.js session cookie ─────────
    let protected = Router::new()
        .route("/me", get(me_handler))
        // Rating
        .route(
            "/media/{id}/rating",
            get(get_user_rating).post(set_user_rating).delete(delete_user_rating),
        )
        // Review (personal)
        .route("/media/{id}/review/me", get(get_my_review))
        .route(
            "/media/{id}/review",
            post(save_user_review).delete(delete_user_review),
        )
        // Watchlist
        .route(
            "/media/{id}/watchlist",
            get(get_watchlist_status)
                .post(add_to_watchlist)
                .delete(remove_from_watchlist),
        )
        .route("/watchlist", get(list_user_watchlist))
        // Lists / Folders
        .route("/lists", get(list_user_lists).post(create_user_list))
        .route(
            "/lists/{id}",
            get(get_user_list_detail)
                .put(update_user_list)
                .delete(delete_user_list),
        )
        .route("/lists/{id}/items", post(add_item_to_list))
        .route("/lists/{id}/items/{media_item_id}", delete(remove_item_from_list))
        .route("/media/{id}/lists", get(get_media_lists_status))
        // Watched Log
        .route(
            "/media/{id}/watched",
            get(get_media_watch_logs).post(log_watch_event),
        )
        .route("/watched/{log_id}", delete(delete_watch_log_entry))
        // History & Profile
        .route("/history", get(list_user_history))
        .route("/user/ratings", get(list_user_ratings))
        .route("/user/taste", get(get_user_taste_profile))
        .route("/users/{id}/ratings", get(get_user_ratings_paginated))
        .route("/users/{id}/reviews", get(get_user_reviews_paginated))
        .route("/users/{id}/stats", get(get_user_stats))
        .route("/users/{id}/taste-breakdown", get(get_user_taste_breakdown))
        // Onboarding
        .route("/onboarding/status", get(get_onboarding_status))
        .route("/onboarding/ratings", post(submit_onboarding_ratings))
        .route("/recommedation", get(get_user_recommedations))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // ── Public routes ─────────────────────────────────────────────────────
    let public = Router::new()
        .route("/", get(|| async { "OK" }))
        // Media browse + detail
        .route("/media", get(browse_media))
        .route("/media/{id}", get(get_media_detail))
        // Reviews (community)
        .route("/media/{id}/reviews", get(list_media_reviews))
        // Onboarding curated seed list
        .route("/onboarding/curated", get(get_curated_onboarding))
        // TMDB sync trigger
        .route("/sync", post(trigger_sync));

    Router::new()
        .merge(public)
        .merge(protected)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /me — returns the authenticated user's identity.
async fn me_handler(session: AuthSession) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "user_id": session.user_id,
        "email":   session.email,
        "name":    session.name,
        "image":   session.image,
    }))
}
