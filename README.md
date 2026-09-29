# 🎬 Tiles — Film-Noir Movie & TV Discovery Platform

A full-stack, AI-powered movie and TV show discovery, tracking, and personalized recommendation platform built with a darkroom film-noir monochrome aesthetic.

Powered by a high-performance **Rust (Axum)** backend, a **Next.js 16 (React 19)** web application, a **PostgreSQL + `pgvector`** vector database, and a **Python (FastAPI + SentenceTransformers)** ML sidecar recommendation engine.

---

## 🌟 Key Features

- **Film-Noir Monochrome Design System**: Frosted glassmorphism, 35mm film grain overlay, cream & charcoal monochrome color palette, and micro-animations.
- **Interactive Quick Search & Command Palette**: Global `CMD+K` / `Ctrl+K` search dialogue with fuzzy trigram matching (`pg_trgm`) and instant live TMDB sync.
- **Personalized Vector Recommendations**: Hybrid content-based and collaborative filtering powered by `pgvector` embeddings, genre vector space analysis, and `all-MiniLM-L6-v2` sentence transformers for review sentiment and taste modeling.
- **Onboarding Taste Calibration**: Curated initial rating grid that computes immediate vector taste profiles for new users.
- **Interactive 10-Point Rating Widget**: Half-star / 10-point rating system with real-time updates and clear capability.
- **Custom User Lists & Folders**: Create, manage, and curate custom film collections with poster thumbnail collages.
- **Watchlist & Viewing History**: Track films you want to watch and log re-watchable viewing events with notes.
- **Shared Session Authentication**: Seamless authentication using **Auth.js v5 (NextAuth)** with a shared PostgreSQL session adapter between Next.js and Rust.

---

## 🏗️ System Architecture

```
                       ┌─────────────────────────┐
                       │   Next.js 16 Frontend   │
                       │    (Port 4000 / 3000)   │
                       └────────────┬────────────┘
                                    │ HTTP / REST & Cookies
                                    ▼
                       ┌─────────────────────────┐
                       │    Rust (Axum) API      │
                       │       (Port 8000)       │
                       └──────┬───────────┬──────┘
                              │           │
           SQLx / pgvector    │           │ Async HTTP Batch Jobs
                              ▼           ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│ PostgreSQL 16 + pgvector      │       │ Python (FastAPI) ML Sidecar   │
│ - Auth.js session adapter     │       │ - SentenceTransformers        │
│ - Media catalog & metadata    │       │ - Vector embeddings engine    │
│ - User ratings, lists, history│       │ - Cosine similarity scoring   │
│ - HNSW / IVFFlat vector index │       │       (Port 8080 / 8000)      │
└───────────────────────────────┘       └───────────────────────────────┘
```

---

## 📁 Repository Layout

```
movierec/
├── tiles/                   # Next.js 16 Frontend Web Application
│   ├── app/                 # App Router (discover, media, recommendations, watchlist, lists, history, auth)
│   ├── app/components/      # UI components (Navbar, NavSearch, MediaCard, AddToListModal, etc.)
│   ├── auth.ts              # Auth.js v5 configuration & Postgres adapter
│   └── next.config.ts       # Rewrites proxy (/api/backend/* -> Rust API) & image patterns
│
├── back/                    # Rust (Axum) High-Performance API Backend
│   ├── src/main.rs          # Application entry point & Tokio runtime setup
│   ├── src/app.rs           # Axum router configuration & auth middleware
│   ├── src/media/           # Media browse, search, and detail handlers
│   ├── src/interactions/    # Ratings, reviews, lists, watchlist, and history handlers
│   ├── src/onboarding/      # Onboarding seed items & initial rating submission
│   ├── src/tmdb/            # The Movie Database (TMDB) API integration & auto-upsert
│   └── schema.sql           # PostgreSQL database schema + pgvector & pg_trgm extensions
│
└── engine/                  # Python (FastAPI) ML & Vector Recommendation Engine
    ├── main.py              # FastAPI sidecar application
    ├── jobs.py              # Async vectorization jobs (genre vectors, taste profiles)
    ├── functions.py         # Cosine similarity scoring & SentenceTransformer encoding
    └── all-MiniLM-L6-v2/    # Local HuggingFace transformer model cache
```

---

## 🧪 Machine Learning & Vector Search

Tiles uses **PostgreSQL + `pgvector`** for real-time vector similarity matching:

