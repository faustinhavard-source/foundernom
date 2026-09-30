import sys, json, zipfile, collections
import xml.etree.ElementTree as E
from pathlib import Path

ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
cards = []
with zipfile.ZipFile(sys.argv[1]) as z:
    strings = [''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml'))]
    for num, kind in [(1, 'Founder'), (2, 'Startup'), (3, 'Fund'), (4, 'City')]:
        rows = E.fromstring(z.read(f'xl/worksheets/sheet{num}.xml')).findall('.//m:row', ns)
        def values(row):
            out = {}
            for c in row:
                v = c.find('m:v', ns)
                value = v.text if v is not None else ''.join(c.itertext())
                if c.get('t') == 's': value = strings[int(value)]
                out[''.join(filter(str.isalpha, c.get('r')))] = value or ''
            return out
        for row in rows[1:]:
            r = values(row)
            if not r.get('A'): continue
            country = r.get('F' if num == 1 else 'E' if num == 3 else 'D', '')
            subtitle = r.get('E' if num in [1,2] else 'D' if num == 3 else 'F', '')
            cards.append(dict(id=r['A'], name=r['B'], rarity=r['C'], kind=kind, country=country, subtitle=subtitle or country))
assert len({c['id'] for c in cards}) == len(cards), 'Duplicate IDs'
assert all(c['rarity'] in ['Common','Rare','Epic','Legendary'] for c in cards)
Path('data/catalog.json').write_text(json.dumps(cards, ensure_ascii=False, separators=(',', ':')))
print(json.dumps({'total':len(cards),'categories':dict(collections.Counter(c['kind'] for c in cards)), 'rarities':dict(collections.Counter(c['rarity'] for c in cards))}))
