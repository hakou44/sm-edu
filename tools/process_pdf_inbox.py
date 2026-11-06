#!/usr/bin/env python3
"""Process user-supplied PDFs offline into a private, non-publishing review queue."""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 50 * 1024 * 1024


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def safe_stem(name: str) -> str:
    stem = re.sub(r'[^A-Za-z0-9._-]+', '_', Path(name).stem).strip('._')
    return (stem or 'document')[:70]


def process_pdf(source: Path, pending: Path, extracted: Path, review: Path) -> dict:
    if source.stat().st_size > MAX_BYTES:
        raise ValueError('file exceeds 50 MiB safety limit')
    with source.open('rb') as stream:
        if stream.read(5) != b'%PDF-':
            raise ValueError('invalid PDF signature')
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError('Install PyMuPDF: pip install pymupdf') from exc

    digest = sha256(source)
    existing = review / f'{digest}.json'
    if existing.exists():
        return {'file': source.name, 'status': 'duplicate_skipped', 'sha256': digest}

    doc = fitz.open(source)
    pages, text_pages, image_only_pages = [], 0, 0
    for index, page in enumerate(doc):
        page_text = page.get_text('text').strip()
        if page_text:
            text_pages += 1
        else:
            image_only_pages += 1
        pages.append(f'--- PAGE {index + 1} ---\n{page_text}')

    stem = f'{safe_stem(source.name)}_{digest[:12]}'
    pdf_target = pending / f'{stem}.pdf'
    txt_target = extracted / f'{stem}.txt'
    pdf_target.write_bytes(source.read_bytes())
    txt_target.write_text('\n\n'.join(pages).rstrip() + '\n', encoding='utf-8')
    record = {
        'source_filename': source.name,
        'sha256': digest,
        'page_count': len(doc),
        'pages_with_extractable_text': text_pages,
        'image_only_or_empty_pages': image_only_pages,
        'extraction_status': 'text_extracted' if text_pages else 'ocr_required',
        'review_status': 'pending_human_review',
        'reuse_permission': 'unknown_pending_rights_review',
        'official_alignment': 'not_verified',
        'solution_verification': 'not_verified',
        'auto_published': False,
        'local_pdf': str(pdf_target.relative_to(ROOT)),
        'extracted_text': str(txt_target.relative_to(ROOT)),
        'imported_at_utc': datetime.now(timezone.utc).isoformat(),
    }
    (review / f'{digest}.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return {'file': source.name, 'status': 'queued_for_review', 'sha256': digest,
            'pages': len(doc), 'text_pages': text_pages, 'ocr_pages': image_only_pages,
            'extracted_text': str(txt_target.relative_to(ROOT))}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inbox', default='imports/inbox')
    args = parser.parse_args()
    inbox = Path(args.inbox)
    inbox = inbox if inbox.is_absolute() else ROOT / inbox
    pending, extracted, review = (ROOT / 'imports' / name for name in ('pending-rights', 'extracted-text', 'review'))
    for directory in (inbox, pending, extracted, review):
        directory.mkdir(parents=True, exist_ok=True)
    results = []
    for source in sorted(inbox.iterdir()):
        if not source.is_file() or source.suffix.lower() != '.pdf':
            continue
        try:
            results.append(process_pdf(source, pending, extracted, review))
        except Exception as exc:
            results.append({'file': source.name, 'status': 'rejected_or_failed', 'error': str(exc)})
    print(json.dumps({'mode': 'offline_local_inbox', 'files_seen': len(results), 'results': results,
                      'publication_count': 0}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
