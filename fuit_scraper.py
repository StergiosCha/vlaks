#!/usr/bin/env python3
"""
fuit_scraper.py — Blogger Scraper for Fuit Art Cafe & Fuit Was Here
=====================================================================
Pulls posts and comments from:
  - https://www.fuit.gr/feeds/posts/default?alt=json&max-results=500
  - https://www.fuitwashere.gr/feeds/posts/default?alt=json&max-results=500
  - Corresponding comment feeds

Outputs:
  - fuit_dump/posts.jsonl
  - fuit_dump/posts.csv
  - fuit_dump/vlax_posts.csv
  - fuit_dump/fb_refs.txt
  - fuit_dump/yt_refs.txt
  - raw/blogs/media/ (high-res images for vlax_core)
  - normalized/blogs.jsonl (Common Schema)
"""

import csv
import json
import os
import re
import sys
import time
import urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup
import requests

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)

BLOG_SOURCES = [
    {"name": "fuit.gr", "url": "https://www.fuit.gr"},
    {"name": "fuitwashere.gr", "url": "https://www.fuitwashere.gr"}
]


def upgrade_blogger_img_url(url: str) -> str:
    """Replace thumbnail sizing params in Blogger image URLs with /s0/ for full resolution."""
    if not url:
        return ""
    upgraded = re.sub(r"/s\d+(-c)?/", "/s0/", url)
    upgraded = re.sub(r"/w\d+-h\d+(-c)?/", "/s0/", upgraded)
    return upgraded


def extract_fb_album_ids(html_content: str, text_content: str) -> list:
    """Extract Facebook album IDs or set=a. IDs from text/HTML."""
    full_text = f"{html_content} {text_content}"
    matches = set()
    for m in re.finditer(r"set=a\.(\d+)", full_text):
        matches.add(f"set=a.{m.group(1)}")
    for m in re.finditer(r"(?:fbid|album_id|albums)/(\d+)", full_text):
        matches.add(f"fbid={m.group(1)}")
    return sorted(list(matches))


def extract_yt_video_ids(html_content: str, text_content: str) -> list:
    """Extract YouTube video IDs from text/HTML embeds."""
    full_text = f"{html_content} {text_content}"
    matches = set()
    patterns = [
        r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})"
    ]
    for p in patterns:
        for m in re.finditer(p, full_text):
            matches.add(m.group(1))
    return sorted(list(matches))


def clean_html_text(html_str: str) -> str:
    if not html_str:
        return ""
    soup = BeautifulSoup(html_str, "html.parser")
    for t in soup(["script", "style"]):
        t.decompose()
    return soup.get_text(separator="\n").strip()


