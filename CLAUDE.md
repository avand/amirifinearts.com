# amirifinearts.com

Fahimeh Amiri's site. Static, Jekyll, GitHub Pages. Migrated off Squarespace in
August 2026.

Most of what you need is in a comment next to the thing it explains. This file
is only for what you cannot find by opening the file you are about to edit.

## How the site is shaped

Five pages plus four section pages, and it matters which is which:

| | |
|---|---|
| `/` | The **Collection index**: four covers, one per section. Not a list of work. |
| `/paintings/` `/persian-miniatures/` `/illustrations/` `/posters/` | A section: its works stacked down a 420px column on the left, its name and description on the right. Clicking a work opens it full screen. |
| `/gallery/` `/classes/` `/profile/` | Carry a **carousel** — arrows, a thumbnail strip, keyboard and swipe. |
| `/contact/` | The message form. `/classes/` has a second copy of it under *Enroll*. |

52 works: 26 paintings, 7 miniatures, 10 illustrations, 9 posters.

## Adding a painting

This is the common task and the whole reason the site moved.

1. Put the photo in `images/works/` under a lower-case hyphenated name.
2. Add `_works/<category>-<name>.md`:

```yaml
---
title: "Spring Flowers"
category: paintings        # paintings | miniatures | illustrations | posters
order: 12                  # position within its section
image: /images/works/spring-flowers.jpg
width: 2000                # optional, but they stop the page jumping as it loads
height: 2593
note: "24 × 30 — Acrylic"  # size and medium, as Fahimeh writes it
price: 4000                # optional. A number, no $ and no commas.
---
```

That is the entire record. There is no body text — the file is front matter and
nothing else.

3. Make its smaller copies — `bin/dev` does this by itself within a second or
   two of the photo landing; otherwise run `bin/resize`. Commit what appears
   under `images/sized/` along with the photo.

Forgetting step 3 does not break anything: the page falls back to the original
photo, and is just slower to load for it.

## Images come in two sizes

`images/` holds the originals, most 2000–3300px and 1–4MB. No page shows those
directly — a painting on a section page is 420px wide. `bin/resize` makes JPEG
copies at 240, 480 and 960px wide under `images/sized/<width>/`, and every
`<img>` asks for those through `_includes/sized.html`. That cut the image weight
of a page by five to eighteen times.

The originals are only fetched by the full-screen view on a section page
(`_includes/lightbox.html` + `assets/lightbox.js`, opted into with
`lightbox: true`). It shows the copy already on the page instantly and swaps in
the original when it arrives.

The copies are committed, not built: GitHub Pages will not run a plugin that
could make them. `bin/resize` needs `vips` (`brew install vips`).

## Prices are data, not layout

Every price lives in its work's front matter. **`show_prices` in `_config.yml`
decides whether any of them render.** It is currently `false`, because Fahimeh
asked for them off.

Turning them back on is that one word. Do not delete a `price:` to hide it — the
toggle exists so that pulling prices from the site does not mean retyping
nineteen numbers to put them back.

19 of the 56 works have a price. The rest never had one on Squarespace.

`_includes/price.html` renders the number with a comma, by hand, because Jekyll
has no number-formatting filter and Pages will not run a plugin that adds one.

## Measure the old site; do not read its stylesheet

The first pass took its palette from the Squarespace CSS bundle, where the most
common background colour is `#272727`. That colour is nowhere on the rendered
page — the body is `#616161`. The result was a site far too dark that looked
nothing like the original.

Every value in `assets/screen.css` was read out of the live site with a headless
browser asking for **computed** styles, and the header comment lists them. If
something needs matching that is not in that list, measure it the same way
rather than reading the bundle:

```js
getComputedStyle(document.querySelector(sel)).backgroundColor
```

Two traps found doing it. Squarespace ships a hidden mobile header, so a bare
`nav a` returns the wrong element's styles — filter to elements that are
actually visible. And navigating straight to `/paintings/` on the old site
serves a carousel, while clicking the cover from the homepage opens the vertical
list; the list is the page people actually saw, and it is what this site
builds.

## Building it

Use the Gemfile. Always.

```sh
bundle exec jekyll build     # or bin/dev, below
```

`gem install jekyll` gets Jekyll 4. GitHub Pages builds with **3.10**, which is
what `github-pages` in the Gemfile pins. `mise.toml` pins the Ruby that goes
with it — the system Ruby is 2.6 and cannot install these gems at all.

There is no CI and no build step of our own. **Deploying is merging to `main`** —
GitHub's classic Pages builder does the rest.

## Previewing

```sh
bin/dev                 # builds, serves _site on :8200, opens the tunnel
NO_TUNNEL=1 bin/dev     # local only
```

