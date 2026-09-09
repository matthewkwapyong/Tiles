import os
import asyncio
import asyncpg

DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")


async def build_genre_vocabulary():

    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(DB_DSN)
    except Exception as e:
        print(f"Failed to connect to PostgreSQL at {DB_DSN}: {e}")
        return

    try:
        # 2. Extract distinct genres using unnest
        rows = await conn.fetch("""
            SELECT DISTINCT unnest(genres) AS genre_name
            FROM media_items
            WHERE genres IS NOT NULL AND array_length(genres, 1) > 0
            ORDER BY genre_name;
        """)

        genres = [r["genre_name"] for r in rows if r["genre_name"]]
        print(f"Found {len(genres)} distinct genres in media_items.")

        # 3. Upsert into genre_vocabulary table with id | genre_name | position
        for pos, genre in enumerate(genres):
            await conn.execute("""
                INSERT INTO genre_vocabulary (genre_name, position)
                VALUES ($1, $2)
                ON CONFLICT (genre_name) DO UPDATE
                SET position = EXCLUDED.position;
            """, genre, pos)

        print(f"Successfully saved {len(genres)} genres to `genre_vocabulary` table.")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(build_genre_vocabulary())