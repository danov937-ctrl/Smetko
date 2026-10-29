# -*- coding: utf-8 -*-
"""SEO страници: по една за всяка тема от програмата, стълбови страници (таблица за умножение, римски цифри,
мерни единици, НВО 4. клас, входно и изходно ниво, тестове) и sitemap-pages.xml.
Стартира се от tools/build.py (накрая) или самостоятелно: python3 tools/seo.py"""
import json, os, re, subprocess, datetime, html as H
from common import head, header, FOOTER, scripts, write, crumbs, faq, faq_ld, page_hero, SITE, ORG, OUT
from seo_content import TOPICS

HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['node', os.path.join(HERE, 'examples.js')], check=True, stdout=subprocess.DEVNULL)
EX = json.load(open(os.path.join(HERE, 'examples.json'), encoding='utf-8'))
TODAY = datetime.date.today().isoformat()
QZ_JS = ['js/math-engine.js', 'js/quiz.js']

GRADE_TOPICS = {1: ['g1t1', 'g1t2', 'g1t3', 'g1t4', 'g1t5', 'g1t6'], 2: ['g2t1', 'g2t2', 'g2t3', 'g2t4'],
                3: ['g3t1', 'g3t2', 'g3t3', 'g3t4', 'g3t5'], 4: ['g4t1', 'g4t2', 'g4t3', 'g4t4', 'g4t5', 'g4t6', 'g4t7']}
GCOL = {1: '#FF5A5F', 2: '#FF9F1C', 3: '#4CBB4A', 4: '#2F80ED'}
OWLS = {1: 'hello', 2: 'happy', 3: 'think', 4: 'cheer'}


def class_url(g):
    return f'matematika-{g}-klas.html'


def topic_url(tid):
    return TOPICS[tid]['slug'] + '.html'


def grade_of(tid):
    return int(tid[1])


def e(s):
    return H.escape(str(s), quote=False)


def learning_ld(name, desc, url, grade_label, teaches, types=('Упражнение', 'Онлайн тест')):
    return {"@context": "https://schema.org", "@type": "LearningResource", "name": name, "description": desc, "url": SITE + '/' + url,
            "inLanguage": "bg", "educationalLevel": grade_label, "learningResourceType": list(types), "teaches": teaches,
            "isAccessibleForFree": True, "audience": {"@type": "EducationalAudience", "educationalRole": "student"},
            "provider": {"@type": "Organization", "name": "Сметко", "url": SITE}}


def examples_block(tid, n=14):
    items = EX.get(tid, [])[:n]
    if not items:
        return ''
    li = ''.join(f'<li><span>{e(x["q"]).replace("{?}", "<b class=\"ex-blank\">?</b>")}</span></li>' for x in items)
    ans = ''.join(f'<li>{e(x["full"])}</li>' for x in items)
    return f'''<ol class="ex-list">{li}</ol>
<details class="ex-ans"><summary>Покажи отговорите</summary><ol>{ans}</ol></details>'''


def quiz(grade, topic='mix', n=10, level=2, title='Онлайн тест', **extra):
    attrs = ''.join(f' data-{k}="{H.escape(str(v))}"' for k, v in extra.items())
    return f'<div class="qz panel" data-grade="{grade}" data-topic="{topic}" data-n="{n}" data-level="{level}" data-title="{H.escape(title)}"{attrs}><noscript>За онлайн теста е нужен JavaScript.</noscript><p class="qz-loading">Зареждам задачите…</p></div>'


def related_cards(items):
    return '<div class="rel-grid">' + ''.join(f'<a class="rel-card" href="{u}" style="--c:{c}"><small>{s}</small><b>{t}</b></a>' for u, s, t, c in items) + '</div>'


SITEMAP = []  # (url, priority, changefreq)
OG = []  # картинки за споделяне: tools/og.py ги рисува


def og(slug, title, sub, color, pose='hello'):
    OG.append({'slug': slug, 'title': title, 'sub': sub, 'color': color, 'pose': pose})
    return f'assets/og/{slug}.jpg'


# ======================================================================= страници по теми
for g, tids in GRADE_TOPICS.items():
    for i, tid in enumerate(tids):
        d = TOPICS[tid]
        url = topic_url(tid)
        name = d['h1']
        short = name if len(name) <= 46 else d['kw'][0].upper() + d['kw'][1:]
        title = f'{short} – {g}. клас: задачи и онлайн тест | Сметко' if str(g) + ' клас' not in short else f'{short} – задачи и онлайн тест | Сметко'
        learn = ''.join(f'<li>{x}</li>' for x in d['learn'])
        expl = ''.join(f'<li>{x}</li>' for x in d['explain'])
        mist = ''.join(f'<li>{x}</li>' for x in d['mistakes'])
        faqs = d['faq'] + [('Безплатен ли е тестът?', 'Да. Онлайн тестът и работните листове са безплатни и без регистрация. Всеки път задачите са нови, защото се генерират автоматично по темата.')]
        prev_t = tids[i - 1] if i > 0 else None
        next_t = tids[i + 1] if i + 1 < len(tids) else None
        rel = []
        if prev_t: rel.append((topic_url(prev_t), '← Предишна тема', TOPICS[prev_t]['h1'], GCOL[g]))
        if next_t: rel.append((topic_url(next_t), 'Следваща тема →', TOPICS[next_t]['h1'], GCOL[g]))
        rel.append((class_url(g), 'Всички теми', f'Математика за {g}. клас', GCOL[g]))
        if g == 2 and tid == 'g2t4' or g == 3 and tid in ('g3t4', 'g3t5'):
            rel.append(('tablica-za-umnozhenie.html', 'Помагало', 'Таблица за умножение с тест', '#8E6CF0'))
        if g == 4:
            rel.append(('nvo-4-klas-matematika.html', 'Подготовка', 'НВО по математика 4. клас', '#8E6CF0'))
        if tid == 'g4t1':
            rel.append(('rimski-cifri.html', 'Помагало', 'Римски цифри – таблица и преобразувател', '#19B5A5'))
        if tid in ('g2t1', 'g3t2', 'g3t5', 'g4t4'):
            rel.append(('merni-edinici.html', 'Помагало', 'Мерни единици – таблици', '#19B5A5'))
        game = f'game.html?grade={g}&amp;mode=practice&amp;topic={tid}'
        ws = f'rabotni-listove.html?grade={g}&amp;topic={tid}'
        ld = [crumbs([('Начало', ''), (f'Математика {g}. клас', class_url(g)), (name, url)]),
              learning_ld(f'{name} – {g}. клас', d['desc'], url, f'{g}. клас', [name] + d['learn']), faq_ld(faqs)]
        body = head(title, d['desc'], url, ld, og=og(d['slug'], name, f'{g}. клас · задачи и онлайн тест', GCOL[g], OWLS[g])) + header() + f'''<section class="page-hero">
  <span class="cloud c1"></span><span class="cloud c2"></span>
  <div class="wrap">
    <div>
      <div class="breadcrumbs"><a href="index.html">Начало</a> › <a href="{class_url(g)}">{g}. клас</a> › Тема {i + 1}</div>
      <h1>{name} <span class="h1-sub">{g}. клас</span></h1>
      <p class="lead">{re.split(r'(?<![0-9])\. ', d['intro'])[0].rstrip('.')}.</p>
      <div class="hero-cta"><a class="btn btn-lg btn-green" href="#test">✏️ Онлайн тест</a><a class="btn btn-white" href="{game}">🎮 Упражнявай като игра</a></div>
    </div>
    <div class="owl" data-owl="{OWLS[g]}"></div>
  </div>
</section>
<main id="main">
<section class="section"><div class="wrap prose">
  <p class="lead-dark">{d['intro']}</p>
  <h2>Какво учи детето в тази тема</h2>
  <ul class="check-list">{learn}</ul>
  <p class="topic-meta"><span class="tag" style="background:{GCOL[g]};color:#fff">{g}. клас</span> <span class="tag">Тема {i + 1} от {len(tids)} по учебната програма на МОН</span></p>
</div></section>
<section class="section soft" id="test"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">Онлайн тест: {e(name.lower() if len(name) < 40 else d["kw"])}</h2><p>10 задачи по темата. Напишете отговорите и натиснете „Провери“. Всеки път задачите са нови.</p></div>
  {quiz(g, tid, 10, 2, name, levels=1)}
</div></section>
<section class="section"><div class="wrap prose">
  <h2>Как да обясним на детето</h2>
  <ol class="steps-list">{expl}</ol>
  <h2>Чести грешки и как да помогнем</h2>
  <ul class="warn-list">{mist}</ul>
  <div class="callout">Съвет: 10 минути на ден са по-полезни от един час веднъж седмично. Кратко, редовно и с похвала за усилието.</div>
</div></section>
<section class="section soft"><div class="wrap prose">
  <h2>Примерни задачи с отговори</h2>
  <p>Задачи по темата „{e(name)}“ – от лесни към по-трудни. Решете ги заедно с детето, после проверете отговорите.</p>
  {examples_block(tid)}
  <div class="tool-row">
    <a class="tool-card" href="{ws}"><span>🖨️</span><b>Работен лист за печат</b><small>20 нови задачи по темата + отговори</small></a>
    <a class="tool-card" href="{game}"><span>🎮</span><b>Тренировка в Сметко</b><small>Без часовник, с обяснение при грешка</small></a>
    <a class="tool-card" href="uchilishta.html#domashna"><span>🔗</span><b>Линк за домашна</b><small>За учители – темата с един линк</small></a>
  </div>
</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси от родители</h2></div>{faq(faqs)}</div></section>
<section class="section soft"><div class="wrap"><div class="section-head"><h2 class="lined">Още по темата</h2></div>{related_cards(rel)}</div></section>
</main>
''' + FOOTER + scripts(QZ_JS)
        write(url, body)
        SITEMAP.append((url, '0.8', 'monthly'))