class FuitBloggerScraper:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.dump_dir = self.base_dir / "fuit_dump"
        self.dump_dir.mkdir(parents=True, exist_ok=True)
        self.raw_dir = self.base_dir / "raw" / "blogs"
        self.media_dir = self.raw_dir / "media"
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/javascript, */*; q=0.01"
        })

        self.all_posts = []
        self.comments_by_post = {}
        self.fb_refs = set()
        self.yt_refs = set()

    def fetch_feed(self, url: str) -> dict:
        time.sleep(0.5)
        try:
            resp = self.session.get(url, timeout=15)
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            print(f"  [!] Failed fetching {url}: {e}")
        return {}

    def run(self):
        print("[INFO] Starting Blogger Scraper for fuit.gr & fuitwashere.gr...")

        for b in BLOG_SOURCES:
            b_name = b["name"]
            b_url = b["url"]
            posts_feed_url = f"{b_url}/feeds/posts/default?alt=json&max-results=500"
            comments_feed_url = f"{b_url}/feeds/comments/default?alt=json&max-results=500"

            print(f"  [+] Fetching posts from {b_name}...")
            posts_data = self.fetch_feed(posts_feed_url)
            entries = posts_data.get("feed", {}).get("entry", [])
            print(f"      Retrieved {len(entries)} posts.")

            print(f"  [+] Fetching comments from {b_name}...")
            comments_data = self.fetch_feed(comments_feed_url)
            comment_entries = comments_data.get("feed", {}).get("entry", [])
            print(f"      Retrieved {len(comment_entries)} comments.")

            for c in comment_entries:
                c_text = clean_html_text(c.get("content", {}).get("$t", ""))
                c_links = c.get("link", [])
                post_link = ""
                for l in c_links:
                    if l.get("rel") == "alternate":
                        post_link = l.get("href", "")
                if post_link:
                    if post_link not in self.comments_by_post:
                        self.comments_by_post[post_link] = []
                    self.comments_by_post[post_link].append(c_text)

            for e in entries:
                post_id = e.get("id", {}).get("$t", "")
                title = e.get("title", {}).get("$t", "")
                published = e.get("published", {}).get("$t", "")
                content_html = e.get("content", {}).get("$t", "")
                text = clean_html_text(content_html)

                post_url = ""
                for l in e.get("link", []):
                    if l.get("rel") == "alternate":
                        post_url = l.get("href", "")

                soup = BeautifulSoup(content_html, "html.parser")
                imgs = []
                for img_tag in soup.find_all("img"):
                    src = img_tag.get("src")
                    if src:
                        high_res_url = upgrade_blogger_img_url(src)
                        imgs.append(high_res_url)

                fb_albums = extract_fb_album_ids(content_html, text)
                yt_videos = extract_yt_video_ids(content_html, text)

                for fba in fb_albums:
                    self.fb_refs.add(fba)
                for ytv in yt_videos:
                    self.yt_refs.add(ytv)

                full_search_str = f"{title} {text}"
                core_match = VLAX_CORE_REGEX.search(full_search_str)
                context_match = VLAX_CONTEXT_REGEX.search(full_search_str)

                vlax_core = bool(core_match)
                vlax_context = bool(context_match)
                is_vlax = vlax_core or vlax_context
                matched_str = core_match.group(0) if core_match else (context_match.group(0) if context_match else "")

                venue = "Fuit Art Cafe" if "fuit.gr" in post_url or "Fuit" in full_search_str else "Unknown"
                city = "Γρεβενά" if "Γρεβενά" in full_search_str or "Fuit" in full_search_str else "Γρεβενά"
                if "Κουκάκι" in full_search_str or "Αυλή" in full_search_str:
                    venue = "Καφενείο Η Αυλή"
                    city = "Αθήνα"
                elif "Βασιλίτσα" in full_search_str:
                    venue = "Βασιλίτσα Ski Resort"
                    city = "Γρεβενά"

                post_rec = {
                    "source": "blogs",
                    "blog_name": b_name,
                    "source_url": post_url,
                    "source_id": post_id,
                    "kind": "post",
                    "date_iso": published,
                    "date_confidence": "exact",
                    "title": title,
                    "text": text,
                    "content_html": content_html,
                    "venue": venue,
                    "city": city,
                    "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if vlax_core else [],
                    "labels": [cat.get("term") for cat in e.get("category", []) if cat.get("term")],
                    "media_urls": imgs,
                    "fb_albums": fb_albums,
                    "yt_videos": yt_videos,
                    "comments": self.comments_by_post.get(post_url, []),
                    "vlax_core": vlax_core,
                    "vlax_context": vlax_context,
                    "is_vlax": is_vlax,
                    "vlax_match": matched_str
                }
                self.all_posts.append(post_rec)

        print(f"[INFO] Processed {len(self.all_posts)} total blog posts.")

        self.save_dump_files()
        self.save_normalized()
        self.download_core_media()

    def save_dump_files(self):
        print("[INFO] Writing fuit_dump files...")

        with open(self.dump_dir / "posts.jsonl", "w", encoding="utf-8") as f:
            for p in self.all_posts:
                f.write(json.dumps(p, ensure_ascii=False) + "\n")

        fieldnames = ["source_url", "blog_name", "date_iso", "title", "vlax_core", "vlax_context", "is_vlax", "vlax_match", "media_count", "fb_albums_count", "yt_videos_count"]
        with open(self.dump_dir / "posts.csv", "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for p in self.all_posts:
                writer.writerow({
                    "source_url": p["source_url"],
                    "blog_name": p["blog_name"],
                    "date_iso": p["date_iso"],
                    "title": p["title"],
                    "vlax_core": p["vlax_core"],
                    "vlax_context": p["vlax_context"],
                    "is_vlax": p["is_vlax"],
                    "vlax_match": p["vlax_match"],
                    "media_count": len(p["media_urls"]),
                    "fb_albums_count": len(p["fb_albums"]),
                    "yt_videos_count": len(p["yt_videos"])
                })

        with open(self.dump_dir / "vlax_posts.csv", "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for p in self.all_posts:
                if p["is_vlax"]:
                    writer.writerow({
                        "source_url": p["source_url"],
                        "blog_name": p["blog_name"],
                        "date_iso": p["date_iso"],
                        "title": p["title"],
                        "vlax_core": p["vlax_core"],
                        "vlax_context": p["vlax_context"],
                        "is_vlax": p["is_vlax"],
                        "vlax_match": p["vlax_match"],
                        "media_count": len(p["media_urls"]),
                        "fb_albums_count": len(p["fb_albums"]),
                        "yt_videos_count": len(p["yt_videos"])
                    })

        with open(self.dump_dir / "fb_refs.txt", "w", encoding="utf-8") as f:
            for ref in sorted(list(self.fb_refs)):
                f.write(ref + "\n")

        with open(self.dump_dir / "yt_refs.txt", "w", encoding="utf-8") as f:
            for ref in sorted(list(self.yt_refs)):
                f.write(ref + "\n")

    def download_core_media(self):
        print("[INFO] Downloading high-res media for vlax_core posts...")
        core_posts = [p for p in self.all_posts if p["vlax_core"]]
        for p in core_posts:
            post_slug = re.sub(r"[^\w]", "_", p["title"])[:30]
            for idx, img_url in enumerate(p["media_urls"]):
                ext = img_url.split("?")[0].split(".")[-1]
                if ext.lower() not in ["jpg", "jpeg", "png", "webp", "gif"]:
                    ext = "jpg"
                local_filename = f"{p['date_iso'][:10]}_{post_slug}_{idx}.{ext}"
                local_path = self.media_dir / local_filename

                if not local_path.exists():
                    try:
                        time.sleep(0.5)
                        resp = self.session.get(img_url, timeout=15)
                        if resp.status_code == 200:
                            with open(local_path, "wb") as f_img:
                                f_img.write(resp.content)
                    except Exception as e:
                        print(f"  [!] Failed downloading image {img_url}: {e}")

    def save_normalized(self):
        print("[INFO] Writing normalized/blogs.jsonl...")
        norm_file = self.norm_dir / "blogs.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for p in self.all_posts:
                media_objs = []
                for idx, u in enumerate(p["media_urls"]):
                    post_slug = re.sub(r"[^\w]", "_", p["title"])[:30]
                    ext = u.split("?")[0].split(".")[-1]
                    if ext.lower() not in ["jpg", "jpeg", "png", "webp", "gif"]:
                        ext = "jpg"
                    local_filename = f"{p['date_iso'][:10]}_{post_slug}_{idx}.{ext}"
                    local_path = str(self.media_dir / local_filename) if p["vlax_core"] else ""

                    media_objs.append({
                        "url": u,
                        "local_path": local_path,
                        "width": 0,
                        "height": 0,
                        "credit": p["blog_name"]
                    })

                rec = {
                    "source": "blogs",
                    "source_url": p["source_url"],
                    "source_id": p["source_id"],
                    "kind": "post",
                    "date_iso": p["date_iso"],
                    "date_confidence": "exact",
                    "title": p["title"],
                    "text": p["text"],
                    "venue": p["venue"],
                    "city": p["city"],
                    "performers": p["performers"],
                    "labels": p["labels"],
                    "media": media_objs,
                    "related_ids": p["fb_albums"] + p["yt_videos"],
                    "is_vlax": p["is_vlax"],
                    "vlax_match": p["vlax_match"]
                }
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    scraper = FuitBloggerScraper()
    scraper.run()
