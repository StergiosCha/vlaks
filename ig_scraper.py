#!/usr/bin/env python3
"""
ig_scraper.py — Instagram Scraper for Fuit Art Cafe & Radical Party
===================================================================
Scrapes Instagram profiles (@fuitartcafe.gr, @fuitwashere.gr, @fuitartcafe)
and hashtags (#fuitartcafe, #fuitwashere, #keepgrevenaweird, #radicalparty, #vlax, #βλαξ).

Outputs:
  - raw/instagram/
  - normalized/instagram.jsonl (Common Schema)
"""

import json
import os
import random
import re
import sys
import time
from pathlib import Path
import instaloader
import requests

TARGET_PROFILES = ["fuitartcafe.gr", "fuitwashere.gr", "fuitartcafe"]
TARGET_HASHTAGS = ["fuitartcafe", "fuitwashere", "keepgrevenaweird", "radicalparty", "vlax", "βλαξ"]

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)


class InstagramScraper:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.raw_dir = self.base_dir / "raw" / "instagram"
        self.media_dir = self.raw_dir / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.loader = instaloader.Instaloader(
            download_pictures=True,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=True,
            compress_json=False
        )

        session_file = self.base_dir / "instagram_session"
        if session_file.exists():
            try:
                self.loader.load_session_from_file("fuitartcafe", filename=str(session_file))
                print("  [+] Loaded Instagram session file.")
            except Exception as e:
                print(f"  [!] Failed loading session file: {e}")

        self.records = []

    def throttle(self):
        jitter = random.uniform(5.0, 12.0)
        time.sleep(jitter)

    def process_post(self, post, source_label):
        caption = post.caption or ""
        dt = post.date_utc
        iso_date = dt.isoformat() if dt else ""

        full_search_str = f"{caption} {post.location or ''}"
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

        media_objs = []
        if post.url:
            local_filename = f"{dt.strftime('%Y-%m-%d')}_{post.shortcode}.jpg"
            local_path = str(self.media_dir / local_filename)
            media_objs.append({
                "url": post.url,
                "local_path": local_path if is_vlax else "",
                "width": 0,
                "height": 0,
                "credit": f"instagram/{source_label}"
            })

            # Save media file if vlax
            if is_vlax and not Path(local_path).exists():
                try:
                    r = requests.get(post.url, timeout=15)
                    if r.status_code == 200:
                        with open(local_path, "wb") as f_img:
                            f_img.write(r.content)
                except Exception:
                    pass

        rec = {
            "source": "instagram",
            "source_url": f"https://www.instagram.com/p/{post.shortcode}/",
            "source_id": post.shortcode,
            "kind": "post",
            "date_iso": iso_date,
            "date_confidence": "exact" if dt else "inferred",
            "title": caption[:40] if caption else f"Instagram post {post.shortcode}",
            "text": caption,
            "venue": venue,
            "city": city,
            "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if vlax_core else [],
            "labels": [f"ig_{source_label}"],
            "media": media_objs,
            "related_ids": [],
            "is_vlax": is_vlax,
            "vlax_match": core_match.group(0) if core_match else (context_match.group(0) if context_match else "")
        }
        self.records.append(rec)

    def run(self):
        print("[INFO] Starting Instagram Scraper...")

        for target in TARGET_PROFILES:
            print(f"  [+] Scraping profile @{target}...")
            try:
                profile = instaloader.Profile.from_username(self.loader.context, target)
                count = 0
                for post in profile.get_posts():
                    self.process_post(post, target)
                    count += 1
                    if count >= 100:  # Safety cap for unauthenticated requests
                        break
                    self.throttle()
                print(f"      Scraped {count} posts from @{target}.")
            except instaloader.exceptions.ProfileNotExistsException:
                print(f"  [!] Profile @{target} does not exist.")
            except instaloader.exceptions.LoginRequiredException:
                print(f"  [!] Profile @{target} requires login. Skipping profile posts.")
            except Exception as e:
                print(f"  [!] Exception scraping profile @{target}: {e}")

        # Write normalized output
        norm_file = self.norm_dir / "instagram.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

        print(f"[INFO] Instagram Scraper saved {len(self.records)} records to normalized/instagram.jsonl.")


if __name__ == "__main__":
    scraper = InstagramScraper()
    scraper.run()
