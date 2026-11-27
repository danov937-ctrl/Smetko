# -*- coding: utf-8 -*-
"""Картинки за споделяне на статиите от блога (1200×630).

Фейсбук показва og:image, не самата страница. Без отделна картинка всяка статия
изглежда еднакво; с нея в емисията се вижда заглавието ѝ.

Картата се рисува от истинския CSS и истинската сова на сайта – зарежда се от
временен php сървър, за да се разрешат шрифтът, стиловете и js/owl.js.

    python3 tools/og.py          # само липсващите
    python3 tools/og.py --all    # всички наново
"""
import json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, '..', 'public_html')
OUT = os.path.join(PUB, 'assets', 'blog')
PORT = 8095
SIZE = (1200, 630)

CARD = """<!doctype html><html lang="bg"><head><meta charset="utf-8">
<base href="http://127.0.0.1:%d/">
<link rel="stylesheet" href="css/style.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { font-family: 'Nunito', system-ui, sans-serif; position: relative;
         background: linear-gradient(180deg, #D7EDFF 0%%, #EFF8FF 58%%); }
  .land { position: absolute; left: 0; right: 0; bottom: 0; height: 215px;
          background: url(assets/images/landscape.svg) center bottom / cover no-repeat; }
  .in { position: absolute; inset: 52px 60px 46px; display: grid;
        grid-template-columns: 1fr 360px; grid-template-rows: auto 1fr auto; column-gap: 24px; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 44px; font-weight: 900; letter-spacing: -.01em; }
  .brand span { display: inline-block; text-shadow: 0 2px 0 rgba(0,0,0,.10); }
  .c1 { color: #F0493F } .c2 { color: #FF7B00 } .c3 { color: #E9A700 }
  .c4 { color: #27AE60 } .c5 { color: #3299FF } .c6 { color: #8E5BEA }
  .tag { background: #fff; color: #C45A00; font-size: 21px; font-weight: 900; padding: 8px 20px;
         border-radius: 999px; box-shadow: 0 4px 14px rgba(20,50,110,.13); }
  h1 { grid-column: 1; grid-row: 2; align-self: center; margin: 0; color: #15306E; letter-spacing: -.025em;
       font-weight: 900; line-height: 1.08; text-shadow: 0 2px 0 rgba(255,255,255,.65); }
  .foot { grid-column: 1; grid-row: 3; justify-self: start; color: #3C5488; font-size: 23px; font-weight: 800;
          background: #fff; padding: 9px 22px; border-radius: 999px; box-shadow: 0 4px 14px rgba(20,50,110,.13); }
  .foot b { color: #15306E; }
  .right { grid-column: 2; grid-row: 1 / -1; position: relative; }
  .owl { position: absolute; right: -18px; bottom: -34px; width: 330px; }
  .owl svg { width: 100%%; height: auto; display: block; }
  .emo { position: absolute; left: 0; top: 96px; width: 150px; height: 150px; border-radius: 50%%;
         background: #fff; box-shadow: 0 10px 28px rgba(20,50,110,.18); display: grid; place-items: center;
         font-size: 84px; line-height: 1; }
</style></head><body>
<div class="land"></div>
<div class="in">
  <div class="brand"><span class="c1">С</span><span class="c2">м</span><span class="c3">е</span><span class="c4">т</span><span class="c5">к</span><span class="c6">о</span>
    <span class="tag">%s</span></div>
  <h1 id="t">%s</h1>
  <div class="foot"><b>smetko.com</b> · блог за родители и учители</div>
  <div class="right"><div class="emo">%s</div><div class="owl" data-owl="%s"></div></div>
</div>
<script src="js/owl.js"></script>
<script>
  document.querySelectorAll('[data-owl]').forEach(function (el) { el.innerHTML = window.Smetko.owl(el.getAttribute('data-owl'), {}); });
  // заглавието слиза, докато се побере на три реда
  var t = document.getElementById('t'), s = 70;
  t.style.fontSize = s + 'px';
  while (s > 32 && (t.scrollHeight > 3.3 * s * 1.08 || t.scrollWidth > t.clientWidth)) { s -= 2; t.style.fontSize = s + 'px'; }
  document.documentElement.setAttribute('data-ready', '1');
</script></body></html>"""

