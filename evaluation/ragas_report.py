"""Score the Resolution agent with RAGAS, against the answer key.

Usage, from the repo root:  python evaluation/ragas_report.py [--limit N] [--out results.json]
  --limit N   only the first N tickets, a cheap check before a full run
  --out FILE  also write every sample and score to FILE as JSON
Real calls only: the Resolution agent (needs the database with kb_chunks) and the judge, EVAL_JUDGE_MODEL, an Anthropic
model (the key in backend/.env). Nothing is written to the database. Personal data is masked before the judge sees it.
The tickets are the closed sample tickets the answer key ties to a knowledge-base article (as in knowledge_report.py),
and the closed ones the key leaves blank (no article), which are run through the agent but not judged.
The reference answer is the text of that article. Scores:
  faithfulness       the cause and steps are supported by the excerpts the agent read (judge)
  context_precision  the excerpts the agent read are useful for the reference answer (judge)
  context_recall     the reference answer is covered by the excerpts the agent read (judge)
  kb_hit             the expected article is among the references the answer cites (no model)
  retrieval_recall   the expected article is among the excerpts the agent's searches showed (no model)
  retrieval_mrr      mean of 1 / its rank among those excerpts, 0 when it was not shown (no model)
  citation_valid     share of the cited references that the agent's searches showed (no model)
  no_match_rate      the tickets with no article: the agent answered no_match (no model)
Answer relevancy is not scored: RAGAS needs an embeddings model for it, and the repo's embedder is not one.
The answer key was written by us; an expert should confirm it.
"""

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path

START = Path.cwd()  # --out is relative to where the script was run, not to backend/
REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))
os.chdir(REPO / "backend")  # settings read backend/.env

from app.agents.resolution.answer import ResolutionAnswer  # noqa: E402
from app.agents.resolution.case import CaseInput, case_text, masker_for  # noqa: E402
from app.agents.resolution.react import resolve  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.llm import ModelError  # noqa: E402
from knowledge_report import real_cases  # noqa: E402  (the same closed tickets and answer key as the Knowledge report)

KB_HEADING = re.compile(r"^### (KB-[A-Z]+-\d+)\b", re.M)
KB_SECTION_END = re.compile(r"^(?:---$|#{1,2} )", re.M)  # a rule or a section heading above the issue headings
JUDGED = ("faithfulness", "context_precision", "context_recall")


def kb_articles(kb_dir: Path) -> dict[str, str]:
    """KB id -> its section of the runbook: from its '### KB-XXX-NNN' heading to the next rule or section heading."""
    articles = {}
    for path in sorted(kb_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        for heading in KB_HEADING.finditer(text):
            end = KB_SECTION_END.search(text, heading.end())
            articles[heading.group(1)] = text[heading.start(): end.start() if end else len(text)].strip()
    return articles


def kb_hit(references: list[str], expected: str) -> bool:
    return expected in references


def shown_kb_ids(trace: list[dict]) -> list[str]:
    """The KB ids the agent's searches showed it, each once, in the order shown."""
    return list(dict.fromkeys(kb for step in trace for kb in step.get("kb_ids", [])))


def build_sample(case_id: str, user_input: str, answer: ResolutionAnswer, trace: list[dict], expected: str,
                 articles: dict[str, str]) -> dict:
    """One scored sample. retrieved_contexts are the articles the agent's searches showed it, in the order shown;
    response is the cause and steps it gave (or its note, when it found no match); reference is the expected article.
    An expected value that is not a KB id (no article) has no reference, hit or rank; it is scored on no_match_ok."""
    shown = shown_kb_ids(trace)
    is_kb = expected.startswith("KB-")
    rank = shown.index(expected) + 1 if is_kb and expected in shown else None
    return {
        "id": case_id,
        "user_input": user_input,
        "response": "\n".join(filter(None, [answer.root_cause, *answer.steps])) or answer.notes,
        "retrieved_contexts": [articles[kb] for kb in shown if kb in articles],
        "reference": articles[expected] if is_kb else None,
        "expected_kb": expected,
        "references": answer.references,
        "verdict": answer.verdict,
        "kb_hit": kb_hit(answer.references, expected) if is_kb else None,
        "retrieved_rank": rank,
        "citation_valid": (sum(r in shown for r in answer.references) / len(answer.references)
                           if answer.references else None),
        "no_match_ok": None if is_kb else answer.verdict == "no_match",
        "scores": None,
    }


def hit_rate(samples: list[dict]) -> float:
    kb = [s for s in samples if s["kb_hit"] is not None]
    return sum(s["kb_hit"] for s in kb) / len(kb) if kb else 0.0


def summarise(samples: list[dict]) -> dict[str, tuple[float | None, int]]:
    """Mean of each score and how many samples it was computed on: (mean or None, n). The KB measures leave out the
    no-match samples; citation_valid and no_match_rate each leave out the samples they do not apply to."""
    out = {}
    for name in JUDGED:
        values = [s["scores"][name] for s in samples if s["scores"] and s["scores"][name] is not None]
        out[name] = (sum(values) / len(values) if values else None, len(values))
    kb = [s for s in samples if s["kb_hit"] is not None]
    ranks = [s.get("retrieved_rank") for s in kb]
    out["kb_hit"] = (hit_rate(samples), len(kb))
    out["retrieval_recall"] = (sum(r is not None for r in ranks) / len(kb) if kb else 0.0, len(kb))
    out["retrieval_mrr"] = (sum(1 / r if r else 0.0 for r in ranks) / len(kb) if kb else 0.0, len(kb))
    cited = [s.get("citation_valid") for s in samples if s.get("citation_valid") is not None]
    out["citation_valid"] = (sum(cited) / len(cited) if cited else None, len(cited))
    checked = [s.get("no_match_ok") for s in samples if s.get("no_match_ok") is not None]
    out["no_match_rate"] = (sum(checked) / len(checked) if checked else None, len(checked))
    return out


def judges(model: str) -> dict:
    """The three judged RAGAS metrics, each calling the Anthropic model `model` through the Anthropic SDK."""
    from anthropic import Anthropic
    from ragas.llms import llm_factory
    from ragas.metrics.collections import ContextPrecisionWithReference, ContextRecall, Faithfulness

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY.get_secret_value() or None)  # None = the SDK's own lookup
    llm = llm_factory(model, provider="anthropic", client=client)
    return {"faithfulness": Faithfulness(llm=llm), "context_precision": ContextPrecisionWithReference(llm=llm),
            "context_recall": ContextRecall(llm=llm)}


