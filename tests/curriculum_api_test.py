import json
import os
import sys
import unittest
from unittest.mock import patch
from pathlib import Path
from collections import defaultdict

os.environ["ALLOW_OPEN_REVIEW_API"] = "1"

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from fastapi.testclient import TestClient
from app.main import app, _segment_curriculum_evidence
sys.path.insert(0, str(ROOT / "tools"))
from validate_curriculum_evidence import validate_row

class CurriculumApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_curriculum_endpoints(self):
        for route in [
            "/api/v1/curriculum/governance",
            "/api/v1/curriculum/coverage-audit",
            "/api/v1/curriculum/official-sources",
            "/api/v1/curriculum/verification-template",
            "/api/v1/curriculum/evidence-policy",
        ]:
            response = self.client.get(route)
            self.assertEqual(response.status_code, 200, route)
        data = self.client.get("/api/v1/curriculum/governance").json()
        self.assertEqual(len(data["grade_subject_records"]), 105)
        self.assertEqual(len(data["secondary_pathway_records"]), 16)
        self.assertEqual(data["totals"]["verified_current_annual_progression_pairs"], 0)

    def test_evidence_policy_and_validation(self):
        policy = self.client.get("/api/v1/curriculum/evidence-policy")
        self.assertEqual(policy.status_code, 200)
        data = policy.json()
        self.assertTrue(data["verification_is_local_only"])
        self.assertFalse(data["automatic_curriculum_publication"])
        good = {"record_id":"primary-3-1","stage":"primary","grade":"الثالثة ابتدائي","subject_or_candidate":"اللغة العربية","term":"1","verification_status":"verified","official_document_title":"Progression 2026-2027","official_document_url":"https://www.education.gov.dz/progression.pdf","page_number":"4","unit":"Unit A","lesson":"Lesson A","competency":"Competency A","source_publication_date":"2026-09-01","reviewer_role":"Teacher","reviewer_name":"Reviewer","verified_at":"2026-10-30"}
        self.assertTrue(validate_row(good, 2)["valid"])
        bad = dict(good, official_document_url="https://example.com/file.pdf")
        self.assertIn("invalid:official_document_url_must_be_https_ministry_domain", validate_row(bad, 2)["errors"])

    def test_page_anchored_curriculum_candidate_extraction(self):
        document = {"extracted_text": "--- PAGE 1 ---\nUnité 1 : Les nombres et les opérations.\nCompétence : résoudre un problème simple.\n\n--- PAGE 2 ---\nالدرس: جمع الأعداد الطبيعية وتوظيفها في وضعية.\n"}
        rows = _segment_curriculum_evidence(document)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["source_page"], 1)
        self.assertEqual(rows[1]["source_page"], 2)
        self.assertEqual(rows[0]["suggested_field"], "unit")
        self.assertEqual(rows[1]["suggested_field"], "lesson")
        self.assertTrue(all(len(x["source_excerpt"]) >= 18 for x in rows))

    def test_curriculum_candidate_api_lifecycle(self):
        documents = [{"id": "testdoc", "filename": "progression.pdf", "extracted_text": "--- PAGE 3 ---\nUnité 2 : développer les compétences de résolution."}]
        candidates = []
        with patch("app.main._load_pdf_review_rows", return_value=documents), \
             patch("app.main._load_curriculum_candidates", side_effect=lambda: candidates), \
             patch("app.main._save_curriculum_candidates", side_effect=lambda rows: candidates.__setitem__(slice(None), rows)):
            created = self.client.post("/api/v1/archive/pdf-review/testdoc/extract-curriculum-candidates")
            self.assertEqual(created.status_code, 200)
            self.assertEqual(created.json()["created"], 1)
            candidate_id = created.json()["candidates"][0]["id"]
            listed = self.client.get("/api/v1/archive/pdf-review/testdoc/curriculum-candidates").json()
            self.assertEqual(listed["candidates"][0]["source_page"], 3)
            saved = self.client.put(f"/api/v1/archive/curriculum-evidence-candidates/{candidate_id}", json={"unit":"Unit 2", "lesson":"", "competency":"", "grade":"الثالثة متوسط", "subject":"الرياضيات", "term":1, "status":"reviewed_candidate"})
            self.assertEqual(saved.status_code, 200)
            self.assertFalse(saved.json()["candidate"]["auto_verified"])
            self.assertEqual(saved.json()["candidate"]["official_alignment"], "not_verified")
            self.assertFalse(saved.json()["official_registry_updated"])

    def test_exam_builder_and_guardrails(self):
        bank = json.loads((ROOT / "web/data/exercise-bank-2026-2027.json").read_text(encoding="utf-8"))["records"]
        groups = defaultdict(list)
        for item in bank:
            groups[(item["grade"], item["subject"], item["term"], item.get("language", "ar"))].append(item)
        key = next(k for k, values in groups.items() if len(values) >= 3)
        payload = {"grade": key[0], "subject": key[1], "term": key[2], "question_count": 3, "language": key[3]}
        response = self.client.post("/api/v1/learning/exam-builder", json=payload)
        self.assertEqual(response.status_code, 200)
        paper = response.json()["paper"]
        self.assertEqual(len(paper["student_version"]["questions"]), 3)
        self.assertEqual(sum(x["points"] for x in paper["teacher_version"]["answer_key"]), 20)
        self.assertFalse(paper["assessment_blueprint"]["official_competency_alignment_verified"])
        secondary_key = next(k for k, values in groups.items() if "ثانوي" in k[0] and len(values) >= 3)
        blocked = self.client.post("/api/v1/learning/exam-builder", json={"grade": secondary_key[0], "subject": secondary_key[1], "term": secondary_key[2], "question_count": 3, "language": secondary_key[3], "pathway_id": "experimental_sciences"})
        self.assertEqual(blocked.status_code, 409)
        language_block = self.client.post("/api/v1/learning/exam-builder", json={"grade": "الثانية ابتدائي", "subject": "اللغة الإنجليزية", "term": 1, "question_count": 3, "language": "auto"})
        self.assertEqual(language_block.status_code, 422)

if __name__ == "__main__":
    unittest.main(verbosity=2)
