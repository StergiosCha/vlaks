#!/usr/bin/env python3
"""
press_scraper.py — Local Press & News Scraper
==============================================
Scrapes articles mentioning 'fuit', 'φούιτ', 'ΒΛΑΞ', 'Χατζηκυριακίδης', 'Radical Party'
across local press portals (grevenamedia.gr, e-grevena.com, grevenanews.gr, etc.) and kathimerini.gr.

Tries WordPress REST API (/wp-json/wp/v2/posts) first, falling back to HTML search + trafilatura.

Outputs:
  - raw/press/
  - normalized/press.jsonl (Common Schema)
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

PRESS_DOMAINS = [
    "grevenamedia.gr",
    "e-grevena.com",
    "grevenanews.gr",
    "grevena-news.gr",
    "ingrevena.gr",
    "sfd.gr",
    "pirsogia.gr"
]

SEARCH_QUERIES = ["fuit", "φούιτ", "ΒΛΑΞ", "Χατζηκυριακίδης", "Radical Party"]

VLAX_CORE_REGEX = re.compile(r"ΒΛΑΞ|VLAX|VLAKS|Ράντικαλ|Radical Party|Live to Get Radical", re.IGNORECASE)
VLAX_CONTEXT_REGEX = re.compile(r"fuit|φούιτ|γρεβενά|party|πάρτι|αυλή|κουκάκι|βασιλίτσα|vol\.", re.IGNORECASE)


class LocalPressScraper:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir).resolve()
        self.raw_dir = self.base_dir / "raw" / "press"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.norm_dir = self.base_dir / "normalized"
        self.norm_dir.mkdir(parents=True, exist_ok=True)

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.records = []
        self.seen_urls = set()

    def scrape_wp_rest(self, domain: str, query: str):
        url = f"https://{domain}/wp-json/wp/v2/posts?search={urllib.parse.quote(query)}&per_page=50"
        try:
            time.sleep(0.5)
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                posts = r.json()
                if isinstance(posts, list):
                    for p in posts:
                        p_link = p.get("link", "")
                        if p_link and p_link not in self.seen_urls:
                            self.seen_urls.add(p_link)
                            title = p.get("title", {}).get("rendered", "")
                            content_raw = p.get("content", {}).get("rendered", "")
                            text = trafilatura.extract(content_raw) or content_raw
                            date_iso = p.get("date", "")

                            self.process_article(p_link, title, text, date_iso, domain)
        except Exception:
            pass

    def scrape_html_fallback(self, domain: str, query: str):
        search_url = f"https://{domain}/?s={urllib.parse.quote(query)}"
        try:
            time.sleep(0.5)
            r = self.session.get(search_url, timeout=10)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                links = set()
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if domain in href and "/20" in href:  # Date-based post URL pattern
                        links.add(href)

                for link in list(links)[:10]:
                    if link not in self.seen_urls:
                        self.seen_urls.add(link)
                        try:
                            time.sleep(0.5)
                            ar_resp = self.session.get(link, timeout=10)
                            if ar_resp.status_code == 200:
                                text = trafilatura.extract(ar_resp.text) or ""
                                ar_soup = BeautifulSoup(ar_resp.text, "html.parser")
                                title = ar_soup.find("h1").text.strip() if ar_soup.find("h1") else link
                                self.process_article(link, title, text, "", domain)
                        except Exception:
                            pass
        except Exception:
            pass

    def scrape_kathimerini(self):
        k_url = "https://www.kathimerini.gr/?s=" + urllib.parse.quote("fuit Γρεβενά")
        try:
            r = self.session.get(k_url, timeout=10)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if "kathimerini.gr" in href and ("fuit" in href.lower() or "grevena" in href.lower()):
                        if href not in self.seen_urls:
                            self.seen_urls.add(href)
                            ar = self.session.get(href, timeout=10)
                            if ar.status_code == 200:
                                text = trafilatura.extract(ar.text) or ""
                                self.process_article(href, "Kathimerini Mention", text, "2020-01-01T00:00:00Z", "kathimerini.gr")
        except Exception:
            pass

    def process_article(self, url: str, title: str, text: str, date_iso: str, domain: str):
        full_search = f"{title} {text}"
        core_match = VLAX_CORE_REGEX.search(full_search)
        context_match = VLAX_CONTEXT_REGEX.search(full_search)

        if not (core_match or context_match):
            return

        rec = {
            "source": "press",
            "source_url": url,
            "source_id": url,
            "kind": "article",
            "date_iso": date_iso,
            "date_confidence": "exact" if date_iso else "inferred",
            "title": title,
            "text": text,
            "venue": "Fuit Art Cafe",
            "city": "Γρεβενά",
            "performers": ["Στέργιος Χατζηκυριακίδης", "Αλέξανδρος Χατζής"] if core_match else [],
            "labels": [domain],
            "media": [],
            "related_ids": [],
            "is_vlax": bool(core_match or context_match),
            "vlax_match": core_match.group(0) if core_match else context_match.group(0)
        }
        self.records.append(rec)

    def run(self):
        print("[INFO] Starting Local Press Scraper...")
        for domain in PRESS_DOMAINS:
            for q in SEARCH_QUERIES:
                print(f"  [+] Searching {domain} for '{q}'...")
                self.scrape_wp_rest(domain, q)
                self.scrape_html_fallback(domain, q)

        print("  [+] Searching Kathimerini for 'fuit Γρεβενά'...")
        self.scrape_kathimerini()

        print(f"[INFO] Local Press Scraper recovered {len(self.records)} articles.")

        # Write normalized output
        norm_file = self.norm_dir / "press.jsonl"
        with open(norm_file, "w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    scraper = LocalPressScraper()
    scraper.run()
