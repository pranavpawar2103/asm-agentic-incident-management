"""Knowledge Builder endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.knowledge import ResolvedCase
from app.schemas.knowledge import AppCoverageOut, KnowledgeRunResponse, ResolvedCaseOut
from app.services.knowledge import coverage, run_knowledge

router = APIRouter(prefix="/knowledge", tags=["knowledge builder"])


@router.post("/run", response_model=KnowledgeRunResponse, summary="Save and match resolved tickets")
async def run(db: AsyncSession = Depends(get_db)) -> KnowledgeRunResponse:
    """Save every resolved ticket whose close notes passed as a masked case, and match it to a knowledge-base article.
    Safe to re-run: unchanged cases are skipped."""
    result = await db.run_sync(run_knowledge)
    return KnowledgeRunResponse(
        evaluated=result.evaluated, skipped=result.skipped, model_errors=result.model_errors, by_status=dict(result.by_status)
    )


@router.get("/cases", response_model=list[ResolvedCaseOut], summary="Saved cases")
async def list_cases(
    match_status: str | None = Query(None, pattern="^(matched|gap|uncertain)$"),
    application: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Saved cases, newest first. Filter by `match_status` or `application`; `gap` shows where an article is missing."""
    return await db.run_sync(_cases, match_status, application, limit)


def _cases(db: Session, match_status: str | None, application: str | None, limit: int) -> list[ResolvedCase]:
    query = select(ResolvedCase).order_by(ResolvedCase.closed_at.desc().nulls_last(), ResolvedCase.ticket_id).limit(limit)
    if match_status:
        query = query.where(ResolvedCase.match_status == match_status)
    if application:
        query = query.where(ResolvedCase.application == application)
    return list(db.scalars(query))


@router.get("/coverage", response_model=list[AppCoverageOut], summary="Knowledge-base coverage per application")
async def get_coverage(db: AsyncSession = Depends(get_db)) -> list[AppCoverageOut]:
    """Per application: articles, saved cases, how many an article covers, the gaps, and the articles never used."""
    rows = await db.run_sync(coverage.coverage)
    return [
        AppCoverageOut(application=r.application, articles=r.articles, cases=r.cases, matched=r.matched, gap=r.gap,
                       uncertain=r.uncertain, covered_share=r.covered_share, unused_articles=r.unused_articles)
        for r in rows
    ]
