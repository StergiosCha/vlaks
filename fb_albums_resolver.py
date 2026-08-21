#!/usr/bin/env python3
"""
fb_albums_resolver.py — Facebook Albums Resolver
=================================================
Matches Facebook album IDs from fuit_dump/fb_refs.txt against parsed Facebook archive exports,
linking blog posts to album photos, titles, and dates.
"""

import json
from pathlib import Path

def resolve_albums(base_dir="."):
    base = Path(base_dir).resolve()
    fb_refs_file = base / "fuit_dump" / "fb_refs.txt"
    norm_blogs_file = base / "normalized" / "blogs.jsonl"
    norm_fb_file = base / "normalized" / "facebook.jsonl"

    if not fb_refs_file.exists():
        print("[INFO] No fuit_dump/fb_refs.txt found.")
        return

    refs = [line.strip() for line in open(fb_refs_file, "r", encoding="utf-8") if line.strip()]
    print(f"[INFO] Resolving {len(refs)} Facebook album references...")

    fb_records_by_id = {}
    if norm_fb_file.exists() and norm_fb_file.stat().st_size > 0:
        for line in open(norm_fb_file, "r", encoding="utf-8"):
            if line.strip():
                try:
                    rec = json.loads(line)
                    fb_records_by_id[rec.get("source_id")] = rec
                except Exception:
                    pass

    resolved_count = 0
    updated_blog_records = []

    if norm_blogs_file.exists() and norm_blogs_file.stat().st_size > 0:
        for line in open(norm_blogs_file, "r", encoding="utf-8"):
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
                rel_ids = rec.get("related_ids", [])
                matched_albums = []
                for r_id in rel_ids:
                    clean_id = r_id.replace("set=a.", "").replace("fbid=", "")
                    if clean_id in fb_records_by_id:
                        matched_albums.append(fb_records_by_id[clean_id])
                        resolved_count += 1
                if matched_albums:
                    rec["resolved_fb_albums"] = matched_albums
                updated_blog_records.append(rec)
            except Exception:
                pass

        if updated_blog_records:
            with open(norm_blogs_file, "w", encoding="utf-8") as f:
                for r in updated_blog_records:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"[INFO] Resolved {resolved_count} album links across {len(updated_blog_records)} blog records.")

if __name__ == "__main__":
    resolve_albums()
