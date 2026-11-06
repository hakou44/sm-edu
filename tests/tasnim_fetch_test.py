#!/usr/bin/env python3
"""Offline test for tools/fetch_tasnim.py: a local server imitates the 3-level Tasnim layout."""
import importlib.util
import json
import tempfile
import threading
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("fetch_tasnim", ROOT / "tools" / "fetch_tasnim.py")
ft = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ft)

# ---------------------------------------------------------------- unit checks
assert ft.parse_meta("اختبارات السنة الثانية متوسط الفصل الاول مادة الرياضيات 2022-2023 رقم 01") == \
    {"season": "2022-2023", "term": 1, "kind": "exam", "num": "01"}
assert ft.parse_meta("فروض السنة الثانية متوسط الفصل الثالث 2019/2020 رقم 7")["term"] == 3
assert ft.parse_meta("فروض السنة الثانية متوسط الفصل الثاني")["kind"] == "devoir"
hosts = {"www.t-onec.com", "t-onec.com"}
assert ft.classify("https://drive.google.com/uc?export=download&id=1DtZgikDnAw2tBSpppSz-1R4oXCnndGBk", hosts) == \
    ("drive", "1DtZgikDnAw2tBSpppSz-1R4oXCnndGBk")
assert ft.classify("https://drive.google.com/file/d/1DtZgikDnAw2tBSpppSz-1R4oXCnndGBk/view", hosts)[0] == "drive"
assert ft.classify("https://drive.google.com/drive/folders/abcdefghijk123", hosts)[0] == "folder"
assert ft.classify("https://docs.google.com/document/d/abcdefghijk123/edit", hosts)[0] == "gdoc"
assert ft.classify("https://blogger.googleusercontent.com/img/a/AVv.png", hosts) is None
assert ft.is_post_url("https://www.t-onec.com/2023/08/2022-2023-01_95.html", hosts)
assert not ft.is_post_url("https://www.t-onec.com/p/exams-2am.html", hosts)
assert not ft.is_post_url("https://www.h-onec.com/2025/09/blog-post_450.html", hosts)
form = '<form id="download-form" action="https://drive.usercontent.google.com/download" method="get">' \
       '<input type="hidden" name="id" value="X1"><input type="hidden" name="confirm" value="t">' \
       '<input type="hidden" name="uuid" value="U9"></form>'
nxt = ft.drive_next_url(form, "X1", set())
assert nxt.startswith("https://drive.usercontent.google.com/download?") and "uuid=U9" in nxt and "confirm=t" in nxt
try:
    ft.drive_next_url("<p>Quota exceeded for this file</p>", "X1", set())
    raise AssertionError("quota page must raise Blocked")
except ft.Blocked:
    pass

# Drive flow: first a "virus scan" confirmation page, then the real file
class _Resp:
    def __init__(self, ctype, data):
        self.headers = type("H", (), {"get_content_type": lambda self_: ctype})()
        self._d = data

    def read(self, n=-1):
        d, self._d = self._d, b""
        return d

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass


class _StubClient:
    save = staticmethod(ft.Client.save)

    def __init__(self, responses):
        self.responses, self.urls = list(responses), []

    def open(self, url, site=True):
        self.urls.append(url)
        return self.responses.pop(0)


with tempfile.TemporaryDirectory() as d0:
    stub = _StubClient([_Resp("text/html", form.encode()), _Resp("application/pdf", b"%PDF-1.4 ok")])
    size, sha = ft.fetch_drive(stub, "X1", Path(d0) / "f.part", 1_000_000)
    assert size == 11 and len(sha) == 64 and stub.urls[0].startswith("https://drive.google.com/uc?export=download&id=X1")
    assert stub.urls[1].startswith("https://drive.usercontent.google.com/download?") and ft.detect_type(Path(d0) / "f.part") == "pdf"
    stub = _StubClient([_Resp("text/html", b"<html>Sign in</html>")] * 3)
    try:
        ft.fetch_drive(stub, "X2", Path(d0) / "g.part", 1_000_000)
        raise AssertionError("private file must raise Blocked")
    except ft.Blocked:
        pass

# ---------------------------------------------------------------- fake site
PDF_A = b"%PDF-1.4\n% exam A\n" + b"A" * 300
PDF_C1 = b"%PDF-1.4\n% devoir\n" + b"C" * 300
PDF_C2 = b"%PDF-1.4\n% solution\n" + b"S" * 300
PDF_L1 = b"%PDF-1.4\n% lesson summary\n" + b"L" * 300
PDF_L2 = b"%PDF-1.4\n% exercises\n" + b"X" * 300
PDF_T1 = b"%PDF-1.4\n% teacher diary\n" + b"T" * 300
PORT = {}
HITS = Counter()


def page(title, body):
    return (f'<html><head><title>{title} - موقع تسنيم للتربية والتعليم</title>'
            f'<meta property="og:title" content="{title}"></head><body>{body}</body></html>').encode()


