"""Ensure the committed v1.11.0 data matches what tools/build_v1_11_dedupe.py generates."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import build_v1_11_dedupe as tool  # noqa: E402


def run():
    bank, report, term_exams, integrative, touched = tool.build()
    expected = [
        (tool.BANK, tool.dump_bank(bank)),
        (tool.COVERAGE, tool.dump_bank(report)),
        (tool.TERM_EXAMS, tool.dump_exam(term_exams)),
        (tool.INTEGRATIVE, tool.dump_exam(integrative)),
    ]
    for path, text in expected:
        assert path.read_text(encoding="utf-8") == text, f"{path.name} differs from generator output; rerun the build tool"
    assert not tool.duplicate_groups(bank["records"]), "duplicate questions remain"
    print(f"PASS: v1.11.0 dedupe data matches generator ({len(tool.REPLACEMENTS)} records, idempotent)")


if __name__ == "__main__":
    run()
