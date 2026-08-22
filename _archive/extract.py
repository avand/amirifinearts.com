"""Read the archived Squarespace pages and write content.json.

The first version of this file swept every <img> off every page into one flat
list. That was wrong in a way that was not visible until the old site was put
side by side with the new one: it flattened an *index* -- a homepage of four
category covers, each linking to its own page -- into a single wall of 56
photographs, and it quietly counted the four cover thumbnails as artworks,
which is why Posters appeared to hold 13 pieces when the site said 9.

This version walks the structure instead:

  home.html      four <div class="project"> sections, each a category with a
                 title, a description, and its works -- every work carrying an
                 image-title (name and price) and an image-desc (size and
                 medium). Then #projectThumbs, the four cover cards.
  gallery.json   a Squarespace "gallery" collection: seven items, shown as a
                 slideshow with a thumbnail strip.
  classes.html   a slideshow block beside the prose, and a grid block of
                 student work below it.
  profile.html   a slideshow block beside the bio.

Slideshow blocks list every image twice -- once as a slide, once in the
thumbnail strip -- so images are de-duplicated within a block, in order.
"""
import json, os, re, html, urllib.parse, urllib.request
from html.parser import HTMLParser

BASE = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(BASE, 'pages')
IMGS = os.path.join(BASE, 'images')
os.makedirs(IMGS, exist_ok=True)

HDRS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*'}
CDN = 'images.squarespace-cdn.com'


def text(fragment):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(fragment))).strip()


def local_name(url):
    """A stable filename: the CDN asset id plus the uploaded name."""
    name = urllib.parse.unquote(url.rsplit('/', 1)[-1]).replace('+', ' ')
    return f"{url.rsplit('/', 2)[-2]}-{name}".replace(' ', '-')


# --------------------------------------------------------------- home page

home = open(os.path.join(PAGES, 'home.html')).read()

PROJECT = re.compile(
    r'<div class="project gallery-project" data-url="(?P<url>/[^"]+)"\s*>(?P<body>.*?)'
    r'(?=<div class="project gallery-project"|<div id="projectThumbs")', re.S)

IMAGE = re.compile(
    r'<div class="image">(?P<body>.*?)(?=<div class="image">|<div class="image-list"|\Z)', re.S)

categories = []
for m in PROJECT.finditer(home):
    body = m.group('body')
    title = text(re.search(r'project-title">(.*?)</h2>', body, re.S).group(1))
    desc = re.search(r'project-description">(.*?)</div>', body, re.S)
    # The description block holds the category's prose; the per-work sizes live
    # in image-desc further down and must not be swept up with it.
    prose = []
    if desc:
        for para in re.findall(r'<p[^>]*>(.*?)</p>', desc.group(1), re.S):
            t = text(para)
            if t:
                prose.append(t)

    works = []
    for im in IMAGE.finditer(body):
        b = im.group('body')
        src = re.search(r'data-src="(https://[^"?]*%s[^"?]*)"' % re.escape(CDN), b)
        if not src:
            continue
        label = re.search(r'image-title"><strong>(.*?)</strong>', b, re.S)
        note = re.search(r'image-desc">(.*?)</span>', b, re.S)
        dim = re.search(r'data-image-dimensions="(\d+)x(\d+)"', b)
        label = text(label.group(1)) if label else ''
        price = re.search(r'\$([\d,]+)', label)
        works.append({
            'title': re.sub(r'\s*\(\$[\d,]+\)\s*', ' ', label).strip(),
            'price': int(price.group(1).replace(',', '')) if price else None,
            # "16 × 20 — Acrylic". Squarespace wrote these with non-breaking
            # spaces around the separators; normalise them to ordinary ones.
            'note': text(note.group(1)).replace('\xa0', ' ') if note else '',
            'url': src.group(1),
            'width': int(dim.group(1)) if dim else None,
            'height': int(dim.group(2)) if dim else None,
        })

    categories.append({
        'url': m.group('url'), 'title': title,
        'description': prose, 'works': works,
    })

