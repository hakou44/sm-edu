"""v1.12.0 quality pass (idempotent).

1. Rebalance correct-answer positions (0/1/2) of legacy multiple-choice records. Records of the
   v1.10 depth pack and the v1.11 dedupe replacements are left untouched (already balanced).
   Term-exam / situation answer keys store the answer TEXT, so they stay valid.
2. Flag questions that repeat identically across grades (`quality_flags`) and write a CSV worklist.
3. Replace the generic written rubric of integrative situations with four criteria in the
   Algerian style (relevance, correct use of subject tools, coherence, mastery), marked as a
   platform adaptation pending official verification.
"""
import csv, json, collections, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web/data"
BANK = DATA / "exercise-bank-2026-2027.json"
COV = DATA / "coverage-report-2026-2027.json"
SIT = DATA / "integrative-assessments-2026-2027.json"
WORKLIST = ROOT / "CROSS_GRADE_REPEAT_WORKLIST.csv"
VERSION = "1.12.0"

RUBRIC = [
    "الوجاهة: فهم الوضعية وملاءمة الإجابة للمطلوب",
    "الاستعمال السليم لأدوات المادة: توظيف المفاهيم والمعارف والقواعد والطرائق",
    "الانسجام: ترابط الخطوات وتسلسل الأفكار وتبرير الاختيارات",
    "الإتقان: دقة النتائج وسلامة اللغة وحسن التنظيم والعرض",
]
RUBRIC_BASIS = "platform_adaptation_of_four_criteria_pending_official_verification"


def apply_quality(bank, integrative, report):
    """Pure, idempotent transformation of the in-memory bank / situations / coverage report."""
    recs = bank["records"]

    # 1. answer-position rebalance
    legacy = [r for r in recs if r.get("choices") and r.get("answer_index") is not None
              and not r.get("content_revision")
              and r.get("content_origin") != "platform_authored_depth_pack_v1.10.0"]
    legacy.sort(key=lambda r: r["id"])
    for i, r in enumerate(legacy):
        target = i % 3
        correct = r["choices"][r["answer_index"]]
        others = [c for j, c in enumerate(r["choices"]) if j != r["answer_index"]]
        r["choices"], r["answer_index"] = others[:target] + [correct] + others[target:], target
        assert r["choices"][r["answer_index"]] == r["solution"], r["id"]

    # 2. cross-grade repeats
    groups = collections.defaultdict(list)
    for r in recs:
        groups[(r["subject"], r["question"].strip())].append(r)
    repeated = {}
    for key, items in groups.items():
        grades = sorted({r["grade"] for r in items})
        for r in items:
            flags = [f for f in r.get("quality_flags", []) if f != "cross_grade_repeat"]
            if len(grades) > 1:
                flags.append("cross_grade_repeat")
                r["repeat_grades"] = grades
            else:
                r.pop("repeat_grades", None)
            if flags:
                r["quality_flags"] = flags
            else:
                r.pop("quality_flags", None)
        if len(grades) > 1:
            repeated[key] = items
    pos = collections.Counter(r["answer_index"] for r in recs if r.get("choices"))
    bank.setdefault("coverage", {})["quality_pass_v1_12_0"] = {
        "answer_positions": {str(k): v for k, v in sorted(pos.items())},
        "records_rebalanced": len(legacy),
        "cross_grade_repeat_questions": len(repeated),
        "cross_grade_repeat_records": sum(len(v) for v in repeated.values()),
        "note": "Repeated questions are flagged, not deleted: ids are referenced by term exams and situations. Grade-specific variants must be authored (see CROSS_GRADE_REPEAT_WORKLIST.csv).",
    }

    # 3. rubric
    for s in integrative["situations"]:
        s["written_rubric"] = list(RUBRIC)
        s["rubric_basis"] = RUBRIC_BASIS

    report["version"] = VERSION
    return repeated


def write_worklist(repeated):
    rows = [[k[0], k[1], len({r["grade"] for r in v}), " | ".join(sorted({r["grade"] for r in v})),
             " ".join(r["id"] for r in v)] for k, v in repeated.items()]
    rows.sort(key=lambda x: (-x[2], x[0], x[1]))
    with open(WORKLIST, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["subject", "question", "grades_count", "grades", "record_ids"])
        w.writerows(rows)


def main():
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import build_v1_11_dedupe as dd
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    report = json.loads(COV.read_text(encoding="utf-8"))
    integrative = json.loads(dd.INTEGRATIVE.read_text(encoding="utf-8"))
    repeated = apply_quality(bank, integrative, report)
    BANK.write_text(dd.dump_bank(bank), encoding="utf-8")
    COV.write_text(dd.dump_bank(report), encoding="utf-8")
    dd.INTEGRATIVE.write_text(dd.dump_exam(integrative), encoding="utf-8")
    write_worklist(repeated)
    print("repeat questions", len(repeated), "records", sum(len(v) for v in repeated.values()))


if __name__ == "__main__":
    main()
