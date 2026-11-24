# -*- coding: utf-8 -*-
"""Картинки за страницата във Фейсбук: корица и профилна снимка.

Рисуват се от истинския CSS и истинската сова на сайта, за да са в същия вид.
Фейсбук реже корицата различно на компютър и на телефон, затова важното стои в
средата; профилната се реже в кръг, затока совата е центрирана с поле наоколо.

    python3 tools/fb.py
"""
import os, subprocess, sys, time

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.abspath(os.path.join(ROOT, '..', 'public_html'))
OUT = os.path.join(ROOT, 'fb')
PORT = 8096

COVER = """<!doctype html><html lang="bg"><head><meta charset="utf-8">
<base href="http://127.0.0.1:%d/">
<link rel="stylesheet" href="css/style.css">
<style>
  html, body { margin: 0; width: 1640px; height: 624px; overflow: hidden; }
  body { font-family: 'Nunito', system-ui, sans-serif; position: relative;
         background: linear-gradient(180deg, #D7EDFF 0%%, #EFF8FF 60%%); }
  .land { position: absolute; left: 0; right: 0; bottom: 0; height: 230px;
          background: url(assets/images/landscape.svg) center bottom / cover no-repeat; }
  /* на телефон Фейсбук показва само средата – затова всичко важно е вътре в .safe */
  /* долу вляво стои профилната снимка на страницата – затова текстът е вдигнат нагоре */
  .safe { position: absolute; left: 50%%; top: 0; transform: translateX(-50%%); width: 1090px; height: 624px;
          display: grid; grid-template-columns: 1fr 320px; align-content: center; column-gap: 26px; padding: 0 18px 92px; }
  .brand { font-size: 96px; font-weight: 900; letter-spacing: -.02em; line-height: 1; margin: 0 0 10px; }
  .brand span { text-shadow: 0 3px 0 rgba(0,0,0,.10); }
  .c1 { color: #F0493F } .c2 { color: #FF7B00 } .c3 { color: #E9A700 }
  .c4 { color: #27AE60 } .c5 { color: #3299FF } .c6 { color: #8E5BEA }
  h1 { margin: 0 0 18px; font-size: 40px; font-weight: 900; color: #15306E; letter-spacing: -.02em; line-height: 1.14;
       text-shadow: 0 2px 0 rgba(255,255,255,.6); }
  .pills { display: flex; gap: 10px; align-items: center; }
  .pill { background: #fff; color: #15306E; font-weight: 900; font-size: 21px; padding: 9px 18px; border-radius: 999px;
          white-space: nowrap; box-shadow: 0 5px 16px rgba(20,50,110,.14); }
  .pill.url { background: #1E3A8A; color: #fff; font-size: 23px; padding: 10px 22px; }
  .owl { width: 320px; justify-self: center; align-self: center; }
  .owl svg { width: 100%%; height: auto; display: block; }
</style></head><body>
<div class="land"></div>
<div class="safe">
  <div>
    <div class="brand"><span class="c1">С</span><span class="c2">м</span><span class="c3">е</span><span class="c4">т</span><span class="c5">к</span><span class="c6">о</span></div>
    <h1>Математика като игра<br>за 1.–4. клас</h1>
    <div class="pills"><span class="pill">безплатно</span><span class="pill">без реклами</span><span class="pill">по учебника</span><span class="pill url">smetko.com</span></div>
  </div>
  <div class="owl" data-owl="wave"></div>
</div>
<script src="js/owl.js"></script>
<script>document.querySelectorAll('[data-owl]').forEach(function (el) { el.innerHTML = window.Smetko.owl(el.getAttribute('data-owl'), {}); });
document.documentElement.setAttribute('data-ready','1');</script></body></html>"""

AVATAR = """<!doctype html><html lang="bg"><head><meta charset="utf-8">
<base href="http://127.0.0.1:%d/">
<link rel="stylesheet" href="css/style.css">
<style>
  html, body { margin: 0; width: 1024px; height: 1024px; overflow: hidden; }
  body { font-family: 'Nunito', system-ui, sans-serif; display: grid; place-items: center;
         background: radial-gradient(circle at 50%% 38%%, #EAF6FF 0%%, #CFE7FF 72%%, #BFDDFF 100%%); }
  .wrap { display: grid; justify-items: center; gap: 2px; }
  .owl { width: 560px; }
  .owl svg { width: 100%%; height: auto; display: block; }
  .brand { font-size: 112px; font-weight: 900; letter-spacing: -.02em; line-height: 1; }
  .brand span { text-shadow: 0 3px 0 rgba(0,0,0,.10); }
  .c1 { color: #F0493F } .c2 { color: #FF7B00 } .c3 { color: #E9A700 }
  .c4 { color: #27AE60 } .c5 { color: #3299FF } .c6 { color: #8E5BEA }
</style></head><body>
<div class="wrap">
  <div class="owl" data-owl="idle"></div>
  <div class="brand"><span class="c1">С</span><span class="c2">м</span><span class="c3">е</span><span class="c4">т</span><span class="c5">к</span><span class="c6">о</span></div>
</div>
<script src="js/owl.js"></script>
<script>document.querySelectorAll('[data-owl]').forEach(function (el) { el.innerHTML = window.Smetko.owl(el.getAttribute('data-owl'), {}); });
document.documentElement.setAttribute('data-ready','1');</script></body></html>"""


def main():
    os.makedirs(OUT, exist_ok=True)
    srv = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % PORT, '-t', PUB],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            for name, tpl, w, h, typ in [('korica', COVER, 1640, 624, 'jpeg'),
                                         ('profilna', AVATAR, 1024, 1024, 'png')]:
                pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
                pg.set_content(tpl % PORT, wait_until='networkidle')
                pg.wait_for_function("document.documentElement.dataset.ready === '1'")
                pg.wait_for_timeout(150)
                f = os.path.join(OUT, 'smetko-%s.%s' % (name, 'jpg' if typ == 'jpeg' else 'png'))
                pg.screenshot(path=f, **({'type': 'jpeg', 'quality': 92} if typ == 'jpeg' else {}))
                print('%s → %s (%.0f KB)' % (name, f, os.path.getsize(f) / 1024))
                pg.close()
            b.close()
    finally:
        srv.terminate()


if __name__ == '__main__':
    main()
