import math
import numpy as np
import asyncio
import asyncpg
import datetime
from sentence_transformers import SentenceTransformer

# Step 1: Build the full list of possible genres (fixed order, decided once)
# In reality we'd pull this from all distinct genres in the DB, but for
# now let's hardcode a small example set to see the mechanism clearly.



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


async def compute_taste_vector(user_id: int, connection):
    rows = await connection.fetch("""SELECT id, user_id,ratings.media_item_id,rating,embedding,vocabulary_version FROM ratings
                left join media_item_vectors on media_item_vectors.media_item_id = ratings.media_item_id
                where user_id = $1
                """,user_id)
    print(rows)
    if len(rows) == 0:
        print(f"No ratings found for user {user_id}")
        return 0
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
    await connection.execute('''
        INSERT INTO user_taste_vectors (user_id, embedding, vocabulary_version,model_version)
        VALUES ($1, $2::vector, $3,$4) ON CONFLICT (user_id)
        DO UPDATE SET embedding = $2::vector, updated_at = NOW()
    ''', user_id, str(taste_vector), 1,'1')
    return 1


async def compute_user_recommendation(user_id: str, connection, content_weight=0.5, cf_weight=0.5, review_weight=0.3, limit=20):
    user_taste_vector = await connection.fetchval('SELECT embedding FROM user_taste_vectors WHERE user_id = $1', user_id)
    if not user_taste_vector:
        print(f"No taste vector found for user {user_id}")
        return

    candidate_limit = max(100, limit * 5)
    cf_row = await connection.fetchrow("SELECT user_id, embedding FROM user_cf_vectors WHERE user_id = $1", user_id)

    if cf_row:
        cf_vector = cf_row["embedding"]
        rows = await connection.fetch(
            """
            SELECT
                miv.media_item_id,
                (miv.embedding <=> $1::vector) AS content_distance,
                (mcv.embedding <=> $2::vector) AS cf_distance
            FROM media_item_vectors miv
            JOIN media_cf_vectors mcv ON mcv.media_item_id = miv.media_item_id
            WHERE miv.media_item_id NOT IN (
                SELECT media_item_id FROM ratings WHERE user_id = $3
            )
            ORDER BY ($4 * (miv.embedding <=> $1::vector) + $5 * (mcv.embedding <=> $2::vector)) ASC
            LIMIT $6
            """,
            str(user_taste_vector), str(cf_vector), user_id, content_weight, cf_weight, candidate_limit
        )
        scores = {}
        for row in rows:
            content_similarity = 1 - (row["content_distance"] / 2)
            cf_similarity = 1 - (row["cf_distance"] / 2)
            scores[row["media_item_id"]] = {
                "content": content_similarity,
                "cf": cf_similarity,
                "review": None,
            }
    else:
        # Cold start — content-based score ordered directly in SQL
        rows = await connection.fetch(
            """
            SELECT
                miv.media_item_id,
                (miv.embedding <=> $1::vector) AS content_distance
            FROM media_item_vectors miv
            WHERE miv.media_item_id NOT IN (
                SELECT media_item_id FROM ratings WHERE user_id = $2
            )
            ORDER BY (miv.embedding <=> $1::vector) ASC
            LIMIT $3
            """,
            str(user_taste_vector), user_id, candidate_limit
        )
        scores = {}
        for row in rows:
            scores[row["media_item_id"]] = {
                "content": 1 - (row["content_distance"] / 2),
                "cf": None,
                "review": None,
            }

    review_row = await connection.fetchrow(
        "SELECT embedding FROM user_review_vectors WHERE user_id = $1", user_id
    )
    if review_row is not None and scores:
        review_vector = review_row["embedding"]
        review_rows = await connection.fetch(
            """
            SELECT media_item_id, (embedding <=> $1::vector) AS review_distance
            FROM media_review_vectors
            WHERE media_item_id = ANY($2::bigint[])
            """,
            str(review_vector), list(scores.keys())
        )
        for row in review_rows:
            if row["media_item_id"] in scores:
                scores[row["media_item_id"]]["review"] = 1 - (row["review_distance"] / 2)

    scored = []
    for media_item_id, s in scores.items():
        used_weight = content_weight
        final_score = content_weight * s["content"]

        if s["cf"] is not None:
            final_score += cf_weight * s["cf"]
            used_weight += cf_weight

        if s["review"] is not None:
            final_score += review_weight * s["review"]
            used_weight += review_weight

        final_score = final_score / used_weight  # rescale for missing signals

        scored.append((media_item_id, final_score, s["content"], s["cf"], s["review"]))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_results = scored[:limit]

    print("Top recommendation results:", top_results)

    # Step 5: write into recommendations cache table
    for media_item_id, final_score, content_score, cf_score, review_score in top_results:
        await connection.execute(
            """
            INSERT INTO recommendations
                (user_id, media_item_id, score, content_score, cf_score, review_score)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, media_item_id)
            DO UPDATE SET score = EXCLUDED.score, content_score = EXCLUDED.content_score,
                          cf_score = EXCLUDED.cf_score, review_score = EXCLUDED.review_score,
                          generated_at = NOW()
            """,
            user_id, media_item_id, final_score, content_score, cf_score, review_score
        )

async def encode_sentence(model,sentence):
    return model.encode(sentence)

async def per_user_review(connection, user_id: str):
    data = await connection.fetch("""
        SELECT re.embedding, r.rating
        FROM review_embeddings re
        JOIN reviews r ON r.id = re.review_id
        WHERE r.user_id = $1
        """, user_id)

    if not data:
        return 0

    midpoint = 5.5
    first_emb = np.fromstring(data[0]["embedding"].strip('[]'), sep=',')
    vector_length = len(first_emb)
    weighted_sum = [0.0] * vector_length
    total_abs_weight = 0.0

    for row in data:
        rating = float(row["rating"]) if row["rating"] is not None else 5.5
        emb = np.fromstring(row["embedding"].strip('[]'), sep=',')
        weight = rating - midpoint
        for i in range(vector_length):
            weighted_sum[i] += emb[i] * weight
        total_abs_weight += abs(weight)

    if total_abs_weight == 0:
        taste_vector = [0.0] * vector_length
    else:
        taste_vector = [float(value / total_abs_weight) for value in weighted_sum]

    await connection.execute('''
        INSERT INTO user_review_vectors (user_id, embedding, model_version)
        VALUES ($1, $2::vector, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
    ''', user_id, str(taste_vector), "all-MiniLM-L6-v2")
    return 1

async def per_movie_review(connection, media_item_id: int):
    data = await connection.fetch("""
        SELECT re.embedding
        FROM review_embeddings re
        JOIN reviews r ON r.id = re.review_id
        WHERE r.media_item_id = $1
        """, media_item_id)

    if not data:
        return 0

    first_emb = np.fromstring(data[0]["embedding"].strip('[]'), sep=',')
    vector_length = len(first_emb)
    weighted_sum = [0.0] * vector_length
    total_reviews = len(data)

    for row in data:
        emb = np.fromstring(row["embedding"].strip('[]'), sep=',')
        for j in range(vector_length):
            weighted_sum[j] += emb[j]

    movie_vector = [float(value / total_reviews) for value in weighted_sum]
    await connection.execute('''
        INSERT INTO media_review_vectors (media_item_id, embedding, model_version)
        VALUES ($1, $2::vector, $3)
        ON CONFLICT (media_item_id)
        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
    ''', media_item_id, str(movie_vector), "all-MiniLM-L6-v2")
    return 1