# The four cover cards. These are NOT artworks -- they are the index's
# thumbnails, and treating them as works is what inflated Posters to 13.
covers = {}
thumbs = home[home.index('<div id="projectThumbs"'):]
for m in re.finditer(
        r'<a class="project" href="(?P<url>[^"]+)">.*?data-src="(?P<img>https://[^"?]+)".*?'
        r'project-item-count">(?P<count>\d+)<.*?project-title">(?P<title>[^<]*)<', thumbs, re.S):
    covers[m.group('url')] = {
        'image': m.group('img'), 'count': int(m.group('count')),
        'title': text(m.group('title')),
    }


# ------------------------------------------------------- slideshow / grid

class GalleryBlocks(HTMLParser):
    """Collect each gallery block's images, keeping blocks separate.

    Depth tracking matters: the blocks nest, and a flat regex sweep hands back
    one block's images inside another's."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.blocks = []
        self.open = []          # (index, depth) of blocks currently open

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'img':
            src = (a.get('data-src') or a.get('src') or '').split('?')[0]
            if self.open and CDN in src:
                block = self.blocks[self.open[-1][0]]
                if src not in block['seen']:
                    block['seen'].add(src)
                    block['images'].append({'url': src, 'caption': (a.get('alt') or '').strip()})
            return
        if tag != 'div':
            return
        cls = a.get('class', '')
        if 'sqs-gallery-container' in cls:
            kind = 'grid' if 'block-grid' in cls else 'slideshow'
            self.blocks.append({'kind': kind, 'images': [], 'seen': set()})
            self.open.append((len(self.blocks) - 1, self.depth))
        self.depth += 1

    def handle_endtag(self, tag):
        if tag != 'div':
            return
        self.depth -= 1
        if self.open and self.open[-1][1] == self.depth:
            self.open.pop()


def blocks_on(page):
    p = GalleryBlocks()
    p.feed(open(os.path.join(PAGES, page + '.html')).read())
    for b in p.blocks:
        del b['seen']
    return [b for b in p.blocks if b['images']]


classes_blocks = blocks_on('classes')
profile_blocks = blocks_on('profile')

# The Gallery page is a Squarespace "gallery" collection, so its items come
# from the JSON rather than the markup.
gallery = []
for item in json.load(open(os.path.join(PAGES, 'gallery.json')))['items']:
    url = (item.get('assetUrl') or '').split('?')[0]
    if url:
        gallery.append({'url': url, 'caption': (item.get('title') or '').strip()})

content = {
    'categories': categories,
    'covers': covers,
    'gallery': gallery,
    'classes': classes_blocks,
    'profile': profile_blocks,
}

# ------------------------------------------------------------- the images

wanted = {}
for cat in categories:
    for w in cat['works']:
        wanted[w['url']] = None
for c in covers.values():
    wanted[c['image']] = None
for group in (gallery, *classes_blocks, *profile_blocks):
    for im in (group['images'] if isinstance(group, dict) else group):
        wanted[im['url']] = None

for i, url in enumerate(wanted, 1):
    dest = os.path.join(IMGS, local_name(url))
    if os.path.exists(dest):
        continue
    req = urllib.request.Request(url + '?format=original', headers=HDRS)
    with urllib.request.urlopen(req) as r, open(dest, 'wb') as f:
        f.write(r.read())
    print(f'  {i:3}/{len(wanted)}  {os.path.getsize(dest)//1024:6}KB  {local_name(url)[:64]}')

json.dump(content, open(os.path.join(BASE, 'content.json'), 'w'), indent=2)

print()
for cat in categories:
    print(f'  {cat["url"]:22} {len(cat["works"]):3} works  "{cat["title"]}"')
print(f'  covers                 {len(covers):3}')
print(f'  gallery                {len(gallery):3}')
for b in classes_blocks:
    print(f'  classes {b["kind"]:11}    {len(b["images"]):3}')
for b in profile_blocks:
    print(f'  profile {b["kind"]:11}    {len(b["images"]):3}')
print(f'\n{len(wanted)} unique images')
