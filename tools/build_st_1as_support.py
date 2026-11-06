# -*- coding: utf-8 -*-
"""Adds the 1AS common-core Science & Technology support pack (100 exercises + 12 term papers)
to web/data. Idempotent: re-running replaces the pack instead of duplicating it."""
import json, random, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from st_1as_content_part1 import MATH, PHYS
from st_1as_content_part2 import SVT, INFO

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"
GRADE = "الأولى ثانوي"
ORIGIN = "original_platform_authored_st1as_support_pack_v1"
PAPER_VARIANT = "st1as_support_pack_B"
CODE = {"الرياضيات": "MATH", "العلوم الفيزيائية": "PHYS", "العلوم الطبيعية": "SVT", "الإعلام الآلي": "INFO"}
COG = {"مبتدئ": "recall", "متوسط": "apply", "متقدم": "reason"}
MIN = {"مبتدئ": 1, "متوسط": 2, "متقدم": 4}
COMPETENCY = {
    "الرياضيات": "حل وضعية رياضية باستعمال المفهوم أو الإجراء المناسب وتبرير النتيجة.",
    "العلوم الفيزيائية": "توظيف القوانين والمفاهيم الفيزيائية والكيميائية في حل وضعية وتبرير النتيجة.",
    "العلوم الطبيعية": "تفسير ظاهرة بيولوجية أو جيولوجية انطلاقاً من معطيات وتبرير الاستنتاج.",
    "الإعلام الآلي": "فهم مفهوم معلوماتي وتطبيقه في وضعية مع التحقق من صحة النتيجة.",
}


def build_records():
    out, counters = [], {}
    for item in MATH + PHYS + SVT + INFO:
        subj = item["subject"]
        counters[subj] = counters.get(subj, 0) + 1
        rid = f"ST1AS-{CODE[subj]}-{counters[subj]:02d}"
        diff, qtype = item["difficulty"], item["question_type"]
        rec = {
            "id": rid, "level": "secondary", "grade": GRADE, "subject": subj, "language": "ar",
            "status": "platform_practice_not_official", "question": item["question"],
        }
        if qtype == "numeric":
            rec.update({"question_type": "numeric", "input_mode": "text", "accepted_answers": item["accepted"],
                        "solution": item["solution"], "explanation": item["explanation"],
                        "solution_steps": item["steps"]})
            mode = "numeric"
        else:
            choices = [item["solution"]] + item["wrong"]
            assert len(choices) == 3 and len(set(choices)) == 3, rid
            random.Random(rid).shuffle(choices)
            idx = choices.index(item["solution"])
            rec.update({"choices": choices, "answer_index": idx, "solution": item["solution"],
                        "explanation": item["explanation"], "solution_steps": item["steps"]})
            mode = "multiple_choice"
        assert len(item["steps"]) >= 2, rid
        rec.update({
            "topic": item["topic"], "lesson": item["lesson"], "difficulty": diff, "term": item["term"],
            "question_type": qtype,
            "curriculum_alignment": {
                "academic_year": "2026-2027", "stage": "secondary", "term": item["term"],
                "platform_unit_label": item["topic"], "platform_lesson_label": item["lesson"],
                "competency_target": COMPETENCY[subj],
                "alignment_status": "platform_topic_mapping_pending_official_annual_progression",
                "official_sequence_verified": False, "source_id": None},
            "cognitive_process": COG[diff],
            "estimated_minutes": 3 if (qtype == "numeric" and diff != "مبتدئ") else MIN[diff],
            "answer_mode": mode,
            "content_origin": ORIGIN,
            "target_pathway_candidate": "common_science_technology",
            "content_review": {
                "answer_integrity": "answer_key_checked_by_script_and_author",
                "language_review": "requires_teacher_editorial_review",
                "official_alignment": "not_verified_against_2026_2027_ministry_annual_progression"},
            "secondary_pathway_alignment": {
                "status": "not_assigned_pending_current_official_subject_matrix",
                "pathway_ids": [], "verified": False},
        })
        out.append(rec)
    return out


def pick(records, n):
    """Pick n questions: keep hardest first, then medium, then easy; return ordered easy -> hard."""
    order = {"متقدم": 0, "متوسط": 1, "مبتدئ": 2}
    chosen = sorted(records, key=lambda r: (order[r["difficulty"]], r["id"]))[:n]
    rank = {"مبتدئ": 0, "متوسط": 1, "متقدم": 2}
    return sorted(chosen, key=lambda r: (rank[r["difficulty"]], r["id"]))


def expected(rec):
    return rec["solution"] if rec["question_type"] != "numeric" else rec["accepted_answers"][0]


