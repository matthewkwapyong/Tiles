import math
import numpy as np
import asyncio
import asyncpg
import datetime
# Step 1: Build the full list of possible genres (fixed order, decided once)
# In reality we'd pull this from all distinct genres in the DB, but for
# now let's hardcode a small example set to see the mechanism clearly.

ALL_GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi"]


def encode_genres(movie_genres: list[str],genre_list:list[tuple]) -> list[int]:
    """
    Turn a movie's genre list (e.g. ["Action", "Sci-Fi"])
    into a fixed-length row of 0s and 1s.
    """
    vector = []                       # this will become our number-row
    for genre_tup in genre_list:          # walk through EVERY possible genre, in order
        genre_name = genre_tup[0]
        if genre_name in movie_genres:     # does this movie have that genre?
            vector.append(1)
        else:
            vector.append(0)
    return vector



def build_taste_vector(rated_movies: list[tuple[list[int], float]]) -> list[float]:
    """
    rated_movies: list of (movie_vector, rating) pairs, rating 1.0-10.0
    Low ratings now push the taste vector AWAY from those genres.
    """
    MIDPOINT = 5.5  # center of the 1-10 scale

    vector_length = len(rated_movies[0][0])
    weighted_sum = [0.0] * vector_length
    total_abs_weight = 0.0   # use ABSOLUTE value here — see note below

    for movie_vector, rating in rated_movies:
        weight = rating - MIDPOINT   # e.g. 9 → +3.5, 2 → -3.5
        for i in range(vector_length):
            weighted_sum[i] += movie_vector[i] * weight
        total_abs_weight += abs(weight)
    taste_vector = [value / total_abs_weight for value in weighted_sum]
    return taste_vector


def dot_product(a: list[float], b: list[float]) -> float:
    total = 0.0
    for i in range(len(a)):
        total += a[i] * b[i]     # multiply matching positions, add them up
    return total

def magnitude(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))   # length of the vector

def cosine_similarity(a: list[float], b: list[float]) -> float:
    mag_a = magnitude(a)
    mag_b = magnitude(b)
    if mag_a == 0 or mag_b == 0:
        return 0.0   # avoid divide-by-zero — no signal if a vector is all zeros
    return dot_product(a, b) / (mag_a * mag_b)


async def compute_taste_vector(user_id: int, connection):
    rows = await connection.fetch("""SELECT id, user_id,ratings.media_item_id,rating,embedding,vocabulary_version FROM ratings
                left join media_item_vectors on media_item_vectors.media_item_id = ratings.media_item_id
                where user_id = $1
                """,user_id)
    MIDPOINT = 5.5  # center of the 1-10 scale
    vector = np.fromstring(rows[0]["embedding"].strip('[]'), sep=',')
    vector_length = len(vector)
    weighted_sum = [0.0] * vector_length
    total_abs_weight = 0.0
    for row in rows:
        rating = float(row["rating"])
        emb = np.fromstring(row["embedding"].strip('[]'), sep=',')
        weight = rating - MIDPOINT
        for i in range(vector_length):
            weighted_sum[i] += emb[i] * weight
        total_abs_weight += abs(weight)
    taste_vector = [float(value / total_abs_weight) for value in weighted_sum]
    print(len(taste_vector))
    await connection.execute('''
        INSERT INTO user_taste_vectors (user_id, embedding, vocabulary_version,model_version)
        VALUES ($1, $2::vector, $3,$4)
    ''', user_id, str(taste_vector), 1,'1')

async def compute_user_recommendation(user_id:str,connection):
    user_taste_vector = await connection.fetchval('SELECT embedding FROM user_taste_vectors WHERE user_id = $1', user_id)
    rows = await connection.fetch("""
            SELECT
               miv.media_item_id,
               mi.title,
               mi.poster_path,
               miv.embedding <=> $1::vector AS distance
            FROM media_item_vectors miv
            JOIN media_items mi ON mi.id = miv.media_item_id
            WHERE miv.media_item_id NOT IN (
               SELECT media_item_id FROM ratings WHERE user_id = $2
            )
            ORDER BY miv.embedding <=> $1::vector
            LIMIT 20
        """,str(user_taste_vector),user_id)

    for r in rows:
        await connection.execute("""
                  INSERT INTO recommendations (
                    user_id,
                    media_item_id,
                    score,
                    generated_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    NOW()
                )
        """,user_id,r['media_item_id'],r['distance'])