# ======================================================================= Таблица за умножение
tips = {
    2: 'Умножението по 2 е удвояване: 2 · 7 е 7 + 7 = 14. Всички отговори са четни числа.',
    3: 'Броете през 3: 3, 6, 9, 12… Сборът от цифрите на всеки отговор също се дели на 3 (например 27 → 2 + 7 = 9).',
    4: 'Умножението по 4 е „двойно удвояване“: 4 · 6 → 6 + 6 = 12, после 12 + 12 = 24.',
    5: 'Отговорите завършват на 0 или 5. По 5 е половината от по 10: 5 · 8 = 80 : 2 = 40.',
    6: 'Ако знаете по 5, добавете още веднъж числото: 6 · 7 = 5 · 7 + 7 = 35 + 7 = 42. При четни числа отговорът завършва на същата цифра: 6 · 4 = 24, 6 · 8 = 48.',
    7: 'Най-трудният ред, но почти всичко вече сте научили от другите редове (7 · 3 = 3 · 7). Остават 7 · 7 = 49, 7 · 8 = 56 („5, 6, 7, 8“) и 7 · 9 = 63.',
    8: 'Умножението по 8 е три пъти удвояване: 8 · 6 → 12 → 24 → 48. Запомнете 8 · 8 = 64.',
    9: 'Трикът с пръстите: протегнете 10 пръста и свийте пръста с номер, равен на числото. Пръстите вляво са десетиците, вдясно – единиците (9 · 4: 3 и 6 → 36). Цифрите на отговора винаги дават сбор 9.',
    10: 'Добавяте нула накрая: 10 · 7 = 70.',
}
tbl = '<table class="tt" aria-label="Таблица за умножение от 1 до 10"><thead><tr><th>·</th>' + ''.join(f'<th>{c}</th>' for c in range(1, 11)) + '</tr></thead><tbody>' + \
      ''.join('<tr><th>' + str(r) + '</th>' + ''.join(f'<td data-r="{r}" data-c="{c}">{r * c}</td>' for c in range(1, 11)) + '</tr>' for r in range(1, 11)) + '</tbody></table>'
rows = ''.join(f'''<div class="tt-row" id="s-{n}"><h3>Таблица за умножение с {n}</h3><ul class="tt-list">{''.join(f'<li>{k} · {n} = <b>{k * n}</b></li>' for k in range(1, 11))}</ul>
<p class="tt-tip">💡 {tips[n]}</p><p class="tt-div">Деление: {', '.join(f'{k * n} : {n} = {k}' for k in (2, 5, 7, 10))} …</p></div>''' for n in range(2, 11))
faq_tt = [('В кой клас се учи таблицата за умножение?', 'Таблицата за умножение и деление се учи във 2. клас по учебната програма на МОН. В 3. и 4. клас се използва за умножение и деление на по-големи числа.'),
          ('Как да научим таблицата за умножение бързо?', 'Започнете с лесните редове (по 2, 10, 5), използвайте разменителното свойство (3 · 8 = 8 · 3), упражнявайте по 5–10 минути на ден и проверявайте с кратки тестове. Повечето деца я знаят уверено за 6–8 седмици.'),
          ('Кои са най-трудните задачи от таблицата?', 'Обикновено 6 · 7 = 42, 6 · 8 = 48, 7 · 8 = 56, 7 · 9 = 63 и 8 · 9 = 72. Упражнявайте ги отделно – в теста горе изберете само числата 6, 7 и 8.'),
          ('Как да разпечатам таблицата за умножение?', 'Натиснете бутона „Печат“ – на листа излиза само таблицата и редовете с подсказки, без менюто на сайта.'),
          ('Какво е таблично деление?', 'Делението, обратно на таблицата за умножение: 56 : 8 = 7, защото 7 · 8 = 56. В теста изберете „Деление“ или „Умножение и деление“.')]
