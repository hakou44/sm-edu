#!/usr/bin/env python3
"""Download Tasnim (t-onec.com) exam / homework files INTO the app so they work offline.

Use ONLY with the site owner's permission (you told us you have it). Run it on your own
computer (the build sandbox has no internet):

    python tools/fetch_tasnim.py --confirm-permission                  # every grade, every subject
    python tools/fetch_tasnim.py --confirm-permission --grades "الثانية متوسط"
    python tools/fetch_tasnim.py --confirm-permission --grades "الثانية متوسط" --subjects math,arabic
    python tools/fetch_tasnim.py --confirm-permission --discover-only  # list files, download nothing

Layout of the live site (verified Nov 2026) and what the tool does with it
  grade page    /p/exams-2am.html                 -> links to one page per subject
  subject page  /p/dz-exams-2am-math.html         -> links to one post per paper (season / term)
  paper post    /2023/08/2022-2023-01_95.html     -> "download pdf" button = Google Drive link
The tool walks those three levels, downloads the PDF (and Word files with --include-word),
saves them to  web/exams/<grade-code>/<subject>/...  and writes  web/data/tasnim-index.json,
which the app (web/v2-pro.js) reads to list the documents offline.

Lessons (v2.1.3-r5): with --content lessons|all (default all) the tool also walks
  grade hub     /p/second-average.html            -> one lesson page per subject
  subject page  /p/2am-arabic.html                -> posts: lesson summaries, exercise series, solutions
and stores them under web/exams/<grade-code>/lessons-<subject>/ with category "lesson" / "exercise".
Teacher-only documents (diaries, guides, curricula, textbooks) are skipped unless --include-teacher.

Good behaviour built in
  * identifies itself, waits --delay seconds (+ jitter) between requests, never runs in parallel
  * reads robots.txt, retries politely (Retry-After honoured) and stops after 3 consecutive 403/429
  * resumable: papers already handled are skipped (imports/tasnim_state.json); identical files
    (same SHA-256) are stored once
  * only links to t-onec.com and Google Drive are followed; other sites are reported, not fetched
  * failures are listed in imports/review/tasnim-fetch-failures.json (private / quota-limited Drive files)

Options
  --grades "الثانية متوسط,..."  --subjects math,arabic   --include-word   --max-per-grade 400
  --max-mb 25   --delay 1.5   --discover-only   --refresh (redo everything)   --base URL (…/p/)
Standard library only.  APK size warning: every PDF placed in web/ is bundled into the app.
"""
import argparse
import hashlib
import http.cookiejar
import json
import random
import re
import sys
import tempfile
import time
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from urllib import robotparser
from urllib.error import HTTPError
from urllib.parse import parse_qs, unquote, urldefrag, urlencode, urljoin, urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
UA = "SM-SCHOOL-AI-fetch/2.1 (owner-authorised; contact: app owner)"
ORD = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة"]
GRADES = (  # (code used by the site, label used by the app)
    [(f"{i + 1}ap", f"{ORD[i]} ابتدائي") for i in range(5)]
    + [(f"{i + 1}am", f"{ORD[i]} متوسط") for i in range(4)]
    + [(f"{i + 1}as", f"{ORD[i]} ثانوي") for i in range(3)]
)
SUBJECT_LABELS = [  # slug keyword -> label (the slug comes from the site's own URL)
    ("math", "الرياضيات"), ("arabic", "اللغة العربية"), ("sciences", "العلوم الطبيعية"),
    ("physics", "العلوم الفيزيائية"), ("history", "التاريخ والجغرافيا"), ("french", "اللغة الفرنسية"),
    ("english", "اللغة الإنجليزية"), ("islamic", "التربية الإسلامية"), ("civic", "التربية المدنية"),
    ("dessein", "التربية الفنية"), ("music", "التربية الموسيقية"), ("informatique", "الإعلام الآلي"),
    ("tamazight", "اللغة الأمازيغية"), ("philosophy", "الفلسفة"), ("technolog", "التكنولوجيا"),
]
DRIVE_HOSTS = {"drive.google.com", "docs.google.com", "drive.usercontent.google.com"}
FILE_EXTS = (".pdf", ".doc", ".docx")
SOURCE = "Tasnim — t-onec.com (used with owner's permission)"
# grade code -> slug of the grade "hub" page that links to one page per subject (lessons, summaries, exercises)
HUBS = {"1ap": "first-primary", "2ap": "second-primary", "3ap": "third-grade-primary", "4ap": "fourth-grade",
        "5ap": "fifth-grade", "1am": "first-average", "2am": "second-average", "3am": "third-average",
        "4am": "fourth-average", "1as": "first-year-1-secondary", "2as": "second-year-2-secondary",
        "3as": "third-year-3-secondary"}
