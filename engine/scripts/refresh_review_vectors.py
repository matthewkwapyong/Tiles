import sys
import os
import asyncio

# Add the project root to sys.path to allow importing from engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from engine.functions import per_movie_review,per_user_review
import asyncpg

async def refresh_user_review_vectors():
    conn = await asyncpg.connect(
        dsn='postgres://postgres:matthew@localhost:5432/tiles',
    )
    rows = await conn.fetch("""
            SELECT
                r.id AS review_id,
                MAX(GREATEST(r.created_at, r.updated_at)) AS latest_rating_at,
                urv.updated_at AS review_vector_updated_at,
                CASE
                    WHEN urv.updated_at IS NULL THEN TRUE
                    WHEN MAX(GREATEST(r.created_at, r.updated_at)) > urv.updated_at THEN TRUE
                    ELSE FALSE
                END AS is_stale
            FROM reviews r
            LEFT JOIN user_review_vectors urv ON urv.review_id = r.id
            GROUP BY r.id, urv.updated_at
            """)
    for row in rows:
        review_id = row['review_id']
        if row["is_stale"]:
            print(f"Computing review vector for review {review_id}")
            result = await per_user_review(review_id,conn)
            if result == 0:
                continue
    await conn.close()

async def refresh_movie_review_vector():
    conn = await asyncpg.connect(
        dsn='postgres://postgres:matthew@localhost:5432/tiles',
    )
    rows = await conn.fetch("""
            SELECT
                r.id AS review_id,
                MAX(GREATEST(r.created_at, r.updated_at)) AS latest_rating_at,
                mr.updated_at AS movie_review_vector_updated_at,
                CASE
                    WHEN mr.updated_at IS NULL THEN TRUE
                    WHEN MAX(GREATEST(r.created_at, r.updated_at)) > mr.updated_at THEN TRUE
                    ELSE FALSE
                END AS is_stale
            FROM reviews r
            LEFT JOIN movie_review_vectors mr ON mr.review_id = r.id
            GROUP BY r.id, mr.updated_at
            """)
    for row in rows:
        review_id = row['review_id']
        if row["is_stale"]:
            print(f"Computing review vector for review {review_id}")
            result = await per_movie_review(review_id,conn)
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
