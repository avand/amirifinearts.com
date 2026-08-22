# Squarespace archive

Captured 2026-08-22, while amirifinearts.com was still live on Squarespace.
This is the source of truth for the migration. Do not cancel the Squarespace
plan until the new site is live and verified against this.

- `pages/*.html` — raw page HTML as served
- `pages/*.json` — Squarespace's own `?format=json-pretty` payload per page
- `images/` — all 111 images at `?format=original` (112 MB)
- `inventory.json` — per-image: title, price, source URL, dimensions, local file
- `extract.py` — the scraper that produced the above; rerunnable

Titles and prices came out of each `<img alt="Title ($Price)">`. Every image has
a title; 19 of 56 works on the Collection page carry a price.
