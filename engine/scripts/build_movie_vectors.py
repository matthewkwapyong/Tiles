import asyncpg
import os
import asyncio
from jobs import build_movie_vector
DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")


async def build_movie_vectors():
    pool = await asyncpg.create_pool(DB_DSN)
    async with pool.acquire() as connection:
        rows = await connection.fetch('SELECT * FROM media_items')
        for row in rows:
            await build_movie_vector(connection,row)
    await pool.close()

if __name__ == "__main__":
    asyncio.run(build_movie_vectors())