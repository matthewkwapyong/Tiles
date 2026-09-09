from fastapi import FastAPI
import asyncio
import asyncpg
import datetime
from jobs import build_movie_vector
from functions import compute_taste_vector, compute_user_recommendation, encode_sentence


import numpy as np
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()


class Movie_Id(BaseModel):
    ids:list[int]

class User_Id(BaseModel):
    user_id:str

@app.on_event("startup")
async def startup():
    # Attach the pool to the app state when the server starts
    app.state.pool = await asyncpg.create_pool(
        dsn='postgres://postgres:matthew@localhost:5432/tiles',
        min_size=10,
        max_size=50
    )
    app.state.smodel = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


@app.on_event("shutdown")
async def shutdown():
    # Close the pool when the server stops
    await app.state.pool.close()

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
            item = connection.fetch("SELECT * FROM media_item where tmdb_id = $1",i)[0]
            await build_movie_vector(connection,item)
        return "Created vectors for movie_ids " + str(body.movie_ids)


@app.get("/vectorize-movie/{movie_id}")
async def build_movie_vectors(movie_id:int):
    async with app.state.pool.acquire() as connection:
        rows = await connection.fetch('SELECT * FROM media_items where tmdb_id = $1',movie_id)
        print(rows[0])
        await build_movie_vector(connection,rows[0])
        return "Created vector for movie_id 34"

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
        vector = await encode_sentence(app.state.smodel, review)
        vector_str = str(vector.tolist()) if hasattr(vector, "tolist") else str(vector)
        await connection.execute('''
            INSERT INTO review_embeddings(review_id, embedding, model_version)
            VALUES ($1, $2::vector, $3)
            ON CONFLICT (review_id) DO UPDATE SET
                embedding = EXCLUDED.embedding,
                model_version = EXCLUDED.model_version
        ''', review_id, vector_str, "all-MiniLM-L6-v2")
    return {"message": f"Created vector for review {review_id}"}