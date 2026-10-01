import sys
import os
import asyncio
import asyncpg

# Add the project root to sys.path to allow importing from engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from engine.jobs import build_movie_vector

DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")


async def build_movie_vectors_sweep():
    pool = await asyncpg.create_pool(DB_DSN)
    async with pool.acquire() as connection:
        rows = await connection.fetch("""
            SELECT m.*
            FROM media_items m
            LEFT JOIN media_item_vectors mv ON mv.media_item_id = m.id
            WHERE mv.media_item_id IS NULL
        """)
        print(f"Found {len(rows)} un-vectorized media items.")
        for row in rows:
            await build_movie_vector(connection, row)
        print("Completed movie vectorization sweep.")
    await pool.close()

async def build_movie_vectors():
    await build_movie_vectors_sweep()

if __name__ == "__main__":
    asyncio.run(build_movie_vectors_sweep())