desc_tt = 'Таблицата за умножение от 1 до 10 – интерактивна, за печат, с трикове за всяко число и безплатен онлайн тест (умножение и деление). За 2. и 3. клас.'
tt_page = head('Таблица за умножение – за печат, трикове и онлайн тест | Сметко', desc_tt, 'tablica-za-umnozhenie.html',
               [crumbs([('Начало', ''), ('Таблица за умножение', 'tablica-za-umnozhenie.html')]),
                learning_ld('Таблица за умножение', desc_tt, 'tablica-za-umnozhenie.html', '2. клас', ['Таблица за умножение', 'Таблично деление']), faq_ld(faq_tt)], 'pillar-page', og=og('tablica-za-umnozhenie', 'Таблица за умножение', 'За печат, трикове и онлайн тест', '#FF5A5F', 'think')) + header() + page_hero(
    'Таблица за умножение', 'Цялата таблица от 1 до 10 – с подсказки за всяко число, версия за печат и онлайн тест, в който избирате кои числа да упражнявате.', 'Таблица за умножение', 'think',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#test">✏️ Тест по таблицата</a><button class="btn btn-white" data-print>🖨️ Печат</button></div>') + f'''
<main id="main">
<section class="section print-zone"><div class="wrap">
  <div class="section-head"><h2 class="lined">Таблица за умножение от 1 до 10</h2><p>Посочете число в таблицата – оцветяват се редът и колоната. Отговорът е там, където се пресичат.</p></div>
  <div class="tt-wrap">{tbl}</div>
  <p class="tt-jump">Към реда: {' '.join(f'<a href="#s-{n}">с {n}</a>' for n in range(2, 11))}</p>
</div></section>
<section class="section soft" id="test"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">Онлайн тест по таблицата за умножение</h2><p>Изберете числата и вида задачи. 15 въпроса – всеки път нови.</p></div>
  {quiz(2, 'mix', 15, 2, 'Таблица за умножение', gen='mul', cta='game.html?grade=2&mode=practice&topic=g2t4')}
</div></section>
<section class="section print-zone"><div class="wrap">
  <div class="section-head"><h2 class="lined">Таблицата за умножение по числа</h2><p>Всеки ред с подсказка как да се запомни по-лесно.</p></div>
  <div class="tt-rows">{rows}</div>
</div></section>
<section class="section soft"><div class="wrap prose">
  <h2>Как да научим таблицата за умножение – 6 стъпки</h2>
  <ol class="steps-list">
    <li><b>Първо разбиране, после наизуст.</b> 4 · 3 означава „4 пъти по 3“: 3 + 3 + 3 + 3 = 12. Покажете с бонбони или кубчета.</li>
    <li><b>Лесните редове първо:</b> по 1, 2, 10 и 5. След тях детето вече знае почти половината таблица.</li>
    <li><b>Разменителното свойство:</b> 3 · 8 = 8 · 3. Така от 100 задачи остават 45 за учене.</li>
    <li><b>Квадратите:</b> 3 · 3, 4 · 4 … 9 · 9 се запомнят лесно и служат за опора (6 · 7 = 6 · 6 + 6).</li>
    <li><b>По 5 минути на ден.</b> Кратките ежедневни упражнения работят по-добре от дълги уроци веднъж седмично.</li>
    <li><b>Проверка с тест и игра.</b> Тестът горе показва кои задачи още бъркате. В Сметко режимът „Бързо сметни“ тренира бързината.</li>
  </ol>
  <p>Още идеи има в статията <a href="blog/tablitsata-za-umnozhenie-bez-salzi-5-stapki">„Таблицата за умножение без сълзи“</a> в блога и в темата <a href="{topic_url('g2t4')}">Таблично умножение и деление (2. клас)</a>.</p>
</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(faq_tt)}</div></section>
</main>
''' + FOOTER + scripts(QZ_JS + ['js/seo-pages.js'])
write('tablica-za-umnozhenie.html', tt_page)
SITEMAP.append(('tablica-za-umnozhenie.html', '0.9', 'monthly'))

# ======================================================================= Римски цифри
def roman(n):
    out = ''
    for v, s in ((1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'), (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'), (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')):
        while n >= v:
            out += s; n -= v
    return out
rc_cells = ''.join(f'<li><b>{n}</b><span>{roman(n)}</span></li>' for n in list(range(1, 31)) + [40, 50, 60, 70, 80, 90, 100, 200, 400, 500, 900, 1000, 2026])
faq_rc = [('Как се пише 4 с римски цифри?', 'IV – една единица преди пет (5 − 1). На някои часовници ще видите IIII, но правилният запис е IV.'),
          ('Как се пише 2026 с римски цифри?', 'MMXXVI: MM = 2000, XX = 20, VI = 6.'),
          ('Има ли нула в римските цифри?', 'Не. Римляните не са имали знак за нула.'),
          ('В кой клас се учат римските цифри?', 'В 4. клас, в темата „Числата над 1000“. Срещат се и при означаване на векове (XXI век) и на глави в книгите.'),
          ('Колко пъти подред може да се повтори една цифра?', 'I, X, C и M – най-много 3 пъти (III, XXX). V, L и D не се повтарят.')]
desc_rc = 'Римски цифри: таблица от 1 до 100 и до 2026, правила за записване, преобразувател (арабски ↔ римски) и онлайн тест за 4. клас.'
rc_page = head('Римски цифри – таблица, правила и преобразувател | Сметко', desc_rc, 'rimski-cifri.html',
               [crumbs([('Начало', ''), ('Римски цифри', 'rimski-cifri.html')]), learning_ld('Римски цифри', desc_rc, 'rimski-cifri.html', '4. клас', ['Римски цифри']), faq_ld(faq_rc)], 'pillar-page', og=og('rimski-cifri', 'Римски цифри', 'Таблица, правила и преобразувател', '#19B5A5', 'think')) + header() + page_hero(
    'Римски цифри', 'Таблица, правила с примери, преобразувател в двете посоки и тест – всичко за 4. клас на едно място.', 'Римски цифри', 'think',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#conv">🔁 Преобразувател</a><a class="btn btn-white" href="#test">✏️ Тест</a></div>') + f'''
<main id="main">
<section class="section" id="conv"><div class="wrap narrow-wrap">
  <div class="panel rc-conv">
    <h2>Преобразувател на римски цифри</h2>
    <div class="rc-grid"><label>Арабско число (1–3999)<input id="rc-a" class="input" inputmode="numeric" maxlength="4" placeholder="напр. 2026" autocomplete="off"></label>
    <label>Римско число<input id="rc-r" class="input" maxlength="16" placeholder="напр. MMXXVI" autocomplete="off" autocapitalize="characters" spellcheck="false"></label></div>
    <p class="rc-out" id="rc-out" aria-live="polite">Напишете число в едно от полетата.</p>
  </div>
</div></section>
<section class="section soft"><div class="wrap">
  <div class="section-head"><h2 class="lined">Седемте римски цифри</h2></div>
  <div class="rc-base">{''.join(f'<div><b>{s}</b><span>{v}</span></div>' for s, v in (('I', 1), ('V', 5), ('X', 10), ('L', 50), ('C', 100), ('D', 500), ('M', 1000)))}</div>
</div></section>
<section class="section"><div class="wrap prose">
  <h2>Правила за записване</h2>
  <ol class="steps-list">
    <li><b>Събиране:</b> по-малка цифра след по-голяма се добавя: VI = 5 + 1 = 6, XV = 15, LX = 60.</li>
    <li><b>Изваждане:</b> по-малка цифра пред по-голяма се изважда: IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900.</li>
    <li><b>Повторение:</b> I, X, C и M се повтарят най-много 3 пъти подред (III = 3, XXX = 30). V, L и D не се повтарят.</li>
    <li><b>Изваждат се само I, X и C</b> – и само пред двете най-близки по-големи цифри (I пред V и X; X пред L и C; C пред D и M). Затова 99 е XCIX, а не IC.</li>
  </ol>
  <h3>Как да превърнем число в римско</h3>
  <p>Разделяме числото на хиляди, стотици, десетици и единици и записваме всяка част: 1 984 = 1000 + 900 + 80 + 4 = M + CM + LXXX + IV = <b>MCMLXXXIV</b>.</p>
  <h2>Таблица на римските цифри</h2>
  <ul class="rc-table">{rc_cells}</ul>
