# PDF import workflow — v1.4.6

Two direct PDF endpoints were verified from DzExams Download controls:
- BEM 2025 French: https://www.dzexams.com/uploads/sujets/officiels/bem/2025/dzexams-bem-francais-1023253.pdf
- BAC 2025 Mathematics (Math stream): https://www.dzexams.com/uploads/sujets/officiels/bac/2025/dzexams-bac-mathematiques-1252509.pdf

Install dependencies with `pip install -r backend/requirements.txt pymupdf`, then run `python tools/import_pdfs.py --fetch` on a network-enabled workstation. PDFs go to `imports/pending-rights/`, extracted text to `imports/extracted-text/`. The importer validates the PDF signature, computes SHA-256 and extracts page text. It does not publish questions automatically. Review rights, OCR, solutions, marks, grade/year/subject/term and curriculum alignment before adding content to the learning bank.

The build environment could not resolve external DNS; the two PDFs could not be downloaded here. Thus this build has 2 verified direct PDF links, 0 local PDF binaries, 0 extracted questions and 0 verified solutions.

## Offline local PDF inbox — v1.4.7

If the build machine cannot reach external websites, download a PDF on your own device/computer and place it in `imports/inbox/`. Run:

```bash
pip install pymupdf
python tools/process_pdf_inbox.py
```

The processor works offline. It accepts PDF files up to 50 MiB, validates the PDF signature, computes SHA-256, skips exact duplicates, copies each source into `imports/pending-rights/`, extracts selectable text into `imports/extracted-text/`, and writes a review record into `imports/review/`. Empty/image-only pages are flagged as requiring OCR. It never adds content to the exercise bank or publishes a document. Keep rights, source, grade, subject, year, term, solution and human-review checks pending until verified. Original files remain in `imports/inbox/` for the user's records.