def routes():
    b = f"http://127.0.0.1:{PORT['n']}"
    return {
        "/p/exams-2am.html": page("grade", f'<a href="{b}/p/dz-exams-2am-math.html">🔢 مادة الرياضيات</a>'
                                           f'<a href="{b}/p/dz-exams-2am-french.html">FR مادة اللغة الفرنسية</a>'
                                           f'<a href="{b}/p/contactez-nous.html">اتصل بنا</a>'),
        "/p/dz-exams-2am-math.html": page("math", f'<a href="{b}/2023/08/a_1.html">الموضوع 01</a>'
                                                  f'<a href="{b}/2023/08/b_2.html">الموضوع 02</a>'
                                                  f'<a href="/2021/04/c_3.html">الموضوع 03</a>'
                                                  f'<a href="{b}/2021/04/e_5.html">الموضوع 05</a>'
                                                  f'<a href="https://www.h-onec.com/2025/09/blog-post_450.html">فروض جديدة</a>'),
        "/p/dz-exams-2am-french.html": page("french", f'<a href="{b}/2021/04/d_4.html">Sujet 4</a>'),
        "/2023/08/a_1.html": page("اختبارات السنة الثانية متوسط الفصل الاول مادة الرياضيات 2022-2023 رقم 01",
                                  f'<a href="{b}/files/a.pdf">تحميل الاختبار pdf مباشرة</a><img src="x.png">'),
        "/2023/08/b_2.html": page("اختبارات السنة الثانية متوسط الفصل الثاني مادة الرياضيات 2023-2024 رقم 02",
                                  f'<a href="{b}/files/a_copy.pdf">تحميل</a>'),
        "/2021/04/c_3.html": page("فروض السنة الثانية متوسط الفصل الثالث مادة الرياضيات 2019-2020 رقم 03",
                                  f'<a href="{b}/files/c1.pdf">تحميل الفرض</a><a href="{b}/files/c2.pdf">تحميل الحل</a>'),
        "/2021/04/e_5.html": page("فروض السنة الثانية متوسط الفصل الاول مادة الرياضيات 2019-2020 رقم 05",
                                  f'<a href="{b}/files/bad.pdf">تحميل</a>'),
        "/2021/04/d_4.html": page("اختبارات السنة الثانية متوسط الفصل الاول مادة اللغة الفرنسية 2021-2022 رقم 04",
                                  '<a href="https://drive.google.com/uc?export=download&id=1DtZgikDnAw2tBSpppSz-1R4oXCnndGBk">'
                                  'تحميل الاختبار pdf مباشرة</a>'
                                  '<iframe src="https://drive.google.com/file/d/1DtZgikDnAw2tBSpppSz-1R4oXCnndGBk/preview"></iframe>'),
        # --- lessons layout: grade hub -> subject lesson page -> post with a download link
        "/p/second-average.html": page("hub", f'<a href="{b}/p/2am-arabic.html"><b>مادة اللغة العربية</b></a>'
                                              f'<a href="{b}/p/2am-math.html">مادة الرياضيات</a>'
                                              f'<a href="{b}/p/exams-2am.html">فروض واختبارات</a>'
                                              f'<a href="{b}/p/2am-professor-documents.html">وثائق الأستاذ</a>'
                                              f'<a href="{b}/p/contactez-nous.html">اتصل بنا</a>'),
        "/p/2am-arabic.html": page("arabic", f'<a href="{b}/p/exams-2am.html">فروض واختبارات</a>'
                                             f'<a href="{b}/2021/07/l1.html">ملخص دروس البناء اللغوي للفصل الاول</a>'
                                             f'<a href="{b}/2021/07/l2.html">سلسلة تمارين في النحو مع الحل</a>'
                                             f'<a href="{b}/2021/08/t1.html">مذكرات السنة 2 متوسط في اللغة العربية</a>'),
        "/p/2am-math.html": page("math lessons", ""),
        "/2021/07/l1.html": page("ملخص دروس البناء اللغوي للفصل الاول للسنة الثانية متوسط",
                                 f'<a href="{b}/files/l1.pdf">تحميل الملف مباشرة</a>'),
        "/2021/07/l2.html": page("سلسلة تمارين في النحو مع الحل للسنة الثانية متوسط",
                                 f'<a href="{b}/files/l2.pdf">تحميل الملف مباشرة</a>'),
        "/2021/08/t1.html": page("مذكرات السنة 2 متوسط في اللغة العربية",
                                 f'<a href="{b}/files/t1.pdf">تحميل</a>'),
        "/files/l1.pdf": PDF_L1, "/files/l2.pdf": PDF_L2, "/files/t1.pdf": PDF_T1,
        "/files/a.pdf": PDF_A, "/files/a_copy.pdf": PDF_A, "/files/c1.pdf": PDF_C1, "/files/c2.pdf": PDF_C2,
        "/files/bad.pdf": b"<html><body>not a pdf</body></html>",
    }


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        HITS[self.path] += 1
        body = routes().get(self.path)
        if body is None:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf" if self.path.endswith(".pdf") else "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
PORT["n"] = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT['n']}/p/"

