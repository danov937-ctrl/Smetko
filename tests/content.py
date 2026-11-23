# -*- coding: utf-8 -*-
"""Съдържанието: моделът на НВО, сборникът, блогът, работните листове,
тестовете и една игра от начало до край.
"""
import json, os, re, subprocess, sys, time
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

# ---------- геометрията: има я във всеки клас и чертежите отговарят на числата
GEO = ['shapes', 'lines', 'countShapes', 'ruler', 'polySides', 'segSum', 'cm20', 'perim2', 'triSides',
       'triAngles', 'angles', 'degrees', 'rectProps', 'sideFromPerim', 'area', 'areaUnits', 'sideFromArea',
       'compArea', 'perimArea2', 'circle', 'circleParts', 'solidsName', 'solidsCount', 'wordArea']
NODE_HEAD = ("const fs=require('fs'),vm=require('vm');const ctx={window:{},Math,console};vm.createContext(ctx);"
             "vm.runInContext(fs.readFileSync(%r,'utf8'),ctx);const E=ctx.window.Smetko.MathEngine;"
             % os.path.join(os.path.abspath(ROOT), 'js', 'math-engine.js'))

def node(js):
    r = subprocess.run(['node', '-e', NODE_HEAD + js], capture_output=True, text=True)
    return (r.stdout or r.stderr).strip()

# ---------- таблицата с умения: нищо не сочи в нищото и нищо не е записано два пъти
chk = json.loads(node("""const miss=[],dup=[],nvo=[];
for(let g=1;g<=4;g++)(E.GRADES[g].topics||[]).forEach(t=>{
  const n=t.skills.map(k=>k[0]);
  n.forEach((k,i)=>{ if(!E._S[k.split(':')[0]]) miss.push(t.id+' '+k); if(n.indexOf(k)!==i) dup.push(t.id+' '+k); });
});
(E.NVO4.plan||[]).forEach(p=>p.s.forEach(k=>{ if(!E._S[k.split(':')[0]]) nvo.push(p.n+' '+k) }));
console.log(JSON.stringify({miss,dup,nvo}))"""))
ok(not chk['miss'], 'всяко умение в мисиите го има в двигателя %s' % chk['miss'][:3])
ok(not chk['dup'], 'нито едно умение не е записано два пъти в една тема %s' % chk['dup'][:3])
ok(not chk['nvo'], 'всяко умение в плана за НВО го има в двигателя %s' % chk['nvo'][:3])

# деление с остатък и част от число се срещат в мисиите, не само в учебниците
seen = json.loads(node("const o={};for(let g=1;g<=4;g++){o[g]=[];"
                       "(E.GRADES[g].topics||[]).forEach(t=>t.skills.forEach(k=>o[g].push(k[0])))}"
                       "console.log(JSON.stringify(o))"))
ok('divRem' in seen['3'] and 'divRem' in seen['4'], 'деление с остатък има в 3. и 4. клас')
ok('parts' in seen['3'] and 'parts' in seen['4'], 'част от число има в 3. и 4. клас')
ok('numLine' in seen['1'] and 'numLine' in seen['3'], 'числовата ос влиза и в мисиите, не само в отделната страница')
ok(set(['degrees', 'triSides', 'triAngles']) <= set(seen['4']),
   'ъглите и видовете триъгълници (задача 13 от НВО) се упражняват в 4. клас')

# приблизителното пресмятане: верният отговор винаги е сред четирите, без повторения и без нули
res = node("""let bad=0,k={};
for(let i=0;i<6000;i++){const x=E._S.estimate();const o=x.choices.map(c=>c.v);
  if(o.length!==4||new Set(o).size!==4||o.indexOf(x.answer)<0||o.some(v=>+v<=0))bad++;
  k[x.q.split(' ')[2]]=1}
console.log(bad+' '+Object.keys(k).length)""").split()
ok(res[0] == '0', 'приблизителното пресмятане: %s грешни от 6000' % res[0])
ok(res[1] == '3', 'и има три вида – сбор, разлика и произведение (%s)' % res[1])

