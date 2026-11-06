import os
import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import date
from typing import Literal

import httpx
from dotenv import load_dotenv
import hmac
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from . import parent_auth

load_dotenv()
app = FastAPI(title="SM éducation API", version="2.1.6")
parent_auth.init_db()
allowed_origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080,https://localhost,capacitor://localhost").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=False, allow_methods=["GET", "POST", "PUT"], allow_headers=["Content-Type", "Authorization", "X-Admin-Token"])
usage = defaultdict(int)


def require_admin(request: Request):
    """Protect the PDF review / OCR / evidence / draft-generation routes.

    Set ADMIN_TOKEN on the server and send it as the X-Admin-Token header. Without ADMIN_TOKEN the
    routes are closed (403) unless ALLOW_OPEN_REVIEW_API=1 is set for local development.
    """
    token = os.getenv("ADMIN_TOKEN", "").strip()
    if not token:
        if os.getenv("ALLOW_OPEN_REVIEW_API", "").strip() == "1":
            return
        raise HTTPException(status_code=403, detail="Review API is disabled: set ADMIN_TOKEN on the server.")
    sent = request.headers.get("x-admin-token", "")
    if not hmac.compare_digest(sent.encode("utf-8"), token.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid admin token.")

CATALOG = {
    "academic_year": "2026-2027",
    "primary": {"grades": ["الأولى ابتدائي", "الثانية ابتدائي", "الثالثة ابتدائي", "الرابعة ابتدائي", "الخامسة ابتدائي"], "foreign_languages": {"english_from": "الثالثة ابتدائي", "french_from": "الرابعة ابتدائي"}},
    "middle": {"grades": ["الأولى متوسط", "الثانية متوسط", "الثالثة متوسط", "الرابعة متوسط"]},
    "secondary": {"grades": ["الأولى ثانوي", "الثانية ثانوي", "الثالثة ثانوي"]},
}


LEARNING_STRUCTURE = {
    "academic_year": "2026-2027",
    "country": "Algeria",
    "terms": 3,
    "content_status": "platform_topic_lesson_competency_map_pending_official_annual_progression_verification",
    "mapping_status": "provisional_platform_mapping_not_official_ministry_progression",
    "mapped_grade_subject_pairs": 105,
    "official_lesson_sequence_verified_pairs": 0,
    "record_fields": ["grade_id", "subject_id", "term", "unit", "lesson", "competency", "activity", "assessment", "source_url", "source_page", "verified_at", "verification_status"],
    "mapping_note": "Exercise-derived topics, lesson labels and competency targets are provisional platform navigation metadata; confirm exact lesson sequence against current 2026-2027 Ministry annual progressions before labelling official.",
    "verified_rules": {"primary_english_from": "الثالثة ابتدائي", "primary_french_from": "الرابعة ابتدائي"},
    "secondary_pathway_catalog": {"first_year_common_trunks": 2, "second_third_year_streams": 7, "candidate_subject_matrices": 16, "subject_matrices_verified": 0, "exercise_stream_assignments_verified": 0, "status": "provisional_candidate_subject_lists_not_verified"},
    "official_sources": ["https://www.education.gov.dz/", "https://www.onps.dz/"]
}

class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=4000)
    language: Literal["ar", "fr", "en"] = "ar"
    grade: str = Field(default="", max_length=80)
    subject: str = Field(default="عام", max_length=100)


class TutorRequest(BaseModel):
    task: Literal["lesson", "practice", "evaluate"] = "lesson"
    message: str = Field(min_length=2, max_length=3000)
    student_answer: str = Field(default="", max_length=3000)
    language: Literal["ar", "fr", "en"] = "ar"
    grade: str = Field(default="", max_length=80)
    subject: str = Field(default="عام", max_length=100)
    learner_name: str = Field(default="", max_length=50)
    learning_context: str = Field(default="", max_length=1200)


class ClaudeContentRequest(BaseModel):
    task: Literal["integrative", "exercise"] = "integrative"
    grade: str = Field(min_length=3, max_length=80)
    subject: str = Field(min_length=2, max_length=100)
    topic: str = Field(min_length=2, max_length=500)
    term: int = Field(default=1, ge=1, le=3)
    language: Literal["ar", "fr", "en"] = "ar"


class ParentRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)

class ParentLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class ParentPasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

class ParentSyncCreateRequest(BaseModel):
    code_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    encrypted_payload: str = Field(min_length=32, max_length=8_000_000)

class ParentSyncRedeemRequest(BaseModel):
    code_hash: str = Field(pattern=r"^[a-f0-9]{64}$")

def _parent_token(request: Request):
    value = request.headers.get("authorization", "")
    scheme, _, token = value.partition(" ")
    return token.strip() if scheme.lower() == "bearer" else None

def _require_parent(request: Request):
    parent = parent_auth.get_parent(_parent_token(request))
    if not parent:
        raise HTTPException(status_code=401, detail="Parent sign-in required.")
    return parent

@app.post("/api/v1/parents/register")
async def parent_register(payload: ParentRegisterRequest):
    try:
        parent, token = parent_auth.create_parent(payload.name, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"parent": parent, "access_token": token, "token_type": "bearer", "expires_in_days": parent_auth.TOKEN_DAYS}

@app.post("/api/v1/parents/login")
async def parent_login(payload: ParentLoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    retry_after = parent_auth.login_throttle_status(payload.email, client_ip)
    if retry_after:
        raise HTTPException(
            status_code=429,
            detail="Too many sign-in attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    result = parent_auth.login_parent(payload.email, payload.password)
    if not result:
        parent_auth.record_login_failure(payload.email, client_ip)
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    parent_auth.clear_login_failures(payload.email, client_ip)
    parent, token = result
    return {"parent": parent, "access_token": token, "token_type": "bearer", "expires_in_days": parent_auth.TOKEN_DAYS}

@app.get("/api/v1/parents/me")
async def parent_me(request: Request):
    return {"parent": _require_parent(request)}

@app.post("/api/v1/parents/logout")
async def parent_logout(request: Request):
    _require_parent(request)
    parent_auth.revoke_token(_parent_token(request))
    return {"status": "signed_out"}

@app.put("/api/v1/parents/password")
async def parent_change_password(payload: ParentPasswordRequest, request: Request):
    parent = _require_parent(request)
    try:
        parent_auth.change_password(parent["id"], payload.current_password, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "password_changed", "message": "Please sign in again with the new password."}

@app.post("/api/v1/parents/sync/create")
async def parent_sync_create(payload: ParentSyncCreateRequest, request: Request):
    parent = _require_parent(request)
    try:
        result = parent_auth.create_sync_package(parent["id"], payload.code_hash, payload.encrypted_payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "created", **result}

@app.post("/api/v1/parents/sync/redeem")
async def parent_sync_redeem(payload: ParentSyncRedeemRequest, request: Request):
    parent = _require_parent(request)
    result = parent_auth.redeem_sync_package(parent["id"], payload.code_hash)
    if not result:
        raise HTTPException(status_code=404, detail="Transfer code is invalid, expired, already used, or belongs to another parent account.")
    return {"status": "redeemed", **result}

@app.get("/health")
async def health():
    return {"status": "ok", "app": "SM éducation", "version": "2.1.6"}

@app.get("/api/v1/catalog")
async def catalog():
    return {"version": "2.1.6", "curriculum": "Algeria", "academic_year": "2026-2027", "levels": CATALOG}

@app.get("/api/v1/learning/structure")
async def learning_structure():
    """Return the curriculum content schema and verified sequencing metadata.

    This endpoint intentionally does not claim that lesson lists are official.
    """
    return LEARNING_STRUCTURE



def _curriculum_governance_data():
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "curriculum-governance-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Curriculum governance registry unavailable.") from exc

@app.get("/api/v1/curriculum/governance")
async def curriculum_governance():
    """Return source-attributed policy facts and the 2026-2027 verification queue."""
    return _curriculum_governance_data()

@app.get("/api/v1/curriculum/coverage-audit")
async def curriculum_coverage_audit():
    """Separate platform exercise coverage from official curriculum verification."""
    data = _curriculum_governance_data()
    coverage_path = Path(__file__).resolve().parents[2] / "web" / "data" / "coverage-report-2026-2027.json"
    try:
        coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Platform coverage report unavailable.") from exc
    return {"academic_year": data["academic_year"], "platform_coverage": coverage["totals"], "official_verification": data["totals"], "stage_summary": coverage["stages"], "policy": "Exercise counts indicate platform practice coverage only; they are not proof of official lesson or competency alignment."}

@app.get("/api/v1/curriculum/official-sources")
async def curriculum_official_sources():
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "official-source-register-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Official source register unavailable.") from exc

