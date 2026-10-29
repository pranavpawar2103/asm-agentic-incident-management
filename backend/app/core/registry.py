"""Read the editable reference files in data/registry."""

from functools import lru_cache
from typing import Any

import yaml

from app.core.config import settings


@lru_cache
def load_registry(filename: str) -> Any:
    return yaml.safe_load((settings.REGISTRY_DIR / filename).read_text(encoding="utf-8"))