per_grade = json.loads(node("const G=%s;const o={};for(let g=1;g<=4;g++){const h=new Set();"
                            "(E.GRADES[g].topics||[]).forEach(t=>t.skills.forEach(k=>{if(G.includes(k[0]))h.add(k[0])}));"
                            "o[g]=[...h]}console.log(JSON.stringify(o))" % json.dumps(GEO, ensure_ascii=False)))
for g in '1234':
    ok(len(per_grade[g]) >= 3, '%s. клас има %d геометрични умения: %s' % (g, len(per_grade[g]), ', '.join(per_grade[g])))
ok(sum(len(v) for v in per_grade.values()) >= 24, 'общо поне 24 геометрични умения в мисиите (%d)'
   % sum(len(v) for v in per_grade.values()))

# чертежът на съставната фигура трябва да дава точно отговора, който се иска
res = node("""let bad=0,n=0;
for(let i=0;i<1500;i++){const x=E.generateSkill(4,'compArea',2);
  const pts=/points="([^"]+)"/.exec(x.figure)[1].trim().split(/\s+/).map(p=>p.split(',').map(Number));
  let A=0,P=0;for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length];
    A+=a[0]*b[1]-b[0]*a[1];P+=Math.hypot(b[0]-a[0],b[1]-a[1]);}
  A=Math.abs(A)/2/121;P=P/11;const want=/лицето/.test(x.q)?A:P;n++;
  if(Math.abs(want-x.answer)>0.001)bad++;}
console.log(bad+'/'+n)""")
ok(res.startswith('0/'), 'съставните фигури: чертежът дава отговора (%s разминавания)' % res)

# линийката: нарисуваната отсечка е дълга точно колкото е отговорът
res = node("""let bad=0;for(let i=0;i<800;i++){const t=E.generateSkill(2,'ruler',2);
  const m=[...t.figure.matchAll(/<line x1="([\d.]+)" y1="46" x2="([\d.]+)" y2="46"/g)][0];
  if(!m||Math.abs((m[2]-m[1])/18-t.answer)>0.001)bad++;}console.log(bad)""")
ok(res == '0', 'линийката: отсечката е толкова дълга, колкото е отговорът (%s грешни)' % res)

# всяко геометрично умение се генерира и има отговор
res = node("""const G=%s;let bad=[];
for(let g=1;g<=4;g++)(E.GRADES[g].topics||[]).forEach(t=>t.skills.forEach(k=>{if(!G.includes(k[0]))return;
  for(let lv=1;lv<=3;lv++){const x=E.generateSkill(g,k[0],lv);
    if(!x||x.answer===undefined||x.answer===null||String(x.answer)==='NaN')bad.push(g+':'+k[0]+':'+lv);
    if(x&&x.figure&&/NaN|undefined/.test(x.figure))bad.push('чертеж '+k[0]);}}));
console.log(JSON.stringify([...new Set(bad)].slice(0,5)))""" % json.dumps(GEO, ensure_ascii=False))
ok(res == '[]', 'всички геометрични умения се генерират чисто %s' % res)

# ---------- работа с данни, закръгляване, редици и календар
DATA = ['tableRead', 'barChart', 'roundTo', 'estimate', 'pattern', 'calendar']
where = json.loads(node("const G=%s;const o={};for(let g=1;g<=4;g++){const h=[];"
                        "(E.GRADES[g].topics||[]).forEach(t=>t.skills.forEach(k=>{if(G.includes(k[0])&&!h.includes(k[0]))h.push(k[0])}));"
                        "o[g]=h}console.log(JSON.stringify(o))" % json.dumps(DATA)))
ok(all(where[g] for g in '1234'), 'всеки клас има нещо от новите видове: %s' % {g: len(where[g]) for g in '1234'})
ok(set(where['3']) >= {'tableRead', 'barChart'}, '3. клас чете таблица и диаграма')
ok('roundTo' in where['4'] and 'estimate' in where['4'], '4. клас закръглява и прави приблизителна сметка')

