import re, html, json, os, urllib.request, hashlib

BASE = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(BASE, 'pages')
IMGS  = os.path.join(BASE, 'images')
os.makedirs(IMGS, exist_ok=True)

# Squarespace serves webp unless you ask otherwise; a plain Accept keeps originals.
HDRS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*'}

def fetch(url, dest):
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req) as r, open(dest, 'wb') as f:
        f.write(r.read())
        return r.headers.get('Content-Type', '')

records = []
for page in ['home', 'gallery', 'classes', 'profile', 'contact']:
    h = open(os.path.join(PAGES, page + '.html')).read()
    # Each <img> carries the CDN url in data-src and "Title ($Price)" in alt.
    for m in re.finditer(r'<img\b[^>]*>', h):
        tag = m.group(0)
        src = re.search(r'data-src="(https://images\.squarespace-cdn\.com[^"?]*)"', tag)
        if not src:
            continue
        url = src.group(1)
        alt = html.unescape(re.search(r'alt="([^"]*)"', tag).group(1)) if 'alt="' in tag else ''
        dim = re.search(r'data-image-dimensions="(\d+)x(\d+)"', tag)
        price = re.search(r'\$([\d,]+)', alt)
        title = re.sub(r'\s*\(\$[\d,]+\)\s*', '', alt).strip()
        records.append({
            'page': page,
            'url': url,
            'alt': alt,
            'title': title,
            'price': int(price.group(1).replace(',', '')) if price else None,
            'width': int(dim.group(1)) if dim else None,
            'height': int(dim.group(2)) if dim else None,
        })

# Dedupe by CDN url; the same piece can appear on more than one page.
seen, uniq = set(), []
for r in records:
    if r['url'] in seen:
        continue
    seen.add(r['url'])
    uniq.append(r)

for i, r in enumerate(uniq, 1):
    name = urllib.parse.unquote(r['url'].rsplit('/', 1)[-1]).replace('+', ' ')
    stem, ext = os.path.splitext(name)
    # CDN filenames collide across pieces; prefix with the immutable asset id.
    asset = r['url'].rsplit('/', 2)[-2]
    r['file'] = f'{asset}-{stem}{ext}'.replace(' ', '-')
    dest = os.path.join(IMGS, r['file'])
    if os.path.exists(dest):
        continue
    try:
        r['content_type'] = fetch(r['url'] + '?format=original', dest)
        r['bytes'] = os.path.getsize(dest)
        print(f'{i:3}/{len(uniq)}  {r["bytes"]//1024:6}KB  {r["file"][:70]}')
    except Exception as e:
        r['error'] = str(e)
        print(f'{i:3}/{len(uniq)}  FAILED {r["url"]}: {e}')

json.dump(uniq, open(os.path.join(BASE, 'inventory.json'), 'w'), indent=2)
print(f'\n{len(uniq)} unique images, inventory.json written')
