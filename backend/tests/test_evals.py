"""Evaluation helpers for the RAGAS report: KB article parsing, sample building and the hit rate. No network, no ragas."""

import sys
from pathlib import Path

from app.agents.resolution.answer import ResolutionAnswer

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "evaluation"))

import ragas_report as report  # noqa: E402


def test_kb_articles_stops_at_the_next_issue_rule_or_section(tmp_path):
    (tmp_path / "app.md").write_text(
        "# App\n\n### KB-APP-001 — First issue\n\n**Root cause**\nCause one.\n\n---\n\n"
        "### KB-APP-002 — Second issue\n\nCause two.\n\n## Escalation contacts\n\n| L2 | Team |\n",
        encoding="utf-8",
    )
    articles = report.kb_articles(tmp_path)
    assert articles["KB-APP-001"] == "### KB-APP-001 — First issue\n\n**Root cause**\nCause one."
    assert articles["KB-APP-002"] == "### KB-APP-002 — Second issue\n\nCause two."


def test_kb_articles_reads_the_real_runbooks():
    articles = report.kb_articles(REPO / "data" / "knowledge_base")
    assert articles["KB-BIL-001"].startswith("### KB-BIL-001")
    assert "Escalation contacts" not in articles["KB-BIL-007"]
    assert all(text.startswith("### KB-") for text in articles.values())


def test_build_sample_uses_the_kb_articles_the_agent_was_shown():
    answer = ResolutionAnswer(verdict="resolved", root_cause="Cause", steps=["1. Restart", "2. Check"],
                              references=["KB-PAY-001"], confidence="high")
    trace = [{"turn": 0, "queries": ["q"], "kb_ids": ["KB-PAY-001", "KB-PAY-002"]},
             {"turn": 1, "queries": ["q2"], "kb_ids": ["KB-PAY-001", "KB-PAY-404"]},
             {"turn": 2, "rejected_references": ["KB-PAY-999"]}]
    articles = {"KB-PAY-001": "Article one", "KB-PAY-002": "Article two", "KB-PAY-003": "Not shown"}

    sample = report.build_sample("INC1", "ticket text", answer, trace, "KB-PAY-001", articles)

    assert sample["retrieved_contexts"] == ["Article one", "Article two"]  # shown once each, unknown ids dropped
    assert sample["response"] == "Cause\n1. Restart\n2. Check"
    assert sample["reference"] == "Article one"
    assert sample["kb_hit"] is True
    assert sample["scores"] is None


def test_build_sample_for_no_match_uses_the_note_as_the_response():
    answer = ResolutionAnswer(verdict="no_match", confidence="low", notes="Escalate to AMS-Payroll.")
    sample = report.build_sample("INC2", "ticket text", answer, [{"turn": 0, "kb_ids": []}], "KB-PAY-002",
                                 {"KB-PAY-002": "Article"})
    assert sample["response"] == "Escalate to AMS-Payroll."
    assert sample["retrieved_contexts"] == []
    assert sample["kb_hit"] is False
    assert sample["retrieved_rank"] is None


def test_build_sample_for_a_ticket_without_an_article_is_scored_on_no_match():
    answer = ResolutionAnswer(verdict="no_match", confidence="low", notes="Escalate to AMS-Payroll.")
    sample = report.build_sample("INC7", "ticket text", answer, [{"turn": 0, "kb_ids": []}], "none",
                                 {"KB-PAY-002": "Article"})
    assert sample["reference"] is None
    assert sample["kb_hit"] is None
    assert sample["retrieved_rank"] is None
    assert sample["citation_valid"] is None
    assert sample["no_match_ok"] is True


def test_build_sample_for_no_match_that_answers_something_is_not_ok():
    answer = ResolutionAnswer(verdict="resolved", root_cause="Cause", steps=["1. Restart"], references=["KB-PAY-001"],
                              confidence="high")
    trace = [{"turn": 0, "kb_ids": ["KB-PAY-001"]}]
    sample = report.build_sample("INC3", "ticket text", answer, trace, "none", {"KB-PAY-001": "Article"})
    assert sample["no_match_ok"] is False
    assert sample["kb_hit"] is None