@app.get("/api/v1/curriculum/verification-template")
async def curriculum_verification_template():
    path = Path(__file__).resolve().parents[2] / "web" / "data" / "curriculum-verification-template-2026-2027.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Curriculum verification template unavailable.")
    return FileResponse(path, media_type="text/csv; charset=utf-8", filename="curriculum-verification-template-2026-2027.csv")



@app.get("/api/v1/curriculum/evidence-policy")
async def curriculum_evidence_policy():
    """Return requirements for local teacher review of official progression evidence."""
    return {
        "academic_year": "2026-2027",
        "accepted_source_host": "education.gov.dz",
        "required_for_reviewer_marked_verified": ["official_document_title", "official_document_url", "page_number", "unit", "lesson", "competency", "source_publication_date", "reviewer_role", "reviewer_name", "verified_at"],
        "required_url_scheme": "https",
        "page_number_minimum": 1,
        "verification_is_local_only": True,
        "automatic_curriculum_publication": False,
        "notice": "Imported evidence is a local review record. It does not update the official curriculum registry or certify a Ministry alignment claim."
    }

@app.get("/api/v1/learning/coverage")
async def learning_coverage():
    """Return a transparent index-to-exercise coverage report, not official curriculum validation."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "coverage-report-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Learning coverage report unavailable.") from exc

@app.get("/api/v1/curriculum/secondary-pathways")
async def secondary_pathways():
    """Return provisional pathway subject candidates without claiming official validation."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "secondary-pathways-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Secondary pathway catalogue unavailable.") from exc

@app.get("/api/v1/learning/term-exams")
async def learning_term_exams():
    """Return ready-to-use platform term papers and worked answer keys."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "term-exams-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Term exam library unavailable.") from exc

@app.get("/api/v1/learning/integrative-assessments")
async def learning_integrative_assessments():
    """Return platform-authored integrative practice situations and self-review solutions."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "integrative-assessments-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Integrative assessment library unavailable.") from exc

@app.get("/api/v1/archive/external-library")
async def external_exam_library():
    """Return external exam resource index; third-party PDFs are not mirrored."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "external-exam-library.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="External exam library unavailable.") from exc


@app.get("/api/v1/archive/exams")
async def exam_archive_index():
    """Return external archive links; no third-party exam files are republished here."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "exam-archive-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Exam archive index unavailable.") from exc

