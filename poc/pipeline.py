"""Multi-format document ingestion -> normalised table (proof of concept).

Usage:  python pipeline.py samples/ --out output/
Always works for csv/xlsx/txt. docx, pdf and images need the optional libraries
listed in requirements.txt; if they are missing the file is routed to review, not crashed.
"""
import argparse, difflib, json, re, shutil, sqlite3, time, uuid
from pathlib import Path
import pandas as pd

SCHEMA = ["vendor", "invoice_number", "invoice_date", "currency", "total_amount"]
REQUIRED = ["vendor", "invoice_number", "invoice_date", "total_amount"]
ALIASES = {
    "vendor": ["vendor", "supplier", "company", "seller", "billed by"],
    "invoice_number": ["invoice number", "invoice no", "inv no", "invoice #", "bill no"],
    "invoice_date": ["invoice date", "date", "billing date"],
    "currency": ["currency", "curr"],
    "total_amount": ["total", "total amount", "amount", "grand total", "amount due"],
}
AUTO, REVIEW = 0.85, 0.50  # confidence thresholds for routing


# ---------- 1. Extraction: one reader per format, all return plain text or a DataFrame ----------
def read_file(path: Path):
    ext = path.suffix.lower()
    if ext in (".csv", ".tsv"):
        return pd.read_csv(path, sep=None, engine="python"), "table"
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(path), "table"
    if ext in (".txt", ".md"):
        return path.read_text(errors="replace"), "regex"
    if ext == ".docx":
        import docx  # python-docx
        d = docx.Document(path)
        return "\n".join(p.text for p in d.paragraphs), "regex"
    if ext == ".pdf":
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            text = "\n".join(pg.extract_text() or "" for pg in pdf.pages)
        if len(text.strip()) < 20:  # no text layer -> scanned PDF, fall back to OCR
            import pytesseract
            from pdf2image import convert_from_path
            text = "\n".join(pytesseract.image_to_string(im) for im in convert_from_path(path))
            return text, "ocr"
        return text, "regex"
    if ext in (".png", ".jpg", ".jpeg", ".tiff"):
        import pytesseract
        from PIL import Image
        return pytesseract.image_to_string(Image.open(path)), "ocr"
    raise ValueError(f"unsupported format: {ext}")


def from_table(df: pd.DataFrame):
    """Map messy column names onto the canonical schema using fuzzy matching."""
    cols = {c: str(c).strip().lower() for c in df.columns}
    out = []
    for _, row in df.iterrows():
        rec = {}
        for field, names in ALIASES.items():
            m = [c for c, low in cols.items() if difflib.get_close_matches(low, names, n=1, cutoff=0.8)]
            rec[field] = row[m[0]] if m else None
        out.append(rec)
    return out


def from_text(text: str):
    """Rule-based key:value extraction. An LLM fallback would slot in here for unknown layouts."""
    def grab(names):
        for n in names:
            m = re.search(rf"{n}\s*[:\-]?\s*(.+)", text, re.I)
            if m:
                return m.group(1).strip()
    return [{f: grab(ALIASES[f]) for f in SCHEMA}]


# ---------- 2. Validation: type checks, missing values, normalisation ----------
def clean(rec: dict):
    errs, r = [], dict(rec)
    for f in REQUIRED:
        if r.get(f) in (None, "") or (isinstance(r.get(f), float) and pd.isna(r[f])):
            errs.append(f"missing {f}")
    if r.get("invoice_date") not in (None, ""):
        d = pd.to_datetime(r["invoice_date"], errors="coerce", dayfirst=True)
        if pd.isna(d): errs.append("bad invoice_date")
        else: r["invoice_date"] = d.date().isoformat()
    if r.get("total_amount") not in (None, ""):
        raw = re.sub(r"[^\d.\-]", "", str(r["total_amount"]).replace(",", ""))
        try:
            r["total_amount"] = float(raw)
            if r["total_amount"] <= 0: errs.append("non-positive total")
        except ValueError:
            errs.append("bad total_amount")
    r["currency"] = (str(r.get("currency") or "INR")).upper()[:3]
    return r, errs


def score(errs, method):
    base = {"table": 0.95, "regex": 0.85, "ocr": 0.70}[method]  # OCR is less trustworthy
    return round(max(0.0, base - 0.25 * len(errs)), 2)


def flag_anomalies(df: pd.DataFrame):
    """Batch-level checks: duplicate invoices and outlier totals (IQR rule)."""
    notes = [[] for _ in range(len(df))]
    dup = df.duplicated(["vendor", "invoice_number"], keep="first")
    for i in df.index[dup]: notes[i].append("duplicate invoice")
    t = pd.to_numeric(df["total_amount"], errors="coerce")
    if t.notna().sum() >= 4:
        q1, q3 = t.quantile([.25, .75]); lim = q3 + 3 * (q3 - q1)
        for i in df.index[t > lim]: notes[i].append("outlier total")
    return notes


# ---------- 3. Orchestration with retries, quarantine and routing ----------
def process(path: Path, retries=2):
    for attempt in range(retries + 1):
        try:
            payload, method = read_file(path)
            recs = from_table(payload) if method == "table" else from_text(payload)
            rows = []
            for rec in recs:
                r, errs = clean(rec)
                rows.append({**r, "source_file": path.name, "method": method, "errors": "; ".join(errs),
                             "confidence": score(errs, method), "doc_id": uuid.uuid4().hex[:8]})
            return rows, None
        except ImportError as e:   # missing optional dependency: not retryable, send to review
            return [], f"dependency missing: {e.name}"
        except Exception as e:     # corrupted/unreadable: retry with backoff, then quarantine
            if attempt == retries: return [], f"{type(e).__name__}: {e}"
            time.sleep(0.5 * 2 ** attempt)


def run(src: Path, out: Path):
    out.mkdir(parents=True, exist_ok=True)
    quarantine = out / "quarantine"; quarantine.mkdir(exist_ok=True)
    rows, failures = [], []
    for f in sorted(p for p in src.iterdir() if p.is_file()):
        got, err = process(f)
        if err:
            failures.append({"file": f.name, "reason": err}); shutil.copy(f, quarantine / f.name)
        rows += got
    df = pd.DataFrame(rows)
    if not df.empty:
        for i, n in enumerate(flag_anomalies(df)):
            if n: df.loc[i, "errors"] = "; ".join(filter(None, [df.loc[i, "errors"], *n])); df.loc[i, "confidence"] = min(df.loc[i, "confidence"], 0.6)
        df["status"] = df["confidence"].apply(lambda c: "accepted" if c >= AUTO else "needs_review" if c >= REVIEW else "rejected")
        df[df.status == "accepted"].to_csv(out / "accepted.csv", index=False)
        df[df.status != "accepted"].to_csv(out / "review_queue.csv", index=False)
        with sqlite3.connect(out / "documents.db") as db: df.to_sql("documents", db, if_exists="replace", index=False)
    (out / "failures.json").write_text(json.dumps(failures, indent=2))
    print(df[["source_file", "invoice_number", "total_amount", "confidence", "status"]].to_string(index=False) if not df.empty else "no rows")
    print(f"\n{len(failures)} file(s) quarantined -> {quarantine}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("src", type=Path); ap.add_argument("--out", type=Path, default=Path("output"))
    a = ap.parse_args(); run(a.src, a.out)
