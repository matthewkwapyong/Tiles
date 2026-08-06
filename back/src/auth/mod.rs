use axum::{
    extract::{FromRequestParts, Request, State},
    http::{StatusCode, header::COOKIE, request::Parts},
    middleware::Next,
    response::Response,
};
use serde::Serialize;
use sqlx::FromRow;
use std::sync::Arc;

use crate::state::AppState;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/// Authenticated user identity, inserted into request extensions by the
/// `auth_middleware`. Extract this in handlers to get the current user.
#[derive(Clone, Debug, Serialize)]
pub struct AuthSession {
    pub user_id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub image: Option<String>,
    pub onboarding_completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// DB row returned by the session query.
#[derive(FromRow)]
struct SessionRow {
    user_id: String,
    email: Option<String>,
    name: Option<String>,
    image: Option<String>,
    onboarding_completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

/// Axum middleware that validates the Auth.js session cookie.
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = extract_session_token(req.headers()).ok_or(StatusCode::UNAUTHORIZED)?;

    let row = sqlx::query_as::<_, SessionRow>(
        r#"
        SELECT
            s."userId"  AS user_id,
            u.email,
            u.name,
            u.image,
            u.onboarding_completed_at
        FROM sessions  s
        JOIN users     u ON u.id = s."userId"
        WHERE s."sessionToken" = $1
          AND s.expires > NOW()
        "#,
    )
    .bind(&token)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Session DB query failed: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    req.extensions_mut().insert(AuthSession {
        user_id: row.user_id,
        email: row.email,
        name: row.name,
        image: row.image,
        onboarding_completed_at: row.onboarding_completed_at,
    });

    Ok(next.run(req).await)
}

// ─────────────────────────────────────────────────────────────────────────────
// Extractors
// ─────────────────────────────────────────────────────────────────────────────

/// Extractor for **protected** routes — returns `401` if no valid session.
///
/// ```rust
/// async fn my_handler(session: AuthSession) -> impl IntoResponse { ... }
/// ```

impl<S> FromRequestParts<S> for AuthSession
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthSession>()
            .cloned()
            .ok_or(StatusCode::UNAUTHORIZED)
    }
}

/// Extractor for **optional** auth — public routes that behave differently
/// when a user is logged in (e.g. personalised recommendations).
///
/// ```rust
/// async fn feed(session: OptionalAuthSession) -> impl IntoResponse {
///     if let Some(s) = session.0 { /* logged-in path */ }
/// }
/// ```
pub struct OptionalAuthSession(pub Option<AuthSession>);

impl<S> FromRequestParts<S> for OptionalAuthSession
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Ok(OptionalAuthSession(
            parts.extensions.get::<AuthSession>().cloned(),
        ))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Reads the Auth.js session token from the Cookie header.
/// Checks both the HTTP (dev) and HTTPS (prod) cookie names.
fn extract_session_token(headers: &axum::http::HeaderMap) -> Option<String> {
    let cookie_header = headers.get(COOKIE)?.to_str().ok()?;

    for part in cookie_header.split(';') {
        let part = part.trim();
        // Auth.js v5 (dev & prod)
        if let Some(val) = part.strip_prefix("authjs.session-token=") {
            return Some(val.to_string());
        }
        if let Some(val) = part.strip_prefix("__Secure-authjs.session-token=") {
            return Some(val.to_string());
        }
        // NextAuth.js v4 (dev & prod compatibility)
        if let Some(val) = part.strip_prefix("next-auth.session-token=") {
            return Some(val.to_string());
        }
        if let Some(val) = part.strip_prefix("__Secure-next-auth.session-token=") {
            return Some(val.to_string());
        }
    }

    None
}