NOT_SUBJECT = re.compile(r"(^|-)(exams?|modakirat|professor|documents?|archive|enrich|upload)(-|$)")
TEACHER_ONLY = re.compile(r"دليل الأستاذ|دليل الاستاذ|الوثيقة المرافقة|التوزيع السنوي|مناهج|منهاج|مذكرات|مخطط|تدرج|الكتاب المدرسي|دليل الكتاب")
EXERCISE_RX = re.compile(r"تمرين|تمارين|سلسلة|وضعي|تقويم|تطبيقات|exercice|série")


def lesson_kind(title):
    """Student-facing kind of a lesson-page post: 'exercise' (with or without solutions) or 'lesson'."""
    return "exercise" if EXERCISE_RX.search(norm_ar(title)) else "lesson"


class Abort(Exception):
    """Too many consecutive 403/429 from the site: stop and be polite."""


class Blocked(Exception):
    """Drive returned a web page instead of the file (private, quota, removed)."""


class TooLarge(Exception):
    pass


# --------------------------------------------------------------------------- HTML helpers
class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self.iframes = [], []
        self.title = self.og_title = ""
        self._href, self._text, self._in_title = None, [], False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("href"):
            self._flush()
            self._href, self._text = a["href"], []
        elif tag == "iframe" and a.get("src"):
            self.iframes.append(a["src"])
        elif tag == "meta" and a.get("property") == "og:title":
            self.og_title = a.get("content", "")
        elif tag == "title":
            self._in_title = True

    def handle_endtag(self, tag):
        if tag == "a":
            self._flush()
        elif tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._href is not None:
            self._text.append(data)

    def _flush(self):
        if self._href is not None:
            self.links.append((self._href, " ".join("".join(self._text).split())))
        self._href, self._text = None, []

    def close(self):
        self._flush()
        super().close()


class FormParser(HTMLParser):
    """Google Drive's 'can't scan for viruses' page: a form with hidden fields."""

    def __init__(self):
        super().__init__()
        self.action, self.fields, self._in = None, {}, False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "form" and self.action is None and "download" in (a.get("action") or ""):
            self.action, self._in = a["action"], True
        elif tag == "input" and self._in and a.get("type") == "hidden" and a.get("name"):
            self.fields[a["name"]] = a.get("value", "")

    def handle_endtag(self, tag):
        if tag == "form":
            self._in = False


def parse_page(html):
    p = PageParser()
    p.feed(html)
    p.close()
    return p


def norm_ar(s):
    return re.sub("[أإآ]", "ا", s or "")


def clean_title(t):
    t = " ".join((t or "").split())
    t = re.sub(r"\s*[|~:–-]\s*موقع تسنيم.*$", "", t)
    return t.strip()


def parse_meta(title):
    t = norm_ar(title)
    m = re.search(r"(20\d\d)\s*[-/–]\s*(20\d\d)", t)
    season = f"{m.group(1)}-{m.group(2)}" if m else ""
    m = re.search(r"الفصل\s+(الاول|الثاني|الثالث|1|2|3)", t)
    term = {"الاول": 1, "الثاني": 2, "الثالث": 3, "1": 1, "2": 2, "3": 3}[m.group(1)] if m else None
    kind = "devoir" if re.search(r"فروض|فرض", t) else "exam"
    m = re.search(r"رقم\s*(\d+)", t)
    return {"season": season, "term": term, "kind": kind, "num": m.group(1) if m else ""}


def site_hosts(base):
    h = urlparse(base).hostname or ""
    core = h[4:] if h.startswith("www.") else h
    return {core, "www." + core}


def clean_site_url(u):
    u, _ = urldefrag(u)
    return u.split("?")[0]


def is_post_url(u, hosts):
    p = urlparse(u)
    return p.hostname in hosts and re.fullmatch(r"/\d{4}/\d{2}/[^/]+\.html", p.path) is not None


def drive_id(u):
    p = urlparse(u)
    m = re.search(r"/d/([\w-]{10,})", p.path)
    if m:
        return m.group(1)
    q = parse_qs(p.query).get("id")
    return q[0] if q else None