</div></section>
<section class="section soft" id="test"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">Тест: римски цифри</h2><p>Прочетете и запишете римски числа. 10 задачи – всеки път нови.</p></div>
  {quiz(4, 'g4t1', 10, 2, 'Римски цифри', skills='romanRead,romanWrite', cta='game.html?grade=4&mode=practice&topic=g4t1')}
</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(faq_rc)}<p class="center-note">Още за 4. клас: <a href="{topic_url('g4t1')}">Числата над 1000</a> · <a href="{class_url(4)}">Всички теми за 4. клас</a></p></div></section>
</main>
''' + FOOTER + scripts(QZ_JS + ['js/seo-pages.js'])
write('rimski-cifri.html', rc_page)
SITEMAP.append(('rimski-cifri.html', '0.8', 'yearly'))

# ======================================================================= Мерни единици
def utable(head_row, rows):
    return '<table class="info-table unit-table"><thead><tr>' + ''.join(f'<th>{h}</th>' for h in head_row) + '</tr></thead><tbody>' + \
           ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</tbody></table>'
faq_mu = [('Колко сантиметра има в един метър?', '100 см. Един метър е и 10 дециметра, и 1000 милиметра.'),
          ('Колко грама е един килограм?', '1000 г. А един тон е 1000 кг.'),
          ('Колко дни има в една година?', '365 дни, а във високосна година – 366. Високосна е година, която се дели на 4 (с малки изключения за вековете).'),
          ('Колко е един декар?', '1000 квадратни метра. Използва се за площ на ниви и дворове.'),
          ('Как се превръщат мерните единици за лице?', 'През 100: 1 кв. см = 100 кв. мм, 1 кв. дм = 100 кв. см, 1 кв. м = 100 кв. дм.')]
desc_mu = 'Мерни единици за 1.–4. клас: таблици за дължина (мм, см, дм, м, км), маса (г, кг, т), време, лице и пари в евро. С примери и онлайн тест за превръщане.'
mu_page = head('Мерни единици – таблици за дължина, маса, време и лице | Сметко', desc_mu, 'merni-edinici.html',
               [crumbs([('Начало', ''), ('Мерни единици', 'merni-edinici.html')]), learning_ld('Мерни единици', desc_mu, 'merni-edinici.html', '1.–4. клас', ['Мерни единици за дължина', 'Мерни единици за маса', 'Мерни единици за време', 'Мерни единици за лице']), faq_ld(faq_mu)], 'pillar-page', og=og('merni-edinici', 'Мерни единици', 'Дължина, маса, време, лице, пари', '#4CBB4A', 'hello')) + header() + page_hero(
    'Мерни единици', 'Всички мерни единици от началното училище в ясни таблици – за дължина, маса, време, лице и пари. С онлайн тест за превръщане.', 'Мерни единици', 'hello',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#test">✏️ Тест</a><button class="btn btn-white" data-print>🖨️ Печат</button></div>') + f'''
<main id="main">
<section class="section print-zone"><div class="wrap prose">
  <p class="toc">Към: <a href="#dalzhina">Дължина</a> · <a href="#masa">Маса</a> · <a href="#vreme">Време</a> · <a href="#lice">Лице</a> · <a href="#pari">Пари</a></p>
  <h2 id="dalzhina">📏 Мерни единици за дължина</h2>
  {utable(['Единица', 'Равно на', 'Клас'], [['1 сантиметър (см)', '10 милиметра (мм)', '1.–3. клас'], ['1 дециметър (дм)', '10 см', '2. клас'], ['1 метър (м)', '10 дм = 100 см = 1000 мм', '2. клас'], ['1 километър (км)', '1000 м', '3. клас']])}
  <p>Пример: 3 м 25 см = 300 см + 25 см = <b>325 см</b>. Педята на детето е около 1–2 дм, а една крачка – около половин метър.</p>
  <h2 id="masa">⚖️ Мерни единици за маса</h2>
  {utable(['Единица', 'Равно на', 'Клас'], [['1 килограм (кг)', '1000 грама (г)', '1. и 3. клас'], ['1 тон (т)', '1000 кг', '3. клас']])}
  <p>Пример: 2 кг 400 г = <b>2400 г</b>. Пакет захар е 1 кг, ябълка – около 150–200 г.</p>
  <h2 id="vreme">⏰ Мерни единици за време</h2>
  {utable(['Единица', 'Равно на', 'Клас'], [['1 минута (мин)', '60 секунди (сек)', '3. клас'], ['1 час (ч)', '60 минути', '2. клас'], ['1 денонощие', '24 часа', '2. клас'], ['1 седмица', '7 денонощия', '2. клас'], ['1 месец', '28, 29, 30 или 31 дни', '2. клас'], ['1 година', '12 месеца = 365 дни (366 във високосна)', '2. клас'], ['1 век', '100 години', '3. клас']])}
  <h2 id="lice">⬛ Мерни единици за лице (4. клас)</h2>
  {utable(['Единица', 'Равно на'], [['1 кв. см (см²)', '100 кв. мм'], ['1 кв. дм (дм²)', '100 кв. см'], ['1 кв. м (м²)', '100 кв. дм = 10 000 кв. см'], ['1 декар (дка)', '1000 кв. м'], ['1 кв. км (км²)', '1 000 000 кв. м']])}
  <p>Лице на правоъгълник = дължина · ширина. Правоъгълник 6 см × 4 см има лице <b>24 кв. см</b>.</p>
  <h2 id="pari">💶 Пари</h2>
  {utable(['Единица', 'Равно на'], [['1 евро (€)', '100 евроцента (ц.)'], ['Монети', '1, 2, 5, 10, 20, 50 цента; 1 и 2 евро'], ['Банкноти', '5, 10, 20, 50, 100, 200 евро']])}
  <p>От 1 януари 2026 г. в България се плаща в евро – задачите с пари в Сметко също са в евро и центове.</p>
</div></section>
<section class="section soft" id="test"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">Тест: превръщане на мерни единици</h2><p>10 задачи за дължина, маса, време и лице.</p></div>
  {quiz(3, 'mix', 10, 2, 'Мерни единици', skills='units2,units3a,units3b,areaUnits', cta='game.html?grade=3&mode=adventure')}
