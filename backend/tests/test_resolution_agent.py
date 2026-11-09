"""Resolution agent: filters, query expansion, the ReAct loop and the run service. No Postgres and no model."""

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.agents.resolution import queries, react
from app.agents.resolution.answer import ReActStep, ResolutionAnswer
from app.agents.resolution.case import CaseInput
from app.agents.resolution.chunking import chunk_knowledge_base
from app.agents.resolution.filters import filters_for
from app.agents.resolution.queries import Expansion, Hypothetical, QuerySet
from app.agents.resolution.retrieval import Filters, RetrievedChunk, fuse_chunks
from app.core.config import settings
from app.core.registry import load_registry
from app.db.session import Base
from app.llm import CallAudit
from app.models.ticket import AgentRun, PipelineStatus, Ticket
from app.services import resolution as service


def _audit(spec):
    return CallAudit(provider="test", model="test", prompt_version=spec.prompt_version, attempts=1,
                     input_tokens=0, output_tokens=0, latency_ms=0)


def _chunk(chunk_id, kb_id="KB-PAY-001", content="Restart the renderer.", app="PayrollPro"):
    return RetrievedChunk(id=chunk_id, app=app, kb_id=kb_id, title="t", heading_path="PayrollPro | KB-PAY-001",
                          content=content, context="", score=0.0)


def _case(**kw):
    base = dict(id="INC1", summary="Payslip PDF fails with 500", application="PayrollPro",
                body="Employees get an error when they open the payslip.")
    return CaseInput(**{**base, **kw})


# ---- filters ----------------------------------------------------------------------------------------------------------

def test_filters_match_the_registry_name_ignoring_case():
    assert filters_for("payrollpro") == Filters(app="PayrollPro")
    assert filters_for("  SalesConnect CRM ") == Filters(app="SalesConnect CRM")


def test_filters_are_empty_for_missing_or_unknown_application():
    assert filters_for(None) == Filters()
    assert filters_for("") == Filters()
    assert filters_for("NoSuchApp") == Filters()


def test_registry_applications_match_the_runbook_titles():
    # The filter only works if every registry name is the H1 app name in the runbooks, and the other way round
    kb_apps = {c.app for items in chunk_knowledge_base(settings.KB_DIR).values() for c in items}
    assert kb_apps == set(load_registry("apps.yaml"))


# ---- answer schema ----------------------------------------------------------------------------------------------------

def test_resolved_answer_needs_steps_and_references():
    with pytest.raises(ValidationError):
        ResolutionAnswer(verdict="resolved", steps=[], references=["KB-PAY-001"], confidence="high")
    with pytest.raises(ValidationError):
        ResolutionAnswer(verdict="resolved", steps=["Restart"], references=[], confidence="high")


def test_no_match_answer_has_no_steps():
    with pytest.raises(ValidationError):
        ResolutionAnswer(verdict="no_match", steps=["guess"], confidence="low")
    assert ResolutionAnswer(verdict="no_match", confidence="low").steps == []


def test_search_and_finish_need_their_payload():
    with pytest.raises(ValidationError):
        ReActStep(thought="x", action="search")
    with pytest.raises(ValidationError):
        ReActStep(thought="x", action="finish")


def test_query_set_bounds_and_blank_queries():
    with pytest.raises(ValidationError):
        QuerySet(queries=["a b", "c d"])
    with pytest.raises(ValidationError):
        QuerySet(queries=["a b", "c d", "e f", "g h", "i j", "k l"])
    with pytest.raises(ValidationError):
        QuerySet(queries=["a b", "c d", "   "])
    assert QuerySet(queries=[" a b ", "c d", "e f"]).queries == ["a b", "c d", "e f"]


def test_fuse_chunks_rewards_chunks_found_by_several_queries():
    fused = fuse_chunks([[_chunk(1), _chunk(2)], [_chunk(2), _chunk(3)]], top_n=3)
    assert [c.id for c in fused] == [2, 1, 3]
    assert fused[0].score == pytest.approx(1 / 62 + 1 / 61)


# ---- query expansion --------------------------------------------------------------------------------------------------

async def test_expand_falls_back_to_the_summary_when_the_model_is_off():
    # conftest switches the model off
    result = await queries.expand(_case())
    assert result == Expansion(queries=["Payslip PDF fails with 500"], hypothetical=None, audits=[])


async def test_expand_keeps_the_summary_first_and_drops_duplicates(monkeypatch):
    def fake(spec, user, masker):
        if spec.name == "resolution_multiquery":
            return QuerySet(queries=["PDF-GEN-500", "payslip renderer", "Payslip PDF fails with 500"]), _audit(spec)
        return Hypothetical(note="The payslip renderer times out; restart the PDF service."), _audit(spec)

    monkeypatch.setattr("app.agents.resolution.case.call_model", fake)
    result = await queries.expand(_case())
    assert result.queries == ["Payslip PDF fails with 500", "PDF-GEN-500", "payslip renderer"]
    assert result.hypothetical.startswith("The payslip renderer")
    assert len(result.audits) == 2