1. **Media Item Vectors (`vector(26)`)**: Multi-hot genre encoding mapped to a standardized genre vocabulary space.
2. **User Taste Vectors (`vector(26)`)**: Weighted aggregate vector computed from user ratings ($\ge 7.0$ positive weight, $< 6.0$ negative weight).
3. **Review Embeddings (`vector(384)`)**: Dense semantic embeddings computed via HuggingFace `all-MiniLM-L6-v2` for review text and sentiment similarity.
4. **Collaborative Filtering Vectors (`vector(50)`)**: Matrix factorization latent vectors (`user_cf_vectors` & `media_cf_vectors`).
5. **Trigram Title Search (`pg_trgm`)**: GIN-indexed trigram fuzzy search to handle typos and punctuation variations (e.g. matching `"widows bay"` to `"Widow's Bay"`).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20+ and `npm`
- **Rust** 1.80+ (`cargo`)
- **Python** 3.10+ and `pip`
- **PostgreSQL 16+** with the following extensions installed:
  - `vector` (`pgvector`)
  - `pg_trgm` (Trigram fuzzy search)
  - `uuid-ossp`
- **TMDB API Key** (v3 API key from [TheMovieDB](https://www.themoviedb.org/))

---

### 1. Database Setup

1. Create a PostgreSQL database (e.g., `tiles`):
   ```bash
   createdb -U postgres tiles
   ```
2. Initialize the schema:
   ```bash
   psql -U postgres -d tiles -f back/schema.sql
   ```

---

### 2. Environment Configuration

#### Backend (`back/.env`)
Create a `.env` file inside `back/`:
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/tiles
FRONTEND_URL=http://localhost:4000
TMDB_API_KEY=your_tmdb_api_key_here
PORT=8000
```

#### Frontend (`tiles/.env.local`)
Create a `.env.local` file inside `tiles/`:
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/tiles
AUTH_SECRET=your_auth_secret_32_chars_long
NEXTAUTH_URL=http://localhost:4000
BACKEND_URL=http://localhost:8000
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
```

---

### 3. Running the Services

#### A. Start the Python ML Sidecar (`engine`)
```bash
cd engine
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install fastapi uvicorn asyncpg numpy sentence-transformers pydantic
uvicorn main:app --port 8080 --reload
```

#### B. Start the Rust Backend (`back`)
```bash
cd back
cargo run
# Server will start on http://localhost:8000
```

#### C. Start the Next.js Frontend (`tiles`)
```bash
cd tiles
npm install
npm run dev
# Web app will be accessible at http://localhost:4000
```

---

## 📡 API Overview

### Frontend Proxy Rewrites (`tiles/next.config.ts`)
Client-side calls to `/api/backend/*` are automatically proxied to the Rust backend (`http://localhost:8000/*`).

### Rust Backend Routes (`back/src/app.rs`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/media` | Browse catalog with filters & trigram search | No |
| `GET` | `/media/{id}` | Full detail for a film/series | No |
| `POST` | `/sync` | Trigger TMDB sync | No |
| `GET` | `/onboarding/curated` | Hand-picked onboarding selection grid | No |
| `POST` | `/onboarding/ratings` | Submit initial onboarding ratings & trigger ML taste vector | Yes |
| `GET` | `/recommedation` | Fetch personalized vector recommendations | Yes |
| `GET/POST/DELETE` | `/media/{id}/rating` | Get, set, or delete half-star user rating (1.0 - 10.0) | Yes |
| `GET/POST/DELETE` | `/media/{id}/watchlist` | Manage user watchlist | Yes |
| `GET/POST` | `/lists` | Create and list custom user collections/folders | Yes |
| `GET/POST/DELETE` | `/media/{id}/watched` | Manage watch history and re-watch logs | Yes |

---

## 🛠️ Tech Stack Summary

- **Frontend**: Next.js 16, React 19, Auth.js v5, TypeScript, Tailwind CSS v4.
- **Backend**: Rust, Axum, SQLx, Tokio, Reqwest, Serde.
- **Database**: PostgreSQL 16, `pgvector`, `pg_trgm`, `uuid-ossp`.
- **Machine Learning**: Python 3.11, FastAPI, `asyncpg`, `SentenceTransformers`, `all-MiniLM-L6-v2`.

---

## 📄 License

This project is open-source under the MIT License.
