"""Knowledge Builder settings, loaded from data/registry/knowledge.yaml."""

import hashlib
import json
from dataclasses import dataclass
from functools import lru_cache

from app.core.config import config_version
from app.core.registry import load_registry, register_document


@dataclass(frozen=True)
class KnowledgeConfig:
    version: str  # hash of the file; a change matches every case again
    min_score: float
    margin: float
    candidates: int
    stopwords: frozenset[str]


def get_config() -> KnowledgeConfig:
    return _build(config_version())


@lru_cache(maxsize=1)
def _build(version: int) -> KnowledgeConfig:
    """Rebuilt when an admin changes the file (the config version moves)."""
    doc = load_registry("knowledge.yaml")
    config = KnowledgeConfig(
        version=hashlib.sha256(json.dumps(doc, sort_keys=True, default=str).encode()).hexdigest()[:12],
        min_score=doc["match"]["min_score"],
        margin=doc["match"]["margin"],
        candidates=doc["match"]["candidates"],
        stopwords=frozenset(str(w).casefold() for w in doc["stopwords"]),
    )
    if not 0 < config.min_score <= 1 or config.margin < 1 or config.candidates < 1:
        raise ValueError("match.min_score must be between 0 and 1, match.margin at least 1 and match.candidates at least 1")
    return config


register_document("knowledge", "knowledge.yaml", get_config)