</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(faq_mu)}</div></section>
</main>
''' + FOOTER + scripts(QZ_JS + ['js/seo-pages.js'])
write('merni-edinici.html', mu_page)
SITEMAP.append(('merni-edinici.html', '0.8', 'yearly'))

# ======================================================================= НВО 4. клас
faq_nvo = [('Кога е НВО по математика в 4. клас?', 'Обикновено в началото на юни. През 2026 г. изпитът беше на 4 юни. Точният график за всяка година се обявява от МОН със заповед в началото на учебната година.'),
           ('Колко задачи има и колко време е изпитът?', 'По модела на МОН тестът има 25 задачи и продължава 60 минути (за ученици със СОП – с 30 минути повече). Максимумът е 100 точки.'),
           ('Какви са задачите?', '16 задачи с избор на един верен отговор от няколко, 4 задачи с кратък свободен отговор, 4 задачи с разширен свободен отговор и 1 задача с разширен отговор с три подточки.'),
           ('Може ли калкулатор?', 'Не. Учениците решават задачите на ръка, с химикал и линия. Затова бързото и точно смятане е важно.'),
           ('Официален ли е тренировъчният тест на тази страница?', 'Не. Това е тренировъчен тест в стила на НВО, генериран автоматично от задачите в Сметко. За официалните материали вижте сайта на МОН.'),
           ('Влияе ли резултатът от НВО в 4. клас на приема в 5. клас?', 'Зависи от училището. Някои училища с прием в 5. клас използват резултатите от НВО в 4. клас като критерий. Проверете правилата на конкретното училище.')]
desc_nvo = 'НВО по математика за 4. клас: формат (25 задачи, 60 минути, 100 точки), какво се проверява, как да се подготвим и безплатен тренировъчен онлайн тест с часовник.'
nvo_page = head('НВО по математика 4. клас – формат, подготовка и тренировъчен тест | Сметко', desc_nvo, 'nvo-4-klas-matematika.html',
                [crumbs([('Начало', ''), ('НВО 4. клас математика', 'nvo-4-klas-matematika.html')]),
                 learning_ld('Тренировъчен тест за НВО по математика – 4. клас', desc_nvo, 'nvo-4-klas-matematika.html', '4. клас', ['Подготовка за НВО по математика в 4. клас'], ('Тест', 'Упражнение')), faq_ld(faq_nvo)], 'pillar-page', og=og('nvo-4-klas-matematika', 'НВО по математика 4. клас', 'Тренировъчен тест: 25 задачи, 60 минути', '#8E6CF0', 'cheer')) + header() + page_hero(
    'НВО по математика в 4. клас', 'Как изглежда изпитът, какво се проверява и как да се подготвим спокойно. С безплатен тренировъчен тест – 25 задачи и 60 минути.', 'НВО 4. клас', 'cheer',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#test">⏱️ Тренировъчен тест</a><a class="btn btn-white" href="#format">Форматът на изпита</a></div>') + f'''
<main id="main">
<section class="section" id="format"><div class="wrap">
  <div class="section-head"><h2 class="lined">Изпитът накратко</h2><p>По модела на МОН за националното външно оценяване по математика в IV клас.</p></div>
  <div class="facts">
    <div><b>25</b><span>задачи</span></div><div><b>60</b><span>минути</span></div><div><b>100</b><span>точки максимум</span></div><div><b>юни</b><span>обикновено в началото на месеца</span></div>
  </div>
  <div class="prose" style="margin-top:28px">
    <h3>Видове задачи</h3>
    <ul class="check-list"><li><b>16 задачи с избор</b> на верен отговор</li><li><b>4 задачи с кратък свободен отговор</b> – пишете само числото</li><li><b>4 задачи с разширен свободен отговор</b> – с решение</li><li><b>1 задача с три подточки</b> – обикновено практическа ситуация</li></ul>
    <p class="hint">Източник: модел на НВО по математика в IV клас, публикуван от <a href="https://www.mon.bg/nfs/2025/09/model-nvo_4kl_matematika-2026_12092025.pdf" rel="noopener" target="_blank">Министерството на образованието и науката</a>. Моделът може да се променя – проверявайте актуалната информация на сайта на МОН.</p>
  </div>
</div></section>
<section class="section soft"><div class="wrap prose">
  <h2>Какво се проверява</h2>
  <p>Изпитът обхваща наученото от 1. до 4. клас, с акцент върху материала от 3. и 4. клас:</p>
  <ul class="check-list">
    <li><b>Числа:</b> четене, писане и сравняване на многоцифрени числа, римски цифри – <a href="{topic_url('g4t1')}">упражнение</a></li>
    <li><b>Действия:</b> събиране, изваждане, умножение и деление на многоцифрени числа, ред на действията – <a href="{topic_url('g4t6')}">умножение</a>, <a href="{topic_url('g4t7')}">деление с двуцифрено число</a></li>
    <li><b>Неизвестен компонент:</b> уравнения от вида ? · 24 = 576 и 8 470 − ? = 3 250</li>
    <li><b>Геометрия:</b> видове ъгли и триъгълници, обиколка, лице на правоъгълник и квадрат, геометрични тела</li>
    <li><b>Мерни единици:</b> дължина, маса, време, лице – <a href="merni-edinici.html">таблици</a></li>
    <li><b>Текстови задачи:</b> с пари, време, покупки и пътуване – с едно и повече действия</li>
  </ul>
  <h2>Как да се подготвим – план за 8 седмици</h2>
  <ol class="steps-list">
    <li><b>Седмици 1–2:</b> таблицата за умножение и деление трябва да е безгрешна. <a href="tablica-za-umnozhenie.html">Тест по таблицата</a>.</li>
    <li><b>Седмици 3–4:</b> писмено събиране, изваждане, умножение и деление – по 3–5 задачи на ден, с проверка.</li>
    <li><b>Седмица 5:</b> геометрия и мерни единици – обиколка, лице, превръщане.</li>
    <li><b>Седмица 6:</b> текстови задачи – детето чете, подчертава данните и пише отговор с изречение.</li>
    <li><b>Седмици 7–8:</b> по един тренировъчен тест седмично с часовник (тук, на тази страница) и преглед на грешките.</li>
  </ol>
  <div class="callout">В деня на изпита: добър сън, закуска, химикал, линия и молив. Задачите, които не върви – прескачаме и се връщаме накрая.</div>
</div></section>
<section class="section" id="test"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">Тренировъчен тест в стила на НВО</h2><p>25 задачи от материала за 3. и 4. клас, първите 16 – с избор на отговор. Часовникът е 60 минути. Не е официален тест.</p></div>
  {quiz(4, 'mix', 25, 3, 'Тренировъчен тест – НВО 4. клас', mix='3,4,4', mc=16, timer=60, lazy='25 задачи · 60 минути. Подгответе лист и химикал за пресмятанията.', cta='game.html?grade=4&mode=adventure')}
</div></section>
<section class="section soft"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси за НВО</h2></div>{faq(faq_nvo)}</div></section>
</main>
''' + FOOTER + scripts(QZ_JS)
write('nvo-4-klas-matematika.html', nvo_page)
SITEMAP.append(('nvo-4-klas-matematika.html', '0.9', 'monthly'))

# ======================================================================= Входно и изходно ниво
def level_page(kind):
    vh = kind == 'vhodno'
    url = 'vhodno-nivo-matematika.html' if vh else 'izhodno-nivo-matematika.html'
    name = 'Входно ниво' if vh else 'Изходно ниво'
    when = 'в началото на учебната година (септември – октомври)' if vh else 'в края на учебната година (май – юни)'
    what = 'какво детето помни от предишния клас' if vh else 'какво детето е научило през годината'
    secs = ''
    for g in (1, 2, 3, 4):
        if vh:
            if g == 1:
                q = quiz(1, 'g1t1', 10, 1, 'Входно ниво – 1. клас', skills='count5,cmp5,add5,sub5,shapes,cmp10', cta='game.html?grade=1&mode=adventure')
                txt = 'В началото на 1. клас учителят проверява готовността за училище: броене до 10, сравняване на количества, разпознаване на фигури и най-простите задачи за събиране и изваждане.'
            else:
                q = quiz(g - 1, 'mix', 12, 2, f'Входно ниво – {g}. клас', cta=f'game.html?grade={g - 1}&mode=adventure')
                txt = f'Входното ниво в {g}. клас проверява материала от {g - 1}. клас: ' + ', '.join(TOPICS[t]['h1'].lower() for t in GRADE_TOPICS[g - 1][-3:]) + '.'
        else:
            q = quiz(g, 'mix', 15, 2, f'Изходно ниво – {g}. клас', cta=f'game.html?grade={g}&mode=adventure')
            txt = f'Изходното ниво в {g}. клас обхваща всички теми от годината: ' + ', '.join(TOPICS[t]['h1'].lower() for t in GRADE_TOPICS[g]) + '.'
        secs += f'''<section class="section{' soft' if g % 2 else ''}" id="klas-{g}"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">{name} по математика – {g}. клас</h2><p>{txt}</p></div>
  {q}
  <p class="center-note">Упражнения по темите: <a href="{class_url(g if not vh or g == 1 else g - 1)}">математика за {g if not vh or g == 1 else g - 1}. клас</a></p>