with tempfile.TemporaryDirectory() as tmp:
    ft.ROOT = Path(tmp)
    common = ["--confirm-permission", "--base", BASE, "--delay", "0", "--grades", "الثانية متوسط", "--content", "exams"]

    # refuses without the permission flag
    try:
        ft.main(["--base", BASE])
        raise AssertionError("must refuse without --confirm-permission")
    except SystemExit:
        pass

    # 1) discovery only: lists links (incl. the Drive one, de-duplicated with its preview iframe), downloads nothing
    assert ft.main(common + ["--discover-only"]) == 0
    disc = json.loads((Path(tmp) / "imports" / "tasnim_discovered.json").read_text(encoding="utf-8"))["papers"]
    assert len(disc) == 5, len(disc)  # h-onec.com post is not followed
    french = next(p for p in disc if p["subject"] == "اللغة الفرنسية")
    assert [f["kind"] for f in french["files"]] == ["drive"], french
    assert not (Path(tmp) / "web").exists(), "discover-only must not write files"

    # 2) real run on the maths subject
    assert ft.main(common + ["--subjects", "math"]) == 0
    idx = json.loads((Path(tmp) / "web" / "data" / "tasnim-index.json").read_text(encoding="utf-8"))["documents"]
    assert len(idx) == 3, [d["file"] for d in idx]  # a, c1, c2 (b = duplicate of a, bad = html)
    assert all(d["grade"] == "الثانية متوسط" and d["subject"] == "الرياضيات" for d in idx)
    by_file = {d["file"]: d for d in idx}
    a = next(d for d in idx if d["season"] == "2022-2023")
    assert a["term"] == 1 and a["solution"] is False and a["file"].startswith("exams/2am/math/2022-2023_t1_exam01_")
    sol = [d for d in idx if d["solution"]]
    assert len(sol) == 1 and sol[0]["term"] == 3 and "الحل" in sol[0]["title"]
    for d in idx:
        p = Path(tmp) / "web" / d["file"]
        assert p.exists() and p.read_bytes().startswith(b"%PDF") and len(d["sha256"]) == 64
    fails = json.loads((Path(tmp) / "imports" / "review" / "tasnim-fetch-failures.json").read_text(encoding="utf-8"))["failures"]
    assert len(fails) == 1 and "web page" in fails[0]["reason"], fails
    assert not list((Path(tmp) / "web").rglob("*.part")) and not list(Path(tmp).rglob("tasnim_*.part"))

    # 3) resume: papers already handled are not requested again
    hits_before = HITS["/2023/08/a_1.html"], HITS["/files/a.pdf"]
    assert ft.main(common + ["--subjects", "math"]) == 0
    assert (HITS["/2023/08/a_1.html"], HITS["/files/a.pdf"]) == hits_before, "resume must skip finished papers"

    # 4) cap per grade
    ft.main(common + ["--subjects", "math", "--refresh", "--max-per-grade", "2"])
    assert len(json.loads((Path(tmp) / "web" / "data" / "tasnim-index.json").read_text(encoding="utf-8"))["documents"]) == 3

    # 5) lessons: hub -> subject lesson pages -> posts; teacher-only documents are skipped by default
    lessons = ["--confirm-permission", "--base", BASE, "--delay", "0", "--grades", "الثانية متوسط", "--content", "lessons",
               "--subjects", "arabic"]
    assert ft.lesson_kind("سلسلة تمارين في النحو مع الحل") == "exercise" and ft.lesson_kind("ملخص دروس الفصل الاول") == "lesson"
    assert ft.main(lessons) == 0
    idx = json.loads((Path(tmp) / "web" / "data" / "tasnim-index.json").read_text(encoding="utf-8"))["documents"]
    les = [d for d in idx if d.get("category") in ("lesson", "exercise")]
    assert sorted(d["category"] for d in les) == ["exercise", "lesson"], les
    assert all(d["file"].startswith("exams/2am/lessons-arabic/") and d["subject"] == "اللغة العربية" for d in les)
    assert next(d for d in les if d["category"] == "exercise")["solution"] is True
    assert HITS["/files/t1.pdf"] == 0 and HITS["/2021/08/t1.html"] == 0, "teacher-only documents must be skipped"
    assert HITS["/p/exams-2am.html"] >= 1 and not any("exams-2am" in d["source_url"] for d in les)
    assert ft.main(lessons + ["--include-teacher"]) == 0
    idx = json.loads((Path(tmp) / "web" / "data" / "tasnim-index.json").read_text(encoding="utf-8"))["documents"]
    assert HITS["/files/t1.pdf"] == 1 and len([d for d in idx if d.get("category") in ("lesson", "exercise")]) == 3
    # exam documents written earlier keep working and default to category "exam"
    assert all(d.get("category", "exam") == "exam" for d in idx if "lessons-" not in d["file"])

srv.shutdown()
print("PASS: fetch_tasnim — 3-level crawl, lessons crawl, Drive link detection, dedupe, resume, failures, no writes in discover-only")