The tunnel puts the site at **https://afa.avand.dev** for as long as `bin/dev`
runs. That matters more here than on most sites: this is a grid of 111
photographs, and a narrowed desktop window does not honestly simulate how a
phone scales, lazy-loads, or runs out of memory on it.

## The carousel

`_includes/carousel.html` plus `assets/carousel.js`. Every slide is real markup,
so the page is complete before the script runs and degrades to the first image
plus the strip without it. The script only moves an `is-current` class around.

Pass `id` — it must be unique on the page, and it is also the CSS hook for that
carousel's thumbnail height (`#gallery`, `#classroom`, `#profile` each set
`--thumb-height`, matching what the old site used).

A page opts into the script with `carousel: true` in its front matter; forms opt
in with `forms: true`. Neither loads where it is not needed.

## `site.categories` is a trap

Jekyll reserves `site.categories` for the categories of blog posts, and it wins
silently over anything set in `_config.yml`. The four sections of the Collection
page are therefore `site.sections`. If the Collection page ever renders empty
with no error, this is the first thing to check.

## Where the content came from

`_archive/` holds the Squarespace site as it was on 2026-08-22: every page's
HTML, its JSON, and the two scripts that turned them into this repo.

- `extract.py` downloaded all 111 images at original resolution and wrote
  `inventory.json` (title, price, dimensions, source URL, local filename).
- `generate.py` turned that into `_works/*.md` and `_data/{gallery,classes,profile}.yml`,
  and moved the images into `images/` under real names.

Both are rerunnable, and `generate.py` overwrites `_works/` and `_data/` when it
runs. **If you hand-edit a work and then rerun it, your edit is gone.** It has
done its job; it is kept as evidence of where the content came from, not as part
of the build.

Titles and prices came out of each `<img alt="Title ($Price)">`, which is where
Squarespace happened to keep them.

## What still needs Fahimeh

Four things the migration could not resolve on its own. None block launch.

| | |
|---|---|
| **3 illustrations have inferred titles** | They were published with no title at all, so the only name they had was the file they were uploaded as. All three are Monkey Bridge plates. Grep `needs_review` in `_works/`. |
| **12 of the 19 priced works are low resolution** | Including *A Sight of Persepolis' Glory* at $30,000, which exists only at 575×431. That is the original upload, not a thumbnail — Squarespace never had better. Re-shooting is the single highest-value improvement available to this site. |
| **Paintings and Posters share a description** | Word for word. Almost certainly a copy-paste on the old site rather than a choice. |
| **"the greatest living Persian miniaturist"** | The old bio said this of Professor Hossein Behzad, who died in 1968. Softened to "the great Persian miniaturist" here. |

Two typos were fixed in passing: "Persian Minatures" and "Mouring". A third,
"Governor Herbet", survives in `_data/profile.yml` because it is a caption she
may want to reword rather than just spell correctly.

The earlier worry that Posters held 13 works against the site's own count of 9
is resolved: four of those were the index cover thumbnails, which the first
extraction mistook for artworks.

## The forms

There are two — Contact, and Enroll at the foot of Classes — and they are the
same include (`_includes/message-form.html`) posting to the same place. A hidden
`form` field says which page a message came from, so an enrolment is never read
as a general enquiry; it is a column in the Sheet and part of the email subject.

`script/contact.gs` is a Google Apps Script web app, owned by
avand@avandamiri.com, that appends to a Sheet and emails on each submission. It
is not part of the build; it is in the repo so it is versioned and findable.
Its own header comments cover deployment.

Two things about it that will otherwise cost you an afternoon:

**The page cannot tell whether a submission worked.** Apps Script cannot send
CORS headers, so the form posts `mode: "no-cors"` and gets back an opaque
response. The success message is optimistic. The mitigation is the notification
email — a failure shows up as silence on a channel Fahimeh already watches.

**Editing the script does not change what is live.** Apps Script serves the
deployed *version*. A change needs Deploy → Manage deployments → edit → New
version.

`contact_endpoint` in `_config.yml` holds the `/exec` URL. While it is empty the
form says so rather than silently dropping mail.

## Fonts are substitutes

The Squarespace site set headings in **futura-pt** and body in **proxima-nova**,
both Adobe fonts licensed through the Squarespace subscription. That licence does
not travel with the content. Jost and Nunito Sans are the closest free
equivalents. An Adobe Fonts plan of our own would restore the originals exactly,
if the difference ever matters enough.

## You cannot see what you are changing

Nothing here verifies rendering. The build, the links, and whether every `<img>`
resolves can all be checked; appearance cannot. Anything visual needs a real
device — and iOS Safari in particular — before it is called done.

Say what you verified and what you did not.