</div></section>'''
    faqs = [(f'Какво е {name.lower()}?', f'{name}то е проверка {when}, която показва {what}. Не се пише оценка за срочната, а учителят вижда какво да преговори.'),
            ('Трябва ли детето да се подготвя?', 'Не е нужна специална подготовка. Полезно е 1–2 седмици преди това да се реши по един кратък тест на ден – като тези на тази страница.'),
            ('Колко задачи има в теста?', 'Обикновено между 10 и 20, за един учебен час (40 минути). Онлайн тестовете тук са 10–15 задачи.'),
            ('Тези тестове официални ли са?', 'Не. Те са тренировъчни и се генерират автоматично по учебната програма на МОН. Всеки път задачите са нови.')]
    desc = f'{name} по математика за 1., 2., 3. и 4. клас – безплатни онлайн тестове с автоматична проверка. Какво се проверява {when} и как да се подготвим.'
    pg = head(f'{name} по математика 1.–4. клас – онлайн тестове | Сметко', desc, url,
              [crumbs([('Начало', ''), ('Тестове по математика', 'testove-po-matematika.html'), (name, url)]),
               learning_ld(f'{name} по математика', desc, url, '1.–4. клас', [f'{name} по математика'], ('Тест',)), faq_ld(faqs)], 'pillar-page', og=og(url[:-5], f'{name} по математика', '1.–4. клас · онлайн тестове', '#FF9F1C' if vh else '#4CBB4A', 'happy')) + header() + page_hero(
        f'{name} по математика', f'Тренировъчни тестове за 1., 2., 3. и 4. клас – {what}. Проверката е автоматична, а задачите – всеки път нови.', f'<a href="testove-po-matematika.html">Тестове</a> › {name}', 'happy',
        '<div class="hero-cta grade-jump">' + ''.join(f'<a class="btn btn-white" href="#klas-{g}">{g}. клас</a>' for g in (1, 2, 3, 4)) + '</div>') + f'''
<main id="main">
<section class="section"><div class="wrap prose"><p class="lead-dark">{name}то се прави {when}. То показва {what}, за да може учителят да планира преговора. Тук ще намерите безплатни онлайн тестове за всеки клас.</p></div></section>
{secs}
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(faqs)}</div></section>
</main>
''' + FOOTER + scripts(QZ_JS)
    write(url, pg)
    SITEMAP.append((url, '0.8', 'monthly'))


level_page('vhodno')
level_page('izhodno')

# ======================================================================= Хъб: тестове и задачи
cards = ''
for g, tids in GRADE_TOPICS.items():
    cards += f'<div class="hub-grade" style="--c:{GCOL[g]}"><h3><a href="{class_url(g)}">Математика за {g}. клас</a></h3><ol>' + ''.join(f'<li><a href="{topic_url(t)}">{TOPICS[t]["h1"]}</a></li>' for t in tids) + '</ol></div>'
desc_hub = 'Безплатни онлайн тестове и задачи по математика за 1., 2., 3. и 4. клас по учебната програма на МОН: по теми, входно и изходно ниво, НВО 4. клас, таблица за умножение.'
hub = head('Тестове и задачи по математика за 1.–4. клас – онлайн | Сметко', desc_hub, 'testove-po-matematika.html',
           [crumbs([('Начало', ''), ('Тестове по математика', 'testove-po-matematika.html')]),
            {"@context": "https://schema.org", "@type": "ItemList", "name": "Онлайн тестове по математика", "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "url": SITE + '/' + u, "name": n} for i, (u, n) in enumerate(
                    [('nvo-4-klas-matematika.html', 'НВО 4. клас'), ('vhodno-nivo-matematika.html', 'Входно ниво'), ('izhodno-nivo-matematika.html', 'Изходно ниво'), ('tablica-za-umnozhenie.html', 'Таблица за умножение')] +
                    [(topic_url(t), TOPICS[t]['h1']) for g in GRADE_TOPICS for t in GRADE_TOPICS[g]])]}], 'pillar-page', og=og('testove-po-matematika', 'Тестове по математика', '1.–4. клас · безплатно, онлайн', '#2F80ED', 'cheer')) + header() + page_hero(
    'Тестове и задачи по математика', 'Онлайн тестове с автоматична проверка за всяка тема от 1. до 4. клас. Безплатно, без регистрация – всеки път с нови задачи.', 'Тестове', 'cheer') + f'''
<main id="main">
<section class="section"><div class="wrap">
  <div class="hub-top">
    <a class="hub-card" href="nvo-4-klas-matematika.html" style="--c:#8E6CF0"><span>⏱️</span><b>НВО 4. клас</b><small>25 задачи, 60 минути</small></a>
    <a class="hub-card" href="vhodno-nivo-matematika.html" style="--c:#FF9F1C"><span>🌱</span><b>Входно ниво</b><small>Септември – октомври</small></a>
    <a class="hub-card" href="izhodno-nivo-matematika.html" style="--c:#4CBB4A"><span>🎓</span><b>Изходно ниво</b><small>Май – юни</small></a>
    <a class="hub-card" href="tablica-za-umnozhenie.html" style="--c:#FF5A5F"><span>✖️</span><b>Таблица за умножение</b><small>Изберете числата</small></a>
    <a class="hub-card" href="rimski-cifri.html" style="--c:#19B5A5"><span>Ⅻ</span><b>Римски цифри</b><small>Преобразувател и тест</small></a>
    <a class="hub-card" href="merni-edinici.html" style="--c:#2F80ED"><span>📏</span><b>Мерни единици</b><small>Таблици и тест</small></a>
  </div>
</div></section>
<section class="section soft"><div class="wrap">
  <div class="section-head"><h2 class="lined">Тестове по теми</h2><p>Темите са в реда на учебната програма на МОН. Всяка страница има обяснение за родители, примерни задачи с отговори и онлайн тест.</p></div>
  <div class="hub-grades">{cards}</div>
</div></section>
<section class="section"><div class="wrap prose">
  <h2>Как работят тестовете</h2>
  <p>Задачите се създават автоматично от генератора на Сметко по темите от учебната програма на МОН за 1.–4. клас. Затова всеки тест е различен и може да се решава многократно. След „Провери“ виждате верните отговори и решенията на сгрешените задачи.</p>
  <p>За редовно упражнение с точки, значки и мисии по уроците в учебника на детето – <a href="game.html">играйте Сметко</a>. За задачи на хартия – <a href="rabotni-listove.html">работни листове</a>.</p>
