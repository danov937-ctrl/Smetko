# -*- coding: utf-8 -*-
"""Основните проверки: всяка страница се отваря и е цяла, нищо не излиза от екрана,
връзките водят донякъде, иконите съществуват и сайтът е безплатен.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests
from playwright.sync_api import sync_playwright
from lib import B, ROOT, INIT, ok, done, page

urls = re.findall(r'<loc>https://smetko\.com/([^<]*)</loc>', open(os.path.join(ROOT, 'sitemap-pages.xml'), encoding='utf-8').read())
pages = [u for u in urls if not u.endswith('.pdf')]
files = [u for u in urls if u.endswith('.pdf')]
ok(len(pages) >= 35, 'картата на сайта изброява %d страници' % len(pages))

BAD = ('Warning:', 'Fatal error', 'Notice:', 'Parse error', '<br />', 'None</', '{ico(')
errs = []

# ---------- всяка страница от картата
S = requests.Session()
titles, canon = {}, 0
for u in pages:
    r = S.get(B + '/' + u)
    t = r.text
    if not ok(r.status_code == 200, 'отваря се: /%s (%d)' % (u, r.status_code)):
        continue
    bad = [b for b in BAD if b in t]
    ok(not bad, '/%s е цяла (%s)' % (u, bad))
    m = re.search(r'<title>(.*?)</title>', t, re.S)
    ok(m and 18 <= len(m.group(1)) <= 110, '/%s има заглавие с разумна дължина' % u)
    d = re.search(r'<meta name="description" content="(.*?)"', t, re.S)
    ok(d and 55 <= len(d.group(1)) <= 260, '/%s има описание' % u)
    ok('rel="canonical"' in t, '/%s сочи основния си адрес' % u)
    ok(t.count('<h1') == 1, '/%s има точно едно h1' % u)
    if m:
        titles.setdefault(m.group(1), []).append(u)
dup = {k: v for k, v in titles.items() if len(v) > 1}
ok(not dup, 'няма две страници с едно заглавие %s' % list(dup.values())[:2])

for u in files:
    r = S.get(B + '/' + u)
    ok(r.status_code == 200 and len(r.content) > 50000, 'файлът се сваля: /%s (%d)' % (u, r.status_code))

# ---------- вътрешните връзки водят донякъде
seen, broken = set(), []
for u in ['', 'nvo-4-klas-matematika.html', 'pricing.html', 'testove-po-matematika.html', 'uchilishta.html', 'za-nas.html', 'koleden-kalendar.html']:
    for href in set(re.findall(r'href="([^"#?:]+\.html|[a-z0-9-]+/)"', S.get(B + '/' + u).text)):
        if href.startswith(('http', '//')) or href in seen:
            continue
        seen.add(href)
        if S.head(B + '/' + href, allow_redirects=True).status_code >= 400:
            broken.append(href)
ok(not broken, 'вътрешните връзки водят донякъде (%d проверени) %s' % (len(seen), broken[:4]))
ok(S.get(B + '/dogovor-pilot.html', allow_redirects=False).status_code == 301, 'старият адрес на договора препраща')
ok(S.get(B + '/matematika-2-klas', allow_redirects=False).status_code == 301, 'краткият адрес на класа препраща')
ok(S.get(B + '/nyama-takava-stranica.html').status_code == 404, 'несъществуваща страница дава 404')

KEY = ['', 'game.html', 'pricing.html', 'nvo-4-klas-matematika.html', 'nvo-sbornik.html',
       'rabotni-listove.html', 'testove-po-matematika.html', 'uchilishta.html', 'otchet.html',
       'koleden-kalendar.html', 'deca-sas-sop.html', 'blog/']

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- нищо не излиза от екрана
    for w, h in ((320, 640), (390, 844), (768, 1024), (1280, 900), (1440, 900)):
        c = b.new_context(viewport={'width': w, 'height': h}); c.add_init_script(INIT)
        pg = page(c, errs)
        out = []
        for u in KEY:
            pg.goto(B + '/' + u); pg.wait_for_timeout(700)
            sw = pg.evaluate('document.documentElement.scrollWidth')
            if sw > w + 1:
                out.append((u, sw))
        ok(not out, '%dpx: нищо не излиза встрани %s' % (w, out))
        c.close()

    c = b.new_context(viewport={'width': 1280, 'height': 900}); c.add_init_script(INIT)
    pg = page(c, errs)

    # ---------- шапката се побира
    for w in (1100, 1180, 1280, 1440):
        pg.set_viewport_size({'width': w, 'height': 800})
        pg.goto(B + '/za-nas.html'); pg.wait_for_timeout(500)
        r = pg.evaluate("""()=>{const n=document.querySelector('.nav').getBoundingClientRect(),
          a=document.querySelector('.header-actions').getBoundingClientRect(),
          l=document.querySelector('.logo').getBoundingClientRect();
          return {gap1: Math.round(n.left-l.right), gap2: Math.round(a.left-n.right)}}""")
        ok(r['gap1'] >= 0 and r['gap2'] >= 0, '%dpx: логото, менюто и бутоните не се застъпват %s' % (w, r))
    pg.set_viewport_size({'width': 1280, 'height': 900})

    # ---------- иконите
    for u in ('', 'pricing.html', 'nvo-4-klas-matematika.html'):
        pg.goto(B + '/' + u); pg.wait_for_timeout(600)
        r = pg.evaluate("""()=>{const ids=[...document.querySelectorAll('.ico use')].map(u=>u.getAttribute('href'));
          const miss=ids.filter(h=>!document.querySelector('symbol'+h));
          const box=[...document.querySelectorAll('.ico')].filter(e=>e.getBoundingClientRect().width<8).length;
          return {n: ids.length, miss, box}}""")
        ok(r['n'] >= 3, '/%s ползва иконите (%d)' % (u, r['n']))
        ok(not r['miss'], '/%s всички икони ги има в набора %s' % (u, r['miss']))
        ok(not r['box'], '/%s иконите се виждат (%d сплескани)' % (u, r['box']))

    # ---------- новината не се връща след затваряне (беше: изскачаше на всяка страница)
    import sqlite3
    db = sqlite3.connect(os.path.join(ROOT, 'api', 'data', 'smetko.sqlite'))
    db.execute("update news set popup=1 where id=(select max(id) from news where active=1"
               " and starts<=date('now') and (ends is null or ends>=date('now')))")
    db.commit(); db.close()
    c2 = b.new_context(viewport={'width': 1280, 'height': 900})   # нов посетител, без нищо запазено
    c2.add_init_script("try{localStorage.setItem('smetko.consent',JSON.stringify({v:1,stats:false,t:Date.now()}))}catch(e){}")
    q = page(c2, errs)
    q.goto(B + '/'); q.wait_for_timeout(2200)
    first = q.locator('dialog.news-modal').count()
    if first:
        q.locator('dialog.news-modal .modal-close').click(); q.wait_for_timeout(400)
    q.goto(B + '/testove-po-matematika.html'); q.wait_for_timeout(2200)
    ok(first == 1, 'новината изскача веднъж на нов посетител')
    ok(q.locator('dialog.news-modal').count() == 0, 'и не се връща на следващата страница след затваряне с ×')
    c2.close()

    # ---------- банерът за бисквитки не изяжда екрана на телефон
    for w, h in ((320, 640), (390, 844)):
        c3 = b.new_context(viewport={'width': w, 'height': h})
        q = page(c3, errs)
        q.goto(B + '/'); q.wait_for_timeout(2200)
        bh = q.evaluate("()=>{const e=document.querySelector('#cookie-bar .ck-in');return e?Math.round(e.getBoundingClientRect().height):0}")
        ok(0 < bh <= h * 0.4, '%dpx: банерът за бисквитки е %d px (под 40%% от екрана)' % (w, bh))
        c3.close()

    # ---------- менюто и долното меню
    pg.goto(B + '/'); pg.wait_for_timeout(900)
    top = pg.eval_on_selector_all('.nav > *', 'e=>e.map(x=>(x.querySelector("button")||x).innerText.trim())')
    ok(len(top) <= 6, 'менюто е до 6 точки: %s' % top)
    ok(any('Помагала' in t for t in top), 'помагалата са в менюто')
    ok(pg.evaluate("()=>getComputedStyle(document.body).fontSize") == '18px', 'основният текст е 18px за деца')
    c4 = b.new_context(viewport={'width': 390, 'height': 844}); c4.add_init_script(INIT)
    q = page(c4, errs)
    q.goto(B + '/'); q.wait_for_timeout(1200)
    ok(q.eval_on_selector_all('footer a', 'e=>e.filter(x=>x.offsetParent).length') <= 2,
       'на телефон долното меню е сгънато')
    q.evaluate("()=>document.querySelectorAll('.f-col').forEach(d=>d.open=true)"); q.wait_for_timeout(200)
    ok(q.eval_on_selector_all('footer a', 'e=>e.filter(x=>x.offsetParent).length') >= 20,
       'и се отваря при докосване')
    c4.close()

    # ---------- не са останали текстове от платения модел
    for u in ('registracia.html', 'profil.html', 'vhod.html'):
        t = S.get(B + '/' + u).text
        ok('Кодът за абонамент' not in t, '/%s не говори за код за абонамент' % u)

    # ---------- никъде по сайта няма цена, бутон „Поръчай“ или форма за плащане
    MONEY = ('data-price=', 'data-subscribe', 'data-paddle-buy', 'js/paddle.js', 'paddle-test',
             'Поръчай', 'class="price"', 'Честни цени', 'period-toggle')
    money = {}
    for u in pages:
        t = S.get(B + '/' + u).text
        hit = [m for m in MONEY if m in t]
        if hit:
            money[u] = hit
    ok(not money, 'никоя страница не продава нищо %s' % list(money.items())[:3])
    ok('paddle' not in S.get(B + '/sw.js').text, 'формата за плащане не се сваля предварително')
    anket = S.get(B + '/anketa.html').text
    ok('€' not in anket and 'платили' not in anket and 'цена' not in anket.lower(),
       'анкетата не пита за цени')
    ok('доброволен подарък' in anket, 'а пита как човек би искал да помогне')

    # ---------- безплатно
    pg.goto(B + '/pricing.html'); pg.wait_for_timeout(700)
    low = pg.inner_text('main').lower()
    ok('безплат' in low, 'страницата за цените казва, че е безплатно')
    ok('лв' not in low.replace('благодаря', ''), 'никъде не е останала цена')
    ok(pg.locator('.free-card').count() >= 8, 'списъкът какво влиза е пълен')
    cfg = requests.get(B + '/api/config.php').json()['config']
    ok(cfg.get('paywall') is False, 'сървърът не иска плащане')
    pg.goto(B + '/game.html'); pg.wait_for_timeout(2000)
    ok(not pg.locator('.paywall, .pay-modal').count(), 'играта не иска абонамент')

    b.close()
done(errs)
