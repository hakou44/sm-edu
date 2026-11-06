# -*- coding: utf-8 -*-
"""Replace the legacy duplicate exercises found in v1.10.0 (v1.11.0).

Earlier packs repeated a question inside the same grade/subject pair (16 groups,
20 redundant records). Term exams and integrative assessments reference
exercises by id, so records are NOT deleted: each redundant record keeps its id,
grade, subject, term, topic and lesson, and receives a new, distinct question
from tools/v1_11_content_dedupe.py. The embedded answer keys of every exam paper
and integrative situation that uses those ids are synchronized.

Idempotent: running the tool again produces byte-identical files.

Usage: python tools/build_v1_11_dedupe.py [--check]
  --check  verify that the committed data already matches, write nothing
"""
import copy
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from v1_11_content_dedupe import GENERIC_REPLACEMENTS, REPLACEMENTS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web/data"
BANK = DATA / "exercise-bank-2026-2027.json"
COVERAGE = DATA / "coverage-report-2026-2027.json"
TERM_EXAMS = DATA / "term-exams-2026-2027.json"
INTEGRATIVE = DATA / "integrative-assessments-2026-2027.json"
ORIGIN = "platform_authored_dedupe_replacement_v1.11.0"
VERSION = "1.11.0"
RELEASE = "1.11.1"
GENERIC_ORIGIN = "platform_authored_generic_replacement_v1.11.1"
DIFFICULTIES = {"مبتدئ", "متوسط", "متقدم"}
COGNITIVE = {"recall", "understand", "apply", "analyze"}
MINUTES = {"مبتدئ": 1, "متوسط": 2, "متقدم": 3}

_DIACRITICS = re.compile("[\u064b-\u0652\u0670\u0640]")
_ALEF = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي"})
_NON_ALNUM = re.compile(r"[\W_]+", re.UNICODE)


def loose_key(question):
    """Question key that ignores diacritics, punctuation, quotes and alef forms."""
    text = _DIACRITICS.sub("", question).translate(_ALEF).lower()
    return _NON_ALNUM.sub("", text)


def duplicate_groups(records):
    groups = defaultdict(list)
    for r in records:
        groups[(r["grade"], r["subject"], loose_key(r["question"]))].append(r["id"])
    return {k: v for k, v in groups.items() if len(v) > 1}


def apply_generic(record, item):
    apply_replacements(record, item, generic=True)


def apply_replacements(record, item, generic=False):
    r = record
    r["question"] = item["question"]
    r["choices"] = list(item["choices"])
    r["answer_index"] = item["answer_index"]
    r["solution"] = item["choices"][item["answer_index"]]
    r["explanation"] = item["explanation"]
    r["solution_steps"] = list(item["steps"])
    r["difficulty"] = item["difficulty"]
    r["cognitive_process"] = item["cognitive"]
    r["estimated_minutes"] = MINUTES[item["difficulty"]]
    r["question_type"] = "concept"
    # content_origin is left untouched: earlier packs are counted per grade/subject/term slot.
    if generic:
        r["content_revision"] = {
            "version": RELEASE,
            "reason": "generic_non_subject_question_replaced",
            "origin": GENERIC_ORIGIN,
        }
    else:
        r["content_revision"] = {
            "version": VERSION,
            "reason": "legacy_duplicate_question_replaced",
            "origin": ORIGIN,
            "replaces_duplicate_of": item["kept_id"],
        }
    review = dict(r.get("content_review", {}))
    review["answer_integrity"] = "machine_checked_for_choice_or_numeric_key"
    review["language_review"] = "platform_language_content_pending_human_editorial_review"
    review["official_alignment"] = "not_verified_against_2026_2027_ministry_annual_progression"
    r["content_review"] = review


def validate_content(records_by_id):
    seen = set()
    for rid, item in REPLACEMENTS.items():
        assert rid in records_by_id, f"unknown id {rid}"
        rec = records_by_id[rid]
        kept = records_by_id.get(item["kept_id"])
        assert kept is not None, f"{rid}: kept id {item['kept_id']} missing"
        assert (kept["grade"], kept["subject"]) == (rec["grade"], rec["subject"]), rid
        assert item["difficulty"] in DIFFICULTIES and item["cognitive"] in COGNITIVE, rid
        assert len(item["choices"]) == 3 and len(set(item["choices"])) == 3, rid
        assert 0 <= item["answer_index"] <= 2, rid
        assert len(item["steps"]) == 2 and all(s.strip() for s in item["steps"]), rid
        assert item["question"].strip() and item["explanation"].strip(), rid
        assert rid not in seen
        seen.add(rid)


def sync_exam_keys(term_exams, integrative, records_by_id):
    touched = Counter()
    synced = set(REPLACEMENTS) | set(GENERIC_REPLACEMENTS)
    for paper in term_exams["papers"]:
        for entry in paper["answer_key"]:
            qid = entry["question_id"]
            if qid in synced:
                rec = records_by_id[qid]
                entry["expected_answer"] = rec["solution"]
                entry["explanation"] = rec["explanation"]
                entry["solution_steps"] = list(rec["solution_steps"])
                touched["term_exam_answer_keys" if qid in REPLACEMENTS else "generic_term_exam_answer_keys"] += 1
    for situation in integrative["situations"]:
        for entry in situation["model_solution"]:
            qid = entry["question_id"]
            if qid in synced:
                rec = records_by_id[qid]
                entry["expected_answer"] = rec["solution"]
                entry["reasoning"] = rec["explanation"]
                entry["solution_steps"] = list(rec["solution_steps"])
                touched["integrative_model_solutions" if qid in REPLACEMENTS else "generic_integrative_model_solutions"] += 1
    return touched