</div></section>
</main>
''' + FOOTER + scripts()
write('testove-po-matematika.html', hub)
SITEMAP.append(('testove-po-matematika.html', '0.9', 'weekly'))

# ======================================================================= Деца със СОП
SOP_OPTS = [('🧘', 'Спокоен режим', 'Без тиктакане, мигане и конфети. Двойно време в „Бързо сметни“. След грешка детето само решава кога да продължи – верният отговор не изчезва след секунда.'),
            ('🔈', 'Чети задачите на глас', 'Сметко прочита всяка задача с българския глас на телефона, таблета или компютъра – и верния отговор след грешка. С бутона 🔈 задачата се чува пак.'),
            ('🔠', 'Едър текст и бутони', 'По-големи задачи, цифри и бутони. По-лесно за виждане и за натискане, ако фината моторика още се развива.'),
            ('📖', 'Лесно четене', 'Повече място между буквите, думите и редовете и мек кремав фон вместо ярко бяло. Помага при дислексия и зрителна умора.'),
            ('🔘', 'Отговор с избор', 'Вместо да пише числото, детето избира верния отговор от три. Подходящо при затруднения с писането и при първи стъпки в нова тема.'),
            ('🎯', 'Кратки мисии', '5 задачи в мисия вместо 10. По-лесно се задържа вниманието, а успехът идва по-бързо.'),
            ('🔴', 'Точици за помощ', 'При събиране и изваждане до 20 и при малко умножение до задачата се появяват точици – детето вижда количеството и може да брои.'),
            ('🔁', 'Втори опит', 'При грешка Сметко подсказва („Отговорът е по-голям от…“) и детето опитва още веднъж, преди да види верния отговор.')]
sop_cards = ''.join(f'<div class="sop-card"><span aria-hidden="true">{i}</span><h3>{n}</h3><p>{d}</p></div>' for i, n, d in SOP_OPTS)
sop_needs = [('Дислексия и трудно четене', 'Чети задачите на глас · Лесно четене · Едър текст'),
             ('Дискалкулия и трудности със смятането', 'Точици за помощ · Втори опит · Отговор с избор · Кратки мисии'),
             ('Трудности с вниманието (ADHD)', 'Кратки мисии · Спокоен режим · Втори опит'),
             ('Аутизъм и чувствителност към дразнители', 'Спокоен режим (без конфети, мигане и тиктакане) · звукът се спира с 🔊'),
             ('Зрителни затруднения', 'Едър текст · Чети задачите на глас · Лесно четене'),
             ('Затруднения с фината моторика', 'Отговор с избор · Едър текст · игра с клавиатура'),
             ('Тревожност и страх от грешки', 'Спокоен режим · Втори опит · Тренировка без часовник'),
             ('Говорно-езикови нарушения', 'Чети задачите на глас · Точици за помощ · Кратки мисии')]
sop_table = '<div class="table-wrap"><table class="compare sop-table"><thead><tr><th>Ако детето има…</th><th>Опитайте</th></tr></thead><tbody>' + ''.join(f'<tr><td><b>{a}</b></td><td>{b}</td></tr>' for a, b in sop_needs) + '</tbody></table></div>'
faq_sop = [('Безплатни ли са помощните настройки?', 'Да. Помощните настройки работят за всички деца, във всички игри и без абонамент. Никой не трябва да плаща допълнително, защото има нужда от подкрепа.'),
           ('Трябва ли документ или решение за СОП?', 'Не. Не питаме за диагноза и не пазим такава информация. Включете това, което помага на детето – дори ако то просто има нужда от по-спокойно темпо.'),
           ('Ще изглежда ли детето „различно“ пред другите?', 'Не. В класациите, значките и отчетите няма знак, че детето ползва помощни настройки. Учителят вижда само в своето „Табло“ на кои ученици ги е включил.'),
           ('Как работи четенето на глас?', 'Използва се гласът, вграден в устройството. На повечето телефони с Android, на iPhone и iPad, на Windows и на Mac има български глас. Ако няма, може да се добави от настройките на устройството: Език → Текст към говор.'),
           ('Учителят може ли да включи настройки за конкретен ученик?', 'Да. В „Табло“ → „Ученици“ натиснете 🤝 до името на детето. Настройките важат на всяко устройство, от което то влиза – в клас и у дома – и детето не може да ги изключи.'),
           ('Сметко замества ли ресурсния учител или терапията?', 'Не. Сметко е допълнително упражнение – кратко, всеки ден, с повече поводи за успех. Работата с ресурсния учител, психолога, логопеда и екипа в училището остава най-важната подкрепа.'),
           ('Какво става с времето в „Предизвикателство“?', 'Седмичното предизвикателство остава 60 секунди за всички, защото е състезание в класацията. В „Бързо сметни“ спокойният режим дава двойно време, а „Тренировка“ и мисиите са без часовник.')]
desc_sop = 'Математика за деца със СОП в 1.–4. клас: четене на задачите на глас, едър текст, лесно четене при дислексия, спокойно темпо, втори опит и точици за помощ. Безплатно, в Сметко.'
sop_ld = learning_ld('Математика за деца със специални образователни потребности', desc_sop, 'deca-sas-sop.html', '1.–4. клас', ['Математика за 1.–4. клас с помощни настройки за деца със СОП'], ('Упражнение', 'Игра'))
sop_ld.update({"accessibilityFeature": ["largePrint", "readingOrder", "structuralNavigation", "ttsMarkup"],
               "accessibilityHazard": ["noFlashingHazard", "noMotionSimulationHazard"], "accessMode": ["textual", "visual", "auditory"],
               "accessibilityControl": ["fullKeyboardControl", "fullTouchControl", "fullMouseControl"]})
sop_page = head('Математика за деца със СОП – помощни настройки | Сметко', desc_sop, 'deca-sas-sop.html',
                [crumbs([('Начало', ''), ('Деца със СОП', 'deca-sas-sop.html')]), sop_ld, faq_ld(faq_sop)], 'pillar-page',
                og=og('deca-sas-sop', 'Сметко за деца със СОП', 'Четене на глас · едър текст', '#19B5A5', 'happy')) + header('parents') + page_hero(
    'Математика за деца със СОП', 'Всяко дете може да смята – с подходящата подкрепа. В Сметко има помощни настройки за деца със специални образователни потребности: четене на глас, едър текст, спокойно темпо, втори опит и точици за помощ. Безплатно.', 'Деца със СОП', 'happy',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html?a11y=1">🤝 Включи помощните настройки</a><a class="btn btn-white" href="#uchiteli">За учители</a></div>') + f'''
<main id="main">
<section class="section"><div class="wrap">
  <div class="section-head"><h2 class="lined">Какво включва</h2><p>Осем настройки, които се включват поотделно – само това, което помага на вашето дете. С бутона „Препоръчани за СОП“ се включват най-често нужните.</p></div>
  <div class="sop-grid">{sop_cards}</div>
  <p class="center-note" style="margin-top:22px"><a class="btn btn-lg" href="game.html?a11y=1">Пробвайте сега</a></p>
