"""Knowledge Builder schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeRunResponse(BaseModel):
    """Result of saving and matching the resolved tickets whose close notes passed."""
    evaluated: int = Field(..., examples=[33])
    skipped: int = Field(..., examples=[0], description="Cases unchanged since their last match")
    model_errors: int = Field(0, examples=[0], description="Cases left unmatched because the model gave no usable answer")
    by_status: dict[str, int] = Field(..., examples=[{"matched": 30, "gap": 3}])


class ResolvedCaseOut(BaseModel):
    """A saved case. All text is masked."""
    model_config = ConfigDict(from_attributes=True)
    ticket_id: str
    application: str | None
    summary: str
    notes: str = Field(..., description="The final close notes, names masked")
    score: int | None = Field(..., examples=[6], description="Closure Quality score, out of 6")
    match_status: Literal["matched", "gap", "uncertain"]
    kb_article_id: str | None = Field(..., examples=["KB-PAY-002"])
    match_method: str | None = Field(..., examples=["cited"], description="cited, code, keywords or model")
    closed_at: datetime | None


class AppCoverageOut(BaseModel):
    """How much of what is fixed in one application is already in the knowledge base."""
    application: str
    articles: int
    cases: int
    matched: int
    gap: int = Field(..., description="Cases no article covers: where a new article is needed")
    uncertain: int = Field(..., description="Cases the rules could not match and the model has not judged")
    covered_share: float = Field(..., examples=[0.9], description="Matched cases as a share of all saved cases")
    unused_articles: list[str] = Field(..., description="Articles no resolved case has matched")