# ---------------------------------------------------------------- картите на страниците
# tools/seo.py записва списъка в og_list.json; тук са и страниците, които build.py прави.
PAGE_CARD = """<!doctype html><html lang="bg"><head><meta charset="utf-8">
<base href="http://127.0.0.1:%d/">
<link rel="stylesheet" href="css/style.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { font-family: 'Nunito', system-ui, sans-serif; position: relative;
         background: linear-gradient(180deg, #4FB3F6 0%%, #8ED6FF 100%%); }
  body.winter { background: linear-gradient(180deg, #2E6FA8 0%%, #6FB0E2 62%%, #A8D3F2 100%%); }
  .grass { position: absolute; left: -4%%; right: -4%%; bottom: -55px; height: 205px; background: #52C04A;
           border-radius: 50%% 50%% 0 0 / 70px 70px 0 0; }
  body.winter .grass { background: #F2F8FF; }
  body.winter .url { color: #1E3A8A; text-shadow: none; }      /* бяло върху сняг не се чете */
  .snow i { position: absolute; display: block; background: #fff; border-radius: 50%%; opacity: .85; }
  .fir { position: absolute; bottom: 118px; width: 0; height: 0; border-left: 34px solid transparent;
         border-right: 34px solid transparent; border-bottom: 86px solid #2F8F4E; }
  .fir::after { content: ''; position: absolute; left: -12px; top: 86px; width: 24px; height: 22px; background: #8A5A2B; }
  .chip { position: absolute; left: 64px; top: 64px; background: %s; color: #fff; font-weight: 900; font-size: 27px;
          padding: 12px 28px; border-radius: 999px; box-shadow: 0 6px 18px rgba(0,0,0,.16); }
  h1 { position: absolute; left: 64px; top: 148px; width: 620px; margin: 0; color: #fff; font-weight: 900;
       letter-spacing: -.02em; line-height: 1.1; text-shadow: 0 4px 0 rgba(0,0,0,.14); }
  .owl { position: absolute; right: 56px; bottom: 118px; width: 330px; }
  .owl svg { width: 100%%; height: auto; display: block; }
  .logo { position: absolute; left: 64px; bottom: 52px; background: #fff; border-radius: 18px; padding: 12px 26px;
          font-size: 34px; font-weight: 900; letter-spacing: -.01em; box-shadow: 0 6px 18px rgba(0,0,0,.14); }
  .c1 { color: #F0493F } .c2 { color: #FF7B00 } .c3 { color: #E9A700 }
  .c4 { color: #27AE60 } .c5 { color: #3299FF } .c6 { color: #8E5BEA }
  .url { position: absolute; right: 64px; bottom: 60px; color: #fff; font-weight: 900; font-size: 30px;
         text-shadow: 0 3px 0 rgba(0,0,0,.14); }
</style></head><body>
<div class="grass"></div>
%s<div class="chip">%s</div>
<h1 id="t">%s</h1>
<div class="owl" data-owl="%s"></div>
<div class="logo"><span class="c1">С</span><span class="c2">м</span><span class="c3">е</span><span class="c4">т</span><span class="c5">к</span><span class="c6">о</span></div>
<div class="url">smetko.com</div>
<script src="js/owl.js"></script>
<script>
  document.querySelectorAll('[data-owl]').forEach(function (el) { el.innerHTML = window.Smetko.owl(el.getAttribute('data-owl'), {}); });
  var t = document.getElementById('t'), s = 72;
  t.style.fontSize = s + 'px';
  while (s > 34 && (t.scrollHeight > 3.2 * s * 1.1 || t.scrollWidth > t.clientWidth)) { s -= 2; t.style.fontSize = s + 'px'; }
  document.documentElement.setAttribute('data-ready', '1');
</script></body></html>"""

# страниците извън темите (tools/build.py ги прави, затова не минават през seo.og)
EXTRA = [
    {'slug': 'koleden-kalendar', 'title': 'Коледен календар', 'sub': 'по една задача на ден · 1.–4. клас', 'color': '#C62828', 'pose': 'cheer', 'theme': 'winter'},
    {'slug': 'rabotni-listove', 'title': 'Работни листове за печат', 'sub': 'по тема или само едно действие', 'color': '#27AE60', 'pose': 'encourage'},
    {'slug': 'zadachi-na-daskata', 'title': 'Задачи на дъската', 'sub': 'една задача на цял екран · за класа', 'color': '#8E5BEA', 'pose': 'wave'},
    {'slug': 'uchilishta', 'title': 'Сметко за учители', 'sub': 'целият клас · безплатно', 'color': '#FF7B00', 'pose': 'hello'},
]


