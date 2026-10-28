"""Data Quality agent endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.data_quality import DataQualityRunResponse
from app.services.data_quality import run_data_quality

router = APIRouter(prefix="/data-quality", tags=["data quality"])


@router.post("/run", response_model=DataQualityRunResponse, summary="Check pending tickets")
def run(db: Session = Depends(get_db)) -> DataQualityRunResponse:
    """Run the Data Quality checks on every pending ticket. Safe to re-run: unchanged tickets are skipped."""
    result = run_data_quality(db)
    return DataQualityRunResponse(evaluated=result.evaluated, skipped=result.skipped, by_verdict=dict(result.by_verdict))
