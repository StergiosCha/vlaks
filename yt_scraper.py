#!/usr/bin/env python3
"""
yt_scraper.py — YouTube Metadata & Media Scraper
===============================================
Scrapes YouTube channel UC3vBqK4NqAylS5OthgDyZXQ, video IDs in yt_refs.txt,
and ytsearch50 queries ('fuit art cafe grevena', 'ΒΛΑΞ Γρεβενά') using yt-dlp.

Outputs:
  - raw/youtube/
  - normalized/youtube.jsonl (Common Schema)
"""

import json
import os
import re
import sys
import subprocess
from pathlib import Path

CHANNEL_URL = "https://www.youtube.com/channel/UC3vBqK4NqAylS5OthgDyZXQ"
SEARCH_QUERIES = ["fuit art cafe grevena", "ΒΛΑΞ Γρεβενά"]

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)


class YouTubeScraper:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.yt_refs_file = self.base_dir / "fuit_dump" / "yt_refs.txt"
        self.raw_dir = self.base_dir / "raw" / "youtube"
        self.media_dir = self.raw_dir / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.records = []
        self.processed_ids = set()

    def run_yt_dlp_metadata(self, target_url: str):
        """Run yt-dlp to extract JSON metadata without downloading video payload."""
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--dump-json",
            "--flat-playlist",
            "--no-warnings",
            target_url
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode == 0 and res.stdout:
                for line in res.stdout.splitlines():
                    if line.strip():
                        try:
                            item = json.loads(line)
                            self.process_yt_item(item)
                        except Exception:
                            pass
        except Exception as e:
            print(f"  [!] Failed running yt-dlp on {target_url}: {e}")

    def process_yt_item(self, item: dict):
        vid = item.get("id")
        if not vid or vid in self.processed_ids:
            return
        self.processed_ids.add(vid)

        title = item.get("title") or item.get("fulltitle") or f"YouTube Video {vid}"
        desc = item.get("description") or ""
        upload_date = item.get("upload_date") or ""
        iso_date = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:8]}" if len(upload_date) == 8 else ""

        full_search_str = f"{title} {desc}"
        core_match = VLAX_CORE_REGEX.search(full_search_str)
        context_match = VLAX_CONTEXT_REGEX.search(full_search_str)

        vlax_core = bool(core_match)
        vlax_context = bool(context_match)
        is_vlax = vlax_core or vlax_context

        venue = "Fuit Art Cafe"
        city = "Γρεβενά"
        if "κουκάκι" in full_search_str.lower() or "αυλή" in full_search_str.lower():
            venue = "Καφενείο Η Αυλή"
            city = "Αθήνα"
        elif "βασιλίτσα" in full_search_str.lower():
            venue = "Βασιλίτσα Ski Resort"
            city = "Γρεβενά"

        yt_url = f"https://www.youtube.com/watch?v={vid}"
        thumbnail_url = item.get("thumbnail") or f"https://img.youtube.com/vi/{vid}/maxresdefault.jpg"

        rec = {
            "source": "youtube",
            "source_url": yt_url,
            "source_id": vid,
            "kind": "video",
            "date_iso": iso_date,
            "date_confidence": "exact" if iso_date else "inferred",
            "title": title,
            "text": desc,
            "venue": venue,
            "city": city,
            "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if vlax_core else [],
            "labels": ["youtube"],
            "media": [{
                "url": thumbnail_url,
                "local_path": "",
                "width": item.get("width", 0),
                "height": item.get("height", 0),
                "credit": "youtube"
            }],
            "related_ids": [],
            "is_vlax": is_vlax,
            "vlax_match": core_match.group(0) if core_match else (context_match.group(0) if context_match else "")
        }
        self.records.append(rec)

    def run(self):
        print("[INFO] Starting YouTube Scraper...")

        # 1. Channel
        print(f"  [+] Fetching channel metadata for {CHANNEL_URL}...")
        self.run_yt_dlp_metadata(CHANNEL_URL)

        # 2. YT Refs from blog
        if self.yt_refs_file.exists():
            refs = [l.strip() for l in open(self.yt_refs_file, "r", encoding="utf-8") if l.strip()]
            print(f"  [+] Processing {len(refs)} video IDs from yt_refs.txt...")
            for vid in refs:
                self.run_yt_dlp_metadata(f"https://www.youtube.com/watch?v={vid}")

        # 3. Search queries
        for q in SEARCH_QUERIES:
            print(f"  [+] Running YouTube search: 'ytsearch20:{q}'...")
            self.run_yt_dlp_metadata(f"ytsearch20:{q}")

        print(f"[INFO] YouTube Scraper recovered {len(self.records)} videos.")

        # Write normalized output
        norm_file = self.norm_dir / "youtube.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    scraper = YouTubeScraper()
    scraper.run()
