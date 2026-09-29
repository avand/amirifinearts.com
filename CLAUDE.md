# amirifinearts.com

Fahimeh Amiri's site. Static, Jekyll, GitHub Pages. Migrated off Squarespace in
August 2026.

Most of what you need is in a comment next to the thing it explains. This file
is only for what you cannot find by opening the file you are about to edit.

## How the site is shaped

Four pages plus four section pages, and it matters which is which:

| | |
|---|---|
| `/` | The **Collection index**: four covers, one per section. Not a list of work. |
| `/paintings/` `/persian-miniatures/` `/illustrations/` `/posters/` | A section: its works stacked down a 420px column on the left, its name and description on the right. Clicking a work opens it full screen. |
| `/classes/` `/profile/` | Carry a **carousel** — arrows, a thumbnail strip, keyboard and swipe. |
| `/contact/` | The message form. `/classes/` has a second copy of it under *Enroll*. |

53 works: 27 paintings, 7 miniatures, 10 illustrations, 9 posters.

**Every work has its own address**: its section's page, `#`, and its image
name — `/paintings/#provincial-dance`. Opening that opens the painting full
screen, and the address follows along as the viewer steps, so anything on
screen can be copied and sent. Renaming a work's image changes its address.

**The banner** across the top of every page is `announcement:` in
`_config.yml`, in Markdown. Delete it and the banner goes.

The old site's `/gallery/` page was dropped in September 2026: seven paintings,
six of them already in the Collection. Its address now 404s.

## Adding a painting

This is the common task and the whole reason the site moved.

1. Put the photo, exactly as it came, in `originals/works/` under a lower-case
   hyphenated name: `spring-flowers.jpg`. JPEG, PNG, WebP or an iPhone's HEIC
   all work.
2. Add an entry to its section's list in `_data/works/` — `paintings.yml`,
   `miniatures.yml`, `illustrations.yml` or `posters.yml` — where you want it
   to appear. The order of the list is the order of the page.

```yaml
- title: "Spring Flowers"
  image: spring-flowers      # the photo's name in originals/works/, no extension
  note: "24 × 30 — Acrylic"  # size and medium, as Fahimeh writes it
  price: 4000                # optional. A number, no $ and no commas.
```

That is the entire record — no dimensions either: `bin/resize` measures the
photo itself.

3. Commit both. The pre-commit hook makes the web images from the photo and
   adds them to the same commit.

With `bin/dev` running the page shows the painting a second or two after step 1,
before anything is committed.

## Originals in, web images out

`originals/` is what Fahimeh sent, untouched and **never published** (it is in
`exclude` in `_config.yml`). `images/` is entirely made from it by `bin/resize`,
and nothing in it is edited by hand:

    originals/works/koala.jpg  ->  images/works/koala/{240,480,960,full}.jpg
                                   _data/images/works/koala.json

Each is resized, converted to sRGB, stripped of camera metadata and saved as a
progressive JPEG. `full.jpg` (works only, capped at 2560px) is for the
full-screen view; the JSON is the image's width and height, which the templates
put on every `<img>` so the page does not jump as it loads.
`_includes/image-url.html` builds the paths.

**Whether to process an original is whether it is committed.** An untracked or
changed original is new; a committed one is never looked at again. `bin/resize
--all` reprocesses everything — the thing to run after changing a size or
quality setting in it.

**The pre-commit hook is what keeps the live site whole.** Only `images/` is
published, so an image that misses a commit is a broken picture on the site,
and nothing between a merge to `main` and GitHub Pages would catch it. The hook
(`.githooks/pre-commit`) processes and stages the images for any original in
the commit, and refuses a commit where a page names an image that is not
there. `bin/dev` switches it on (`git config core.hooksPath .githooks`); a
fresh clone that has not run `bin/dev` does not have it.

Do not trust a file's extension. Several originals named `.jpg`/`.jpeg` are
PNGs or WebPs inside, as Squarespace handed them over; vips reads what a file
is, not what it is called. `bin/resize` needs `vips` (`brew install vips`).

## Prices are data, not layout

Every price lives in its work's front matter. **`show_prices` in `_config.yml`
decides whether any of them render.** It is currently `false`, because Fahimeh
asked for them off.

Turning them back on is that one word. Do not delete a `price:` to hide it — the
toggle exists so that pulling prices from the site does not mean retyping
nineteen numbers to put them back.

19 of the 53 works have a price. The rest never had one on Squarespace.

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
carousel's thumbnail height (`#classroom` and `#profile` each set
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
- `generate.py` turned that into `_works/*.md` (since folded into `_data/works/`) and `_data/{gallery,classes,profile}.yml` (the Gallery page has since been dropped),
  and moved the images into `images/` under real names. Those are now
  `originals/`, and the paths in both scripts are out of date.

Both are rerunnable, and `generate.py` overwrites `_data/` when it
runs. **If you hand-edit a work and then rerun it, your edit is gone.** It has
done its job; it is kept as evidence of where the content came from, not as part
of the build.

Titles and prices came out of each `<img alt="Title ($Price)">`, which is where
Squarespace happened to keep them.

## What still needs Fahimeh

Four things the migration could not resolve on its own. None block launch.

| | |
|---|---|
| **3 illustrations have inferred titles** | They were published with no title at all, so the only name they had was the file they were uploaded as. All three are Monkey Bridge plates. Grep `needs_review` in `_data/works/`. |
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