def check_papers(term_exams, integrative, records_by_id):
    """No exam paper or situation may contain two equivalent questions."""
    collections = [("term exam", term_exams["papers"]), ("integrative", integrative["situations"])]
    for label, items in collections:
        for item in items:
            keys = [loose_key(records_by_id[q]["question"]) for q in item["question_ids"]]
            assert len(keys) == len(set(keys)), f"{label} {item['id']} repeats a question"


def build():
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    report = json.loads(COVERAGE.read_text(encoding="utf-8"))
    term_exams = json.loads(TERM_EXAMS.read_text(encoding="utf-8"))
    integrative = json.loads(INTEGRATIVE.read_text(encoding="utf-8"))
    records = bank["records"]
    by_id = {r["id"]: r for r in records}
    validate_content(by_id)

    before = duplicate_groups(records)
    for ids in before.values():
        redundant = [i for i in ids if i in REPLACEMENTS]
        kept = [i for i in ids if i not in REPLACEMENTS]
        assert len(kept) == 1, ("group is not covered by the replacement content", ids)
        for i in redundant:
            assert REPLACEMENTS[i]["kept_id"] == kept[0], (i, kept)
    if before:
        assert len(before) == 16 and sum(len(v) - 1 for v in before.values()) == 20, (
            "unexpected duplicate group count", len(before))
    for rid, item in REPLACEMENTS.items():
        apply_replacements(by_id[rid], item)

    for rid, item in GENERIC_REPLACEMENTS.items():
        assert rid in by_id and rid not in REPLACEMENTS, rid
        assert len(item["choices"]) == 3 and len(set(item["choices"])) == 3, rid
        assert item["choices"][item["answer_index"]] and len(item["steps"]) == 2, rid
        apply_generic(by_id[rid], item)

    after = duplicate_groups(records)
    assert not after, f"duplicates remain: {sorted(after.values())}"
    assert len({r["id"] for r in records}) == len(records)
    for r in records:
        if r.get("choices"):
            assert r["choices"][r["answer_index"]] == r["solution"], r["id"]

    touched = sync_exam_keys(term_exams, integrative, by_id)
    check_papers(term_exams, integrative, by_id)

    bank["coverage"]["dedupe_v1_11"] = {
        "records_replaced": len(REPLACEMENTS),
        "legacy_duplicate_groups": 16,
        "ids_preserved": True,
        "exam_answer_keys_synchronized": touched["term_exam_answer_keys"],
        "integrative_model_solutions_synchronized": touched["integrative_model_solutions"],
        "official_alignment_verified": False,
        "teacher_review_required": True,
    }
    marker = "v1.11.0 replaces 20 legacy duplicate questions"
    if marker not in bank["description"]:
        bank["description"] += (
            " " + marker + " with new platform-authored items (ids preserved, exam answer keys "
            "synchronized); teacher review required and no official alignment is claimed.")

    bank["coverage"]["generic_question_cleanup_v1_11_1"] = {
        "records_replaced": len(GENERIC_REPLACEMENTS),
        "ids_preserved": True,
        "subject": "العلوم الفيزيائية والتكنولوجيا",
        "stage": "middle",
        "exam_answer_keys_synchronized": touched["generic_term_exam_answer_keys"],
        "integrative_model_solutions_synchronized": touched["generic_integrative_model_solutions"],
        "teacher_review_required": True,
    }
    report["version"] = RELEASE
    report["totals"]["generic_questions_replaced_v1_11_1"] = len(GENERIC_REPLACEMENTS)
    report["totals"]["legacy_duplicates_replaced_v1_11"] = len(REPLACEMENTS)
    report["totals"]["exercises"] = len(records)
    # v1.12.0 quality pass runs last so the generator output stays the committed data.
    from build_v1_12_quality import apply_quality
    apply_quality(bank, integrative, report)
    return bank, report, term_exams, integrative, touched


def dump_bank(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1)


def dump_exam(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def main(check_only=False):
    bank, report, term_exams, integrative, touched = build()
    outputs = [
        (BANK, dump_bank(bank)),
        (COVERAGE, dump_bank(report)),
        (TERM_EXAMS, dump_exam(term_exams)),
        (INTEGRATIVE, dump_exam(integrative)),
    ]
    if check_only:
        stale = [p.name for p, text in outputs if p.read_text(encoding="utf-8") != text]
        if stale:
            print("OUT OF DATE:", ", ".join(stale))
            raise SystemExit(1)
        print(f"OK: committed data matches generator ({len(REPLACEMENTS)} records, {dict(touched)})")
        return
    for path, text in outputs:
        path.write_text(text, encoding="utf-8")
    print(f"Replaced {len(REPLACEMENTS)} records; synchronized {dict(touched)}")


if __name__ == "__main__":
    main("--check" in sys.argv)