def test_shown_kb_ids_are_unique_and_in_the_order_shown():
    trace = [{"turn": 0, "kb_ids": ["KB-A-002", "KB-A-001"]}, {"turn": 1, "queries": ["q"]},
             {"turn": 2, "kb_ids": ["KB-A-001", "KB-A-003"]}]
    assert report.shown_kb_ids(trace) == ["KB-A-002", "KB-A-001", "KB-A-003"]
    assert report.shown_kb_ids([]) == []


def test_build_sample_rank_and_citation_validity():
    answer = ResolutionAnswer(verdict="resolved", root_cause="Cause", steps=["1. Restart"],
                              references=["KB-PAY-002", "KB-PAY-404"], confidence="high")
    trace = [{"turn": 0, "kb_ids": ["KB-PAY-001", "KB-PAY-002"]}]
    articles = {"KB-PAY-001": "One", "KB-PAY-002": "Two"}

    sample = report.build_sample("INC4", "ticket text", answer, trace, "KB-PAY-002", articles)
    assert sample["retrieved_rank"] == 2
    assert sample["citation_valid"] == 0.5  # KB-PAY-404 was never shown

    missed = report.build_sample("INC5", "ticket text", answer, trace, "KB-PAY-003", {"KB-PAY-003": "Three"})
    assert missed["retrieved_rank"] is None

    uncited = ResolutionAnswer(verdict="no_match", confidence="low", notes="Escalate.")
    assert report.build_sample("INC6", "ticket text", uncited, trace, "KB-PAY-001", articles)["citation_valid"] is None


def test_kb_hit_and_hit_rate():
    assert report.kb_hit(["KB-A-001", "KB-A-002"], "KB-A-002")
    assert not report.kb_hit([], "KB-A-002")
    samples = [{"kb_hit": True}, {"kb_hit": False}, {"kb_hit": True}, {"kb_hit": True}]
    assert report.hit_rate(samples) == 0.75
    assert report.hit_rate([]) == 0.0


def test_summarise_skips_samples_without_a_score():
    samples = [
        {"kb_hit": True, "scores": {"faithfulness": 1.0, "context_precision": 0.5, "context_recall": None}},
        {"kb_hit": False, "scores": None},
        {"kb_hit": True, "scores": {"faithfulness": 0.5, "context_precision": 1.0, "context_recall": 1.0}},
    ]
    summary = report.summarise(samples)
    assert summary["faithfulness"] == (0.75, 2)
    assert summary["context_precision"] == (0.75, 2)
    assert summary["context_recall"] == (1.0, 1)
    assert summary["kb_hit"] == (2 / 3, 3)


def test_summarise_retrieval_and_citations():
    samples = [
        {"kb_hit": True, "retrieved_rank": 1, "citation_valid": 1.0, "no_match_ok": None, "scores": None},
        {"kb_hit": False, "retrieved_rank": 4, "citation_valid": 0.5, "no_match_ok": None, "scores": None},
        {"kb_hit": False, "retrieved_rank": None, "citation_valid": None, "no_match_ok": None, "scores": None},
        {"kb_hit": None, "retrieved_rank": None, "citation_valid": None, "no_match_ok": True, "scores": None},
        {"kb_hit": None, "retrieved_rank": None, "citation_valid": 1.0, "no_match_ok": False, "scores": None},
    ]
    summary = report.summarise(samples)
    assert summary["retrieval_recall"] == (2 / 3, 3)  # the no-match samples are left out
    assert summary["retrieval_mrr"] == ((1 + 0.25 + 0) / 3, 3)
    assert summary["kb_hit"] == (1 / 3, 3)
    assert summary["citation_valid"] == ((1.0 + 0.5 + 1.0) / 3, 3)
    assert summary["no_match_rate"] == (0.5, 2)


def test_summarise_without_samples_gives_no_rates():
    summary = report.summarise([])
    assert summary["retrieval_recall"] == (0.0, 0)
    assert summary["citation_valid"] == (None, 0)
    assert summary["no_match_rate"] == (None, 0)