async def score(judged: dict, sample: dict) -> dict[str, float]:
    q, ctx, ref = sample["user_input"], sample["retrieved_contexts"], sample["reference"]
    return {
        "faithfulness": (await judged["faithfulness"].ascore(user_input=q, response=sample["response"],
                                                             retrieved_contexts=ctx)).value,
        "context_precision": (await judged["context_precision"].ascore(user_input=q, reference=ref,
                                                                       retrieved_contexts=ctx)).value,
        "context_recall": (await judged["context_recall"].ascore(user_input=q, retrieved_contexts=ctx,
                                                                 reference=ref)).value,
    }


async def evaluate(tickets: list[tuple], judged: dict, articles: dict[str, str]) -> tuple[list[dict], int]:
    """Run the agent on each ticket, mask what the judge will read, and score it. A ticket whose model call fails is
    left out and counted."""
    samples, errors = [], 0
    for ticket, expected in tickets:
        case = CaseInput(id=ticket.id, summary=ticket.summary, application=ticket.application,
                         body=ticket.description or "", reporter_name=ticket.reporter_name)
        try:
            res = await resolve(case)
        except ModelError as exc:
            errors += 1
            print(f"  ERR {ticket.id:<12} {type(exc).__name__}")
            continue
        sample = build_sample(ticket.id, case_text(case), res.answer, res.trace, expected, articles)
        masker = masker_for(case)
        sample["user_input"], sample["response"] = masker.mask(sample["user_input"]), masker.mask(sample["response"])
        sample["scores"] = await score(judged, sample) if sample["reference"] and sample["retrieved_contexts"] else None
        samples.append(sample)
        shown = sample["scores"] and {k: round(v, 2) for k, v in sample["scores"].items()}
        print(f"  {ticket.id:<12} expected {expected:<12} verdict {sample['verdict']:<9} kb_hit {sample['kb_hit']!s:<5} {shown}")
    return samples, errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Score the Resolution agent with RAGAS (real model calls).")
    parser.add_argument("--limit", type=int, default=0, help="only the first N tickets (default: all)")
    parser.add_argument("--out", type=Path, help="also write every sample and score to this JSON file")
    args = parser.parse_args()

    settings.LLM_ENABLED = True  # the agent and the judge are both model calls; this script never runs rules only
    tickets = [(t, expected) for t, _notes, expected in real_cases(no_match=True)]
    if args.limit:
        tickets = tickets[: args.limit]
    judged = judges(settings.EVAL_JUDGE_MODEL)
    samples, errors = asyncio.run(evaluate(tickets, judged, kb_articles(settings.KB_DIR)))

    summary = summarise(samples)
    print(f"\nResolution agent ({settings.LLM_MODEL}), judge {settings.EVAL_JUDGE_MODEL}, {len(samples)} tickets, "
          f"{errors} model errors")
    for name, (mean, n) in summary.items():
        print(f"  {name:<18} {'-' if mean is None else f'{mean:.2f}':>5}   on {n}")

    if args.out:
        result = {"agent_model": settings.LLM_MODEL, "judge": settings.EVAL_JUDGE_MODEL, "model_errors": errors,
                  "summary": {k: {"mean": m, "n": n} for k, (m, n) in summary.items()}, "samples": samples}
        (START / args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
