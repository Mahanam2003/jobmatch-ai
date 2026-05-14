from sentence_transformers import SentenceTransformer
import numpy as np

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_text(text: str) -> np.ndarray:
    return _get_model().encode(text, convert_to_numpy=True)


def embed_texts(texts: list[str]) -> np.ndarray:
    return _get_model().encode(texts, convert_to_numpy=True, batch_size=32, show_progress_bar=False)
