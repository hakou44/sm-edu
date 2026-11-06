#!/usr/bin/env python3
"""Validate a filled SM SCHOOL AI curriculum evidence CSV without publishing it."""
from __future__ import annotations
import argparse, csv, json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

REQUIRED_BASE = ("record_id", "stage", "grade", "subject_or_candidate", "term")
REQUIRED_VERIFIED = ("official_document_title", "official_document_url", "page_number", "unit", "lesson", "competency", "source_publication_date", "reviewer_role", "reviewer_name", "verified_at")

def valid_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return len(value) == 10
    except (TypeError, ValueError):
        return False

def validate_row(row: dict[str, str], line: int) -> dict:
    errors=[]
    record_type=(row.get("record_type") or "grade_subject_term").strip()
    required = ("record_id", "stage", "grade", "pathway_id", "subject_or_candidate") if record_type == "secondary_pathway_subject" else REQUIRED_BASE
    for key in required:
        if not (row.get(key) or "").strip(): errors.append(f"missing:{key}")
    if record_type not in {"grade_subject_term", "secondary_pathway_subject"}: errors.append("invalid:record_type")
    term=(row.get("term") or "").strip()
    if record_type == "grade_subject_term" and term not in {"1","2","3"}: errors.append("invalid:term")
    if record_type == "secondary_pathway_subject" and term: errors.append("invalid:term_not_applicable_to_pathway_subject")
    status=(row.get("verification_status") or "pending_official_source_review").strip()
    if status not in {"verified","pending_official_source_review","rejected"}:
        errors.append("invalid:verification_status")
    if status == "verified":
        for key in REQUIRED_VERIFIED:
            if not (row.get(key) or "").strip(): errors.append(f"missing:{key}")
        url=(row.get("official_document_url") or "").strip()
        try:
            parsed=urlparse(url)
            if parsed.scheme != "https" or not (parsed.hostname == "education.gov.dz" or (parsed.hostname or "").endswith(".education.gov.dz")):
                errors.append("invalid:official_document_url_must_be_https_ministry_domain")
        except ValueError:
            errors.append("invalid:official_document_url")
        try:
            if int(row.get("page_number") or "0") < 1: errors.append("invalid:page_number")
        except ValueError: errors.append("invalid:page_number")
        for key in ("source_publication_date","verified_at"):
            if row.get(key) and not valid_date(row[key]): errors.append(f"invalid:{key}")
    return {"line":line,"record_id":row.get("record_id",""),"status":status,"valid":not errors,"errors":errors}

def validate_csv(path: Path) -> dict:
    with path.open("r",encoding="utf-8-sig",newline="") as handle:
        reader=csv.DictReader(handle)
        rows=[validate_row(row,line) for line,row in enumerate(reader,start=2)]
    return {"file":path.name,"rows":len(rows),"valid_rows":sum(x["valid"] for x in rows),"invalid_rows":sum(not x["valid"] for x in rows),"reviewer_marked_verified_rows":sum(x["status"]=="verified" for x in rows),"rows_detail":rows,"automatic_publication":False,"note":"Validation is a format and provenance pre-check only; it does not authenticate documents or certify curriculum alignment."}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file",type=Path)
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    result=validate_csv(args.csv_file)
    rendered=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output: args.output.write_text(rendered+"\n",encoding="utf-8")
    print(rendered)
    raise SystemExit(1 if result["invalid_rows"] else 0)

if __name__=="__main__": main()
