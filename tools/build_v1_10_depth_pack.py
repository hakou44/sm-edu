# -*- coding: utf-8 -*-
"""Merge the v1.10.0 depth pack into the exercise bank and coverage report.

Targets the 64 grade/subject pairs that had only 11 exercises (the thinnest
tier) and adds three platform-authored multiple-choice items to each (one per
term). Idempotent: previous V10-* records are removed before re-adding.

Usage: python tools/build_v1_10_depth_pack.py [--check]
"""
import json
import sys
import zlib
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from v1_10_content_primary import PRIMARY      # noqa: E402
from v1_10_content_middle import MIDDLE        # noqa: E402
from v1_10_content_secondary import SECONDARY  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "web/data/exercise-bank-2026-2027.json"
COVERAGE = ROOT / "web/data/coverage-report-2026-2027.json"
PREFIX = "V10-"
ORIGIN = "platform_authored_depth_pack_v1.10.0"
THIN = 11
DIFFICULTIES = {"مبتدئ", "متوسط", "متقدم"}
COGNITIVE = {"مبتدئ": "recall", "متوسط": "understand", "متقدم": "analyze"}
MINUTES = {"مبتدئ": 1, "متوسط": 2, "متقدم": 3}
STEPS = {
    "ar": "نقرأ السؤال ونحدد المطلوب في موضوع «{topic}».",
    "en": "Read the question carefully.",
    "fr": "Lisez attentivement la question.",
}


def language_for(subject):
    if subject == "اللغة الإنجليزية":
        return "en"
    if subject == "اللغة الفرنسية":
        return "fr"
    return "ar"


def all_content():
    merged = {}
    for pack in (PRIMARY, MIDDLE, SECONDARY):
        for grade, subjects in pack.items():
            for subject, items in subjects.items():
                merged[(grade, subject)] = items
    return merged


def thin_pairs(records):
    counts = Counter((r["grade"], r["subject"]) for r in records)
    return sorted(p for p, n in counts.items() if n == THIN)


def build_record(grade, subject, idx_g, idx_s, item, template):
    term, diff, topic, lesson, question, correct, w1, w2, explanation = item
    assert diff in DIFFICULTIES, (grade, subject, question)
    assert term in (1, 2, 3)
    rid = f"{PREFIX}{idx_g:02d}-{idx_s:02d}-{term}"
    choices = [w1, w2]
    pos = zlib.crc32(rid.encode("utf-8")) % 3
    choices.insert(pos, correct)
    lang = language_for(subject)
    level = template["level"]
    alignment = {
        "academic_year": "2026-2027",
        "stage": level,
        "term": term,
        "platform_unit_label": topic,
        "platform_lesson_label": lesson,
        "competency_target": template["curriculum_alignment"]["competency_target"],
        "alignment_status": "platform_topic_mapping_pending_official_annual_progression",
        "official_sequence_verified": False,
        "source_id": None,
    }
    rec = {
        "id": rid,
        "level": level,
        "grade": grade,
        "subject": subject,
        "language": lang,
        "status": "platform_practice_not_official",
        "question": question,
        "choices": choices,
        "answer_index": pos,
        "solution": correct,
        "explanation": explanation,
        "solution_steps": [STEPS[lang].format(topic=topic), explanation],
        "topic": topic,
        "lesson": lesson,
        "difficulty": diff,
        "term": term,
        "question_type": "concept",
        "content_origin": ORIGIN,
        "curriculum_alignment": alignment,
        "cognitive_process": COGNITIVE[diff],
        "estimated_minutes": MINUTES[diff],
        "answer_mode": "multiple_choice",
        "content_review": {
            "answer_integrity": "machine_checked_for_choice_or_numeric_key",
            "language_review": "platform_language_content_pending_human_editorial_review",
            "official_alignment": "not_verified_against_2026_2027_ministry_annual_progression",
        },
    }
    if level == "secondary":
        rec["secondary_pathway_alignment"] = {
            "status": "not_assigned_pending_current_official_subject_matrix",
            "pathway_ids": [],
            "verified": False,
        }
    return rec


