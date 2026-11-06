# OCR setup (v1.5.1)

Scanned PDF OCR is optional and runs locally on the FastAPI server. It does not send documents to a third party.

1. Install Python dependencies: `pip install -r backend/requirements.txt`.
2. Install the Tesseract OCR engine on the server OS.
3. Install Tesseract language data for Arabic (`ara`), French (`fra`) and English (`eng`).
4. Restart FastAPI and open Tests & Archives → imported PDF → Run OCR.

The OCR endpoint processes only pages with no extractable text. It supports language combinations `ara`, `fra`, `eng`, `ara+fra`, `ara+eng`, `eng+fra`, `ara+fra+eng`. OCR text is a draft: check spelling, mathematical notation, tables, diagrams and answer keys manually. The endpoint never publishes questions or distributes the original PDF. Missing Tesseract binaries/language packs return an explicit HTTP 503 response.