def classify(u, hosts):
    """-> (kind, key) for something that looks like a downloadable paper, else None."""
    p = urlparse(u)
    if p.hostname in DRIVE_HOSTS:
        if "/folders/" in p.path:
            return ("folder", u)
        fid = drive_id(u)
        if not fid:
            return None
        if p.hostname == "docs.google.com" and p.path.startswith("/document/"):
            return ("gdoc", fid)
        if p.hostname == "docs.google.com" and p.path.startswith(("/spreadsheets/", "/presentation/", "/forms/")):
            return None
        return ("drive", fid)
    if p.hostname in hosts and p.path.lower().endswith(FILE_EXTS):
        return ("direct", u)
    return None


def collect_candidates(page, page_url, hosts):
    """Download candidates of a paper post, in page order, de-duplicated."""
    out = {}
    for href, text in page.links:
        u = urljoin(page_url, href)
        c = classify(u, hosts)
        if c:
            old = out.get(c)
            if not old or (not old["label"] and text):
                out[c] = {"kind": c[0], "key": c[1], "label": text}
    for src in page.iframes:
        c = classify(urljoin(page_url, src), hosts)
        if c and c not in out:
            out[c] = {"kind": c[0], "key": c[1], "label": "preview"}
    return list(out.values())


# --------------------------------------------------------------------------- HTTP
class Client:
    def __init__(self, delay, timeout=40, retries=3):
        self.delay, self.timeout, self.retries = delay, timeout, retries
        self.opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.last, self.blocks = 0.0, 0

    def _wait(self):
        gap = self.delay * (1 + random.uniform(0, 0.4))
        rem = self.last + gap - time.monotonic()
        if rem > 0:
            time.sleep(rem)
        self.last = time.monotonic()

    def open(self, url, site=True):
        for attempt in range(self.retries + 1):
            self._wait()
            try:
                req = Request(url, headers={"User-Agent": UA, "Accept-Language": "ar,fr;q=0.8,en;q=0.5"})
                resp = self.opener.open(req, timeout=self.timeout)
                if site:
                    self.blocks = 0
                return resp
            except HTTPError as e:
                if site and e.code in (403, 429):
                    self.blocks += 1
                    if self.blocks >= 3:
                        raise Abort("3 consecutive 403/429 from the site — stopping. Try again later with a larger --delay.")
                if e.code in (429, 500, 502, 503, 504) and attempt < self.retries:
                    ra = e.headers.get("Retry-After", "")
                    time.sleep(min(float(ra) if ra.isdigit() else 5 * 2 ** attempt, 120))
                    continue
                raise
            except OSError:
                if attempt < self.retries:
                    time.sleep(3 * 2 ** attempt)
                    continue
                raise

    def text(self, url):
        with self.open(url) as r:
            return r.read(5_000_000).decode("utf-8", "replace")

    @staticmethod
    def save(resp, tmp, max_bytes):
        h, size = hashlib.sha256(), 0
        with open(tmp, "wb") as f:
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise TooLarge(f"larger than {max_bytes // (1024 * 1024)} MB")
                h.update(chunk)
                f.write(chunk)
        return size, h.hexdigest()


def drive_next_url(body, fid, tried):
    low = body.lower()
    if "quota exceeded" in low or "too many users have viewed or downloaded" in low:
        raise Blocked("Drive quota exceeded for this file (try again later)")
    fp = FormParser()
    fp.feed(body)
    if fp.action:
        url = fp.action + ("&" if "?" in fp.action else "?") + urlencode(fp.fields)
    else:
        m = re.search(r"confirm=([\w-]+)", body)
        url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm={m.group(1) if m else 't'}"
    return None if url in tried else url


def fetch_drive(client, fid, tmp, max_bytes, gdoc=False):
    url = (f"https://docs.google.com/document/d/{fid}/export?format=pdf" if gdoc
           else f"https://drive.google.com/uc?export=download&id={fid}")
    tried = set()
    for _ in range(3):
        tried.add(url)
        resp = client.open(url, site=False)
        if resp.headers.get_content_type() != "text/html":
            with resp:
                return client.save(resp, tmp, max_bytes)
        body = resp.read(2_000_000).decode("utf-8", "replace")
        resp.close()
        url = drive_next_url(body, fid, tried)
        if not url:
            break
    raise Blocked("Drive returned a web page instead of the file (private or removed)")


