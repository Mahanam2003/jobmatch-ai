import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from .embedder import embed_texts


def rank_jobs(user_embedding: np.ndarray, jobs: list[dict]) -> list[dict]:
    if not jobs:
        return []

    descriptions = [job["description"] for job in jobs]
    job_embeddings = embed_texts(descriptions)

    scores = cosine_similarity(user_embedding.reshape(1, -1), job_embeddings)[0]

    ranked = [
        {**job, "score": float(score)}
        for job, score in zip(jobs, scores)
    ]
    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked
