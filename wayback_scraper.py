#!/usr/bin/env python3
"""
wayback_scraper.py — Wayback Machine CDX API & Archive Scraper
==============================================================
Queries Wayback CDX API for snapshots of:
  - facebook.com/fuitartcafe*
  - facebook.com/Fuit-art-cafe-150065845126337*
  - facebook.com/events/*fuit*
  - fuit.gr/*
  - fuitwashere.gr/*

Outputs:
  - raw/wayback/
  - normalized/wayback.jsonl (Common Schema)
"""

import json
import re
import sys
import time
import urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup
import requests
import trafilatura

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

WAYBACK_PATTERNS = [
    "facebook.com/fuitartcafe*",
    "facebook.com/Fuit-art-cafe-150065845126337*",
    "facebook.com/events/*fuit*",
    "www.fuit.gr/*",
    "www.fuitwashere.gr/*"
]

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)


class WaybackScraper:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.raw_dir = self.base_dir / "raw" / "wayback"
        self.media_dir = self.raw_dir / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.records = []
        self.seen_captures = set()

    def query_cdx(self, pattern: str):
        cdx_url = f"https://web.archive.org/cdx/search/cdx?url={urllib.parse.quote(pattern)}&output=json&collapse=digest&filter=statuscode:200"
        try:
            time.sleep(0.5)
            r = self.session.get(cdx_url, timeout=15)
            if r.status_code == 200:
                rows = r.json()
                if len(rows) > 1:
                    # Skip header row [urlkey, timestamp, original, mime, statuscode, digest, length]
                    for row in rows[1:]:
                        if len(row) >= 3:
                            ts = row[1]
                            orig_url = row[2]
                            self.process_capture(ts, orig_url)
        except Exception as e:
            print(f"  [!] Failed Wayback CDX query for '{pattern}': {e}")

    def process_capture(self, timestamp: str, orig_url: str):
        key = f"{timestamp}_{orig_url}"
        if key in self.seen_captures:
            return
        self.seen_captures.add(key)

        lower_url = orig_url.lower()
        if not ("event" in lower_url or "photo" in lower_url or "vol" in lower_url or "post" in lower_url):
            return

        archive_url = f"https://web.archive.org/web/{timestamp}/{orig_url}"
        try:
            time.sleep(0.5)
            r = self.session.get(archive_url, timeout=15)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")

                # Extract OG metadata
                og_title = ""
                og_desc = ""
                og_image = ""
                for meta in soup.find_all("meta"):
                    prop = meta.get("property", "").lower()
                    if prop == "og:title":
                        og_title = meta.get("content", "")
                    elif prop == "og:description":
                        og_desc = meta.get("content", "")
                    elif prop == "og:image":
                        og_image = meta.get("content", "")

                extracted_text = trafilatura.extract(r.text) or og_desc
                title = og_title or (soup.find("title").text.strip() if soup.find("title") else orig_url)

                full_search = f"{title} {extracted_text}"
                core_match = VLAX_CORE_REGEX.search(full_search)
                context_match = VLAX_CONTEXT_REGEX.search(full_search)

                if core_match or context_match:
                    iso_date = f"{timestamp[:4]}-{timestamp[4:6]}-{timestamp[6:8]}T{timestamp[8:10]}:{timestamp[10:12]}:{timestamp[12:14]}Z"

                    venue = "Fuit Art Cafe"
                    city = "Γρεβενά"
                    if "κουκάκι" in full_search.lower() or "αυλή" in full_search.lower():
                        venue = "Καφενείο Η Αυλή"
                        city = "Αθήνα"
                    elif "βασιλίτσα" in full_search.lower():
                        venue = "Βασιλίτσα Ski Resort"
                        city = "Γρεβενά"

                    rec = {
                        "source": "wayback",
                        "source_url": archive_url,
                        "source_id": f"{timestamp}_{orig_url}",
                        "kind": "post" if "post" in lower_url else ("event" if "event" in lower_url else "photo"),
                        "date_iso": iso_date,
                        "date_confidence": "inferred",
                        "title": title,
                        "text": extracted_text,
                        "venue": venue,
                        "city": city,
                        "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if core_match else [],
                        "labels": ["wayback"],
                        "media": [{"url": og_image, "local_path": "", "width": 0, "height": 0, "credit": "wayback"}] if og_image else [],
                        "related_ids": [],
                        "is_vlax": bool(core_match or context_match),
                        "vlax_match": core_match.group(0) if core_match else context_match.group(0)
                    }
                    self.records.append(rec)
        except Exception as e:
            print(f"  [!] Failed fetching archive capture {archive_url}: {e}")

    def run(self):
        print("[INFO] Starting Wayback Machine Scraper...")
        for pattern in WAYBACK_PATTERNS:
            print(f"  [+] Querying Wayback CDX for {pattern}...")
            self.query_cdx(pattern)

        print(f"[INFO] Wayback Scraper recovered {len(self.records)} archived items.")

        # Write normalized output
        norm_file = self.norm_dir / "wayback.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    scraper = WaybackScraper()
    scraper.run()
