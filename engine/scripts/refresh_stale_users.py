import sys
import os
import asyncio

# Add the project root to sys.path to allow importing from engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from engine.functions import compute_taste_vector,compute_user_recommendation
import asyncpg

async def refresh_stale_users():
    conn = await asyncpg.connect(
        dsn='postgres://postgres:matthew@localhost:5432/tiles',
    )
    rows = await conn.fetch("""
            SELECT
                u.id AS user_id,
                MAX(GREATEST(r.created_at, r.updated_at)) AS latest_rating_at,
                utv.updated_at AS taste_vector_updated_at,
                CASE
                    WHEN utv.updated_at IS NULL THEN TRUE
                    WHEN MAX(GREATEST(r.created_at, r.updated_at)) > utv.updated_at THEN TRUE
                    ELSE FALSE
                END AS is_stale
            FROM users u
            LEFT JOIN ratings r ON r.user_id = u.id
            LEFT JOIN user_taste_vectors utv ON utv.user_id = u.id
            GROUP BY u.id, utv.updated_at
            """)
    for row in rows:
        user_id = row['user_id']
        if row["is_stale"]:
            print(f"Computing taste vector for user {user_id}")
            result = await compute_taste_vector(user_id,conn)
            if result == 0:
                continue
            print(f"Computing recommendations for user {user_id}")
            await compute_user_recommendation(user_id,conn)
        else:
            print(f"User {user_id} is not stale")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(refresh_stale_users())
