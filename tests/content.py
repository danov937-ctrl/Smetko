# -*- coding: utf-8 -*-
"""Съдържанието: моделът на НВО, сборникът, блогът, работните листове,
тестовете и една игра от начало до край.
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests
from playwright.sync_api import sync_playwright
from lib import B, ROOT, TOOLS, INIT, ok, done, page

errs = []

# ---------- чертежът на изпита живее на едно място
NODE = ("const fs=require('fs'),vm=require('vm');const ctx={window:{},Math,console};"
        "vm.createContext(ctx);vm.runInContext(fs.readFileSync(%r,'utf8'),ctx);"
        "console.log(JSON.stringify(ctx.window.Smetko.MathEngine.NVO4))" % os.path.join(os.path.abspath(ROOT), 'js', 'math-engine.js'))
js = subprocess.run(['node', '-e', NODE], capture_output=True, text=True)
N = json.loads(js.stdout or '{}')
ok(N.get('mc') == 16 and N.get('short') == 4 and N.get('written') == 5, 'моделът е 16 с избор + 4 кратки + 5 с решение')
ok(N.get('tasks') == 25 and N.get('points') == 100 and N.get('minutes') == 60, '25 задачи, 100 точки, 60 минути')
ok(N.get('sopExtra') == 30, 'за деца със СОП има 30 минути повече')
ok(len(N.get('plan', [])) == 20 and len(N.get('writtenPlan', [])) == 5, 'чертежът описва всичките 25 задачи')
areas = {t['area'] for t in N['plan']} | {t['area'] for t in N['writtenPlan']}
ok(areas == {'Числа', 'Фигури', 'Измерване', 'Моделиране'},
   'четирите области са покрити: %s' % sorted(areas))

S = requests.Session()
# старият модел не бива да се среща никъде
for u in ('nvo-4-klas-matematika.html', 'nvo-4-klas-zadachi-s-izbor.html', 'nvo-sbornik.html',
          'nvo-4-klas-probni-testove.html', 'index.html'):
    t = S.get(B + '/' + u).text
    ok('18-те задачи' not in t and '18 задачи с избираем' not in t, '/%s не повтаря стария модел' % u)
t = S.get(B + '/nvo-4-klas-matematika.html').text
ok('4 юни 2027' in t, 'датата на изпита е вярна')
ok('16' in t and '25 задачи' in t, 'страницата изброява задачите по модела')

# ---------- сборникът е безплатен и цял
pdf = os.path.join(ROOT, 'assets', 'Smetko-NVO-4-klas-sbornik.pdf')
ok(os.path.exists(pdf) and os.path.getsize(pdf) > 1000000, 'сборникът е в сайта (%d kB)' % (os.path.getsize(pdf) // 1024 if os.path.exists(pdf) else 0))
sb = S.get(B + '/nvo-sbornik.html').text
ok(sb.count('Smetko-NVO-4-klas-sbornik.pdf') >= 2, 'сборникът се сваля от страницата')
ok('Smetko-NVO-4-klas-izvadka.pdf' in sb, 'има и извадка')
ok('не се продава' not in sb and 'когато излезе' not in sb, 'няма остатъци от „още не се продава“')
ok('безплат' in sb.lower(), 'страницата казва, че е безплатен')
ok('91 страници' not in sb, 'броят страници е верен')

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1280, 'height': 1000}); c.add_init_script(INIT)
    pg = page(c, errs)

    # ---------- блогът
    pg.goto(B + '/blog/'); pg.wait_for_timeout(900)
    n = pg.locator('.blog-card').count()
    ok(n >= 10, 'блогът показва %d статии' % n)
    pg.locator('.blog-card a, a.blog-card').first.click(); pg.wait_for_timeout(900)
    url = pg.url
    ok('/blog/' in url and not url.rstrip('/').endswith('blog'), 'статията се отваря на свой адрес: %s' % url)
    ok(pg.locator('script[type="application/ld+json"]').count() >= 1, 'статията носи структурирани данни')
    toc = pg.locator('.bp-toc a')
    if ok(toc.count() >= 2, 'статията има съдържание с %d точки' % toc.count()):
        toc.nth(1).click(); pg.wait_for_timeout(600)
        ok(pg.url.split('#')[0].rstrip('/') == url.split('#')[0].rstrip('/'),
           'връзка от съдържанието остава в статията (%s)' % pg.url)
        ok(pg.evaluate('window.scrollY') > 200, 'и скача надолу по текста')

    # ---------- насрочените статии излизат чак на своя ден
    import glob, datetime
    today = datetime.date.today().isoformat()
    future, live = [], []
    for f in glob.glob(os.path.join(ROOT, 'api', 'blog_posts*.php')):
        src = open(f, encoding='utf-8').read()
        for sl, dt in re.findall(r"'slug' => '([a-z0-9-]+)'.*?'date' => '([^']+)'", src, re.S):
            (future if re.match(r'^\d{4}-', dt) and dt > today else live).append(sl)   # „-42 days“ значи отдавна излязла
    ok(len(live) >= 15, 'излезли статии: %d' % len(live))
    early = [sl for sl in future if S.get(B + '/blog/' + sl).status_code == 200]
    ok(not early, 'насрочените статии още не се виждат (%d насрочени) %s' % (len(future), early[:3]))
    late = [sl for sl in live if S.get(B + '/blog/' + sl).status_code != 200]
    ok(not late, 'всяка излязла статия се отваря %s' % late[:3])

    # ---------- работните листове: три вида
    pg.goto(B + '/rabotni-listove.html'); pg.wait_for_timeout(1400)
    ok(pg.locator('#ws-sheet .ws-list li').count() == 20, 'работен лист: 20 задачи')
    ok(pg.locator('#ws-key li').count() == 20, 'и ключ с 20 отговора')
    pg.select_option('#ws-kind', 'test'); pg.wait_for_timeout(1200)
    ok(pg.locator('#ws-sheet .ws-page').count() == 2, 'контролно: два варианта')
    A = pg.eval_on_selector_all('#ws-sheet .ws-page:nth-child(1) .ws-list li', 'e=>e.map(x=>x.innerText.trim())')
    Bv = pg.eval_on_selector_all('#ws-sheet .ws-page:nth-child(2) .ws-list li', 'e=>e.map(x=>x.innerText.trim())')
    ok(len(A) == len(Bv) == 20 and sum(1 for x, y in zip(A, Bv) if x == y) == 0,
       'вариантите са равни по брой и различни по задачи')
    sa = pg.eval_on_selector_all('#ws-sheet .ws-page:nth-child(1) .ws-list li', 'e=>e.map(x=>x.dataset.skill)')
    sb = pg.eval_on_selector_all('#ws-sheet .ws-page:nth-child(2) .ws-list li', 'e=>e.map(x=>x.dataset.skill)')
    ok(sa and all(sa), 'задачите носят името на умението си')
    ok(sa == sb, 'вариант Б повтаря уменията на вариант А ред по ред')
    pg.select_option('#ws-kind', 'nvo'); pg.wait_for_timeout(1400)
    ok(pg.locator('#ws-sheet .ws-list li').count() == 20, 'пробно НВО: 20 задачи на лист')
    ok(pg.locator('#ws-sheet .ws-opts').count() == 16, 'от които 16 с готови отговори')
    opts = pg.eval_on_selector_all('#ws-sheet .ws-opts', 'e=>e.map(x=>x.innerText.trim())')
    ok(all(o.startswith('а)') for o in opts), 'отговорите са с букви а) б) в) г)')

    # ---------- коледният календар
    pg.goto(B + '/koleden-kalendar.html'); pg.wait_for_timeout(1400)
    ok(pg.locator('.ac-day').count() == 24, 'календарът има 24 врати')
    import datetime
    t = datetime.date.today()
    want = 24 - t.day if t.month == 12 else 0
    ok(pg.locator('.ac-day.locked').count() == max(0, want), 'заключени са само бъдещите дни (%d)' % pg.locator('.ac-day.locked').count())
    pg.locator('.ac-day:not(.locked)').first.click(); pg.wait_for_timeout(600)
    q1 = pg.locator('.ac-q').inner_text()
    ok(len(q1) > 4, 'вратата отваря задача: %s' % q1[:40])
    pg.reload(); pg.wait_for_timeout(1400)
    pg.locator('.ac-day:not(.locked)').first.click(); pg.wait_for_timeout(600)
    ok(pg.locator('.ac-q').inner_text() == q1, 'същият ден дава същата задача след презареждане')
    pg.select_option('#ac-grade', '4'); pg.wait_for_timeout(700)
    pg.locator('.ac-day:not(.locked)').first.click(); pg.wait_for_timeout(600)
    ok(pg.locator('.ac-q').inner_text() != q1, 'другият клас получава друга задача')
    # верен отговор се помни
    pg.select_option('#ac-grade', '2'); pg.wait_for_timeout(700)
    pg.locator('.ac-day:not(.locked)').first.click(); pg.wait_for_timeout(500)
    pg.fill('.ac-in', '999999'); pg.click('.ac-check'); pg.wait_for_timeout(400)
    ok('Не е това' in pg.inner_text('.ac-fb'), 'грешният отговор се отхвърля')
    day = pg.eval_on_selector('.ac-panel', 'e=>e.dataset.day')
    right = pg.evaluate('d=>String(Smetko.Advent.taskFor(+d, Smetko.Advent.grade()).answer)', day)
    pg.fill('.ac-in', right); pg.click('.ac-check'); pg.wait_for_timeout(1500)
    ok(pg.locator('.ac-day.solved').count() == 1, 'решеният ден получава звезда')
    ok('1' in pg.inner_text('.ac-count'), 'броячът отчита решеното: %s' % pg.inner_text('.ac-count'))
    pg.reload(); pg.wait_for_timeout(1300)
    ok(pg.locator('.ac-day.solved').count() == 1, 'звездата остава след презареждане')

    # ---------- тестовете онлайн
    pg.goto(B + '/nvo-4-klas-probni-testove.html'); pg.wait_for_timeout(1800)
    ok(pg.locator('.qz').count() >= 3, 'страницата предлага %d пробни теста' % pg.locator('.qz').count())
    pg.locator('.qz button.btn-green').first.click(); pg.wait_for_timeout(1800)
    q = pg.locator('.qz .qz-q')
    ok(q.count() >= 20, 'пробният тест показва %d задачи' % q.count())
    tags = set(t.split('·')[0].strip().lower() for t in pg.eval_on_selector_all('.qz-plan', 'e=>e.map(x=>x.innerText)'))
    ok(tags and tags <= {'числа', 'фигури', 'измерване', 'моделиране'}, 'задачите сочат областта си: %s' % sorted(tags))

    # ---------- часовникът
    pg.goto(B + '/chasovnik.html'); pg.wait_for_timeout(1400)
    ok(pg.locator('#ck-face').count() == 1 and pg.locator('#ck-h').count() == 1, 'часовникът се вижда със стрелките си')
    ok(not pg.locator('#ck-digi').is_visible(), 'при „Колко е часът“ отговорът не стои на екрана')
    tgt = pg.evaluate('Smetko.Clock.target()')
    h = (tgt // 60) % 12 or 12
    pg.fill('#ck-ans', '%d:%02d' % (h, tgt % 60)); pg.click('#ck-check'); pg.wait_for_timeout(400)
    ok('Браво' in pg.inner_text('#ck-fb'), 'верният час се приема: %s' % pg.inner_text('#ck-fb'))
    pg.select_option('#ck-mode', 'set'); pg.wait_for_timeout(600)
    ok('Нагласи' in pg.inner_text('#ck-task'), 'вторият режим иска нагласяване: %s' % pg.inner_text('#ck-task'))
    tgt = pg.evaluate('Smetko.Clock.target()')
    pg.evaluate('t=>Smetko.Clock.set(t)', tgt); pg.click('#ck-check'); pg.wait_for_timeout(400)
    ok('Браво' in pg.inner_text('#ck-fb'), 'нагласеният часовник се приема')
    # стрелките се местят с влачене
    box = pg.locator('#ck-face').bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    pg.evaluate('()=>Smetko.Clock.set(3*60)')
    pg.mouse.move(cx, cy - box['height'] * 0.42); pg.mouse.down()
    pg.mouse.move(cx + box['width'] * 0.42, cy, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    ok(pg.evaluate('Smetko.Clock.get()') == 195, 'влачене по ръба мести минутната стрелка (3:00 → 3:15)')
    pg.evaluate('()=>Smetko.Clock.set(3*60)')
    pg.mouse.move(cx, cy - box['height'] * 0.20); pg.mouse.down()
    pg.mouse.move(cx, cy + box['height'] * 0.20, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    ok(pg.evaluate('Smetko.Clock.get()') == 360, 'влачене до центъра мести часовата стрелка (3:00 → 6:00)')

    # как се казва часът на български
    w = pg.evaluate('()=>[Smetko.Clock.words(7*60+45), Smetko.Clock.words(9*60+30), Smetko.Clock.words(3*60)]')
    ok(w[0] == '8 без петнайсет' and w[1] == '9 и половина' and 'точно' in w[2], 'часът се казва правилно: %s' % w)

    # ---------- отчетът за родителя дава какво да се направи
    pg.goto(B + '/otchet.html'); pg.wait_for_timeout(1000)
    txt = pg.evaluate("""()=>{const el=document.getElementById('rp-local');
      const days={}; const d=new Date();
      for(let i=0;i<6;i++){const x=new Date(d-i*864e5);
        days[x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')]=[12,7];}
      Smetko.Report.render(el,{nickname:'Мими',grade:2,answered:220,correct:160,stars:9,missions:5,
        skills:{'add100x':[4,12],'mulTable':[18,20],'sub100x':[9,14]},days:days});
      const p=document.querySelector('.rp-plan'); return p ? p.innerText : ''}""")
    ok('Какво да направите' in txt, 'отчетът казва какво да се направи тази седмица')
    ok('Въпрос към детето' in txt, 'и дава въпрос за детето')
    ok('преминаване' in txt, 'сочи точно слабата тема: %s' % txt.split('\n')[1][:60])

    # ---------- задачи на дъската
    pg.goto(B + '/zadachi-na-daskata.html'); pg.wait_for_timeout(1600)
    ok(pg.locator('#bd-topic option').count() >= 4, 'темите на класа се зареждат (%d)' % pg.locator('#bd-topic option').count())
    q1 = pg.inner_text('#bd-q')
    ok(len(q1) > 2 and pg.locator('#bd-a').is_hidden(), 'показва задача, без отговора: %s' % q1[:30])
    pg.keyboard.press(' '); pg.wait_for_timeout(300)
    ok(not pg.locator('#bd-a').is_hidden() and len(pg.inner_text('#bd-a')) > 2, 'интервалът показва отговора: %s' % pg.inner_text('#bd-a')[:30])
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
    ok(pg.locator('#bd-a').is_hidden(), 'стрелката дава нова задача и скрива отговора')
    ok('2' in pg.inner_text('#bd-count'), 'задачите се броят: %s' % pg.inner_text('#bd-count'))
    pg.select_option('#bd-grade', '4'); pg.wait_for_timeout(600)
    ok(pg.locator('#bd-topic option').count() >= 4, 'смяната на класа сменя темите')

    # ---------- една игра от начало до край
    pg.goto(B + '/game.html'); pg.wait_for_timeout(2500)
    pg.locator('.dt-card .btn-green').first.click(); pg.wait_for_timeout(2000)
    ok(pg.locator('.qcard').count() == 1, 'играта отваря задача')
    txt = pg.locator('.qcard .q-text').first.inner_text().strip()
    ok(len(txt) > 3, 'задачата има условие: %s' % txt.replace('\n', ' ')[:48])
    ok(pg.locator('.qcard .slot, .qcard input, .keypad, .choices').count() > 0, 'има къде да се отговори')

    b.close()
done(errs)
