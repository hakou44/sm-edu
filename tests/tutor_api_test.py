"""Focused API test for learner-aware tutor request context and safe demo fallback."""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fastapi.testclient import TestClient
from backend.app.main import app, usage

class TutorApiTests(unittest.TestCase):
    def test_learner_context_accepted_without_exposing_keys(self):
        with patch.dict(os.environ, {}, clear=False):
            client = TestClient(app)
            response = client.post("/api/v1/ai/tutor", json={
                "task": "lesson", "message": "Explain fractions", "language": "en",
                "grade": "الثالثة ابتدائي", "subject": "Mathematics",
                "learner_name": "Learner A", "learning_context": "Mathematics: 62% (3 activities)"
            })
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "demo")
        self.assertIn("answer", payload)
        self.assertNotIn("learner_name", payload)
        self.assertNotIn("learning_context", payload)

    def test_context_fields_are_bounded_by_schema(self):
        client = TestClient(app)
        response = client.post("/api/v1/ai/tutor", json={
            "task": "lesson", "message": "Explain fractions", "learner_name": "x" * 51
        })
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main(verbosity=2)
