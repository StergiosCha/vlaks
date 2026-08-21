#!/usr/bin/env python3
"""
test_archive.py — Unit Tests for ΒΛΑΞ Digital Archive
=====================================================
"""

import json
import pytest
from fb_export_parser import fix_mojibake, parse_timestamp
from fuit_scraper import upgrade_blogger_img_url, VLAX_CORE_REGEX


def test_fix_mojibake():
    # Test UTF-8 bytes wrongly decoded as Latin-1
    original_greek = "ΒΛΑΞ"
    mojibake = original_greek.encode("utf-8").decode("latin-1")
    fixed = fix_mojibake(mojibake)
    assert fixed == original_greek
    assert "ΒΛΑΞ" in fixed


def test_vlax_regex_matching():
    text = "Έρχεται το μεγάλο πάρτι ΒΛΑΞ vol.04 στο Fuit!"
    match = VLAX_CORE_REGEX.search(text)
    assert match is not None
    assert match.group(0) == "ΒΛΑΞ"


def test_blogger_img_upgrade():
    thumb_url = "https://1.bp.blogspot.com/-abc/s320/photo.jpg"
    upgraded = upgrade_blogger_img_url(thumb_url)
    assert "/s0/" in upgraded
    assert "/s320/" not in upgraded


def test_parse_timestamp():
    ts = 1578900000  # Jan 13, 2020
    iso_str, weekday = parse_timestamp(ts)
    assert iso_str.startswith("2020-01-13")
    assert weekday != ""