def detect_type(path):
    with open(path, "rb") as f:
        head = f.read(8)
    if head.startswith(b"%PDF"):
        return "pdf"
    if head.startswith(b"\xd0\xcf\x11\xe0"):
        return "doc"
    if head.startswith(b"PK\x03\x04"):
        try:
            names = zipfile.ZipFile(path).namelist()
        except Exception:
            return "zip"
        if any(n.startswith("word/") for n in names):
            return "docx"
        return "zip"
    if head.startswith(b"Rar!"):
        return "rar"
    if head.lstrip().lower().startswith((b"<!doc", b"<html")):
        return "html"
    return "other"


# --------------------------------------------------------------------------- state
def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


def slug_label(slug, text):
    for kw, label in SUBJECT_LABELS:
        if kw in slug:
            return label
    t = re.sub(r"^[^\w\u0600-\u06FF]+", "", text or "")
    return re.sub(r"^(FR|ENG)\s+", "", t.replace("مادة", "", 1)).strip() or slug


def safe(s):
    return re.sub(r"[^\w-]+", "_", s)[:80].strip("_") or "x"


# --------------------------------------------------------------------------- main flow
def process_post(client, a, ctx, post_url, grade_code, grade_label, subject_slug, subject_label, category="exam"):
    html = client.text(post_url)
    page = parse_page(html)
    title = clean_title(page.og_title or page.title) or Path(urlparse(post_url).path).stem
    meta = parse_meta(title)
    if category != "exam":
        category = lesson_kind(title)
        meta = dict(meta, kind=category, num="")
    cands = collect_candidates(page, post_url, ctx["hosts"])
    exts_ok = {"pdf"} | ({"doc", "docx"} if a.include_word else set())
    rec = {"post": post_url, "title": title, "grade": grade_label, "subject": subject_label,
           "files": [{"kind": c["kind"], "key": c["key"], "label": c["label"]} for c in cands]}
    if a.discover_only:
        ctx["discovered"].append(rec)
        return "discovered"
    if not cands:
        return "no_file"
    saved = 0
    many = len(cands) > 1
    for i, c in enumerate(cands, 1):
        if c["kind"] == "folder":
            ctx["failures"].append({"post": post_url, "url": c["key"], "reason": "Drive folder link (open it manually)"})
            continue
        if sum(1 for d in ctx["docs"] if d["grade"] == grade_label
               and (d.get("category", "exam") == "exam") == (category == "exam")) >= a.max_per_grade:
            print(f"   reached --max-per-grade ({a.max_per_grade}) for {grade_label}")
            return "cap"
        tmp = Path(tempfile.mkstemp(prefix="tasnim_", suffix=".part")[1])
        try:
            if c["kind"] in ("drive", "gdoc"):
                size, sha = fetch_drive(client, c["key"], tmp, ctx["max_bytes"], gdoc=c["kind"] == "gdoc")
                url = f"drive:{c['key']}"
            else:
                with client.open(c["key"], site=True) as resp:
                    size, sha = client.save(resp, tmp, ctx["max_bytes"])
                url = c["key"]
            ftype = detect_type(tmp)
            if ftype == "html":
                raise Blocked("got a web page instead of a file")
            if ftype not in exts_ok:
                ctx["failures"].append({"post": post_url, "url": url, "reason": f"skipped file type: {ftype}"})
                continue
            dup = next((d for d in ctx["docs"] if d.get("sha256") == sha), None)
            if dup:
                print(f"   duplicate of {dup['file']} — not stored again")
                saved += 1
                continue
            name = "_".join(x for x in (meta["season"] or "na", f"t{meta['term'] or 'x'}",
                                         meta["kind"] + meta["num"], safe(Path(urlparse(post_url).path).stem)) if x)
            if many:
                name += f"_{i}"
            folder = safe(subject_slug) if category == "exam" else "lessons-" + safe(subject_slug)
            rel = f"exams/{grade_code}/{folder}/{name}.{ftype}"
            dest = ROOT / "web" / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp.replace(dest)
            label = c["label"] if c["label"] not in ("", "preview") else ""
            doc_title = f"{title} ({label})" if many and label else title
            ctx["docs"].append({
                "title": doc_title, "grade": grade_label, "subject": subject_label,
                "term": meta["term"], "season": meta["season"], "file": rel,
                "solution": bool(re.search(r"حل|تصحيح|corrig|solution", norm_ar(label + " " + title), re.I)),
                "category": "exam" if category == "exam" else category,
                "source": SOURCE, "source_url": post_url, "sha256": sha, "bytes": size})
            saved += 1
            print(f"   saved {rel}  ({size // 1024} KB)")
            write_json(ctx["index_path"], {"version": "2.1.0", "documents": ctx["docs"]})
        except TooLarge as e:
            ctx["failures"].append({"post": post_url, "url": str(c["key"]), "reason": str(e)})
        except Blocked as e:
            ctx["failures"].append({"post": post_url, "url": str(c["key"]), "reason": str(e)})
            print(f"   blocked: {e}")
        except HTTPError as e:
            ctx["failures"].append({"post": post_url, "url": str(c["key"]), "reason": f"HTTP {e.code}"})
            print(f"   HTTP {e.code} for {c['key']}")
        except OSError as e:
            ctx["failures"].append({"post": post_url, "url": str(c["key"]), "reason": f"network: {e}"})
            print(f"   network error: {e}")
        finally:
            tmp.unlink(missing_ok=True)
    return "done" if saved else "failed"


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--confirm-permission", action="store_true", help="required: you hold the site owner's permission")
    ap.add_argument("--base", default="https://www.t-onec.com/p/", help="pages base URL (must end with /p/)")
    ap.add_argument("--delay", type=float, default=1.5)
    ap.add_argument("--max-per-grade", type=int, default=400)
    ap.add_argument("--max-mb", type=float, default=25)
    ap.add_argument("--include-word", action="store_true")
    ap.add_argument("--grades", default="", help='Arabic labels, comma separated, e.g. "الثانية متوسط"')
    ap.add_argument("--subjects", default="", help="slug keywords, comma separated, e.g. math,arabic")
    ap.add_argument("--content", choices=("exams", "lessons", "all"), default="all",
                    help="exams = papers bank; lessons = lesson summaries / exercises from the subject pages; all = both")
    ap.add_argument("--include-teacher", action="store_true",
                    help="also fetch teacher-only documents (diaries, guides, curricula, textbooks) from subject pages")
    ap.add_argument("--discover-only", action="store_true")
    ap.add_argument("--refresh", action="store_true", help="ignore saved progress")
    a = ap.parse_args(argv)
    if not a.confirm_permission:
        sys.exit("Refusing to run without --confirm-permission (owner's authorisation).")

    base = a.base if a.base.endswith("/") else a.base + "/"
    origin = "{0.scheme}://{0.netloc}".format(urlparse(base))
    hosts = site_hosts(base)
    only_g = {g.strip() for g in a.grades.split(",") if g.strip()}
    only_s = [s.strip().lower() for s in a.subjects.split(",") if s.strip()]
    state_path = ROOT / "imports" / "tasnim_state.json"
    index_path = ROOT / "web" / "data" / "tasnim-index.json"
    state = {} if a.refresh else read_json(state_path, {})
    docs = read_json(index_path, {}).get("documents", [])
    ctx = {"hosts": hosts, "docs": docs, "failures": [], "discovered": [], "index_path": index_path,
           "max_bytes": int(a.max_mb * 1024 * 1024)}
    client = Client(a.delay)

    rp = robotparser.RobotFileParser()
    try:
        rp.parse(client.text(origin + "/robots.txt").splitlines())
    except Exception:
        rp = None

    def allowed(u):
        return rp is None or rp.can_fetch(UA, u)

    totals = {"posts": 0, "saved": 0}

    def run_subject(surl, code, label, slug, sub_label, category):
        """Open one subject page and process every paper / lesson post it links to."""
        if not allowed(surl):
            print("    robots.txt disallows — skipped")
            return
        spage = parse_page(client.text(surl))
        posts, external, seen_text = [], set(), {}
        for href, text in spage.links:
            u = urljoin(surl, href)
            if is_post_url(u, hosts):
                u = clean_site_url(u)
                if category != "exam" and not a.include_teacher and TEACHER_ONLY.search(norm_ar(text or "")):
                    continue
                if u not in posts:
                    posts.append(u)
                    seen_text[u] = text
            elif re.search(r"/\d{4}/\d{2}/[^/]+\.html$", urlparse(u).path or ""):
                external.add(urlparse(u).hostname)
        if external:
            print(f"    (not followed: posts on other sites {sorted(external)})")
        print(f"    {len(posts)} {'papers' if category == 'exam' else 'lesson files'} found")
        for post in posts:
            if not a.discover_only and state.get(post) in ("done", "no_file") and not a.refresh:
                continue
            if not allowed(post):
                continue
            totals["posts"] += 1
            before = len(ctx["docs"])
            try:
                status = process_post(client, a, ctx, post, code, label, slug, sub_label, category)
            except HTTPError as e:
                status = "failed"
                ctx["failures"].append({"post": post, "url": post, "reason": f"HTTP {e.code}"})
            except OSError as e:
                status = "failed"
                ctx["failures"].append({"post": post, "url": post, "reason": f"network: {e}"})
            totals["saved"] += len(ctx["docs"]) - before
            if not a.discover_only and status in ("done", "no_file"):
                state[post] = status
                write_json(state_path, state)
            if status == "cap":
                break

    try:
        for code, label in GRADES:
            if only_g and label not in only_g:
                continue
            if a.content in ("exams", "all"):
                gurl = f"{base}exams-{code}.html"
                print(f"== {label} (exams): {gurl}")
                if not allowed(gurl):
                    print("   robots.txt disallows this page — skipped")
                else:
                    try:
                        gpage = parse_page(client.text(gurl))
                    except HTTPError as e:
                        gpage = None
                        print(f"   cannot open grade page (HTTP {e.code})")
                    subjects = {}
                    for href, text in (gpage.links if gpage else []):
                        m = re.search(rf"/p/dz-exams-{code}-([\w-]+)\.html$", urlparse(urljoin(gurl, href)).path)
                        if m and m.group(1) not in subjects:
                            subjects[m.group(1)] = (urljoin(gurl, href), text)
                    if gpage and not subjects:
                        print("   no subject pages found (layout changed?)")
                    for slug, (surl, stext) in subjects.items():
                        if only_s and not any(k in slug.lower() for k in only_s):
                            continue
                        sub_label = slug_label(slug, stext)
                        print(f" -- {sub_label} ({slug})")
                        run_subject(surl, code, label, slug, sub_label, "exam")
            if a.content in ("lessons", "all"):
                hub = f"{base}{HUBS[code]}.html"
                print(f"== {label} (lessons): {hub}")
                if not allowed(hub):
                    print("   robots.txt disallows this page — skipped")
                    continue
                try:
                    hpage = parse_page(client.text(hub))
                except HTTPError as e:
                    print(f"   cannot open grade hub page (HTTP {e.code})")
                    continue
                lsubjects = {}
                for href, text in hpage.links:
                    u = urljoin(hub, href)
                    pu = urlparse(u)
                    if pu.hostname not in hosts or not re.fullmatch(r"/p/[\w.-]+\.html", pu.path):
                        continue
                    slug = Path(pu.path).stem
                    by_code = re.fullmatch(rf"{code}-([\w-]+)", slug)
                    if by_code:
                        slug = by_code.group(1)
                    elif not (text or "").strip().startswith("مادة"):
                        continue
                    if NOT_SUBJECT.search(slug) or slug in lsubjects:
                        continue
                    lsubjects[slug] = (u, text)
                if not lsubjects:
                    print("   no subject pages found (layout changed?)")
                    continue
                for slug, (surl, stext) in lsubjects.items():
                    if only_s and not any(k in slug.lower() for k in only_s):
                        continue
                    sub_label = slug_label(slug, stext)
                    print(f" -- {sub_label} ({slug})")
                    run_subject(surl, code, label, slug, sub_label, "lesson")
    except Abort as e:
        print(f"\nSTOPPED: {e}")
    except KeyboardInterrupt:
        print("\nInterrupted — progress is saved; run again to resume.")

    if a.discover_only:
        write_json(ROOT / "imports" / "tasnim_discovered.json", {"papers": ctx["discovered"]})
        n = sum(len(p["files"]) for p in ctx["discovered"])
        print(f"Discovery done: {len(ctx['discovered'])} papers, {n} file links -> imports/tasnim_discovered.json")
        return 0
    write_json(ROOT / "imports" / "review" / "tasnim-fetch-failures.json", {"failures": ctx["failures"]})
    write_json(index_path, {"version": "2.1.0", "documents": ctx["docs"]})
    mb = sum(d.get("bytes", 0) for d in ctx["docs"]) / (1024 * 1024)
    print(f"Done. {len(ctx['docs'])} documents indexed ({mb:.0f} MB) -> {index_path}; "
          f"{totals['saved']} new this run, {len(ctx['failures'])} problems "
          f"(see imports/review/tasnim-fetch-failures.json).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
