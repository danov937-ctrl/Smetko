# -*- coding: utf-8 -*-
"""Картинки за споделяне (Open Graph, 1200×630) за страниците по теми и помагалата.
Рисува ги с Playwright от tools/og_list.json (пише се от seo.py). Рисува само нови или променени.
Стартиране: python3 tools/og.py  (нужен е локален сървър на :8093 с public_html)"""
import json, os, hashlib, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'public_html', 'assets', 'og')
os.makedirs(OUT, exist_ok=True)
items = json.load(open(os.path.join(HERE, 'og_list.json'), encoding='utf-8'))
mf = os.path.join(OUT, 'manifest.json'); done = json.load(open(mf)) if os.path.exists(mf) else {}
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8093'
TPL = '''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{base}/css/style.css"><style>
@font-face{{font-family:Nunito;src:url({base}/assets/fonts/nunito.woff) format("woff");font-weight:600 900}}
html,body{{margin:0;width:1200px;height:630px;overflow:hidden}}
.og{{position:relative;width:1200px;height:630px;background:linear-gradient(160deg,#4AA8FF 0%,#7CC4FF 62%,#BFE5FF 100%);font-family:Nunito,sans-serif}}
.og .hills{{position:absolute;left:0;right:0;bottom:0;height:150px;background:radial-gradient(120% 140px at 30% 150px,#5DBB3F 60%,transparent 61%),radial-gradient(120% 160px at 80% 170px,#4CAF37 60%,transparent 61%)}}
.og .og-card{{position:absolute;left:64px;top:70px;width:700px}}
.og .tag{{display:inline-block;background:{color};color:#fff;font-weight:900;font-size:30px;padding:8px 22px;border-radius:999px;box-shadow:0 4px 0 rgba(0,0,0,.15)}}
.og h1{{margin:26px 0 18px;color:#fff;font-size:{fs}px;line-height:1.08;font-weight:900;text-shadow:0 4px 0 #1C64C8,0 10px 30px rgba(28,100,200,.35)}}
.og p{{margin:0;color:#fff;font-size:34px;font-weight:800;text-shadow:0 2px 0 rgba(28,100,200,.6)}}
.og .owl{{position:absolute;right:70px;top:90px;width:380px;height:410px}}
.og .brand{{position:absolute;left:64px;bottom:34px;background:#fff;border-radius:22px;padding:10px 26px;font-size:40px;font-weight:900;box-shadow:0 6px 0 rgba(0,0,0,.12)}}
.og .brand span:nth-child(1){{color:#FF5A5F}}.og .brand span:nth-child(2){{color:#FF9F1C}}.og .brand span:nth-child(3){{color:#4CBB4A}}.og .brand span:nth-child(4){{color:#19B5A5}}.og .brand span:nth-child(5){{color:#2F80ED}}.og .brand span:nth-child(6){{color:#8E6CF0}}
.og .url{{position:absolute;right:70px;bottom:44px;color:#fff;font-weight:900;font-size:30px;text-shadow:0 2px 0 rgba(0,0,0,.2)}}
</style></head><body><div class="og"><div class="hills"></div><div class="og-card"><span class="tag">{sub}</span><h1>{title}</h1></div>
<div class="owl" id="owl"></div><div class="brand"><span>С</span><span>м</span><span>е</span><span>т</span><span>к</span><span>о</span></div><div class="url">smetko.com</div></div>
<script src="{base}/js/owl.js"></script><script>document.getElementById('owl').innerHTML=Smetko.owl('{pose}')</script></body></html>'''
todo = []
for it in items:
    key = hashlib.md5(json.dumps(it, sort_keys=True).encode()).hexdigest()
    path = os.path.join(OUT, it['slug'] + '.jpg')
    if done.get(it['slug']) == key and os.path.exists(path): continue
    todo.append((it, key, path))
if todo:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630}); pg.goto(BASE + '/robots.txt')  # същият произход – шрифтът се зарежда без CORS
        for it, key, path in todo:
            t = it['title'].replace('. клас', '.\u00a0клас'); fs = 76 if len(t) <= 26 else 64 if len(t) <= 44 else 54 if len(t) <= 70 else 46
            pg.set_content(TPL.format(base=BASE, color=it['color'], fs=fs, sub=it['sub'], title=t, pose=it['pose']), wait_until='networkidle')
            pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(150)
            pg.screenshot(path=path, type='jpeg', quality=80)
            done[it['slug']] = key
        b.close()
json.dump(done, open(mf, 'w'), indent=0)
print('OG:', len(todo), 'нови,', len(items), 'общо')