res = node("""let bad=0;
for(let i=0;i<1200;i++){const t=E.generateSkill(4,'roundTo',1+i%3);
  const m=/Закръгли (\\d+) до/.exec(t.q); const to=/десетици/.test(t.q)?10:/стотици/.test(t.q)?100:1000;
  if(!m||+m[1]%to===0||Math.round(+m[1]/to)*to!==t.answer)bad++;}
console.log(bad)""")
ok(res == '0', 'закръгляването е вярно и числото не е вече закръглено (%s грешни)' % res)

res = node("""let bad=0;
for(let i=0;i<1200;i++){for(const sk of ['tableRead','barChart']){const t=E.generateSkill(4,sk,1+i%3);
  if(t.kind==='choice'){const v=t.choices.map(c=>typeof c==='object'?c.v:c);
    if(new Set(v).size!==v.length||v.length>4)bad++;}
  if(!/dtbl|<svg/.test(t.figure||''))bad++;}}
console.log(bad)""")
ok(res == '0', 'таблиците и диаграмите идват с рисунка и с различни отговори (%s)' % res)

res = node("""let bad=0;
for(let i=0;i<1500;i++){const t=E.generateSkill(3,'pattern',1+i%3);
  const m=/редицата: ([\\d, ]+),/.exec(t.q); if(!m){bad++;continue;}
  const n=m[1].split(',').map(x=>+x.trim());
  const d=n[1]-n[0], q=n[1]/n[0];
  const okAdd=n.every((x,j)=>j===0||x-n[j-1]===d) && t.answer===n[3]+d;
  const okMul=n.every((x,j)=>j===0||x/n[j-1]===q) && t.answer===n[3]*q;
  if(!okAdd&&!okMul)bad++;}
console.log(bad)""")
ok(res == '0', 'редиците продължават по своето правило (%s грешни)' % res)