</div></section>
<section class="section soft"><div class="wrap narrow-wrap">
  <div class="section-head"><h2 class="lined">Кое кога помага</h2><p>Всяко дете е различно – това са отправни точки, не правила. Пробвайте 1–2 настройки, наблюдавайте детето и променяйте.</p></div>
  {sop_table}
</div></section>
<section class="section"><div class="wrap">
  <div class="sop-two">
    <div class="prose"><h2 id="roditeli">Как да ги включите – за родители</h2>
      <ol class="steps-list">
        <li>Отворете <a href="game.html">играта</a> на устройството, на което играе детето.</li>
        <li>Натиснете <b>🤝</b> горе вдясно или „Помощни настройки“ под бутона „Започни!“.</li>
        <li>Изберете „✨ Препоръчани за СОП“ или включете настройките една по една.</li>
        <li>Ако детето има профил в акаунта ви, настройките го следват на всяко устройство.</li>
      </ol></div>
    <div class="prose"><h2 id="uchiteli">За учители и ресурсни учители</h2>
      <ol class="steps-list">
        <li>Влезте в <a href="tablo.html">„Табло“</a> → „Ученици“.</li>
        <li>Натиснете <b>🤝</b> до името на детето и изберете настройките.</li>
        <li>Те важат на всяко устройство, от което ученикът влиза – в клас и у дома. Детето не може да ги изключи.</li>
        <li>Домашните и отчетите работят както за останалите – виждате напредъка на детето по теми.</li>
      </ol></div>
  </div>
</div></section>
<section class="section soft"><div class="wrap prose">
  <h2>Съвети за упражнения у дома</h2>
  <ul class="check-list">
    <li><b>Кратко и всеки ден.</b> 5–10 минути дневно помагат повече от един дълъг час веднъж седмично.</li>
    <li><b>Хвалете усилието, не само верния отговор.</b> „Видях как опита пак“ работи по-добре от „Браво, умник“.</li>
    <li><b>Започнете от лесното.</b> Мисия, която детето ще реши, дава увереност за следващата.</li>
    <li><b>Ползвайте предмети.</b> Копчета, кубчета, бонбони – особено при събиране, изваждане и първите стъпки в умножението.</li>
    <li><b>Четете задачата заедно</b> при текстовите задачи и подчертавайте числата.</li>
    <li><b>Говорете с учителя.</b> Ако в клас детето ползва помощни настройки, включете същите и у дома.</li>
  </ul>
  <h2>Подкрепа в училище</h2>
  <p>По Закона за предучилищното и училищното образование и Наредбата за приобщаващото образование децата със специални образователни потребности имат право на допълнителна подкрепа за личностно развитие. В училището за нея отговаря екипът за подкрепа за личностно развитие – ресурсен учител, психолог, логопед и учителите на детето. При нужда се изготвя индивидуален учебен план. Повече информация дават училището и регионалният център за подкрепа на процеса на приобщаващото образование.</p>
  <p>На <a href="nvo-4-klas-matematika.html">НВО по математика в 4. клас</a> учениците със СОП имат допълнително време.</p>
  <div class="callout">Сметко не поставя диагнози и не замества специалистите. Той е допълнително упражнение – кратко, ежедневно и с повече поводи за успех.</div>
  <h2>Достъпност на играта</h2>
  <p>Сметко се играе с докосване, с мишка или само с клавиатура (цифри, <kbd>Enter</kbd>, <kbd>⌫</kbd>; при избор – 1, 2, 3). Звукът се спира с 🔊. Анимациите се изключват сами, ако в устройството е включено „Намаляване на движението“. Задачите са с текст, а не само с картинки, и се четат от екранни четци.</p>
</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(faq_sop)}
  <p class="center-note">Имате идея как да направим Сметко по-удобен за дете със СОП? Пишете ни на <a href="mailto:info@smetko.com">info@smetko.com</a> – четем всяко писмо.</p>
</div></section>
</main>
''' + FOOTER + scripts()
write('deca-sas-sop.html', sop_page)
SITEMAP.append(('deca-sas-sop.html', '0.8', 'monthly'))

# ======================================================================= sitemap-pages.xml
STATIC = [('', '1.0', 'weekly'), ('game.html', '0.9', 'weekly')] + [(class_url(g), '0.9', 'monthly') for g in (1, 2, 3, 4)] + [
    ('uchilishta.html', '0.8', 'monthly'), ('rabotni-listove.html', '0.8', 'monthly'), ('pricing.html', '0.7', 'monthly'), ('about.html', '0.6', 'monthly'),
    ('liga.html', '0.6', 'daily'), ('za-nas.html', '0.6', 'monthly'), ('otchet.html', '0.5', 'monthly'), ('novini.html', '0.4', 'weekly'),
    ('registracia.html', '0.5', 'yearly'), ('vhod.html', '0.4', 'yearly'), ('achievements.html', '0.3', 'monthly'),
    ('pravna-informacia.html', '0.3', 'yearly'), ('terms.html', '0.2', 'yearly'), ('privacy-policy.html', '0.2', 'yearly'), ('cookies.html', '0.2', 'yearly'),
    ('otkaz.html', '0.1', 'yearly'), ('dogovor-uchilishte.html', '0.3', 'yearly'), ('pismo-roditeli.html', '0.3', 'yearly'), ('dogovor-danni.html', '0.2', 'yearly')]
xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    f'  <url><loc>{SITE}/{u}</loc><lastmod>{TODAY}</lastmod><changefreq>{c}</changefreq><priority>{p}</priority></url>\n' for u, p, c in STATIC + SITEMAP) + '</urlset>\n'
missing = [u for u, _, _ in STATIC + SITEMAP if u and not os.path.exists(os.path.join(OUT, u))]
assert not missing, missing
write('sitemap-pages.xml', xml)
for g in (1, 2, 3, 4):
    og(f'matematika-{g}-klas', f'Математика за {g}. клас', 'Задачи, тестове и игри по програмата на МОН', GCOL[g], OWLS[g])
json.dump(OG, open(os.path.join(HERE, 'og_list.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('SEO:', len(SITEMAP), 'страници;', len(STATIC + SITEMAP), 'адреса в sitemap')

# ======================================================================= sw.js: версия и списък за офлайн кеша (от VER)
import re
from common import VER
swp = os.path.join(OUT, 'sw.js')
sw = open(swp, encoding='utf-8').read()
sw = re.sub(r"smetko-v\d+", 'smetko-v' + VER, sw)
sw = re.sub(r"\?v=\d+", '?v=' + VER, sw)
for g in (1, 2, 3, 4):
    sw = sw.replace(f"'/class-{g}.html'", f"'/{class_url(g)}'")
if "/js/quiz.js" not in sw:
    sw = sw.replace("'/js/challenge.js?v=" + VER + "',", "'/js/challenge.js?v=" + VER + "', '/js/quiz.js?v=" + VER + "', '/tablica-za-umnozhenie.html', '/testove-po-matematika.html',")
if "/js/wardrobe.js" not in sw:
    sw = sw.replace("'/js/game.js?v=" + VER + "',", "'/js/wardrobe.js?v=" + VER + "', '/js/game.js?v=" + VER + "',")
if "/js/a11y.js" not in sw:
    sw = sw.replace("'/js/game.js?v=" + VER + "',", "'/js/a11y.js?v=" + VER + "', '/js/game.js?v=" + VER + "',")
open(swp, 'w', encoding='utf-8').write(sw)
