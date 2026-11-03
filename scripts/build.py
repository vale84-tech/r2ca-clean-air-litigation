#!/usr/bin/env python3
"""Assemble the deployable static site.

Reads every JSON file in cases/, validates the minimal contract the
front-end relies on, merges them into data/cases.json and copies the
static shell from site/ into _site/. A validation error aborts the build,
so a broken entry can never replace the live dataset.
"""
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CASES = ROOT / "cases"
OUT = ROOT / "_site"

REQUIRED = [
    "slug", "name", "year", "date", "status", "geography", "jurisdiction",
    "description", "outcome",
]
OPTIONAL_LISTS = ("topics", "sources")
FORUM_TYPES = ("Domestic", "CJEU", "ECtHR", "UN")
LATEST = SITE / "data" / "latest-additions.json"

MONTHS = {m: i for i, m in enumerate(
    ("January February March April May June July August September October November December").split(), 1)}
FULL_DATE = re.compile(r"\b(\d{1,2}) (" + "|".join(MONTHS) + r") ((?:19|20)\d{2})\b")
MONTH_YEAR = re.compile(r"\b(" + "|".join(MONTHS) + r") ((?:19|20)\d{2})\b")
YEAR = re.compile(r"(?<![\d/])((?:19|20)\d{2})(?![\d/])")


def latest_date(case: dict) -> str:
    """Most recent date mentioned in the 'date' field (YYYY-MM-DD), used to sort the list.

    Full dates win over month-year and year-only mentions of the same year; docket
    numbers such as 3364/2021 are ignored. Falls back to the 'year' field.
    """
    text = case["date"]
    found = [(int(y), MONTHS[m], int(d)) for d, m, y in FULL_DATE.findall(text)]
    found += [(int(y), MONTHS[m], 0) for m, y in MONTH_YEAR.findall(text)]
    found += [(int(y), 0, 0) for y in YEAR.findall(text)]
    y, m, d = max(found) if found else (case["year"], 0, 0)
    return f"{y:04d}-{m:02d}-{d:02d}"


def fail(msg: str) -> None:
    print(f"BUILD FAILED: {msg}", file=sys.stderr)
    sys.exit(1)


def load_cases() -> list:
    files = sorted(CASES.glob("*.json"))
    if not files:
        fail("no case files found in cases/")
    cases, slugs = [], set()
    for path in files:
        try:
            case = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(f"{path.name}: invalid JSON ({exc})")
        missing = [k for k in REQUIRED if k not in case]
        if missing:
            fail(f"{path.name}: missing fields {missing}")
        if case["slug"] in slugs:
            fail(f"{path.name}: duplicate slug '{case['slug']}'")
        slugs.add(case["slug"])
        for key in ("country", "iso_n3"):
            if not case["geography"].get(key):
                fail(f"{path.name}: geography.{key} is required")
        if not str(case["geography"]["iso_n3"]).isdigit() or len(str(case["geography"]["iso_n3"])) != 3:
            fail(f"{path.name}: geography.iso_n3 must be a 3-digit code, got '{case['geography']['iso_n3']}'")
        if case["jurisdiction"].get("type") not in FORUM_TYPES:
            fail(f"{path.name}: jurisdiction.type must be one of {FORUM_TYPES}")
        try:
            case["year"] = int(case["year"])
        except (TypeError, ValueError):
            fail(f"{path.name}: year must be a number")
        empty = [k for k in ("name", "date", "status", "description", "outcome") if not str(case[k]).strip()]
        if empty:
            fail(f"{path.name}: empty fields {empty}")
        case["docket"] = case.get("docket") or ""
        for key in OPTIONAL_LISTS:
            case[key] = case.get(key) or []
        for src in case["sources"]:
            src["url"] = src.get("url") or None
        case["latest"] = latest_date(case)
        case["related"] = case.get("related") or []
        cases.append(case)
    for case in cases:
        unknown = [s for s in case["related"] if s not in slugs]
        if unknown:
            fail(f"{case['slug']}.json: related entries not found {unknown}")
    # most recent first; same date in alphabetical order
    cases.sort(key=lambda c: c["name"])
    cases.sort(key=lambda c: c["latest"], reverse=True)
    return cases


def check_latest(cases: list) -> None:
    """Validate the homepage 'Latest additions' list edited from /admin."""
    if not LATEST.exists():
        return
    try:
        items = json.loads(LATEST.read_text(encoding="utf-8")).get("items") or []
    except (json.JSONDecodeError, AttributeError) as exc:
        fail(f"{LATEST.name}: invalid JSON ({exc})")
    slugs = {c["slug"] for c in cases}
    for i, item in enumerate(items, 1):
        if item.get("slug") not in slugs:
            fail(f"{LATEST.name}: entry {i} refers to an unknown case '{item.get('slug')}'")
        try:
            date.fromisoformat(str(item.get("added", ""))[:10])
        except ValueError:
            fail(f"{LATEST.name}: entry {i} needs a date added in the form YYYY-MM-DD")
        if not str(item.get("headline", "")).strip():
            fail(f"{LATEST.name}: entry {i} needs a description of what was added")


def main() -> None:
    cases = load_cases()
    check_latest(cases)
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SITE, OUT)
    dest = OUT / "data" / "cases.json"
    dest.write_text(json.dumps(cases, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"built _site/ with {len(cases)} cases")


if __name__ == "__main__":
    main()
