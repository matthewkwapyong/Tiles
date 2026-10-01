import sys
import os
import asyncio

# Add the project root to sys.path to allow importing from engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from engine.functions import per_movie_review, per_user_review
import asyncpg

DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")

async def refresh_user_review_vectors():
    conn = await asyncpg.connect(dsn=DB_DSN)
    rows = await conn.fetch("""
            SELECT
                r.user_id,
                MAX(GREATEST(r.created_at, r.updated_at)) AS latest_review_at,
                urv.updated_at AS review_vector_updated_at,
                CASE
                    WHEN urv.updated_at IS NULL THEN TRUE
                    WHEN MAX(GREATEST(r.created_at, r.updated_at)) > urv.updated_at THEN TRUE
                    ELSE FALSE
                END AS is_stale
            FROM reviews r
            JOIN review_embeddings re ON re.review_id = r.id
            LEFT JOIN user_review_vectors urv ON urv.user_id = r.user_id
            GROUP BY r.user_id, urv.updated_at
            """)
    for row in rows:
        user_id = row['user_id']
        if row["is_stale"]:
            print(f"Computing review vector for user {user_id}")
            result = await per_user_review(conn, user_id)
            if result == 0:
                continue
    await conn.close()

async def refresh_movie_review_vector():
    conn = await asyncpg.connect(dsn=DB_DSN)
    rows = await conn.fetch("""
            SELECT
                r.media_item_id,
                MAX(GREATEST(r.created_at, r.updated_at)) AS latest_review_at,
                mr.updated_at AS movie_review_vector_updated_at,
                CASE
                    WHEN mr.updated_at IS NULL THEN TRUE
                    WHEN MAX(GREATEST(r.created_at, r.updated_at)) > mr.updated_at THEN TRUE
                    ELSE FALSE
                END AS is_stale
            FROM reviews r
            JOIN review_embeddings re ON re.review_id = r.id
            LEFT JOIN media_review_vectors mr ON mr.media_item_id = r.media_item_id
            GROUP BY r.media_item_id, mr.updated_at
            """)
    for row in rows:
        media_item_id = row['media_item_id']
        if row["is_stale"]:
            print(f"Computing review vector for media_item {media_item_id}")
            result = await per_movie_review(conn, media_item_id)
            if result == 0:
                continue
    await conn.close()


async def refresh_review_vectors():
    await asyncio.gather(
        refresh_user_review_vectors(),
        refresh_movie_review_vector()
    )

if __name__ == "__main__":
    asyncio.run(refresh_review_vectors())