def validate(new_records, existing_records):
    existing_q = {(r["grade"], r["subject"], r["question"]) for r in existing_records}
    seen = set()
    for r in new_records:
        key = (r["grade"], r["subject"], r["question"])
        assert key not in existing_q, f"duplicate of existing question: {key}"
        assert key not in seen, f"duplicate within pack: {key}"
        seen.add(key)
        assert len(set(r["choices"])) == 3, r["id"]
        assert r["choices"][r["answer_index"]] == r["solution"], r["id"]
        assert r["question"].strip() and r["explanation"].strip(), r["id"]
    ids = [r["id"] for r in new_records]
    assert len(ids) == len(set(ids)), "duplicate ids"


def recompute_coverage_report(report, records):
    by_pair = defaultdict(list)
    for r in records:
        by_pair[(r["grade"], r["subject"])].append(r)
    for entry in report["grade_subject_coverage"]:
        rows = by_pair[(entry["grade"], entry["subject"])]
        terms = Counter(str(r["term"]) for r in rows)
        entry["exercise_count"] = len(rows)
        entry["term_counts"] = {t: terms.get(t, 0) for t in ("1", "2", "3")}
        entry["target_met"] = len(rows) >= entry["minimum_target"]
        entry["all_terms_covered"] = all(terms.get(t, 0) > 0 for t in ("1", "2", "3"))
    stage_totals = Counter(r["level"] for r in records)
    for stage in report["stages"]:
        stage["exercises"] = stage_totals[stage["stage"]]
    report["totals"]["exercises"] = len(records)
    report["totals"]["depth_pack_v1_10_exercises"] = sum(
        1 for r in records if r.get("content_origin") == ORIGIN)
    report.setdefault("version", "1.10.0")
    report["purpose"] = report["purpose"]


def main(check_only=False):
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    base = [r for r in bank["records"] if not r["id"].startswith(PREFIX)]
    content = all_content()
    targets = thin_pairs(base)
    assert set(content) == set(targets), (
        "content must cover exactly the thin pairs",
        sorted(set(content) ^ set(targets)))
    for pair, items in content.items():
        assert len(items) == 3 and sorted(i[0] for i in items) == [1, 2, 3], pair

    grades = sorted({r["grade"] for r in base})
    subjects = sorted({r["subject"] for r in base})
    new_records = []
    for (grade, subject) in targets:
        template = next(r for r in base if r["grade"] == grade and r["subject"] == subject)
        for item in sorted(content[(grade, subject)], key=lambda i: i[0]):
            new_records.append(build_record(
                grade, subject, grades.index(grade) + 1, subjects.index(subject) + 1,
                item, template))
    validate(new_records, base)
    records = base + new_records

    if check_only:
        print(f"OK: {len(new_records)} records valid; bank would have {len(records)}")
        return

    bank["records"] = records
    cov = bank["coverage"]
    cov["exercises"] = len(records)
    cov["multiple_choice_exercises"] = sum(1 for r in records if r["question_type"] != "numeric")
    for key in ("cognitive_process_metadata", "estimated_time_metadata", "answer_mode_metadata"):
        cov[key] = len(records)
    cov["depth_pack_v1_10"] = {
        "exercises": len(new_records),
        "grade_subject_pairs": len(targets),
        "per_pair": 3,
        "terms_balanced": True,
        "answer_mode": "multiple_choice",
        "languages": dict(Counter(r["language"] for r in new_records)),
        "targeted_tier": "pairs that had exactly 11 exercises before v1.10.0",
        "teacher_review_required": True,
        "official_alignment_verified": False,
    }
    marker = "v1.10.0 adds 192 platform-authored multiple-choice practice exercises"
    if marker not in bank["description"]:
        bank["description"] += (
            " " + marker + " (3 per pair, one per term) for the 64 grade/subject pairs "
            "that previously had only 11; teacher review required and no official "
            "alignment is claimed.")
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")

    report = json.loads(COVERAGE.read_text(encoding="utf-8"))
    recompute_coverage_report(report, records)
    COVERAGE.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(new_records)} records; bank now {len(records)}")


if __name__ == "__main__":
    main("--check" in sys.argv)