def build_papers(new_records):
    papers = []
    for subj, code in CODE.items():
        for term in (1, 2, 3):
            pool = [r for r in new_records if r["subject"] == subj and r["term"] == term]
            n = 5 if subj == "الإعلام الآلي" else 8
            qs = pick(pool, n)
            pts = 20 / n
            papers.append({
                "id": f"secondary-1AS-ST-{code}-T{term}-B", "academic_year": "2026-2027", "grade": GRADE,
                "stage": "secondary", "subject": subj, "term": term,
                "title": f"اختبار فصلي تدريبي إضافي (ب) · الأولى ثانوي جذع مشترك علوم وتكنولوجيا · {subj} · الفصل {term}",
                "variant": PAPER_VARIANT, "question_ids": [q["id"] for q in qs], "question_count": n,
                "duration_minutes": 45 if n == 5 else 60, "total_points": 20,
                "marking_policy": "equal_weight_per_question",
                "answer_key": [{"question_id": q["id"], "expected_answer": expected(q),
                                "explanation": q["explanation"], "solution_steps": q["solution_steps"],
                                "points": pts, "answer_mode": q["answer_mode"]} for q in qs],
                "content_status": "platform_authored_practice_not_official_ministry_exam",
                "curriculum_alignment_status": "provisional_topic_mapping_pending_official_2026_2027_progression_review"})
    return papers


def main():
    bank_path = DATA / "exercise-bank-2026-2027.json"
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    bank["records"] = [r for r in bank["records"] if r.get("content_origin") != ORIGIN]
    base_total = len(bank["records"])
    new = build_records()
    assert len(new) == 100
    ids = {r["id"] for r in bank["records"]}
    assert not ids & {r["id"] for r in new}
    bank["records"].extend(new)
    typed_new = sum(1 for r in new if r["answer_mode"] == "numeric")
    cov = bank["coverage"]
    cov["exercises"] = len(bank["records"])
    cov["multiple_choice_exercises"] = sum(1 for r in bank["records"] if r.get("question_type") != "numeric")
    cov["typed_answer_exercises"] = sum(1 for r in bank["records"] if r.get("question_type") == "numeric")
    cov["cognitive_process_metadata"] = cov["estimated_time_metadata"] = len(bank["records"])
    cov["answer_mode_metadata"] = sum(1 for r in bank["records"] if r.get("answer_mode"))
    cov["targeted_grade_counts"][GRADE] = sum(1 for r in bank["records"] if r["grade"] == GRADE)
    cov["st1as_support_pack"] = {"exercises": 100, "typed_numeric": typed_new,
                                 "subjects": {s: sum(1 for r in new if r["subject"] == s) for s in CODE},
                                 "pathway_candidate": "common_science_technology",
                                 "teacher_review_required": True, "official_alignment_verified": False}
    bank["description"] += (" The ST-1AS support pack adds 100 platform-authored exercises with worked solutions"
                            " for the Grade 1 Secondary Science & Technology common-core candidate subjects"
                            " (mathematics, physical sciences, natural sciences, computer science); teacher review required.")
    bank_path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    t_path = DATA / "term-exams-2026-2027.json"
    te = json.loads(t_path.read_text(encoding="utf-8"))
    te["papers"] = [p for p in te["papers"] if p.get("variant") != PAPER_VARIANT]
    papers = build_papers(new)
    te["papers"].extend(papers)
    tot = te["totals"]
    tot["papers"] = len(te["papers"])
    tot["questions_referenced"] = len({i for p in te["papers"] for i in p["question_ids"]})
    tot["max_questions_per_paper"] = max(p["question_count"] for p in te["papers"])
    tot["min_questions_per_paper"] = min(p["question_count"] for p in te["papers"])
    tot["additional_variant_papers"] = len(papers)
    te["policy"]["question_source"] = ("existing platform exercise bank; the ST-1AS support pack adds 12 variant (B) "
                                       "papers built only from its own new exercises")
    t_path.write_text(json.dumps(te, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    c_path = DATA / "coverage-report-2026-2027.json"
    cr = json.loads(c_path.read_text(encoding="utf-8"))
    cr["totals"]["exercises"] = len(bank["records"])
    for st in cr["stages"]:
        if st["stage"] == "secondary":
            st["exercises"] = sum(1 for r in bank["records"] if r["level"] == "secondary")
    for row in cr["grade_subject_coverage"]:
        if row["grade"] == GRADE:
            rs = [r for r in bank["records"] if r["grade"] == GRADE and r["subject"] == row["subject"]]
            row["exercise_count"] = len(rs)
            tc = {}
            for r in rs:
                tc[str(r["term"])] = tc.get(str(r["term"]), 0) + 1
            row["term_counts"] = dict(sorted(tc.items()))
    cr["totals"]["st1as_support_pack_exercises"] = 100
    c_path.write_text(json.dumps(cr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"bank {base_total} -> {len(bank['records'])}; papers -> {len(te['papers'])}; typed new {typed_new}")


if __name__ == "__main__":
    main()
