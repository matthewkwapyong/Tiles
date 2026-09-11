-- =============================================================================
-- Movie Recommendation App — PostgreSQL Schema
-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector


-- =============================================================================
-- Auth.js (next-auth) Adapter Tables
-- Spec: https://authjs.dev/reference/adapter/pg
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name                TEXT,
    email               TEXT        UNIQUE,
    "emailVerified"     TIMESTAMPTZ,
    image               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- =============================================================================
-- Curated Onboarding Items
-- Hand-picked TMDB items seeded for onboarding rating selection
-- =============================================================================

CREATE TABLE IF NOT EXISTS curated_onboarding_items (
    id            BIGSERIAL PRIMARY KEY,
    tmdb_id       INTEGER NOT NULL,
    media_type    TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    display_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_curated_onboarding_tmdb ON curated_onboarding_items (tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS idx_curated_onboarding_display ON curated_onboarding_items (display_order ASC);

CREATE TABLE IF NOT EXISTS accounts (
    id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "userId"              TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                  TEXT        NOT NULL,
    provider              TEXT        NOT NULL,
    "providerAccountId"   TEXT        NOT NULL,
    refresh_token         TEXT,
    access_token          TEXT,
    expires_at            BIGINT,
    token_type            TEXT,
    scope                 TEXT,
    id_token              TEXT,
    session_state         TEXT,
    UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "sessionToken"  TEXT        NOT NULL UNIQUE,
    "userId"        TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires         TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier  TEXT        NOT NULL,
    token       TEXT        NOT NULL UNIQUE,
    expires     TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);


-- =============================================================================
-- Media Items  (unified movies + TV)
-- Sourced from TMDB; cached locally.
-- =============================================================================

CREATE TABLE IF NOT EXISTS media_items (
    id              BIGSERIAL   PRIMARY KEY,
    tmdb_id         INTEGER     NOT NULL,
    media_type      TEXT        NOT NULL CHECK (media_type IN ('movie', 'tv')),

    -- Core metadata
    title           TEXT        NOT NULL,
    original_title  TEXT,
    overview        TEXT,
    tagline         TEXT,
    poster_path     TEXT,
    backdrop_path   TEXT,
    homepage        TEXT,

    -- Dates & status
    release_date    DATE,                   -- movie release / tv first_air_date
    status          TEXT,                   -- Released, Ended, Returning Series, …

    -- Classification
    genres          TEXT[]      NOT NULL DEFAULT '{}',
    language        TEXT,                   -- original_language (ISO 639-1)
    runtime         INTEGER,                -- minutes (movie) or avg episode (tv)

    -- Rich relational data stored as JSONB for flexibility
    -- cast:  [{id, name, character, profile_path, order}]
    -- crew:  [{id, name, job, department, profile_path}]
    cast_crew       JSONB       NOT NULL DEFAULT '{}',

    -- Popularity & ratings from TMDB (not user ratings)
    popularity      NUMERIC(10, 4),
    vote_average    NUMERIC(4, 2),
    vote_count      INTEGER,

    -- Housekeeping
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_media_items_tmdb        ON media_items (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_media_items_media_type  ON media_items (media_type);
CREATE INDEX IF NOT EXISTS idx_media_items_genres      ON media_items USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_media_items_cast_crew   ON media_items USING GIN (cast_crew);
CREATE INDEX IF NOT EXISTS idx_media_items_popularity  ON media_items (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_release     ON media_items (release_date DESC);


-- =============================================================================
-- Ratings
-- User star ratings: numeric(3,1), range 1.0 – 10.0 (half-point steps, e.g. 7.5)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ratings (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_item_id   BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    rating          NUMERIC(3, 1) NOT NULL
                        CHECK (rating >= 1.0 AND rating <= 10.0
                               AND rating * 2 = FLOOR(rating * 2)), -- enforce 0.5 steps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, media_item_id)     -- one rating per user per item
);

CREATE INDEX IF NOT EXISTS idx_ratings_user        ON ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_media_item  ON ratings (media_item_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating      ON ratings (rating);


-- =============================================================================
-- Reviews
-- Free-text reviews; sentiment & embedding computed asynchronously by Python sidecar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_item_id   BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    body            TEXT        NOT NULL CHECK (char_length(body) >= 1),
    sentiment       NUMERIC(4, 3),   -- e.g. 0.921  (set async; NULL until processed)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, media_item_id)     -- one review per user per item
);

CREATE INDEX IF NOT EXISTS idx_reviews_user        ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_media_item  ON reviews (media_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at  ON reviews (created_at DESC);


-- =============================================================================
-- Watchlist
-- Items the user wants to watch (not yet watched / rated).
-- =============================================================================

CREATE TABLE IF NOT EXISTS watchlist (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_item_id   BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user       ON watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at   ON watchlist (added_at DESC);


-- =============================================================================
-- Watched Log
-- Records each watch event (supports re-watches; separate from rating).
-- =============================================================================

CREATE TABLE IF NOT EXISTS watched_log (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_item_id   BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    watched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- No UNIQUE constraint here intentionally — allows logging re-watches.
    -- A partial unique index on (user_id, media_item_id, watched_at::DATE)
    -- can be added if de-duplication per calendar day is desired.
    notes           TEXT        -- optional: "watched with friends", episode note, etc.
);

CREATE INDEX IF NOT EXISTS idx_watched_log_user        ON watched_log (user_id);
CREATE INDEX IF NOT EXISTS idx_watched_log_media_item  ON watched_log (media_item_id);
CREATE INDEX IF NOT EXISTS idx_watched_log_watched_at  ON watched_log (watched_at DESC);


-- =============================================================================
-- Review Embeddings  (pgvector)
-- Sentence-transformer embeddings (384-dim) generated by Python sidecar.
-- Filled asynchronously after a review is submitted.
-- =============================================================================

CREATE TABLE IF NOT EXISTS review_embeddings (
    review_id       BIGINT      PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
    embedding       vector(384) NOT NULL,
    model_version   TEXT,                   -- e.g. 'all-MiniLM-L6-v2'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for approximate nearest-neighbour search.
-- Build AFTER populating enough rows (needs >0 rows for lists to make sense).
-- Replace with HNSW if pgvector >= 0.5 and latency is critical:
--   CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_review_embeddings_vec
    ON review_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);


-- =============================================================================
-- User Taste Vectors  (pgvector)
-- Aggregated embedding profile per user; recomputed by Python sidecar on a schedule
-- or after a configurable number of new ratings/reviews.
-- =============================================================================
-- Corrected version — dimension matches media_item_vectors, not the old 384 placeholder
CREATE TABLE IF NOT EXISTS user_taste_vectors (
    user_id         TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding       vector(26)  NOT NULL,   -- must match media_item_vectors dimension
    vocabulary_version INTEGER  NOT NULL DEFAULT 1,
    model_version   TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_taste_vectors_vec
    ON user_taste_vectors USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);



-- =============================================================================
-- Recommendations  (precomputed cache)
-- Scored candidates per user; refreshed by background job.
-- =============================================================================

CREATE TABLE IF NOT EXISTS recommendations (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_item_id   BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    score           NUMERIC(6, 4) NOT NULL,  -- 0.0000 – 1.0000 cosine similarity
    reason          TEXT,                    -- optional human-readable reason string
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, media_item_id)          -- latest score wins; use upsert
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user         ON recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score        ON recommendations (user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_generated_at ON recommendations (generated_at DESC);

ALTER TABLE recommendations
    ADD COLUMN content_score NUMERIC(6,4),
    ADD COLUMN cf_score NUMERIC(6,4);
-- =============================================================================
-- Helper: auto-update updated_at timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_ratings_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE IF NOT EXISTS genre_vocabulary (
    id SERIAL PRIMARY KEY,
    genre_name TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_genre_vocabulary_genre_name ON genre_vocabulary(genre_name);


CREATE TABLE IF NOT EXISTS media_item_vectors (
    media_item_id   BIGINT      PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
    embedding       vector(26)  NOT NULL,   -- dimension = genre count for now; adjust as you add features
    vocabulary_version INTEGER  NOT NULL DEFAULT 1,  -- bump if you ever rebuild the vocabulary/reorder
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_item_vectors_vec
    ON media_item_vectors USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);



CREATE TABLE IF NOT EXISTS user_cf_vectors (
    user_id         TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding       vector(50)  NOT NULL,   -- dimension = your chosen factor count
    model_version   INTEGER     NOT NULL DEFAULT 1,  -- bump on full retrain
    trained_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_cf_vectors (
    media_item_id   BIGINT      PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
    embedding       vector(50)  NOT NULL,
    model_version   INTEGER     NOT NULL DEFAULT 1,
    trained_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_cf_vectors_vec
    ON media_cf_vectors USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);


    -- Aggregated per-user review taste (analogous to user_taste_vectors)
CREATE TABLE IF NOT EXISTS user_review_vectors (
    user_id         TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding       vector(384) NOT NULL,
    model_version   TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated per-movie review profile (built from everyone's reviews of it)
CREATE TABLE IF NOT EXISTS media_review_vectors (
    media_item_id   BIGINT      PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
    embedding       vector(384) NOT NULL,
    model_version   TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- User Lists (Folders / Curated Collections)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_lists (
    id                  BIGSERIAL   PRIMARY KEY,
    user_id             TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT        NOT NULL,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_lists_user ON user_lists (user_id, created_at DESC);

CREATE OR REPLACE TRIGGER trg_user_lists_updated_at
    BEFORE UPDATE ON user_lists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_list_items (
    id                  BIGSERIAL   PRIMARY KEY,
    list_id             BIGINT      NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    media_item_id       BIGINT      NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (list_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_list_items_list ON user_list_items (list_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_list_items_media ON user_list_items (media_item_id);