@app.get("/api/v1/archive/school-assessments")
async def school_assessments_archive():
    """Return the 2017-2026 source-discovery index for school tests and homework."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "school-assessments-archive-2017-2026.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="School assessments archive unavailable.") from exc

@app.get("/api/v1/archive/pdf-acquisition")
async def pdf_acquisition_manifest():
    """Return verified direct PDF endpoints and their actual import status."""
    data_path = Path(__file__).resolve().parents[2] / "web" / "data" / "pdf-acquisition-2026-2027.json"
    try:
        return json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="PDF acquisition manifest unavailable.") from exc


# Local PDF review workspace. Uploaded files remain private and are never published to the exercise bank.
PDF_REVIEW_ROOT = Path(__file__).resolve().parents[2] / "imports"
PDF_REVIEW_FILES = PDF_REVIEW_ROOT / "pending-rights"
PDF_REVIEW_TEXTS = PDF_REVIEW_ROOT / "extracted-text"
PDF_REVIEW_META = PDF_REVIEW_ROOT / "review" / "documents.json"
MAX_REVIEW_PDF_BYTES = 50 * 1024 * 1024


def _load_pdf_review_rows():
    try:
        rows = json.loads(PDF_REVIEW_META.read_text(encoding="utf-8"))
        return rows if isinstance(rows, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save_pdf_review_rows(rows):
    PDF_REVIEW_META.parent.mkdir(parents=True, exist_ok=True)
    PDF_REVIEW_META.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class PDFReviewUpdate(BaseModel):
    extracted_text: str = Field(max_length=2_000_000)
    review_notes: str = Field(default="", max_length=5000)
    status: Literal["pending_review", "reviewed_not_approved", "rights_cleared"] = "pending_review"


@app.get("/api/v1/archive/pdf-review", dependencies=[Depends(require_admin)])
async def list_pdf_review_documents():
    """List locally imported PDFs and their review status; no public content is created."""
    return {"documents": _load_pdf_review_rows(), "max_upload_bytes": MAX_REVIEW_PDF_BYTES}


@app.post("/api/v1/archive/pdf-review/upload", dependencies=[Depends(require_admin)])
async def upload_pdf_for_review(request: Request, filename: str = "document.pdf"):
    """Accept one raw application/pdf body and extract text into a private review queue."""
    raw = await request.body()
    if not raw or len(raw) > MAX_REVIEW_PDF_BYTES:
        raise HTTPException(status_code=413 if len(raw) > MAX_REVIEW_PDF_BYTES else 400,
                            detail="PDF is empty or exceeds the 50 MB limit.")
    if not raw.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF signature.")
    import hashlib, re, uuid
    document_id = uuid.uuid4().hex[:16]
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(filename).name)[:120] or "document.pdf"
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"
    PDF_REVIEW_FILES.mkdir(parents=True, exist_ok=True)
    PDF_REVIEW_TEXTS.mkdir(parents=True, exist_ok=True)
    pdf_path = PDF_REVIEW_FILES / f"{document_id}_{safe_name}"
    text_path = PDF_REVIEW_TEXTS / f"{document_id}.txt"
    pdf_path.write_bytes(raw)
    extracted = ""
    page_count = 0
    extraction_status = "ocr_required_or_pymupdf_missing"
    try:
        import fitz
        with fitz.open(stream=raw, filetype="pdf") as doc:
            page_count = len(doc)
            extracted = "\n\n".join(f"--- PAGE {i+1} ---\n{page.get_text('text').strip()}" for i, page in enumerate(doc)).strip()
        extraction_status = "text_extracted" if extracted else "image_pdf_ocr_required"
    except ImportError:
        extraction_status = "pymupdf_not_installed"
    except Exception as exc:
        pdf_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {str(exc)[:180]}") from exc
    text_path.write_text(extracted, encoding="utf-8")
    row = {"id": document_id, "filename": safe_name, "local_file": str(pdf_path.relative_to(PDF_REVIEW_ROOT.parent)),
           "text_file": str(text_path.relative_to(PDF_REVIEW_ROOT.parent)), "sha256": hashlib.sha256(raw).hexdigest(),
           "size_bytes": len(raw), "page_count": page_count, "extraction_status": extraction_status,
           "status": "pending_review", "review_notes": "", "extracted_text": extracted,
           "uploaded_at": date.today().isoformat(), "reuse_permission": "unknown_pending_rights_review"}
    rows = _load_pdf_review_rows()
    duplicate = next((item for item in rows if item.get("sha256") == row["sha256"]), None)
    if duplicate:
        pdf_path.unlink(missing_ok=True)
        text_path.unlink(missing_ok=True)
        return {"duplicate": True, "document": duplicate}
    rows.insert(0, row)
    _save_pdf_review_rows(rows)
    return {"duplicate": False, "document": row}


@app.post("/api/v1/archive/pdf-review/{document_id}/ocr", dependencies=[Depends(require_admin)])
async def run_pdf_ocr(document_id: str, languages: str = "ara+fra+eng", pages: str = ""):
    """Run optional local Tesseract OCR on scanned/empty PDF pages; results remain in private review."""
    allowed_language_sets = {"ara", "eng", "fra", "ara+eng", "ara+fra", "eng+fra", "ara+fra+eng"}
    if languages not in allowed_language_sets:
        raise HTTPException(status_code=400, detail="Supported OCR language sets: ara, fra, eng, or combinations of these.")
    rows = _load_pdf_review_rows()
    row = next((item for item in rows if item.get("id") == document_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="PDF review document not found.")
    path = (PDF_REVIEW_ROOT.parent / row.get("local_file", "")).resolve()
    if not path.is_file() or PDF_REVIEW_FILES.resolve() not in path.parents:
        raise HTTPException(status_code=404, detail="Stored PDF file is unavailable.")
    try:
        import fitz
        import pytesseract
        from PIL import Image
        from pytesseract import TesseractNotFoundError
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="OCR dependencies missing. Install pymupdf, pytesseract and Pillow.") from exc
    try:
        available = set(pytesseract.get_languages(config=""))
    except TesseractNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Tesseract OCR engine is not installed on the server.") from exc
    requested = languages.split("+")
    missing = [code for code in requested if code not in available]
    if missing:
        raise HTTPException(status_code=503, detail=f"Tesseract language data missing: {', '.join(missing)}")
    selected = None
    if pages.strip():
        try:
            selected = {int(value.strip()) for value in pages.split(",") if value.strip()}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="pages must be comma-separated 1-based page numbers.") from exc
        if not selected or min(selected) < 1:
            raise HTTPException(status_code=400, detail="Page numbers must be positive and 1-based.")
    try:
        with fitz.open(path) as doc:
            if selected and max(selected) > len(doc):
                raise HTTPException(status_code=400, detail="Requested page is outside the PDF page range.")
            page_texts = []
            ocr_processed_count = 0
            for index, page in enumerate(doc):
                existing_text = page.get_text("text").strip()
                current = existing_text
                should_ocr = (not existing_text) and (selected is None or (index + 1) in selected)
                if should_ocr:
                    pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
                    mode = "RGB" if pix.n >= 3 else "L"
                    image = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
                    current = pytesseract.image_to_string(image, lang=languages, config="--psm 6").strip()
                    ocr_processed_count += 1
                page_texts.append(f"--- PAGE {index + 1} ---\n{current}")
        extracted = "\n\n".join(page_texts).strip()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"OCR processing failed: {str(exc)[:180]}") from exc
    row["extracted_text"] = extracted
    row["ocr_languages"] = languages
    row["ocr_status"] = "ocr_completed" if ocr_processed_count and any(item.split("--- PAGE ", 1)[-1].split("---\n", 1)[-1].strip() for item in page_texts) else "ocr_completed_no_text"
    row["ocr_pages_processed"] = ocr_processed_count
    row["extraction_status"] = "text_and_ocr_processed" if extracted else "ocr_completed_no_text"
    row["ocr_processed_at"] = date.today().isoformat()
    text_path = PDF_REVIEW_TEXTS / f"{document_id}.txt"
    text_path.parent.mkdir(parents=True, exist_ok=True)
    text_path.write_text(extracted, encoding="utf-8")
    _save_pdf_review_rows(rows)
    return {"document": row, "languages": languages, "pages_processed": len(page_texts),
            "ocr_pages_processed": ocr_processed_count,
            "ocr_pages_selected": sorted(selected) if selected else "all_image_only_pages",
            "text_characters": len(extracted), "auto_published": False}


@app.get("/api/v1/archive/pdf-review/{document_id}/file", dependencies=[Depends(require_admin)])
async def get_pdf_review_file(document_id: str):
    for row in _load_pdf_review_rows():
        if row.get("id") == document_id:
            path = (PDF_REVIEW_ROOT.parent / row.get("local_file", "")).resolve()
            if path.is_file() and PDF_REVIEW_FILES.resolve() in path.parents:
                return FileResponse(path, media_type="application/pdf")
    raise HTTPException(status_code=404, detail="PDF review document not found.")


@app.put("/api/v1/archive/pdf-review/{document_id}", dependencies=[Depends(require_admin)])
async def update_pdf_review_document(document_id: str, payload: PDFReviewUpdate):
    rows = _load_pdf_review_rows()
    for row in rows:
        if row.get("id") == document_id:
            row["extracted_text"] = payload.extracted_text
            row["review_notes"] = payload.review_notes
            row["status"] = payload.status
            row["reuse_permission"] = "cleared" if payload.status == "rights_cleared" else "unknown_pending_rights_review"
            text_path = PDF_REVIEW_TEXTS / f"{document_id}.txt"
            text_path.parent.mkdir(parents=True, exist_ok=True)
            text_path.write_text(payload.extracted_text, encoding="utf-8")
            _save_pdf_review_rows(rows)
            return {"saved": True, "document": row}
    raise HTTPException(status_code=404, detail="PDF review document not found.")


# PDF layout analysis: heuristic extraction of math-like text, tables, images and vector drawings.
PDF_LAYOUT_META = PDF_REVIEW_ROOT / "review" / "layout-analysis.json"


def _load_pdf_layout_rows():
    try:
        rows = json.loads(PDF_LAYOUT_META.read_text(encoding="utf-8"))
        return rows if isinstance(rows, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save_pdf_layout_rows(rows):
    PDF_LAYOUT_META.parent.mkdir(parents=True, exist_ok=True)
    PDF_LAYOUT_META.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _analyze_pdf_page_layout(page, page_number):
    """Return review hints only; this does not reconstruct equations or interpret diagrams."""
    text_dict = page.get_text("dict")
    text_blocks, math_regions, image_blocks = [], [], 0
    math_pattern = re.compile(r"[=±×÷√∑∫∞≤≥≠≈∝∠π]|\\b(?:sin|cos|tan|log|ln|lim)\\b|[A-Za-z]\s*\^\s*\{?[-+]?\d", re.I)
    for block in text_dict.get("blocks", []):
        if block.get("type") == 1:
            image_blocks += 1
            continue
        lines = block.get("lines", [])
        block_text = " ".join(span.get("text", "") for line in lines for span in line.get("spans", [])).strip()
        if not block_text:
            continue
        text_blocks.append(block_text)
        if math_pattern.search(block_text):
            math_regions.append({"text": block_text[:1200], "bbox": [round(float(v), 1) for v in block.get("bbox", [])[:4]]})
    table_count, table_cells = 0, 0
    if hasattr(page, "find_tables"):
        try:
            found = page.find_tables()
            for table in found.tables[:20]:
                table_count += 1
                table_cells += len(table.extract()) * max((len(row) for row in table.extract()), default=0)
        except Exception:
            pass
    try:
        drawings = len(page.get_drawings())
    except Exception:
        drawings = 0
    return {
        "page": page_number,
        "text_block_count": len(text_blocks),
        "math_region_count": len(math_regions),
        "math_regions": math_regions[:30],
        "table_count": table_count,
        "estimated_table_cells": table_cells,
        "embedded_image_count": image_blocks,
        "vector_drawing_count": drawings,
        "visual_review_recommended": bool(image_blocks or drawings > 8 or table_count),
        "limitations": ["math_detection_is_heuristic", "equations_may_lose_layout_or_symbols", "tables_and_figures_require_visual_human_review"]
    }


@app.post("/api/v1/archive/pdf-review/{document_id}/analyze-layout", dependencies=[Depends(require_admin)])
async def analyze_pdf_layout(document_id: str, pages: str = ""):
    """Analyze PDF page structure and create review hints; never publishes extracted content."""
    rows = _load_pdf_review_rows()
    document = next((item for item in rows if item.get("id") == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="PDF review document not found.")
    path = (PDF_REVIEW_ROOT.parent / document.get("local_file", "")).resolve()
    if not path.is_file() or PDF_REVIEW_FILES.resolve() not in path.parents:
        raise HTTPException(status_code=404, detail="Stored PDF file is unavailable.")
    selected = None
    if pages.strip():
        try:
            selected = sorted({int(value.strip()) for value in pages.split(",") if value.strip()})
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="pages must be comma-separated 1-based page numbers.") from exc
        if not selected or selected[0] < 1:
            raise HTTPException(status_code=400, detail="Page numbers must be positive and 1-based.")
    try:
        import fitz
        with fitz.open(path) as pdf:
            if len(pdf) > 500:
                raise HTTPException(status_code=413, detail="Layout analysis is limited to 500 pages per document.")
            if selected and selected[-1] > len(pdf):
                raise HTTPException(status_code=400, detail="Requested page is outside the PDF page range.")
            indexes = selected or list(range(1, len(pdf) + 1))
            page_results = [_analyze_pdf_page_layout(pdf[number - 1], number) for number in indexes]
    except HTTPException:
        raise
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Install PyMuPDF to analyze PDF page layout.") from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF layout analysis failed: {str(exc)[:180]}") from exc
    summary = {
        "pages_analyzed": len(page_results),
        "pages_with_math_hints": sum(1 for item in page_results if item["math_region_count"]),
        "pages_with_tables": sum(1 for item in page_results if item["table_count"]),
        "pages_with_visuals": sum(1 for item in page_results if item["visual_review_recommended"]),
        "math_region_count": sum(item["math_region_count"] for item in page_results),
        "table_count": sum(item["table_count"] for item in page_results),
        "image_count": sum(item["embedded_image_count"] for item in page_results),
        "vector_drawing_count": sum(item["vector_drawing_count"] for item in page_results)
    }
    analysis = {"document_id": document_id, "filename": document.get("filename", ""), "analyzed_at": date.today().isoformat(),
                "method": "pymupdf_layout_heuristics", "summary": summary, "pages": page_results,
                "auto_published": False, "human_visual_review_required": True}
    layout_rows = [item for item in _load_pdf_layout_rows() if item.get("document_id") != document_id]
    layout_rows.append(analysis)
    _save_pdf_layout_rows(layout_rows)
    document["layout_analysis_status"] = "completed_review_hints_only"
    document["layout_analysis_summary"] = summary
    _save_pdf_review_rows(rows)
    return analysis


@app.get("/api/v1/archive/pdf-review/{document_id}/layout", dependencies=[Depends(require_admin)])
async def get_pdf_layout_analysis(document_id: str):
    result = next((item for item in _load_pdf_layout_rows() if item.get("document_id") == document_id), None)
    if not result:
        raise HTTPException(status_code=404, detail="Layout analysis has not been run for this document.")
    return result


# Candidate question workflow: heuristic segmentation only; never auto-publishes to the learning bank.
PDF_CANDIDATES_META = PDF_REVIEW_ROOT / "review" / "question-candidates.json"

def _load_pdf_candidates():
    try:
        rows = json.loads(PDF_CANDIDATES_META.read_text(encoding="utf-8"))
        return rows if isinstance(rows, list) else []
    except (OSError, json.JSONDecodeError):
        return []

def _save_pdf_candidates(rows):
    PDF_CANDIDATES_META.parent.mkdir(parents=True, exist_ok=True)
    PDF_CANDIDATES_META.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def _segment_question_candidates(document):
    """Conservative numbered-item splitter; solution blocks are attached to the preceding item."""
    lines = document.get("extracted_text", "").splitlines()
    candidates, current, current_page, in_solution = [], [], 1, False
    question_start = re.compile(r"^\s*(?:(?:question|exercice|تمرين|السؤال|سؤال)\s*)?(?:[0-9٠-٩۰-۹]{1,2})\s*[.)、:：-]\s*\S+", re.I)
    solution_heading = re.compile(r"^\s*(?:corrig[eé]|solution|r[eé]ponse[s]?|answer[s]?|الحل|التصحيح|الإجابة|الاجابة)\s*[:：-]?\s*(.*)$", re.I)
    def flush():
        nonlocal current
        body = "\n".join(current).strip()
        if len(body) >= 12:
            if in_solution and candidates:
                old = candidates[-1].get("suggested_answer", "")
                candidates[-1]["suggested_answer"] = (old + "\n" + body).strip()
            elif not in_solution:
                candidates.append({"candidate_text": body, "suggested_answer": "", "source_page": current_page})
        current = []
    for line in lines:
        marker = re.match(r"--- PAGE (\d+) ---", line.strip())
        if marker:
            flush(); current_page = int(marker.group(1)); in_solution = False; continue
        solution = solution_heading.match(line)
        if solution:
            flush(); in_solution = True
            if solution.group(1).strip(): current = [solution.group(1).strip()]
            continue
        if question_start.match(line):
            flush(); in_solution = False; current = [line.strip()]; continue
        if not line.strip():
            if current: current.append("")
            continue
        if current:
            current.append(line.rstrip())
        elif not in_solution and re.search(r"[؟?]\s*$", line.strip()) and len(line.strip()) >= 12:
            current = [line.strip()]
    flush()
    return candidates

class PDFQuestionCandidateUpdate(BaseModel):
    candidate_text: str = Field(min_length=5, max_length=12000)
    suggested_answer: str = Field(default="", max_length=12000)
    grade: str = Field(default="", max_length=80)
    subject: str = Field(default="", max_length=100)
    term: int | None = Field(default=None, ge=1, le=3)
    topic: str = Field(default="", max_length=160)
    exam_year: int | None = Field(default=None, ge=2000, le=2100)
    exam_type: Literal["BEM", "BAC", "term_test", "homework", "practice", "other"] = "other"
    status: Literal["pending_review", "approved_for_manual_entry", "rejected"] = "pending_review"
    reviewer_notes: str = Field(default="", max_length=3000)

@app.get("/api/v1/archive/pdf-question-candidates", dependencies=[Depends(require_admin)])
async def list_pdf_question_candidates(document_id: str = ""):
    rows = _load_pdf_candidates()
    if document_id:
        rows = [x for x in rows if x.get("document_id") == document_id]
    return {"candidates": rows, "publication_count": 0, "workflow": "manual_review_only"}

@app.post("/api/v1/archive/pdf-review/{document_id}/extract-candidates", dependencies=[Depends(require_admin)])
async def extract_pdf_question_candidates(document_id: str):
    document = next((x for x in _load_pdf_review_rows() if x.get("id") == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="PDF review document not found.")
    pieces = _segment_question_candidates(document)
    if not pieces:
        raise HTTPException(status_code=422, detail="No clear numbered or question-marked items were detected. Review the extracted text or use OCR first.")
    import uuid
    rows = _load_pdf_candidates()
    existing = {(x.get("document_id"), x.get("candidate_text")) for x in rows}
    created = []
    for piece in pieces:
        if (document_id, piece["candidate_text"]) in existing:
            continue
        row = {"id": uuid.uuid4().hex[:16], "document_id": document_id, "source_filename": document.get("filename", ""),
               **piece, "grade": "", "subject": "", "term": None, "topic": "", "exam_year": None, "exam_type": "other", "status": "pending_review",
               "reviewer_notes": "", "reuse_permission": document.get("reuse_permission", "unknown_pending_rights_review"),
               "official_alignment": "not_verified", "auto_published": False}
        rows.append(row); created.append(row)
    _save_pdf_candidates(rows)
    return {"created": len(created), "candidates": created, "publication_count": 0, "method": "heuristic_text_segmentation_requires_human_review"}

@app.put("/api/v1/archive/pdf-question-candidates/{candidate_id}", dependencies=[Depends(require_admin)])
async def update_pdf_question_candidate(candidate_id: str, payload: PDFQuestionCandidateUpdate):
    rows = _load_pdf_candidates()
    for row in rows:
        if row.get("id") == candidate_id:
            document = next((x for x in _load_pdf_review_rows() if x.get("id") == row.get("document_id")), {})
            if payload.status == "approved_for_manual_entry" and (document.get("status") != "rights_cleared" or document.get("reuse_permission") != "cleared"):
                raise HTTPException(status_code=409, detail="Check and record reuse permission on the source document before approving this candidate for manual entry.")
            row.update(payload.model_dump())
            row["auto_published"] = False
            row["official_alignment"] = "not_verified"
            _save_pdf_candidates(rows)
            return {"saved": True, "candidate": row, "publication_count": 0}
    raise HTTPException(status_code=404, detail="Question candidate not found.")


@app.get("/api/v1/archive/exam-library")
async def searchable_exam_library(
    q: str = "", grade: str = "", subject: str = "", term: int | None = None,
    year: int | None = None, exam_type: str = "", limit: int = 100
):
    """Search only human-approved candidates whose source reuse permission is cleared.

    This is a private, local catalogue of reviewed text excerpts, not a public
    redistribution endpoint for the original PDFs and not the exercise bank.
    """
    candidates = _load_pdf_candidates()
    documents = {d.get("id"): d for d in _load_pdf_review_rows()}
    query = q.strip().casefold()
    rows = []
    for item in candidates:
        doc = documents.get(item.get("document_id"), {})
        if item.get("status") != "approved_for_manual_entry":
            continue
        if doc.get("status") != "rights_cleared" or doc.get("reuse_permission") != "cleared":
            continue
        if grade and item.get("grade") != grade: continue
        if subject and item.get("subject") != subject: continue
        if term is not None and item.get("term") != term: continue
        if year is not None and item.get("exam_year") != year: continue
        if exam_type and item.get("exam_type") != exam_type: continue
        searchable = " ".join(str(item.get(k, "")) for k in ("candidate_text", "suggested_answer", "topic", "subject", "grade", "source_filename")).casefold()
        if query and query not in searchable: continue
        rows.append({
            "id": item.get("id"), "question": item.get("candidate_text", ""),
            "suggested_answer": item.get("suggested_answer", ""), "grade": item.get("grade", ""),
            "subject": item.get("subject", ""), "term": item.get("term"),
            "topic": item.get("topic", ""), "exam_year": item.get("exam_year"),
            "exam_type": item.get("exam_type", "other"), "source_filename": item.get("source_filename", ""),
            "source_page": item.get("source_page"), "document_id": item.get("document_id"),
            "reuse_permission": "cleared", "official_alignment": "not_verified",
            "answer_verification": "human_review_recorded_not_independently_certified",
            "exercise_bank_inserted": False
        })
    rows.sort(key=lambda x: (x.get("exam_year") or 0, x.get("grade"), x.get("subject")), reverse=True)
    safe_limit = max(1, min(limit, 250))
    return {"records": rows[:safe_limit], "total_matches": len(rows), "limit": safe_limit,
            "catalogue_scope": "rights_cleared_human_approved_local_excerpts",
            "original_pdf_distribution": False, "exercise_bank_inserted": False}



# Curriculum progression evidence candidates: page-aware, local, never self-verifying.
CURRICULUM_CANDIDATES_META = PDF_REVIEW_ROOT / "review" / "curriculum-evidence-candidates.json"

def _load_curriculum_candidates():
    try:
        rows = json.loads(CURRICULUM_CANDIDATES_META.read_text(encoding="utf-8"))
        return rows if isinstance(rows, list) else []
    except (OSError, json.JSONDecodeError):
        return []

def _save_curriculum_candidates(rows):
    CURRICULUM_CANDIDATES_META.parent.mkdir(parents=True, exist_ok=True)
    CURRICULUM_CANDIDATES_META.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def _segment_curriculum_evidence(document):
    """Create cautious page-level text candidates; labels are suggestions, not curriculum facts."""
    rows, page, buffer = [], 1, []
    def flush():
        text = " ".join(x.strip() for x in buffer if x.strip()).strip()
        if len(text) < 18:
            return
        compact = re.sub(r"\s+", " ", text)
        if len(compact) > 900:
            compact = compact[:897].rstrip() + "..."
        lower = compact.casefold()
        labels = [
            ("competency", r"\b(compétence|competency|competence)\b|كفاء|كفاءة|الكفاءة"),
            ("lesson", r"\b(leçon|lesson|cours)\b|درس|التعلم|التعلّم"),
            ("unit", r"\b(unité|unit|sequence|séquence)\b|وحدة|مقطع|المقطع"),
        ]
        matches = [(match.start(), name) for name, pattern in labels for match in [re.search(pattern, lower, re.I)] if match]
        kind = min(matches)[1] if matches else "unclassified"
        rows.append({"source_page": page, "source_excerpt": compact, "suggested_field": kind})
    for line in document.get("extracted_text", "").splitlines():
        marker = re.match(r"\s*--- PAGE (\d+) ---\s*", line)
        if marker:
            flush(); buffer.clear(); page = int(marker.group(1)); continue
        if not line.strip():
            flush(); buffer.clear(); continue
        buffer.append(line)
    flush()
    return rows

@app.get("/api/v1/archive/pdf-review/{document_id}/curriculum-candidates", dependencies=[Depends(require_admin)])
async def list_curriculum_evidence_candidates(document_id: str):
    if not any(x.get("id") == document_id for x in _load_pdf_review_rows()):
        raise HTTPException(status_code=404, detail="PDF review document not found.")
    rows = [x for x in _load_curriculum_candidates() if x.get("document_id") == document_id]
    return {"candidates": rows, "count": len(rows), "verified_count": 0,
            "automatic_registry_update": False, "workflow": "page_anchored_human_review_only"}

@app.post("/api/v1/archive/pdf-review/{document_id}/extract-curriculum-candidates", dependencies=[Depends(require_admin)])
async def extract_curriculum_evidence_candidates(document_id: str):
    document = next((x for x in _load_pdf_review_rows() if x.get("id") == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="PDF review document not found.")
    pieces = _segment_curriculum_evidence(document)
    if not pieces:
        raise HTTPException(status_code=422, detail="No usable page text found. Extract text or run OCR first.")
    import uuid
    rows = _load_curriculum_candidates()
    existing = {(x.get("document_id"), x.get("source_page"), x.get("source_excerpt")) for x in rows}
    created = []
    for piece in pieces:
        key = (document_id, piece["source_page"], piece["source_excerpt"])
        if key in existing: continue
        item = {"id": uuid.uuid4().hex[:16], "document_id": document_id,
                "source_filename": document.get("filename", ""), **piece,
                "unit": "", "lesson": "", "competency": "", "grade": "", "subject": "", "term": None,
                "status": "pending_review", "reviewer_notes": "",
                "reuse_permission": document.get("reuse_permission", "unknown_pending_rights_review"),
                "official_alignment": "not_verified", "auto_verified": False, "auto_published": False}
        rows.append(item); created.append(item); existing.add(key)
    _save_curriculum_candidates(rows)
    return {"created": len(created), "candidates": created, "verified_count": 0,
            "automatic_registry_update": False, "method": "page_anchored_text_heuristics_requires_human_review"}

class CurriculumEvidenceCandidateUpdate(BaseModel):
    unit: str = Field(default="", max_length=300)
    lesson: str = Field(default="", max_length=300)
    competency: str = Field(default="", max_length=500)
    grade: str = Field(default="", max_length=80)
    subject: str = Field(default="", max_length=100)
    term: int | None = Field(default=None, ge=1, le=3)
    status: Literal["pending_review", "reviewed_candidate", "rejected"] = "pending_review"
    reviewer_notes: str = Field(default="", max_length=3000)

@app.put("/api/v1/archive/curriculum-evidence-candidates/{candidate_id}", dependencies=[Depends(require_admin)])
async def update_curriculum_evidence_candidate(candidate_id: str, payload: CurriculumEvidenceCandidateUpdate):
    rows = _load_curriculum_candidates()
    for item in rows:
        if item.get("id") == candidate_id:
            item.update(payload.model_dump())
            item["official_alignment"] = "not_verified"
            item["auto_verified"] = False
            item["auto_published"] = False
            _save_curriculum_candidates(rows)
            return {"saved": True, "candidate": item, "official_registry_updated": False}
    raise HTTPException(status_code=404, detail="Curriculum evidence candidate not found.")


class CurriculumExamRequest(BaseModel):
    grade: str = Field(min_length=3, max_length=80)
    subject: str = Field(min_length=2, max_length=100)
    term: int = Field(ge=1, le=3)
    question_count: int = Field(default=3, ge=3, le=6)
    language: Literal["ar", "fr", "en", "auto"] = "auto"
    pathway_id: str = Field(default="", max_length=80)


def _load_curriculum_exercise_bank():
    path = Path(__file__).resolve().parents[2] / "web" / "data" / "exercise-bank-2026-2027.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("records", [])
    except (OSError, json.JSONDecodeError):
        raise HTTPException(status_code=503, detail="Exercise bank unavailable.")


def _grade_number(grade):
    words = {"الأولى": 1, "الأول": 1, "الثانية": 2, "الثاني": 2, "الثالثة": 3, "الثالث": 3, "الرابعة": 4, "الرابع": 4, "الخامسة": 5, "الخامس": 5}
    for word, number in words.items():
        if word in grade: return number
    match = re.search(r"[1-5]", grade)
    return int(match.group()) if match else None


def _grade_stage(grade):
    if "ابتدائي" in grade: return "primary"
    if "متوسط" in grade: return "middle"
    if "ثانوي" in grade: return "secondary"
    return None


@app.post("/api/v1/learning/exam-builder")
async def build_curriculum_exam(payload: CurriculumExamRequest):
    """Build separate student/teacher practice papers from exact grade-subject-term matches.

    Existing platform questions are reused; the endpoint does not generate or claim official
    Ministry content. Current official policy constraints are enforced where documented.
    """
    stage = _grade_stage(payload.grade)
    if not stage:
        raise HTTPException(status_code=422, detail="Unknown Algerian school grade.")
    if stage == "primary":
        grade_no = _grade_number(payload.grade)
        if payload.subject in {"اللغة الإنجليزية", "English", "Anglais"} and grade_no < 3:
            raise HTTPException(status_code=422, detail="English starts in third year primary under the 2026-2027 Ministry arrangement.")
        if payload.subject in {"اللغة الفرنسية", "Français", "French"} and grade_no < 4:
            raise HTTPException(status_code=422, detail="French starts in fourth year primary under the 2026-2027 Ministry arrangement.")
    if stage == "secondary" and payload.pathway_id:
        raise HTTPException(status_code=409, detail="Stream-specific exercise mapping is not officially verified for 2026-2027. Generate a grade-level practice paper without a stream filter.")

    bank = _load_curriculum_exercise_bank()
    matches = [q for q in bank if q.get("grade") == payload.grade and q.get("subject") == payload.subject and q.get("term") == payload.term]
    resolved_language = payload.language
    if payload.language == "auto" and matches:
        resolved_language = matches[0].get("language", "ar")
    matches = [q for q in matches if q.get("language", "ar") == resolved_language]
    # Never silently substitute another grade, subject, term, or stream.
    if len(matches) < payload.question_count:
        raise HTTPException(status_code=422, detail={"message": "Not enough exact-match questions for this selection.", "available": len(matches), "requested": payload.question_count, "fallback": "No cross-grade, cross-term or cross-language substitution is allowed."})
    import random, uuid
    rng = random.SystemRandom()
    # Stratify by platform cognitive_process labels where possible. These are an
    # internal practice taxonomy, not Ministry-defined competencies.
    buckets = defaultdict(list)
    for item in matches:
        buckets[item.get("cognitive_process") or "unclassified"].append(item)
    for values in buckets.values():
        rng.shuffle(values)
    selected = []
    bucket_names = list(buckets.keys())
    rng.shuffle(bucket_names)
    while len(selected) < payload.question_count and bucket_names:
        remaining = []
        for name in bucket_names:
            if buckets[name] and len(selected) < payload.question_count:
                selected.append(buckets[name].pop())
            if buckets[name]:
                remaining.append(name)
        bucket_names = remaining
    base, remainder = divmod(20, payload.question_count)
    teacher_questions, student_questions = [], []
    for i, q in enumerate(selected):
        points = base + (1 if i < remainder else 0)
        common = {"number": i+1, "question_id": q.get("id"), "question": q.get("question"), "choices": q.get("choices", []), "question_type": q.get("question_type", "concept"), "topic": q.get("topic", ""), "lesson_label": q.get("lesson", ""), "difficulty": q.get("difficulty", ""), "cognitive_process": q.get("cognitive_process", ""), "cognitive_taxonomy_status": "platform_practice_tag_not_official_ministry_competency", "points": points}
        student_questions.append(common)
        teacher_questions.append({**common, "answer": q.get("solution"), "answer_index": q.get("answer_index"), "accepted_answers": q.get("accepted_answers", []), "explanation": q.get("explanation", ""), "solution_steps": q.get("solution_steps", [])})
    curriculum_status = "platform_mapping_pending_official_2026_2027_annual_progression"
    if stage == "primary" and payload.subject in {"اللغة الإنجليزية", "English", "Anglais"} and _grade_number(payload.grade) >= 3:
        policy_note = "Ministry policy confirms English from third year primary; exact lesson sequence is not verified."
    elif stage == "primary" and payload.subject in {"اللغة الفرنسية", "Français", "French"} and _grade_number(payload.grade) >= 4:
        policy_note = "Ministry policy confirms French from fourth year primary; exact lesson sequence is not verified."
    elif stage == "secondary":
        policy_note = "The Ministry confirms common trunks in year one and stream-based study from year two, with some subjects reorganized across secondary years for 2026-2027. This paper is grade-level only: no stream-specific lesson mapping, timetable or coefficient is assumed. Decision No. 36 (2026-09-09) rescinded Decision No. 20 on secondary timetables/coefficients. Exact lesson sequence remains unverified."
    else:
        policy_note = "Grade/subject/term are exact-matched to the platform bank. Exact lesson sequence and competency alignment remain unverified against the current official annual progression."
    paper_id = "practice-" + uuid.uuid4().hex[:12]
    cognitive_distribution = defaultdict(int)
    for item in selected:
        cognitive_distribution[item.get("cognitive_process") or "unclassified"] += 1
    common_meta = {"id": paper_id, "academic_year": "2026-2027", "grade": payload.grade, "stage": stage, "subject": payload.subject, "term": payload.term, "question_count": len(selected), "total_points": 20, "language": resolved_language, "content_status": "platform_authored_practice_not_official_ministry_exam", "curriculum_alignment_status": curriculum_status, "curriculum_policy_note": policy_note, "official_ministry_exam": False, "pathway_specific": False, "teacher_review_required": True, "assessment_blueprint": {"selection_method": "balanced_platform_cognitive_process_stratification", "cognitive_process_distribution": dict(cognitive_distribution), "taxonomy_status": "platform_practice_tags_not_official_ministry_competencies", "official_competency_alignment_verified": False}, "policy_sources": [{"id": "ministry-2026-2027-reform-update", "url": "https://www.education.gov.dz/2026/07/30/وزير-التربية-الوطنية-ينشّط-ندوة-صحفية-يقدّم-فيها-توضيحات-حول-الترتيبات-البيداغوجية-الجديدة-الخاصة-بالدخول-المدرسي-2026-2027/"}, {"id": "ministry-decision-36-2026-09-09", "url": "https://www.education.gov.dz/2026/09/10/قرار-رقم-36-مؤرخ-في-27-ربيع-الأول-عام-1448-الموافق-9-سبتمبر-سنة-2026-يتضمن-إلغاء-القرار-رقم-20-المؤرخ-في-13-صفر-عام-1448-الموافق-28-جويلية-سنة-2026-المتضمن-المواقيت-والمعاملات-لمرحلة-التعليم-الثانوي-العام-والتكنولوجي/"}]}
    return {"paper": {**common_meta, "student_version": {"title": f"Practice assessment — {payload.grade} — {payload.subject}", "instructions": "Answer all questions. Total: 20 points.", "questions": student_questions}, "teacher_version": {"title": f"Teacher copy — {payload.grade} — {payload.subject}", "marking_scheme": [{"question_number": x["number"], "points": x["points"]} for x in teacher_questions], "answer_key": teacher_questions}}, "curriculum_guardrails": {"exact_grade_subject_term_match": True, "cross_grade_substitution": False, "cross_term_substitution": False, "cross_language_substitution": False, "resolved_question_language": resolved_language, "unverified_stream_mapping_used": False, "official_sequence_verified": False, "policy_note": policy_note}}

# Structured exam-question understanding assistant. Groq is optional; fallback is explicitly heuristic.
PDF_ANALYSES_META = PDF_REVIEW_ROOT / "review" / "question-analyses.json"

class PDFQuestionAnalysisRequest(BaseModel):
    language: Literal["ar", "fr", "en"] = "ar"


def _load_pdf_question_analyses():
    try:
        rows = json.loads(PDF_ANALYSES_META.read_text(encoding="utf-8"))
        return rows if isinstance(rows, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save_pdf_question_analyses(rows):
    PDF_ANALYSES_META.parent.mkdir(parents=True, exist_ok=True)
    PDF_ANALYSES_META.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _heuristic_question_analysis(candidate, language):
    question = str(candidate.get("candidate_text", ""))
    subject = str(candidate.get("subject", ""))
    lines = [line.strip(" \t•-") for line in question.splitlines() if line.strip()]
    numeric = re.compile(r"(?:\d+(?:[.,]\d+)?\s*(?:cm|mm|m|km|kg|g|s|min|h|A|V|W|J|N|°C|%|mol|L|mL)?)|[=±×÷√π²³]")
    givens = [line for line in lines if numeric.search(line) and len(line) < 500][:12]
    request_words = {
        "ar": r"احسب|أوجد|عين|عيّن|استنتج|برهن|فسر|اشرح|حدد|قارن|ارسم|أنشئ|ما قيمة|ماذا تستنتج|بيّن|بين",
        "fr": r"calculer|déterminer|montrer|déduire|expliquer|justifier|comparer|tracer|construire|quelle est|que conclure",
        "en": r"calculate|determine|find|deduce|explain|justify|compare|draw|construct|what is|show that|prove"
    }
    wanted = [line for line in lines if re.search(request_words[language], line, re.I)][:10]
    math_hint = bool(re.search(r"math|رياض|mathématiques", subject, re.I) or re.search(r"[=±×÷√∑∫∞≤≥≠≈π²³]", question))
    physics_hint = bool(re.search(r"phys|فيزياء|science physique", subject, re.I) or re.search(r"\b(?:m/s|km/h|volt|amp[eè]re|newton|joule|watt)\b", question, re.I))
    science_hint = bool(re.search(r"natural|nature|علوم طبيعية|svt|biology|biologie", subject, re.I))
    if language == "ar":
        concepts = (["رياضيات: تحقق من الوحدات والرموز والعلاقات قبل التعويض."] if math_hint else []) + (["فيزياء: اكتب المعطيات مع وحداتها وحدد القانون المناسب قبل الحساب."] if physics_hint else []) + (["علوم طبيعية: ميّز بين الملاحظة والتفسير والاستنتاج واستند إلى الوثيقة."] if science_hint else [])
        if not concepts: concepts=["حدّد المفاهيم الأساسية من نص السؤال والدرس المرتبط به."]
        steps=["اقرأ نص السؤال كاملاً وحدد المطلوب بدقة.","استخرج المعطيات الصريحة، مع الحفاظ على الوحدات والرموز كما وردت.","حدد العلاقة أو القاعدة أو المفهوم المناسب، واذكر سبب اختياره.","أنجز الحل خطوة بخطوة ولا تقفز فوق التحويلات أو التبريرات.","تحقق من النتيجة والوحدات ومدى توافقها مع المطلوب."]
        caveat="تحليل أولي قائم على قواعد نصية؛ لم يتم اشتقاق نتيجة نهائية موثوقة. راجع نص السؤال والوثائق والرسوم يدوياً."
        title="فهم السؤال — تحليل أولي"
        givens_label,req_label,concept_label,steps_label,answer_label,checks_label="المعطيات المرصودة","المطلوب المحتمل","مفاهيم ينبغي مراجعتها","خطة الحل المقترحة","الإجابة / الحل","التحقق والمراجعة"
        answer="لم تُنشأ إجابة نهائية في الوضع المحلي. أكمل الحل يدوياً أو فعّل مفتاح Groq على الخادم للحصول على شرح مولّد يحتاج بدوره إلى مراجعة الأستاذ."
        checks=["هل نُقلت جميع المعطيات دون تغيير؟","هل الوحدات متجانسة؟","هل أجاب الحل عن كل أجزاء المطلوب؟","هل يمكن التحقق من النتيجة بطريقة مستقلة؟"]
    elif language == "fr":
        concepts=(["Mathématiques : vérifier les unités, les symboles et les relations avant le calcul."] if math_hint else [])+(["Physique : relever les données avec leurs unités et choisir la loi pertinente."] if physics_hint else [])+(["Sciences naturelles : distinguer observation, interprétation et conclusion."] if science_hint else [])
        if not concepts: concepts=["Identifier les notions essentielles liées à l'énoncé et au cours."]
        steps=["Lire tout l'énoncé et préciser chaque demande.","Relever les données explicites sans modifier unités ni symboles.","Choisir la relation ou la notion adaptée et justifier ce choix.","Rédiger les étapes sans omettre conversions ni justifications.","Vérifier le résultat, les unités et la cohérence avec la question."]
        caveat="Analyse heuristique initiale ; aucune réponse finale fiable n'est déduite automatiquement. Vérification humaine nécessaire."
        title="Comprendre l'énoncé — analyse initiale";givens_label,req_label,concept_label,steps_label,answer_label,checks_label="Données repérées","Demandes possibles","Notions à revoir","Plan de résolution","Réponse / solution","Vérifications"
        answer="Aucune solution finale n'est produite en mode local. Résoudre manuellement ou configurer Groq côté serveur ; toute réponse générée doit être vérifiée par l'enseignant."
        checks=["Toutes les données sont-elles fidèlement reprises ?","Les unités sont-elles cohérentes ?","Chaque partie de la consigne est-elle traitée ?","Le résultat peut-il être vérifié indépendamment ?"]
    else:
        concepts=(["Mathematics: check units, symbols and relationships before substitution."] if math_hint else [])+(["Physics: list quantities with units and select a relevant law."] if physics_hint else [])+(["Natural sciences: distinguish observation, interpretation and conclusion."] if science_hint else [])
        if not concepts: concepts=["Identify the key concepts from the question and its related lesson."]
        steps=["Read the complete question and identify each requested task.","Extract explicit givens without changing units or symbols.","Choose a suitable rule, relationship or concept and justify it.","Write the solution step by step, including conversions and reasoning.","Check the result, units and consistency with the requested task."]
        caveat="Initial rule-based analysis; no reliable final answer has been inferred. Inspect the source question, figures and documents manually."
        title="Understand the question — initial analysis";givens_label,req_label,concept_label,steps_label,answer_label,checks_label="Detected givens","Possible requirements","Concepts to review","Suggested solution plan","Answer / solution","Checks"
        answer="No final answer is generated in local mode. Solve manually or use the in-app Groq tutor for a generated explanation; teacher review is still required."
        checks=["Were all givens copied accurately?","Are units consistent?","Does the solution address every requested part?","Can the result be independently checked?"]
    givens = givens or ([lines[0][:400]] if lines else [])
    wanted = wanted or ([lines[-1][:400]] if len(lines)>1 else [])
    def bullets(values): return "\n".join("- "+v for v in values) if values else "- " + ("غير واضح من النص المستخرج" if language=="ar" else "Non identifiable from extracted text" if language=="fr" else "Not clear from extracted text")
    text = f"# {title}\n\n## {givens_label}\n{bullets(givens)}\n\n## {req_label}\n{bullets(wanted)}\n\n## {concept_label}\n{bullets(concepts)}\n\n## {steps_label}\n" + "\n".join(f"{i+1}. {step}" for i,step in enumerate(steps)) + f"\n\n## {answer_label}\n{answer}\n\n## {checks_label}\n{bullets(checks)}\n\n> {caveat}"
    return {"analysis_text": text, "mode": "heuristic", "givens": givens, "requirements": wanted, "concepts": concepts, "solution_steps": steps, "proposed_answer": answer, "limitations": [caveat]}


@app.post("/api/v1/archive/pdf-question-candidates/{candidate_id}/analyze", dependencies=[Depends(require_admin)])
async def analyze_pdf_question_candidate(candidate_id: str, payload: PDFQuestionAnalysisRequest, request: Request):
    candidates = _load_pdf_candidates()
    candidate = next((item for item in candidates if item.get("id") == candidate_id), None)
    if not candidate:
        raise HTTPException(status_code=404, detail="Question candidate not found.")
    client_ip = request.client.host if request.client else "unknown"
    quota_key = f"{date.today().isoformat()}:{client_ip}"
    limit = max(1, int(os.getenv("AI_DAILY_FREE_LIMIT", "8")))
    if usage[quota_key] >= limit:
        raise HTTPException(status_code=429, detail="Daily free AI limit reached.")
    usage[quota_key] += 1
    result = _heuristic_question_analysis(candidate, payload.language)
    import uuid
    analysis = {"id": uuid.uuid4().hex[:16], "candidate_id": candidate_id, "document_id": candidate.get("document_id"),
                "source_page": candidate.get("source_page"), "language": payload.language, "created_at": date.today().isoformat(),
                **result, "teacher_approved": False, "review_status": "draft_requires_teacher_review", "auto_published": False}
    rows = [item for item in _load_pdf_question_analyses() if not (item.get("candidate_id") == candidate_id and item.get("language") == payload.language)]
    rows.append(analysis); _save_pdf_question_analyses(rows)
    return {"analysis": analysis, "remaining": max(0, limit - usage[quota_key]), "publication_count": 0}


@app.get("/api/v1/archive/pdf-question-candidates/{candidate_id}/analysis", dependencies=[Depends(require_admin)])
async def get_pdf_question_candidate_analysis(candidate_id: str, language: Literal["ar", "fr", "en"] = "ar"):
    result = next((item for item in _load_pdf_question_analyses() if item.get("candidate_id") == candidate_id and item.get("language") == language), None)
    if not result:
        raise HTTPException(status_code=404, detail="No analysis has been generated for this candidate and language.")
    return result


@app.post("/api/v1/ai/claude-content", dependencies=[Depends(require_admin)])
async def claude_content_draft(payload: ClaudeContentRequest):
    """Create a teacher-review draft with Claude when a server-side Anthropic key is configured."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Claude غير مفعّل: أضف ANTHROPIC_API_KEY إلى بيئة الخادم فقط.")
    language = {"ar": "Arabic", "fr": "French", "en": "English"}[payload.language]
    if payload.task == "integrative":
        spec = ("Create one original age-appropriate integrative situation with a realistic context, clear student task, 3-5 questions, worked model answers, step-by-step reasoning and a 20-point suggested rubric.")
    else:
        spec = ("Create five original progressive practice questions with choices, one unambiguous correct answer, explanations and solution steps.")
    prompt = (f"You are an expert educational content designer. Create a supplemental practice draft for Algeria. "
              f"Grade: {payload.grade}. Subject: {payload.subject}. Term: {payload.term}. Topic: {payload.topic}. "
              f"Write in {language}. Respect age and subject level. Do not claim official Ministry approval or invent official curriculum sequence. "
              f"Return valid JSON only. Include content_status='claude_generated_practice_pending_teacher_review', curriculum_alignment_status='pending_official_annual_progression_verification', "
              f"grade, subject, term, topic, task, questions, model_solution, marking_rubric, and teacher_review_required=true. {spec}")
    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post("https://api.anthropic.com/v1/messages", headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}, json={"model": model, "max_tokens": 5000, "messages": [{"role": "user", "content": prompt}]})
            response.raise_for_status()
            data = response.json()
        text = "\n".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text").strip()
        if not text:
            raise ValueError("Empty Claude response")
        try:
            draft = json.loads(text)
        except json.JSONDecodeError:
            draft = {"raw_draft": text}
        return {"mode": "claude", "model": model, "draft": draft, "status": "pending_teacher_review", "published_to_bank": False}
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="تعذر إنشاء مسودة Claude حالياً.") from exc


@app.post("/api/v1/ai/tutor")
async def ai_tutor(payload: TutorRequest):
    """Local fallback only. Live AI requests are routed directly from the app to Groq."""
    demos = {
        "lesson": "المعلّم الذكي غير مفعّل بعد. افتح إعدادات Groq داخل التطبيق وأدخل مفتاحك لتفعيل الشرح المباشر.",
        "practice": "إنشاء التمارين بالذكاء الاصطناعي يحتاج إلى تفعيل Groq من إعدادات التطبيق. يمكنك استعمال بنك التمارين المحلي حالياً.",
        "evaluate": "التصحيح الذكي يحتاج إلى تفعيل Groq من إعدادات التطبيق. يمكنك مقارنة إجابتك بالحلول الموجودة في الدرس حالياً."
    }
    return {"mode": "demo", "task": payload.task, "answer": demos[payload.task], "remaining": None}

@app.post("/api/v1/ai/chat")
async def ai_chat(payload: ChatRequest):
    """Compatibility fallback; the client sends live requests directly to Groq."""
    return {"mode": "demo", "answer": "المساعد الذكي غير مفعّل بعد. افتح إعدادات Groq داخل التطبيق وأدخل مفتاحك لتفعيل الإجابات المباشرة.", "remaining": None}
