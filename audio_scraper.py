#!/usr/bin/env python3
"""
audio_scraper.py — Audio Platforms Scraper (Mixcloud, SoundCloud, Bandcamp)
==========================================================================
Searches Mixcloud public API, SoundCloud (via yt-dlp scsearch), and Bandcamp HTML search
for 'fuit', 'vlax', 'grevena', 'Χατζηκυριακίδης', 'Χατζής'.

Outputs:
  - raw/audio/
  - normalized/audio.jsonl (Common Schema)
  - normalized/audio_searched_queries.json (Sidecar)
"""

import json
import re
import sys
import time
import urllib.parse
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup
import requests

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
SEARCH_QUERIES = ["fuit", "vlax", "grevena", "Χατζηκυριακίδης", "Χατζής"]

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)


class AudioScraper:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.raw_dir = self.base_dir / "raw" / "audio"
        self.media_dir = self.raw_dir / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.records = []
        self.searched_queries = []

    def search_mixcloud(self, query: str):
        url = f"https://api.mixcloud.com/search/?q={urllib.parse.quote(query)}&type=cloudcast"
        try:
            time.sleep(0.5)
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                items = r.json().get("data", [])
                for item in items:
                    name = item.get("name", "")
                    mc_url = item.get("url", "")
                    user = item.get("user", {}).get("name", "")
                    text = f"{name} {user} {item.get('slug', '')}"

                    core_match = VLAX_CORE_REGEX.search(text)
                    context_match = VLAX_CONTEXT_REGEX.search(text)

                    if core_match or context_match:
                        rec = {
                            "source": "mixcloud",
                            "source_url": mc_url,
                            "source_id": item.get("key", mc_url),
                            "kind": "audio",
                            "date_iso": item.get("created_time", ""),
                            "date_confidence": "exact" if item.get("created_time") else "inferred",
                            "title": name,
                            "text": text,
                            "venue": "Fuit Art Cafe",
                            "city": "Γρεβενά",
                            "performers": [user] if user else [],
                            "labels": ["mixcloud"],
                            "media": [{"url": item.get("pictures", {}).get("large", ""), "local_path": "", "width": 0, "height": 0, "credit": "mixcloud"}],
                            "related_ids": [],
                            "is_vlax": bool(core_match or context_match),
                            "vlax_match": core_match.group(0) if core_match else context_match.group(0)
                        }
                        self.records.append(rec)
        except Exception as e:
            print(f"  [!] Failed Mixcloud search '{query}': {e}")

    def search_soundcloud(self, query: str):
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--dump-json",
            "--flat-playlist",
            "--no-warnings",
            f"scsearch10:{query}"
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if res.returncode == 0 and res.stdout:
                for line in res.stdout.splitlines():
                    if line.strip():
                        try:
                            item = json.loads(line)
                            title = item.get("title", "")
                            url = item.get("url", "")
                            uploader = item.get("uploader", "")
                            text = f"{title} {uploader}"

                            core_match = VLAX_CORE_REGEX.search(text)
                            context_match = VLAX_CONTEXT_REGEX.search(text)

                            if core_match or context_match:
                                rec = {
                                    "source": "soundcloud",
                                    "source_url": url,
                                    "source_id": item.get("id", url),
                                    "kind": "audio",
                                    "date_iso": "",
                                    "date_confidence": "unknown",
                                    "title": title,
                                    "text": text,
                                    "venue": "Fuit Art Cafe",
                                    "city": "Γρεβενά",
                                    "performers": [uploader] if uploader else [],
                                    "labels": ["soundcloud"],
                                    "media": [],
                                    "related_ids": [],
                                    "is_vlax": bool(core_match or context_match),
                                    "vlax_match": core_match.group(0) if core_match else context_match.group(0)
                                }
                                self.records.append(rec)
                        except Exception:
                            pass
        except Exception:
            pass

    def search_bandcamp(self, query: str):
        bc_url = f"https://bandcamp.com/search?q={urllib.parse.quote(query)}"
        try:
            time.sleep(0.5)
            r = self.session.get(bc_url, timeout=10)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for item in soup.find_all(class_="searchresult"):
                    heading = item.find(class_="heading")
                    if heading:
                        title = heading.text.strip()
                        link = heading.find("a")["href"] if heading.find("a") else ""
                        subtext = item.find(class_="subhead").text.strip() if item.find(class_="subhead") else ""
                        full_txt = f"{title} {subtext}"

                        core_match = VLAX_CORE_REGEX.search(full_txt)
                        context_match = VLAX_CONTEXT_REGEX.search(full_txt)

                        if core_match or context_match:
                            rec = {
                                "source": "bandcamp",
                                "source_url": link,
                                "source_id": link,
                                "kind": "audio",
                                "date_iso": "",
                                "date_confidence": "unknown",
                                "title": title,
                                "text": full_txt,
                                "venue": "Fuit Art Cafe",
                                "city": "Γρεβενά",
                                "performers": [],
                                "labels": ["bandcamp"],
                                "media": [],
                                "related_ids": [],
                                "is_vlax": bool(core_match or context_match),
                                "vlax_match": core_match.group(0) if core_match else context_match.group(0)
                            }
                            self.records.append(rec)
        except Exception:
            pass

    def run(self):
        print("[INFO] Starting Audio Platforms Scraper...")
        for q in SEARCH_QUERIES:
            print(f"  [+] Searching Audio platforms for '{q}'...")
            self.search_mixcloud(q)
            self.search_soundcloud(q)
            self.search_bandcamp(q)
            self.searched_queries.append({"query": q, "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")})

        print(f"[INFO] Audio Scraper recovered {len(self.records)} audio items.")

        # Write normalized output
        norm_file = self.norm_dir / "audio.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

        # Write sidecar search query record
        sidecar_file = self.norm_dir / "audio_searched_queries.json"
        with open(sidecar_file, "w", encoding="utf-8") as f:
            json.dump({
                "queries": SEARCH_QUERIES,
                "searched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "results_count": len(self.records)
            }, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    scraper = AudioScraper()
    scraper.run()