# ---- ReAct loop -------------------------------------------------------------------------------------------------------

def _scripted(monkeypatch, steps, seen_users=None):
    it = iter(steps)

    def fake(spec, user, masker):
        if seen_users is not None:
            seen_users.append(str(user))
        return next(it), _audit(spec)

    monkeypatch.setattr("app.agents.resolution.case.call_model", fake)


def _no_expansion(monkeypatch):
    async def expand(case):
        return Expansion(queries=[case.summary], hypothetical=None)

    monkeypatch.setattr(react, "expand", expand)


def _search_results(monkeypatch, chunks=None):
    calls = []

    async def fake_search(queries_, embedder, filters):
        calls.append(queries_)
        return chunks if chunks is not None else [_chunk(1)]

    monkeypatch.setattr(react, "_search", fake_search)
    return calls


def _finish(**kw):
    answer = ResolutionAnswer(**{**dict(verdict="resolved", steps=["Restart the renderer"], references=["KB-PAY-001"],
                                        confidence="high"), **kw})
    return ReActStep(thought="done", action="finish", answer=answer)


async def test_search_then_finish_with_a_cited_runbook_entry(monkeypatch):
    _no_expansion(monkeypatch)
    calls = _search_results(monkeypatch)
    _scripted(monkeypatch, [
        ReActStep(thought="look for the renderer", action="search", query="renderer 500"),
        _finish(),
    ])
    res = await react.resolve(_case())
    assert res.answer.verdict == "resolved"
    assert calls == [["Payslip PDF fails with 500"], ["renderer 500"]]
    assert [t["kb_ids"] for t in res.trace] == [["KB-PAY-001"], ["KB-PAY-001"]]


async def test_invented_reference_is_sent_back_and_not_accepted(monkeypatch):
    _no_expansion(monkeypatch)
    _search_results(monkeypatch)
    seen = []
    _scripted(monkeypatch, [
        _finish(references=["KB-PAY-999"]),
        _finish(),
    ], seen_users=seen)
    res = await react.resolve(_case())
    assert res.answer.references == ["KB-PAY-001"]
    assert "KB-PAY-999, which no excerpt showed" in seen[1]
    assert res.trace[-1] == {"turn": 1, "rejected_references": ["KB-PAY-999"]}


async def test_search_budget_ends_in_no_match(monkeypatch):
    _no_expansion(monkeypatch)
    calls = _search_results(monkeypatch)
    _scripted(monkeypatch, [ReActStep(thought="more", action="search", query=f"q{i}") for i in range(react.MAX_CALLS)])
    res = await react.resolve(_case())
    assert res.answer.verdict == "no_match"
    assert len(calls) == 1 + react.MAX_SEARCHES


def test_prompt_versions_name_every_resolution_prompt():
    versions = react.prompt_versions()
    assert versions == "resolution_multiquery@1|resolution_hyde@1|resolution_react@1"


# ---- run service ------------------------------------------------------------------------------------------------------

async def test_run_records_an_agent_run_and_skips_unchanged_tickets(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(service, "AsyncSessionLocal", maker)
    async with maker() as db:
        db.add(Ticket(id="INC1", source="servicenow", status="resolved", pipeline_status=PipelineStatus.REVIEWED,
                      summary="Payslip PDF fails with 500", description="Error on payslip", application="PayrollPro"))
        await db.commit()

    async def fake_resolve(case, embedder=None):
        assert case.application == "PayrollPro"
        return react.Resolution(
            answer=ResolutionAnswer(verdict="resolved", steps=["Restart"], references=["KB-PAY-001"], confidence="high"),
            filters=Filters(app="PayrollPro"), queries=[case.summary], hypothetical=None, trace=[], audits=[],
        )

    monkeypatch.setattr(service, "resolve", fake_resolve)
    first = await service.run_resolution()
    assert (first.evaluated, first.skipped, dict(first.by_verdict)) == (1, 0, {"resolved": 1})
    second = await service.run_resolution()
    assert (second.evaluated, second.skipped) == (0, 1)

    async with maker() as db:
        runs = (await db.scalars(select(AgentRun).where(AgentRun.agent == "resolution"))).all()
    assert len(runs) == 1
    assert runs[0].verdict == "resolved"
    assert runs[0].output["references"] == ["KB-PAY-001"]
    assert runs[0].output["filters"] == {"app": "PayrollPro", "kb_id": None, "criticality_tier": None, "section_type": None}
    await engine.dispose()


async def test_endpoint_returns_the_run_counts(client, monkeypatch):
    async def fake_run():
        return service.RunResult(evaluated=2, skipped=1, model_errors=0, by_verdict={"resolved": 1, "no_match": 1})

    import app.api.v1.endpoints.resolution as endpoint

    monkeypatch.setattr(endpoint, "run_resolution", fake_run)
    response = await client.post("/api/v1/resolution/run")
    assert response.json() == {"evaluated": 2, "skipped": 1, "model_errors": 0, "by_verdict": {"resolved": 1, "no_match": 1}}
