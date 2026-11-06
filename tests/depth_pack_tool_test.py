"""Ensure the committed v1.10.0 data matches what tools/build_v1_10_depth_pack.py generates."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import build_v1_10_depth_pack as tool  # noqa: E402


def run():
    bank = json.loads(tool.BANK.read_text(encoding="utf-8"))
    base = [r for r in bank["records"] if not r["id"].startswith(tool.PREFIX)]
    committed = {r["id"]: {k: v for k, v in r.items() if k not in ("quality_flags", "repeat_grades")}
                 for r in bank["records"] if r["id"].startswith(tool.PREFIX)}
    content = tool.all_content()
    targets = tool.thin_pairs(base)
    assert set(content) == set(targets), "content no longer matches the thin-pair set"
    grades = sorted({r["grade"] for r in base})
    subjects = sorted({r["subject"] for r in base})
    expected = {}
    for grade, subject in targets:
        template = next(r for r in base if r["grade"] == grade and r["subject"] == subject)
        for item in content[(grade, subject)]:
            rec = tool.build_record(grade, subject, grades.index(grade) + 1,
                                    subjects.index(subject) + 1, item, template)
            expected[rec["id"]] = rec
    assert expected == committed, "committed pack differs from generator output; rerun the build tool"
    tool.validate(list(expected.values()), base)
    print(f"PASS: v1.10.0 depth pack data matches generator ({len(expected)} records, idempotent)")


if __name__ == "__main__":
    run()