# ---------- числовата ос: стрелката стои на мястото на отговора
res = node("""let bad=0;
for(let i=0;i<1200;i++){const t=E.generateSkill(3,'numLine',1+i%3);
  const m=/Стрелката сочи (\\d+)/.exec(t.full||'');const at=m?+m[1]:t.answer;
  const p=/<polygon points="([\\d., ]+)" fill="#FF7A1A"/.exec(t.figure);if(!p){bad++;continue;}
  const x=+p[1].trim().split(/[ ]/)[0].split(',')[0];
  const sp=/>(\\d+)<\\/text><\\/svg>|class="ln">(\\d+)</g;
  const nums=[...t.figure.matchAll(/class="ln">(\\d+)</g)].map(z=>+z[1]);
  const span=Math.max(...nums), X=18, L=300-2*X;
  if(Math.abs(X+L*at/span-x)>0.6)bad++;}
console.log(bad)""")
ok(res == '0', 'числовата ос: стрелката сочи точно числото (%s разминавания)' % res)

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

    # ---------- връзките вътре в статиите водят донякъде (в оформлението има <base href="/">)
    posts = {}
    for f in glob.glob(os.path.join(ROOT, 'api', 'blog_posts*.php')):
        src = open(f, encoding='utf-8').read()
        for sl, body in re.findall(r"'slug' => '([a-z0-9-]+)'.*?<<<'MD'\n(.*?)\nMD\]", src, re.S):
            posts[sl] = [h for h in re.findall(r'\]\(([^)]+)\)', body) if not h.startswith(('http', '#', 'mailto'))]
    ok(len(posts) >= 30, 'статиите се четат от php файловете: %d' % len(posts))
    bad = []
    for sl, hs in posts.items():
        for h in hs:
            t = h.split('#')[0].lstrip('/')
            if t.startswith('blog/'):
                if t[5:] not in posts:
                    bad.append((sl, h))
            elif not os.path.exists(os.path.join(ROOT, t)):
                bad.append((sl, h))
    ok(not bad, 'връзките в статиите водят донякъде (%d проверени) %s' % (sum(len(v) for v in posts.values()), bad[:3]))
    thin = [sl for sl, hs in posts.items() if len(hs) < 2]
    ok(not thin, 'всяка статия сочи поне две вътрешни страници %s' % thin[:3])

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
    # отделен лист само по геометрия, с чертежите
    for g in ('1', '2', '3', '4'):
        pg.goto(B + '/rabotni-listove.html?grade=' + g); pg.wait_for_timeout(1300)
        ok(pg.locator('#ws-topic option[value="geo"]').count() == 1, '%s. клас: има лист „Геометрия“' % g)
        pg.select_option('#ws-topic', 'geo'); pg.wait_for_timeout(1700)
        n = pg.locator('#ws-sheet .ws-list li').count()
        figs = pg.locator('#ws-sheet .ws-fig').count()
        ok(n == 20 and pg.locator('#ws-key li').count() == 20, '%s. клас: 20 задачи и 20 отговора (%d)' % (g, n))
        ok(figs >= 6, '%s. клас: чертежите стигат до листа (%d)' % (g, figs))
        sk = pg.eval_on_selector_all('#ws-sheet .ws-list li', 'e=>e.map(x=>x.dataset.skill)')
        ok(len(set(x for x in sk if x)) >= 4, '%s. клас: листът не се върти около едно умение (%d различни)' % (g, len(set(sk))))
    pg.goto(B + '/rabotni-listove.html'); pg.wait_for_timeout(1300)
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

    # ---------- страницата по геометрия
    pg.goto(B + '/geometria.html'); pg.wait_for_timeout(1800)
    ok(pg.locator('.geo-grade').count() == 4, 'геометрията е подредена по четирите класа')
    ok(pg.locator('.qz').count() == 4, 'всеки клас има свой тест')
    ok(pg.locator('.qz-q').count() >= 28, 'тестовете се зареждат с %d задачи' % pg.locator('.qz-q').count())
    ok(pg.locator('.qz-fig').count() >= 12, 'задачите идват с чертежи (%d)' % pg.locator('.qz-fig').count())
    for g in ('1', '2', '3', '4'):
        ok(pg.locator('#klas-%s' % g).count() == 1, 'има раздел за %s. клас' % g)
    skills = pg.eval_on_selector_all('.qz', 'e=>e.map(x=>x.dataset.skills||"")')
    ok(all(len(x.split(',')) >= 3 for x in skills), 'всеки тест пита поне по три умения: %s' % [len(x.split(',')) for x in skills])

    # ---------- числовата ос на живо
    pg.goto(B + '/chislova-os.html'); pg.wait_for_timeout(1400)
    ok(pg.locator('#nl-svg').count() == 1, 'оста се показва')
    tgt = pg.evaluate('Smetko.NumLine.target()')
    pg.evaluate('v=>Smetko.NumLine.set(v)', tgt); pg.click('#nl-check'); pg.wait_for_timeout(400)
    ok('Браво' in pg.inner_text('#nl-fb'), 'намереното число се приема: %s' % pg.inner_text('#nl-fb')[:40])
    pg.wait_for_timeout(1600)
    pg.select_option('#nl-mode', 'round'); pg.select_option('#nl-span', '100'); pg.wait_for_timeout(700)
    t = pg.evaluate('Smetko.NumLine.target()'); st = pg.evaluate('Smetko.NumLine.step()')
    lo = (t // st) * st
    right = lo if t - lo < lo + st - t else lo + st
    pg.fill('#nl-ans', str(right)); pg.click('#nl-check'); pg.wait_for_timeout(400)
    ok('Браво' in pg.inner_text('#nl-fb'), 'закръгляването с оста работи (%d → %d)' % (t, right))

    # ---------- двубой за двама
    pg.goto(B + '/dvuboy.html'); pg.wait_for_timeout(1400)
    pg.fill('#du-n1', 'Мира'); pg.fill('#du-n2', 'Иво'); pg.select_option('#du-rounds', '3')
    pg.click('#du-start'); pg.wait_for_timeout(800)
    ok(pg.inner_text('#du-who') == 'Мира', 'първи е на ход играчът, въведен първи')
    turns = []
    for _ in range(6):
        a = pg.evaluate('()=>{const t=Smetko.Duel.task(); return t?String(t.answer):null}')
        if a is None:
            break
        turns.append(pg.inner_text('#du-who'))
        if pg.locator('#du-chs').is_visible():
            pg.locator('.du-ch[data-v="%s"]' % a).first.click()
        else:
            pg.fill('#du-ans', a); pg.click('#du-ok')
        pg.wait_for_timeout(1100)
    ok(turns[:4] == ['Мира', 'Иво', 'Мира', 'Иво'], 'редът се сменя след всеки отговор: %s' % turns[:4])
    sc = pg.evaluate('Smetko.Duel.score()')
    ok(sc[0] > 0 and sc[1] > 0, 'верните отговори носят точки и на двамата: %s' % sc)
    pg.wait_for_timeout(1800)
    ok(not pg.locator('#du-over').is_hidden(), 'след последния рунд излиза краят')
    ok('печели' in pg.inner_text('#du-over') or 'Равенство' in pg.inner_text('#du-over'),
       'краят обявява победител: %s' % pg.inner_text('#du-over').split('\n')[0])

    # ---------- обиколка и лице
    pg.goto(B + '/obikolka-i-lice.html'); pg.wait_for_timeout(1400)
    pg.evaluate('()=>Smetko.Area.set(6,4)')
    ok(pg.evaluate('Smetko.Area.per()') == 20 and pg.evaluate('Smetko.Area.area()') == 24,
       'правоъгълник 6 на 4: обиколка 20, лице 24')
    want = pg.evaluate('Smetko.Area.want()')
    swap = pg.evaluate('Smetko.Area.area()') if want == 'per' else pg.evaluate('Smetko.Area.per()')
    pg.fill('#ar-ans', str(swap)); pg.click('#ar-check'); pg.wait_for_timeout(300)
    t1 = pg.inner_text('#ar-fb')
    ok(('обиколката' in t1 or 'лицето' in t1) and 'Браво' not in t1, 'обърканото едно с друго се казва направо: %s' % t1[:50])
    right = pg.evaluate('Smetko.Area.per()') if want == 'per' else pg.evaluate('Smetko.Area.area()')
    pg.fill('#ar-ans', str(right)); pg.click('#ar-check'); pg.wait_for_timeout(300)
    ok('Браво' in pg.inner_text('#ar-fb'), 'верният отговор се приема: %s' % pg.inner_text('#ar-fb')[:40])

    # ---------- текстови задачи със стъпки
    pg.goto(B + '/tekstovi-zadachi.html'); pg.wait_for_timeout(1500)
    ok(pg.locator('.wt-steps li').count() == 5, 'петте стъпки са налице')
    ok(pg.locator('.wt-steps li.on').count() == 0, 'в началото нито една стъпка не е отворена')
    q0 = pg.inner_text('#wt-q')
    ok(len(q0) > 30 and '?' in q0, 'задачата е текстова: %s' % q0[:50])
    pg.click('#wt-hint'); pg.wait_for_timeout(200)
    ok(pg.locator('.wt-steps li.on').count() == 1, 'подсказката отваря по една стъпка')
    pg.fill('#wt-ans', '999999'); pg.click('#wt-check'); pg.wait_for_timeout(300)
    ok('Не е това' in pg.inner_text('#wt-fb'), 'грешният отговор се отхвърля')
    a = pg.evaluate('Smetko.WordTask.task().answer')
    pg.fill('#wt-ans', str(a)); pg.click('#wt-check'); pg.wait_for_timeout(300)
    ok('Браво' in pg.inner_text('#wt-fb'), 'верният отговор се приема: %s' % pg.inner_text('#wt-fb')[:40])
    ok(pg.locator('.wt-steps li.on').count() == 5, 'накрая се вижда целият ред на работа')
    for g in ('1', '3', '4'):
        pg.select_option('#wt-grade', g); pg.wait_for_timeout(500)
        ok(len(pg.inner_text('#wt-q')) > 25, '%s. клас също дава текстова задача' % g)

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

    # ---------- родителят се регистрира и стига до картата
    c2 = b.new_context(viewport={'width': 1100, 'height': 950}); c2.add_init_script(INIT)
    q = page(c2, errs)
    q.goto(B + '/registracia.html'); q.wait_for_timeout(1200)
    mail = 'rod%d@example.com' % int(time.time())
    reg = q.evaluate('''async m=>{const r=await fetch('/api/account.php',{method:'POST',headers:{'Content-Type':'application/json'},
      credentials:'same-origin',body:JSON.stringify({action:'register',email:m,name:'Мария Петрова',
      password:'testtest123',role:'parent',terms:1})});return (await r.json()).ok===true}''', mail)
    ok(reg, 'родителят се регистрира')
    q.goto(B + '/profil.html?new=1'); q.wait_for_timeout(1800)
    txt = q.inner_text('main')
    ok('Акаунтът е създаден' in txt, 'първият екран посреща родителя')
    ok('активирайте кода' not in txt and 'Абонаменти“' not in txt, 'не се говори за кодове и абонаменти')
    ok(q.locator('.sub-card').count() == 0, 'няма карта за абонамент, щом всичко е безплатно')
    ok(not q.locator('#pf-form').is_hidden(), 'формата за дете е отворена сама')
    q.fill('#pf-name', 'Иво'); q.select_option('#pf-grade', '2')
    q.locator('#pf-form button[type=submit]').click()
    q.wait_for_timeout(3000)
    ok('game.html' in q.url, 'след първото дете се отива право на картата (%s)' % q.url.split('/')[-1])
    ok(q.locator('dialog.modal h3').count() and 'готово' in q.inner_text('dialog.modal h3').lower(),
       'картата посреща с кратко обяснение')
    c2.close()

    # ---------- картата: три мисии напред и ясен прогрес
    pg.goto(B + '/game.html?grade=2&mode=adventure'); pg.wait_for_timeout(2500)
    free = pg.eval_on_selector_all('.map-node', 'e=>e.filter(x=>!x.classList.contains("locked")).length')
    ok(free == 3, 'в началото са отворени три мисии, не само една (%d)' % free)
    ok(pg.locator('.map-node.far').count() > 0, 'далечните мисии избледняват, вместо да са стена от катинари')
    ok('%' in pg.inner_text('#map-stars'), 'прогресът се показва в проценти: %s' % pg.inner_text('#map-stars').replace('\n', ' '))
    ok(pg.locator('#map-stars .ms-bar').count() == 1, 'има и лента за прогрес')
    names = pg.eval_on_selector_all('.ch small', 'e=>e.map(x=>x.innerText)')
    ok(names and not any(n.replace('–', '-').replace(' ', '').replace('…', '').isdigit() or '-' in n and n[0].isdigit() for n in names),
       'частите са с имена, а не „1–16“: %s' % names[:3])
    out = pg.evaluate("""()=>{const G=Smetko.Game,k='2-mon.2';for(let i=0;i<5;i++)G.setStars(k,i,3);
      return {f:G.frontier(k),u:[5,6,7,8].map(i=>G.isUnlocked(k,i))}}""")
    ok(out['f'] == 4 and out['u'] == [True, True, True, False], 'минатите мисии отключват следващите три: %s' % out)
    pg.reload(); pg.wait_for_timeout(2300)
    ok(pg.eval_on_selector_all('.map-node.current', 'e=>e.map(x=>x.dataset.i)') == ['5'],
       'бухалът стои на следващата мисия, не на последната отключена')

    # ---------- в задачата се вижда докъде е стигнало детето
    pg.evaluate("()=>document.querySelector('.map-node:not(.locked)').click()"); pg.wait_for_timeout(2200)
    ok(pg.locator('#screen-play').is_visible(), 'мисията се отваря')
    ok(pg.locator('#q-count').is_visible() and ' / ' in pg.inner_text('#q-count'),
       'показва се коя задача от колко: %s' % pg.inner_text('#q-count'))

    # ---------- една игра от начало до край
    pg.goto(B + '/game.html'); pg.wait_for_timeout(2500)
    pg.locator('.dt-card .btn-green').first.click(); pg.wait_for_timeout(2000)
    ok(pg.locator('.qcard').count() == 1, 'играта отваря задача')
    txt = pg.locator('.qcard .q-text').first.inner_text().strip()
    ok(len(txt) > 3, 'задачата има условие: %s' % txt.replace('\n', ' ')[:48])
    ok(pg.locator('.qcard .slot, .qcard input, .keypad, .choices').count() > 0, 'има къде да се отговори')

    b.close()
done(errs)