def pages(pw, port, all_=False):
    """Рисува картите на страниците по теми (og_list.json) и на ключовите страници."""
    import json
    out = os.path.join(PUB, 'assets', 'og')
    os.makedirs(out, exist_ok=True)
    lst = []
    f = os.path.join(ROOT, 'og_list.json')
    if os.path.exists(f):
        lst = json.load(open(f, encoding='utf-8'))
    have = {c['slug'] for c in lst}
    lst = lst + [c for c in EXTRA if c['slug'] not in have]   # темите вече имат своите карти
    jobs = [c for c in lst if all_ or not os.path.exists(os.path.join(out, c['slug'] + '.jpg'))]
    if not jobs:
        print('картите на страниците са готови (%d)' % len(lst)); return
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    esc = lambda x: str(x).replace('&', '&amp;').replace('<', '&lt;')
    for c in jobs:
        deco = ''
        if c.get('theme') == 'winter':
            import random
            rnd = random.Random(7)
            flakes = ''.join('<i style="left:%dpx;top:%dpx;width:%dpx;height:%dpx"></i>'
                             % (rnd.randint(20, 1180), rnd.randint(10, 430), r, r)
                             for r in [rnd.choice([6, 8, 10, 13]) for _ in range(34)])
            deco = ('<div class="snow">' + flakes + '</div>'
                    '<div class="fir" style="left:70px"></div><div class="fir" style="left:148px;transform:scale(.72)"></div>'
                    '<div class="fir" style="right:430px;transform:scale(.62)"></div>')
        pg.set_content(PAGE_CARD % (port, c['color'], deco, esc(c['sub']), esc(c['title']), c.get('pose', 'hello')),
                       wait_until='networkidle')
        if c.get('theme'):
            pg.evaluate("t=>document.body.classList.add(t)", c['theme'])
            pg.wait_for_timeout(80)
        pg.wait_for_function("document.documentElement.dataset.ready === '1'")
        pg.wait_for_timeout(100)
        pg.screenshot(path=os.path.join(out, c['slug'] + '.jpg'), type='jpeg', quality=88)
    b.close()
    print('нарисувани карти на страници: %d' % len(jobs))


POSE = {'Съвети за родители': 'encourage', 'Математика у дома': 'idle',
        'Игри и идеи': 'cheer', 'За учители': 'think'}


def posts():
    php = ("foreach (glob('%s/api/blog_posts*.php') as $f) require_once $f; $o = [];"
           "foreach (blog_posts() as $p) $o[] = ['slug' => $p['slug'], 'title' => $p['title'],"
           "'emoji' => $p['emoji'] ?? '📘', 'cat' => $p['cat']];"
           "echo json_encode($o, JSON_UNESCAPED_UNICODE);") % os.path.abspath(PUB)
    return json.loads(subprocess.run(['php', '-r', php], capture_output=True, text=True, check=True).stdout)


def main():
    todo_all = '--all' in sys.argv
    only = 'pages' if '--pages' in sys.argv else ('blog' if '--blog' in sys.argv else 'all')
    os.makedirs(OUT, exist_ok=True)
    rows = posts()
    jobs = [p for p in rows if todo_all or not os.path.exists(os.path.join(OUT, p['slug'] + '.jpg'))]
    if only == 'blog':
        pass
    elif not jobs and only == 'all':
        jobs = []
    if not jobs and only != 'pages':
        print('картинките на статиите са готови (%d)' % len(rows))
        if only == 'blog':
            return

    srv = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % PORT, '-t', os.path.abspath(PUB)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            if only in ('all', 'pages'):
                pages(pw, PORT, todo_all)
            if only == 'pages':
                return
            b = pw.chromium.launch()
            pg = b.new_page(viewport={'width': SIZE[0], 'height': SIZE[1]}, device_scale_factor=1)
            for p in jobs:
                esc = lambda x: str(x).replace('&', '&amp;').replace('<', '&lt;')
                pg.set_content(CARD % (PORT, esc(p['cat']), esc(p['title']), p['emoji'],
                                       POSE.get(p['cat'], 'wave')), wait_until='networkidle')
                pg.wait_for_function("document.documentElement.dataset.ready === '1'")
                pg.wait_for_timeout(120)
                pg.screenshot(path=os.path.join(OUT, p['slug'] + '.jpg'), type='jpeg', quality=88)
            b.close()
    finally:
        srv.terminate()
    kb = sum(os.path.getsize(os.path.join(OUT, p['slug'] + '.jpg')) for p in jobs) / 1024
    print('нарисувани картинки за споделяне: %d (%.0f KB)' % (len(jobs), kb))


if __name__ == '__main__':
    main()
