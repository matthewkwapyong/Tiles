import asyncpg
import os
import asyncio
from vector_encode import cosine_similarity


def dot_product(a: list[float], b: list[float]) -> float:
    total = 0.0
    for i in range(len(a)):
        total += float(a[i]) * float(b[i])     # multiply matching positions, add them up
    return total

def magnitude(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))   # length of the vector

def cosine_similarity(a: list[float], b: list[float]) -> float:
    mag_a = magnitude(a)
    mag_b = magnitude(b)
    if mag_a == 0 or mag_b == 0:
        return 0.0   # avoid divide-by-zero — no signal if a vector is all zeros
    return dot_product(a, b) / (mag_a * mag_b)



async def build_user_rating_vector(conn,user_id):
    # rows = await conn.fetch('SELECT * FROM users where id = $1',user_id)
    rows = await conn.fetch('SELECT media_item_id,rating FROM ratings WHERE user_id = $1',user_id)
    user_vector = {}
    for row in rows:
        user_vector[row["media_item_id"]] = row["rating"]
    return user_vector



async def get_similarity(conn,user1,user_2):
    user1_ratings = await build_user_rating_vector(conn,user1)
    user2_ratings = await build_user_rating_vector(conn,user_2)

    user_1_list = []
    user_2_list = []

    for item_id in user1_ratings:
        if item_id in user2_ratings:
            user_1_list.append(user1_ratings[item_id])
            user_2_list.append(user2_ratings[item_id])
    if len(user1_ratings) == 0:
        return None
    return cosine_similarity(user_1_list,user_2_list)


async def get_similar_users(conn,user_id):
    rows = await conn.fetch("select DISTINCT(user_id) from ratings where user_id != $1",user_id)
    user_pairs = []
    for user in rows:
        similairty = await get_similarity(conn,user_id,user["user_id"])
        if similairty > 0 or similairty is not None:
            user_pairs.append((user["user_id"],similairty))
    user_pairs.sort(key=lambda x: x[1],reverse=True)
    return user_pairs

async def predict_candidate(conn,user_id,media_item_id):
    similar_users = await get_similar_users(conn,user_id)
    if len(similar_users) == 0:
        return None
    user_did_rate = []
    for row  in similar_users:
        rated_movies = await conn.fetch("select * from ratings where user_id = $1 AND media_item_id = $2",row[0],media_item_id)
        if len(rated_movies) > 0:
            user_did_rate.append((row[0],rated_movies[0]["rating"]))

    similarity_weighted = 0.0
    similarity_sum = 0.0

    for i in user_did_rate:
        for j in similar_users:
            if i[0] == j[0]:
                similarity_weighted += float(i[1]) * float(j[1])
                similarity_sum += float(j[1])

    if similarity_sum > 0:
        print(f"Predicted rating: {similarity_weighted / similarity_sum} for movie: {media_item_id}")
        return similarity_weighted / similarity_sum
    else:
        return None


async def collaborative_recs(conn):
    users =  conn.fetch("select id from users")
    for user in users:
        unrated_movies = conn.fetch("select * from media_items m left join ratings r ON r.media_item_id = m.id AND r.user_id = $1 where r.id is null",user["id"])
        for movie in unrated_movies:
            rating = await predict_candidate(conn,user["id"],movie["id"])
            #write to recommendation
            await conn.execute('''
                INSERT INTO recommendations (user_id, media_item_id, predicted_rating)
                VALUES ($1, $2, $3)
            ''', user["id"], movie["id"], rating)

DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")

async def collaborative_recs():
    pool = await asyncpg.create_pool(DB_DSN)
    async with pool.acquire() as connection:
        await predict_candidate(connection,"974a57b5-9408-4774-b68d-7161e1d39c9c",2)
    await pool.close()

if __name__ == "__main__":
    asyncio.run(collaborative_recs())