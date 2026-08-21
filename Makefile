# Makefile for ΒΛΑΞ / Fuit Art Cafe Digital Archive

PYTHON = venv/bin/python3

.PHONY: all blogs fb ig yt press audio wayback merge clean

all: blogs fb ig yt press audio wayback merge

blogs:
	$(PYTHON) fuit_scraper.py

fb:
	$(PYTHON) fb_export_parser.py
	$(PYTHON) fb_albums_resolver.py

ig:
	$(PYTHON) ig_scraper.py

yt:
	$(PYTHON) yt_scraper.py

press:
	$(PYTHON) press_scraper.py

audio:
	$(PYTHON) audio_scraper.py

wayback:
	$(PYTHON) wayback_scraper.py

merge:
	$(PYTHON) merge.py

clean:
	rm -rf fuit_dump/* raw/* normalized/* archive/*
