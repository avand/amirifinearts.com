"""Turn the Squarespace archive into the Jekyll site's content.

Reads _archive/inventory.json plus the section headings in the archived home
page, writes one _works/<slug>.md per piece, and moves each image out of the
archive into images/ under a name derived from its title. The archive keeps the
HTML, the JSON, and these scripts; it does not keep a second copy of 112MB of
photographs.

Rerunnable: it overwrites _works and skips images already moved.
"""
import re, html, json, os, shutil, unicodedata

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARC  = os.path.join(BASE, '_archive')

# The live site spells two things wrong. Faithful is about the design, not
# about carrying typos across a migration.
FIX = {'Persian Minatures': 'Persian Miniatures', 'Mouring': 'Mourning'}

# Six pieces went up on Squarespace with no alt text, so the only "title" they
# have is the filename it was uploaded under. These are inferred from the
# filename and the section they sit in -- good enough to publish, not good
# enough to trust. They carry needs_review until Fahimeh confirms them.
UNTITLED = {
    'monkey bridge.png':        'The Monkey Bridge',
    'monkey bridge cover.png':  'The Monkey Bridge (Cover)',
    'monkey bridge ship.png':   'The Monkey Bridge (Ship)',
    'babri-frog.png':           'Babri (Frog II)',
    'Legal-Sea-Foods.png':      'Legal Sea Foods (II)',
    'Simorgh.png':              'Simorgh (II)',
}

CATEGORIES = {
    'Paintings': 'paintings',
    'Persian Miniatures': 'miniatures',
    'Illustrations': 'illustrations',
    'Posters': 'posters',
}

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')

# Walk the home page in document order so each image inherits the heading above it.
h = open(os.path.join(ARC, 'pages/home.html')).read()
section, order = None, {}
for m in re.finditer(r'<h[1-3][^>]*>(.*?)</h[1-3]>|data-src="(https://images\.squarespace-cdn\.com[^"?]*)"', h, re.S):
    if m.group(1):
        t = re.sub(r'<[^>]+>', '', html.unescape(m.group(1))).strip()
        t = FIX.get(t, t)
        if t in CATEGORIES:
            section = CATEGORIES[t]
    elif m.group(2) and section:
        order.setdefault(m.group(2), (section, len(order)))

inv = json.load(open(os.path.join(ARC, 'inventory.json')))
works_dir = os.path.join(BASE, '_works')
os.makedirs(works_dir, exist_ok=True)
for f in os.listdir(works_dir):
    os.remove(os.path.join(works_dir, f))

DEST = {'home': 'works', 'gallery': 'gallery', 'classes': 'classes', 'profile': 'profile'}
seen, made = set(), 0

for r in inv:
    src = os.path.join(ARC, 'images', r['file'])
    ext = os.path.splitext(r['file'])[1].lower()
    review = r['title'] in UNTITLED
    title = UNTITLED.get(r['title']) or FIX.get(r['title'], r['title'])
    sub = DEST[r['page']]

    name = slug(title) or slug(os.path.splitext(r['file'])[0])
    n, base = 2, name
    while (sub, name) in seen:
        name, n = f'{base}-{n}', n + 1
    seen.add((sub, name))

    rel = f'/images/{sub}/{name}{ext}'
    dest = os.path.join(BASE, rel.lstrip('/'))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(src) and not os.path.exists(dest):
        shutil.move(src, dest)

    if r['page'] != 'home':
        continue

    cat, pos = order.get(r['url'], ('paintings', 999))
    fm = [
        '---',
        f'title: {json.dumps(title)}',
        f'category: {cat}',
        f'order: {pos}',
        f'image: {rel}',
        f'width: {r["width"]}',
        f'height: {r["height"]}',
    ]
    # Price is data, not layout. `show_prices` in _config.yml decides whether
    # any of it is ever rendered; pulling them must not lose them.
    fm.append(f'price: {r["price"]}' if r['price'] else '# price:  # unknown -- ask Fahimeh')
    if review:
        fm.append('needs_review: true  # title inferred from filename; confirm with Fahimeh')
    fm += ['---', '']
    open(os.path.join(works_dir, f'{cat}-{name}.md'), 'w').write('\n'.join(fm))
    made += 1

# The Collection page's works become _works/*.md. The other three pages are
# not catalogues -- they are a bio, a class description, and a gallery -- so
# their images become plain ordered lists in _data/, captions included. Several
# of the profile captions are real sentences ("Governor Herbet awards Fahimeh
# the Governor's Mansion Artist medal"), and those are worth keeping.
data_dir = os.path.join(BASE, '_data')
os.makedirs(data_dir, exist_ok=True)

for page in ('gallery', 'classes', 'profile'):
    rows = []
    for r in inv:
        if r['page'] != page:
            continue
        ext = os.path.splitext(r['file'])[1].lower()
        name = slug(FIX.get(r['title'], r['title'])) or slug(os.path.splitext(r['file'])[0])
        # Same collision walk as above; the names were assigned in that pass.
        n, base = 2, name
        while not os.path.exists(os.path.join(BASE, 'images', page, f'{name}{ext}')):
            if n > 12:
                break
            name, n = f'{base}-{n}', n + 1
        caption = FIX.get(r['title'], r['title'])
        # A caption that is just the upload filename is noise, not a caption.
        if re.search(r'\.(png|jpe?g)$', caption, re.I) or re.fullmatch(r'[\d\-]+', caption):
            caption = ''
        rows.append({'image': f'/images/{page}/{name}{ext}',
                     'caption': caption,
                     'width': r['width'], 'height': r['height']})

    with open(os.path.join(data_dir, f'{page}.yml'), 'w') as f:
        f.write(f'# Generated by _archive/generate.py from the Squarespace archive.\n')
        f.write(f'# {len(rows)} images from the {page} page. Edit freely -- rerunning\n')
        f.write(f'# the generator overwrites this.\n')
        for row in rows:
            f.write(f'- image: {row["image"]}\n')
            f.write(f'  caption: {json.dumps(row["caption"])}\n')
            if row['width']:
                f.write(f'  width: {row["width"]}\n  height: {row["height"]}\n')
    print(f'{len(rows):3} images -> _data/{page}.yml')

print(f'{made} works written to _works/')
