import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncpg
import numpy as np
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from jobs import build_movie_vector
from functions import compute_taste_vector, compute_user_recommendation, encode_sentence

DB_DSN = os.getenv("DATABASE_URL", "postgres://postgres:matthew@localhost:5432/tiles")

class Movie_Id(BaseModel):
    ids: list[int]

class User_Id(BaseModel):
    user_id: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Attach pool and model to app state on startup
    app.state.pool = await asyncpg.create_pool(
        dsn=DB_DSN,
        min_size=10,
        max_size=50
    )
    app.state.smodel = SentenceTransformer("./all-MiniLM-L6-v2")
    yield
    # Clean up pool on shutdown
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/users")
async def get_users():
    # Borrow a connection from the pool for this specific request
    async with app.state.pool.acquire() as connection:
        users = await connection.fetch('SELECT * FROM media_items LIMIT 10')
        return [dict(u) for u in users]


@app.get("/health")
def health_check():
    return {"message": "Healthy"}


@app.post("/vectorize_movie_batch")
async def vectorize_movie_batch(body:Movie_Id):
    async with app.state.pool.acquire() as connection:
        for i in body.ids:
            item = await connection.fetch("SELECT * FROM media_items where tmdb_id = $1",i)
            if item:
                await build_movie_vector(connection,item[0])
        return "Created vectors for movie_ids " + str(body.ids)


@app.post("/vectorize-movie/{movie_id}")
@app.get("/vectorize-movie/{movie_id}")
async def vectorize_single_movie(movie_id: int):
    async with app.state.pool.acquire() as connection:
        rows = await connection.fetch("SELECT * FROM media_items WHERE id = $1 OR tmdb_id = $1 LIMIT 1", movie_id)
        if rows:
            await build_movie_vector(connection, rows[0])
            return {"message": f"Created vector for movie {movie_id}"}
        return {"error": f"Movie {movie_id} not found"}

@app.get("/build_user_taste_vector/{user_id}")
async def build_user_taste_vector(user_id:str):
    async with app.state.pool.acquire() as connection:
        await compute_taste_vector(user_id,connection)
    return "Created taste vector for user " + user_id

@app.get("/build_user_recommendation/{user_id}")
async def build_user_recommendation(user_id:str):
    async with app.state.pool.acquire() as connection:
        await compute_user_recommendation(user_id,connection)
    return "Created recommendations for all movies"


@app.get("/complete_onboarding/{user_id}")
async def complete_onboarding(user_id:str):
    async with app.state.pool.acquire() as connection:
        await compute_taste_vector(user_id,connection)
        await compute_user_recommendation(user_id,connection)
    return "Completed onboarding for user " + user_id


@app.post("/embed-review/{review_id}")
async def embed_review(review_id: int):
    async with app.state.pool.acquire() as connection:
        review = await connection.fetch("SELECT body FROM reviews WHERE id = $1", review_id)
        if not review:
            return {"error": f"Review {review_id} not found"}
        vector = await encode_sentence(app.state.smodel, review[0]["body"])
        vector_str = str(vector.tolist()) if hasattr(vector, "tolist") else str(vector)
        await connection.execute('''
            INSERT INTO review_embeddings(review_id, embedding, model_version)
            VALUES ($1, $2::vector, $3)
            ON CONFLICT (review_id) DO UPDATE SET
                embedding = EXCLUDED.embedding,
                model_version = EXCLUDED.model_version
        ''', review_id, vector_str, "all-MiniLM-L6-v2")
    return {"message": f"Created vector for review {review_id}"}