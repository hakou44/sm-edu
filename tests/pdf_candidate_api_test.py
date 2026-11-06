"""Integration test for private PDF import and question-candidate review."""
import os
import sys
import tempfile
from pathlib import Path

os.environ["ALLOW_OPEN_REVIEW_API"] = "1"
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import fitz
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient
from app import main


def run():
    with tempfile.TemporaryDirectory() as temp:
        imports = Path(temp) / "imports"
        main.PDF_REVIEW_ROOT = imports
        main.PDF_REVIEW_FILES = imports / "pending-rights"
        main.PDF_REVIEW_TEXTS = imports / "extracted-text"
        main.PDF_REVIEW_META = imports / "review" / "documents.json"
        main.PDF_CANDIDATES_META = imports / "review" / "question-candidates.json"

        pdf = fitz.open()
        page = pdf.new_page()
        page.insert_text((72, 72), "1. Calculate 2 + 2.\n\n2. Explain why the sky is blue?\n\nSolution:\n2 + 2 = 4")
        raw = pdf.tobytes()
        pdf.close()

        client = TestClient(main.app)
        invalid = client.post("/api/v1/archive/pdf-review/upload?filename=bad.pdf", content=b"not-pdf")
        assert invalid.status_code == 415

        uploaded = client.post("/api/v1/archive/pdf-review/upload?filename=sample.pdf", content=raw)
        assert uploaded.status_code == 200, uploaded.text
        document_id = uploaded.json()["document"]["id"]

        detected = client.post(f"/api/v1/archive/pdf-review/{document_id}/extract-candidates")
        assert detected.status_code == 200, detected.text
        assert detected.json()["created"] >= 2
        first = detected.json()["candidates"][0]
        assert first["auto_published"] is False

        payload = {
            "candidate_text": "1. Calculate 2 + 2.", "suggested_answer": "4",
            "grade": "الأولى متوسط", "subject": "الرياضيات", "term": 1,
            "topic": "الجمع", "exam_year": 2025, "exam_type": "BEM", "status": "approved_for_manual_entry", "reviewer_notes": "checked"
        }
        blocked = client.put(f"/api/v1/archive/pdf-question-candidates/{first['id']}", json=payload)
        assert blocked.status_code == 409

        document = client.get("/api/v1/archive/pdf-review").json()["documents"][0]
        rights = client.put(f"/api/v1/archive/pdf-review/{document_id}", json={
            "extracted_text": document["extracted_text"], "review_notes": "permission checked",
            "status": "rights_cleared"
        })
        assert rights.status_code == 200, rights.text

        approved = client.put(f"/api/v1/archive/pdf-question-candidates/{first['id']}", json=payload)
        assert approved.status_code == 200, approved.text
        assert approved.json()["candidate"]["auto_published"] is False
        assert client.get("/api/v1/archive/pdf-question-candidates").json()["publication_count"] == 0
        library = client.get("/api/v1/archive/exam-library?exam_type=BEM&year=2025&subject=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D9%8A%D8%A7%D8%AA")
        assert library.status_code == 200, library.text
        assert library.json()["total_matches"] == 1, library.json()
        assert library.json()["records"][0]["exercise_bank_inserted"] is False
        assert library.json()["original_pdf_distribution"] is False
        hidden = client.get("/api/v1/archive/exam-library?exam_type=BAC")
        assert hidden.json()["total_matches"] == 0

        # Build a raster-only page and verify real local OCR when Tesseract is installed.
        image = Image.new("RGB", (1400, 360), "white")
        draw = ImageDraw.Draw(image)
        draw.text((60, 90), "OCR TEST 12345", fill="black")
        import io
        image_buffer = io.BytesIO()
        image.save(image_buffer, format="PNG")
        scanned = fitz.open()
        scanned_page = scanned.new_page(width=560, height=144)
        scanned_page.insert_image(scanned_page.rect, stream=image_buffer.getvalue())
        scanned_raw = scanned.tobytes()
        scanned.close()
        scanned_upload = client.post("/api/v1/archive/pdf-review/upload?filename=scanned.pdf", content=scanned_raw)
        assert scanned_upload.status_code == 200, scanned_upload.text
        scanned_id = scanned_upload.json()["document"]["id"]
        ocr = client.post(f"/api/v1/archive/pdf-review/{scanned_id}/ocr?languages=eng")
        assert ocr.status_code == 200, ocr.text
        assert ocr.json()["auto_published"] is False
        assert "OCR" in ocr.json()["document"]["extracted_text"].upper()
        assert client.get("/api/v1/archive/pdf-review").status_code == 200

        assert client.get("/health").json()["version"] == "2.1.6"
        assert client.get("/api/v1/catalog").json()["version"] == "2.1.6"

        for route in (
            "/health", "/api/v1/catalog", "/api/v1/learning/structure", "/api/v1/learning/coverage",
            "/api/v1/curriculum/secondary-pathways", "/api/v1/learning/term-exams",
            "/api/v1/learning/integrative-assessments", "/api/v1/archive/pdf-review",
            "/api/v1/archive/pdf-question-candidates", "/api/v1/archive/exam-library"
        ):
            response = client.get(route)
            assert response.status_code == 200, (route, response.status_code, response.text[:200])

        # Legacy external archive indexes were intentionally removed in v2.0.0.
        for route in ("/api/v1/archive/exams", "/api/v1/archive/school-assessments", "/api/v1/archive/pdf-acquisition"):
            assert client.get(route).status_code == 503, route

    print("PASS: PDF upload, text extraction, candidate and solution segmentation, manual tagging, rights gate, non-publication, and real image-only PDF OCR, 13 GET API routes and searchable exam-library filters")


if __name__ == "__main__":
    run()
