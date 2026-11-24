# -*- coding: utf-8 -*-
"""Хартията: работните листове излизат на A4 портрет, пълнят страницата и нищо не се застъпва.
Грамотата остава единственото нещо, което се печата на ширина.
"""
import os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from lib import B, INIT, ok, done

A4W, A4H = 594.96, 841.92
TMP = tempfile.mkdtemp(prefix='smetko-print-')
errs = []

SET = """(a)=>{const s=id=>document.getElementById(id);
  if(a.kind){s('ws-kind').value=a.kind;s('ws-kind').dispatchEvent(new Event('change'));}
  if(a.grade){s('ws-grade').value=a.grade;s('ws-grade').dispatchEvent(new Event('change'));}
  if(a.topic){s('ws-topic').value=a.topic;s('ws-topic').dispatchEvent(new Event('change'));}
  if(a.count){s('ws-count').value=a.count;s('ws-count').dispatchEvent(new Event('change'));}
  return document.querySelectorAll('#ws-sheet li').length}"""


def info(f):
    t = subprocess.run(['pdfinfo', f], capture_output=True, text=True).stdout
    size = re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', t)
    return int(re.search(r'Pages:\s+(\d+)', t).group(1)), float(size.group(1)), float(size.group(2))


def boxes(f, page=1):
    """Думите на страницата с координати – така се вижда дали нещо излиза или се застъпва."""
    t = subprocess.run(['pdftotext', '-bbox', '-f', str(page), '-l', str(page), f, '-'],
                       capture_output=True, text=True).stdout
    return [tuple(float(x) for x in m) for m in
            re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"', t)]


with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1280, 'height': 900}); c.add_init_script(INIT)
    pg = c.new_page()

    cases = [('лист 12', {'grade': '2', 'count': '12'}), ('лист 20', {'grade': '3', 'count': '20'}),
             ('лист 30', {'grade': '4', 'count': '30'}), ('контролно', {'kind': 'test', 'grade': '3'}),
             ('НВО', {'kind': 'nvo'}), ('геометрия', {'grade': '4', 'topic': 'geo', 'count': '20'}),
             ('седмица', {'kind': 'week', 'grade': '2'}), ('само деление', {'grade': '3', 'topic': 'div', 'count': '20'})]
    for name, args in cases:
        pg.goto(B + '/rabotni-listove.html'); pg.wait_for_timeout(1400)
        n = pg.evaluate(SET, args); pg.wait_for_timeout(600)
        f = os.path.join(TMP, re.sub(r'\W+', '-', name) + '.pdf')
        pg.pdf(path=f, prefer_css_page_size=True, print_background=True)
        pages, w, h = info(f)
        ok(abs(w - A4W) < 2 and abs(h - A4H) < 2, '%s: листът е A4 изправен (%.0f x %.0f)' % (name, w, h))
        ok(n >= 12, '%s: има задачи (%d)' % (name, n))
        bb = boxes(f)
        ok(bb and max(x[2] for x in bb) <= A4W - 18, '%s: нищо не излиза встрани' % name)
        ok(bb and max(x[3] for x in bb) <= A4H - 20, '%s: нищо не слиза под долното поле' % name)
        if args.get('count') and not args.get('topic') and args.get('kind') is None:
            fill = max(x[3] for x in bb) / A4H
            ok(fill > .62, '%s: листът пълни страницата (%.0f%%)' % (name, fill * 100))
        # две думи на един ред не се застъпват – точно това разваляше отговорите
        rows = {}
        for x0, y0, x1, y1 in bb:
            rows.setdefault(round(y1, 1), []).append((x0, x1))
        clash = 0
        for y, r in rows.items():
            r.sort()
            for i in range(1, len(r)):
                if r[i][0] < r[i - 1][1] - 1.5:
                    clash += 1
        ok(clash == 0, '%s: думите не се застъпват (%d)' % (name, clash))

    # листовете за родителска среща и за колега – по един на страница
    pg.goto(B + '/listovki.html'); pg.wait_for_timeout(1200)
    f = os.path.join(TMP, 'listovki.pdf')
    pg.pdf(path=f, prefer_css_page_size=True, print_background=True)
    pages, w, h = info(f)
    ok(pages == 2 and abs(w - A4W) < 2 and abs(h - A4H) < 2, 'листовете са два, на A4 изправен (%d, %.0fx%.0f)' % (pages, w, h))
    for n in (1, 2):
        bb = boxes(f, n)
        ok(bb and max(x[2] for x in bb) <= A4W - 18, 'лист %d: нищо не излиза встрани' % n)
        ok(bb and max(x[3] for x in bb) <= A4H - 20, 'лист %d: нищо не слиза под полето' % n)
    ok('smetko.com' in subprocess.run(['pdftotext', f, '-'], capture_output=True, text=True).stdout,
       'адресът на сайта го пише и на двата листа')

    # грамотата е единствената на ширина
    pg.goto(B + '/gramota.html'); pg.wait_for_timeout(1200)
    f = os.path.join(TMP, 'gramota.pdf')
    pg.pdf(path=f, prefer_css_page_size=True, print_background=True)
    _, w, h = info(f)
    ok(w > h, 'грамотата се печата на ширина (%.0f x %.0f)' % (w, h))

    # а обикновена страница от сайта – изправена
    pg.goto(B + '/terms.html'); pg.wait_for_timeout(900)
    f = os.path.join(TMP, 'terms.pdf')
    pg.pdf(path=f, prefer_css_page_size=True)
    _, w, h = info(f)
    ok(h > w, 'останалите страници се печатат изправени (%.0f x %.0f)' % (w, h))
    b.close()
done(errs)
