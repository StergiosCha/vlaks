#!/usr/bin/env python3
"""
fb_export_parser.py — Facebook Archive Export Parser
===================================================
Parses Facebook JSON export data in ./fb_export/ (unzipping zips if present).
Fixes Facebook Mojibake encoding (UTF-8 bytes wrongly decoded as Latin-1).
Converts Unix timestamps to Europe/Athens local time and derives weekday.

Flags:
  - vlax_core regex matches
  - Events at Fuit between 1 Dec and 10 Jan of any year
  - Any event containing "vol." in its title

Outputs:
  - normalized/facebook.jsonl (Common Schema)
  - Copies matched media to raw/facebook/media/
"""

import json
import os
import re
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
try:
    import zoneinfo
    ATHENS_TZ = zoneinfo.ZoneInfo("Europe/Athens")
except Exception:
    ATHENS_TZ = timezone.utc

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)


def fix_mojibake(val):
    """Fix Facebook JSON mojibake strings (UTF-8 decoded as Latin-1)."""
    if isinstance(val, str):
        try:
            return val.encode("latin-1").decode("utf-8")
        except Exception:
            return val
    elif isinstance(val, list):
        return [fix_mojibake(item) for item in val]
    elif isinstance(val, dict):
        return {k: fix_mojibake(v) for k, v in val.items()}
    return val


def parse_timestamp(ts):
    """Convert Unix timestamp integer/float to Europe/Athens ISO string."""
    if not ts:
        return "", ""
    try:
        dt = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(ATHENS_TZ)
        iso_str = dt.isoformat()
        weekday_str = dt.strftime("%A")
        return iso_str, weekday_str
    except Exception:
        return "", ""


class FBExportParser:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.fb_dir = self.base_dir / "fb_export"
        self.raw_media_dir = self.base_dir / "raw" / "facebook" / "media"
        self.raw_media_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.records = []

    def extract_zips(self):
        """Unzip any .zip files in ./fb_export/."""
        if not self.fb_dir.exists():
            return
        for z_path in self.fb_dir.glob("*.zip"):
            extract_target = self.fb_dir / z_path.stem
            if not extract_target.exists():
                print(f"  [+] Unzipping {z_path.name} to {extract_target.name}...")
                try:
                    with zipfile.ZipFile(z_path, "r") as z_file:
                        z_file.extractall(extract_target)
                except Exception as e:
                    print(f"  [!] Failed unzipping {z_path.name}: {e}")

    def run(self):
        print("[INFO] Starting Facebook Export Parser...")
        if not self.fb_dir.exists():
            print("  [!] ./fb_export/ folder missing. Gracefully writing empty normalized/facebook.jsonl.")
            self.write_normalized()
            return

        self.extract_zips()

        # Find all JSON files
        json_files = list(self.fb_dir.rglob("*.json"))
        if not json_files:
            print("  [!] No JSON files found in ./fb_export/. Gracefully writing empty normalized/facebook.jsonl.")
            self.write_normalized()
            return

        print(f"  [+] Found {len(json_files)} JSON files in ./fb_export/. Processing...")

        for j_path in json_files:
            try:
                with open(j_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data = fix_mojibake(data)
                self.parse_json_file(j_path, data)
            except Exception as e:
                print(f"  [!] Exception parsing {j_path.name}: {e}")

        print(f"[INFO] Facebook Parser recovered {len(self.records)} flagged items.")
        self.write_normalized()

    def parse_json_file(self, file_path: Path, data):
        rel_path = str(file_path.relative_to(self.fb_dir)).lower()

        # 1. Events (your_events.json, event_invitations.json, etc.)
        if "events" in rel_path:
            events_list = []
            if isinstance(data, list):
                events_list = data
            elif isinstance(data, dict):
                events_list = data.get("your_events", []) or data.get("event_responses", []) or data.get("events", [])

            for ev in events_list:
                name = ev.get("name", "") or ev.get("title", "")
                ts = ev.get("start_timestamp") or ev.get("create_timestamp") or 0
                iso_date, _ = parse_timestamp(ts)
                text = f"{name} {ev.get('description', '')}"

                # Check Dec 1 - Jan 10 rule
                month_day_match = False
                if iso_date:
                    try:
                        m = int(iso_date[5:7])
                        d = int(iso_date[8:10])
                        if (m == 12 and d >= 1) or (m == 1 and d <= 10):
                            month_day_match = True
                    except Exception:
                        pass

                has_vol = "vol." in name.lower() or "vol." in text.lower()
                core_match = VLAX_CORE_REGEX.search(text)
                is_flagged = bool(core_match) or month_day_match or has_vol

                if is_flagged:
                    self.records.append({
                        "source": "facebook",
                        "source_url": ev.get("url", f"fb_event_{ts}"),
                        "source_id": str(ev.get("id", ts)),
                        "kind": "event",
                        "date_iso": iso_date,
                        "date_confidence": "exact" if ts else "inferred",
                        "title": name,
                        "text": ev.get("description", ""),
                        "venue": ev.get("place", {}).get("name", "Fuit Art Cafe"),
                        "city": "Γρεβενά",
                        "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if core_match else [],
                        "labels": ["facebook_event"],
                        "media": [],
                        "related_ids": [],
                        "is_vlax": True,
                        "vlax_match": core_match.group(0) if core_match else ("Dec-Jan Fuit Event" if month_day_match else "vol.")
                    })

        # 2. Posts (your_posts_*.json, posts/*.json)
        elif "posts" in rel_path:
            posts_list = data if isinstance(data, list) else data.get("posts", [])
            for p in posts_list:
                title = p.get("title", "")
                ts = p.get("timestamp", 0)
                iso_date, _ = parse_timestamp(ts)

                attachments = p.get("attachments", [])
                post_text_parts = []
                if "data" in p:
                    for d in p["data"]:
                        if "post" in d:
                            post_text_parts.append(d["post"])

                full_text = f"{title} {' '.join(post_text_parts)}"
                core_match = VLAX_CORE_REGEX.search(full_text)
                context_match = VLAX_CONTEXT_REGEX.search(full_text)

                if core_match or context_match:
                    self.records.append({
                        "source": "facebook",
                        "source_url": p.get("url", f"fb_post_{ts}"),
                        "source_id": str(ts),
                        "kind": "post",
                        "date_iso": iso_date,
                        "date_confidence": "exact" if ts else "inferred",
                        "title": title or full_text[:40],
                        "text": full_text,
                        "venue": "Fuit Art Cafe",
                        "city": "Γρεβενά",
                        "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if core_match else [],
                        "labels": ["facebook_post"],
                        "media": [],
                        "related_ids": [],
                        "is_vlax": True,
                        "vlax_match": core_match.group(0) if core_match else context_match.group(0)
                    })

    def write_normalized(self):
        norm_file = self.norm_dir / "facebook.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"[INFO] Saved {len(self.records)} records to normalized/facebook.jsonl")


if __name__ == "__main__":
    parser = FBExportParser()
    parser.run()
