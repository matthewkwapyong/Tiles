import asyncpg
import os
import asyncio
import numpy as np
from scipy.sparse import coo_array, csr_matrix
import implicit
from vector_encode import cosine_similarity


async def build_rating_matrix(conn):
    rows =  await conn.fetch("SELECT user_id, media_item_id, rating FROM ratings")
    user_idx = 0
    user_dict = {}
    media_idx = 0
    media_dict = {}

    for i in rows:
        user_id = i['user_id']
        if user_id not in user_dict:
            user_dict[user_id] = user_idx
            user_idx += 1
        if i['media_item_id'] not in media_dict:
            media_dict[i['media_item_id']] = media_idx
            media_idx += 1

    row_indices = []
    col_indices = []
    values = []

    for row in rows:
        row_indices.append(user_dict[row["user_id"]])
        col_indices.append(media_dict[row["media_item_id"]])
        values.append(float(row["rating"]))

    num_users = len(user_dict)
    num_movies = len(media_dict)

    ratings_matrix = csr_matrix(
        (values, (row_indices, col_indices)),
        shape=(num_users, num_movies)
    )
    index_to_user_id = {index: user_id for user_id, index in user_dict.items()}
    index_to_media_id = {index: media_id for media_id, index in media_dict.items()}

    return ratings_matrix, index_to_user_id, index_to_media_id

async def train_model(conn):
    rating_matrix = await build_rating_matrix(conn)
    model = implicit.als.AlternatingLeastSquares(factors=20)

    model.fit(rating_matrix[0])
    for i in range(0,len(model.user_factors)):
        user_id = rating_matrix[1][i];
        vector = model.user_factors[i].tolist()
        await conn.execute('''
            INSERT INTO user_cf_vectors (user_id, embedding, model_version)
            VALUES ($1, $2::vector, $3)
        ''', user_id, str(vector), 2)

    for i in range(0,len(model.item_factors)):
        media_item_id = rating_matrix[2][i];
        vector = model.item_factors[i].tolist()
        await conn.execute('''
            INSERT INTO media_cf_vectors (media_item_id,embedding, model_version)
            VALUES ($1, $2::vector, $3)
        ''', media_item_id, str(vector), 2)

DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")

async def main():
    pool = await asyncpg.create_pool(DB_DSN)
    async with pool.acquire() as connection:
        await train_model(connection)

    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())



