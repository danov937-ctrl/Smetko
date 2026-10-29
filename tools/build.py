# -*- coding: utf-8 -*-
"""Генерира основните страници на smetko.com. Стартиране: python3 tools/build.py"""
import os, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_content import TOPICS  # noqa
from common import *  # noqa
import legal  # noqa: правните страници

# ---------------- илюстрации за „Как работи?“ ----------------
STEP1 = '''<svg viewBox="0 0 220 150" aria-hidden="true"><defs><linearGradient id="s1a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D99A5B"/><stop offset="1" stop-color="#A9672E"/></linearGradient></defs>
<rect x="62" y="16" width="96" height="124" rx="14" fill="url(#s1a)"/><rect x="72" y="30" width="76" height="100" rx="8" fill="#fff"/><rect x="90" y="8" width="40" height="18" rx="7" fill="#8796B2"/>
<g stroke-linecap="round" stroke-width="5.5" fill="none"><path d="M82 52 l6 6 l11 -12" stroke="#4CBB4A"/><path d="M82 80 l6 6 l11 -12" stroke="#4CBB4A"/><path d="M82 108 l6 6 l11 -12" stroke="#FFC531"/></g>
<g fill="#DCE6F5"><rect x="106" y="48" width="32" height="9" rx="4.5"/><rect x="106" y="76" width="26" height="9" rx="4.5"/><rect x="106" y="104" width="30" height="9" rx="4.5"/></g>
<text x="176" y="60" font-family="Nunito,Arial" font-weight="900" font-size="24" fill="#3299FF">2+3</text><text x="26" y="104" font-family="Nunito,Arial" font-weight="900" font-size="32" fill="#FF5A5F">×</text><text x="182" y="118" font-family="Nunito,Arial" font-weight="900" font-size="30" fill="#4CBB4A">=</text></svg>'''
STEP2 = '''<svg viewBox="0 0 220 150" aria-hidden="true"><defs><radialGradient id="s2a" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FFB800"/></radialGradient></defs>
<path d="M110 12 l18 37 40 6 -29 28 7 40 -36 -19 -36 19 7 -40 -29 -28 40 -6z" fill="url(#s2a)" stroke="#E59A00" stroke-width="5" stroke-linejoin="round"/>
<circle cx="97" cy="72" r="5.5" fill="#1D2440"/><circle cx="123" cy="72" r="5.5" fill="#1D2440"/><path d="M97 87 q13 11 26 0" stroke="#1D2440" stroke-width="4.5" fill="none" stroke-linecap="round"/>
<g><ellipse cx="38" cy="130" rx="24" ry="8" fill="#E0A500"/><ellipse cx="38" cy="122" rx="24" ry="8" fill="#FFC531" stroke="#E0A500" stroke-width="3"/><ellipse cx="38" cy="111" rx="24" ry="8" fill="#FFC531" stroke="#E0A500" stroke-width="3"/></g>
<g><ellipse cx="182" cy="132" rx="24" ry="8" fill="#E0A500"/><ellipse cx="182" cy="124" rx="24" ry="8" fill="#FFC531" stroke="#E0A500" stroke-width="3"/></g>
<circle cx="168" cy="30" r="6" fill="#FF9F1C"/><circle cx="48" cy="36" r="4" fill="#FF5A5F"/><circle cx="190" cy="74" r="4" fill="#4CBB4A"/></svg>'''
STEP3 = '''<svg viewBox="0 0 220 150" aria-hidden="true"><path d="M16 142 L88 50 L118 86 L150 54 L210 142Z" fill="#8FB7DB"/><path d="M88 50 L74 68 L88 64 L100 74Z M150 54 L138 70 L150 66 L160 74Z" fill="#fff"/>
<rect x="148" y="18" width="4" height="40" fill="#7B4A22"/><path d="M152 20 L180 29 L152 38Z" fill="#FF5A5F"/>
<g transform="rotate(35 66 70)"><path d="M66 18 C 83 33 85 72 79 98 L53 98 C 47 72 49 33 66 18Z" fill="#fff" stroke="#3299FF" stroke-width="4"/><circle cx="66" cy="56" r="10" fill="#8ED3FF" stroke="#3299FF" stroke-width="4"/>
<path d="M53 80 L38 102 L53 98Z M79 80 L94 102 L79 98Z" fill="#FF5A5F"/><path d="M57 100 Q66 128 75 100Z" fill="#FF9F1C"/></g></svg>'''

HILLS = '''<svg class="hero2-land" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <path d="M0 170 L110 92 L200 140 L330 50 L460 150 L560 104 L660 160 L790 74 L920 156 L1030 100 L1140 150 L1260 62 L1370 130 L1440 104 L1440 300 L0 300Z" fill="#B7D7F2"/>
  <path d="M330 50 L300 74 L318 70 L332 82 L348 70 L362 76Z M790 74 L762 96 L780 92 L794 102 L808 92 L820 97Z M1260 62 L1230 86 L1248 82 L1262 94 L1278 82 L1292 88Z" fill="#fff"/>
  <path d="M0 214 L100 160 L210 204 L320 146 L440 212 L560 168 L680 216 L800 154 L920 214 L1040 164 L1160 216 L1280 158 L1390 208 L1440 182 L1440 300 L0 300Z" fill="#9CC6EA"/>
  <path d="M-20 238 C 200 182 380 200 560 230 C 760 262 900 196 1100 206 C 1260 214 1360 196 1460 214 L1460 300 L-20 300Z" fill="#88D43B"/>
  <path d="M-20 262 C 240 228 460 246 700 262 C 920 278 1120 236 1460 252 L1460 300 L-20 300Z" fill="#A9DF51"/>
  <path d="M640 300 C 680 276 740 266 790 256 C 840 246 880 244 930 236" stroke="#FFE9B8" stroke-width="20" fill="none" stroke-linecap="round"/>
  <g fill="#4FAE3C"><circle cx="150" cy="226" r="20"/><circle cx="176" cy="232" r="14"/><circle cx="1110" cy="214" r="22"/><circle cx="1138" cy="222" r="14"/><circle cx="1320" cy="226" r="16"/></g>
  <g fill="#7B4A22"><rect x="147" y="240" width="6" height="14"/><rect x="1107" y="230" width="6" height="16"/><rect x="1317" y="238" width="6" height="12"/></g>
  <g fill="#FFC531"><circle cx="300" cy="276" r="4"/><circle cx="520" cy="284" r="4"/><circle cx="1180" cy="272" r="4"/><circle cx="1000" cy="284" r="4"/></g>
  <g fill="#FF5A5F"><circle cx="340" cy="284" r="4"/><circle cx="1220" cy="282" r="4"/><circle cx="90" cy="286" r="4"/></g>
  <g fill="#fff"><circle cx="440" cy="278" r="3.5"/><circle cx="860" cy="284" r="3.5"/><circle cx="1380" cy="278" r="3.5"/></g>
  <path d="M-20 300 C 400 284 1040 284 1460 300 Z" fill="#fff"/>
</svg>'''

# ---------------- класове (по учебните програми на МОН) ----------------
GRADES = {
    1: dict(c='g1', color='#FF5A5F', short=['Числата до 10 и до 20', 'Събиране и изваждане с и без преминаване', 'Кръглите десетици до 100', 'Фигури, сантиметър, часовник, пари'],
            topics=[('g1t1', 'Числата до 5 и нула'), ('g1t2', 'Числата до 10. Събиране и изваждане до 10'), ('g1t3', 'Числата от 11 до 20'), ('g1t4', 'Събиране и изваждане до 20 без преминаване'), ('g1t5', 'Събиране и изваждане до 20 с преминаване'), ('g1t6', 'Числата 10, 20, 30, … 100')],
            about='Програмата на МОН за 1. клас има 6 теми, които вървят една след друга: числата до 5 и нула, числата до 10, числата от 11 до 20, събиране и изваждане до 20 без преминаване, после с преминаване, и накрая кръглите десетици до 100. Децата разпознават триъгълник, квадрат, кръг и правоъгълник, мерят отсечки в сантиметри, работят с килограм, монети и банкноти и разчитат часовника в цели часове.',
            ex=['3 + 2 = ?', '8 − 5 = ?', '13 + 4 = ?', '9 + 6 = ?', '50 + 30 = ?']),
    2: dict(c='g2', color='#FF9F1C', short=['Числата до 100', 'Събиране и изваждане до 100', 'Цялата таблица за умножение и деление', 'Обиколка, триъгълници, часовник'],
            topics=[('g2t1', 'Числата до 100'), ('g2t2', 'Събиране и изваждане до 100 без преминаване'), ('g2t3', 'Събиране и изваждане до 100 с преминаване'), ('g2t4', 'Таблично умножение и деление')],
            about='Във 2. клас темите са 4: числата до 100, събиране и изваждане до 100 без преминаване, после с преминаване, и таблично умножение и деление. Децата учат скоби и ред на действията, неизвестно събираемо и множител, четни и нечетни числа, видовете триъгълници според страните, обиколка, дециметър и метър, минута, денонощие, седмица, месец и година.',
            ex=['34 + 25 = ?', '72 − 38 = ?', '7 · 8 = ?', '40 − (15 + 5) = ?', '? · 6 = 42']),
    3: dict(c='g3', color='#4CBB4A', short=['Числата до 1000', 'Събиране и изваждане до 1000', 'Умножение и деление с едноцифрено число', 'Ъгли, части, мерни единици'],
            topics=[('g3t1', 'Числата до 1000'), ('g3t2', 'Събиране и изваждане до 1000 без преминаване'), ('g3t3', 'Събиране и изваждане до 1000 с преминаване'), ('g3t4', 'Умножение на двуцифрено и трицифрено число с едноцифрено'), ('g3t5', 'Деление на двуцифрено и трицифрено число с едноцифрено')],
            about='В 3. клас темите са 5: числата до 1000, събиране и изваждане без и с преминаване, умножение и деление на двуцифрено и трицифрено число с едноцифрено. Децата разпознават права, крива линия и лъч, прав, остър и тъп ъгъл, триъгълниците според ъглите, намират половина, трета, четвърт и десета, работят с мм, км, г, т, век и секунда.',
            ex=['456 + 238 = ?', '703 − 368 = ?', '23 · 4 = ?', '84 : 4 = ?', 'Половината от 18 = ?']),
    4: dict(c='g4', color='#3299FF', short=['Числата над 1000 и римски цифри', 'Многоцифрени числа – 4 действия', 'Умножение и деление с двуцифрено', 'Лице, градуси, геометрични тела'],
            topics=[('g4t1', 'Числата над 1000'), ('g4t2', 'Събиране и изваждане на многоцифрени числа без преминаване'), ('g4t3', 'Събиране и изваждане на многоцифрени числа с преминаване'), ('g4t4', 'Умножение на многоцифрено число с едноцифрено'), ('g4t5', 'Деление на многоцифрено число с едноцифрено'), ('g4t6', 'Умножение на многоцифрено число с двуцифрено'), ('g4t7', 'Деление на многоцифрено число с двуцифрено')],
            about='В 4. клас темите са 7: числата над 1000, събиране и изваждане на многоцифрени числа без и с преминаване, умножение и деление с едноцифрено и с двуцифрено число. Децата пишат римски цифри, мерят ъгли в градуси, разпознават куб, паралелепипед, цилиндър, конус, пирамида и сфера, намират лице на правоъгълник и квадрат и работят с мерните единици за лице.',
            ex=['4 528 + 3 271 = ?', 'XIV = ?', '2 345 · 3 = ?', '576 : 24 = ?', 'Лице на 8 см × 5 см = ?']),
}
BOOKS = {1: ['Просвета', 'Просвета Плюс', 'Бит и Техника', 'Архимед'], 2: ['Просвета', 'Просвета Плюс', 'Бит и Техника'], 3: ['Просвета', 'Просвета Плюс', 'Бит и Техника'], 4: ['Просвета', 'Просвета Плюс', 'Бит и Техника']}

FAQ_INDEX = [
    ('По кой учебник са задачите?', 'Детето избира своя учебник и получава <b>по една мисия за всеки урок</b> от годишното разпределение – между 110 и 136 мисии за година, с уроците в същия ред. Ако учебникът още го няма в списъка, мисиите следват учебната програма на МОН – общият ред, по който работят всички одобрени учебници.'),
    ('Безплатен ли е Сметко?', 'Има безплатен план: „Бързо сметни“, първите <span data-cfg="freeMissions">3</span> мисии от всеки клас и <span data-cfg="freePractice">20</span> задачи на ден в „Тренировка“. Пълният достъп се отключва с код от учителя или с абонамент. Вижте <a href="pricing.html">цените</a>.' if SALES_OPEN else 'Има безплатен план за всички: „Бързо сметни“, първите <span data-cfg="freeMissions">3</span> мисии от всеки клас и <span data-cfg="freePractice">20</span> задачи на ден в „Тренировка“. Сега Сметко е в затворен тест – пълният достъп е само за участниците с код за достъп. Абонаментите ще бъдат пуснати скоро.'),
    ('Как се активира абонамент?' if SALES_OPEN else 'Кога ще има абонаменти?', 'След поръчката получавате един код по имейл. Влезте в акаунта си (или си направете безплатен), отворете <a href="pricing.html#activate">„Абонаменти“</a> и въведете кода – веднъж. Семейният и индивидуалният абонамент важат за децата в профила ви на всяко устройство, а абонаментът за клас – за до 30 ученици.' if SALES_OPEN else 'Скоро. Сега Сметко е в затворен тест с група родители, учители и училища. Ако имате код за достъп от нас, въведете го в <a href="pricing.html#activate">„Абонаменти“</a>. Искате да участвате? Пишете ни на <a href="mailto:info@smetko.com">info@smetko.com</a>.'),
    ('Трябва ли регистрация?', 'За да опитате – не: безплатният план работи веднага. За пълен достъп родителят или учителят прави безплатен акаунт. Децата не въвеждат имейл: родителят им прави профили, а учениците от клас влизат с име и парола от учителя.'),
    ('Има ли реклами?', 'Не. Сметко е чиста детска среда, без рекламни банери и без рекламно проследяване. Статистика за посещенията се събира само ако възрастният я приеме в банера за бисквитки.'),
    ('На какво устройство работи?', 'На телефон, таблет, компютър и интерактивна дъска, направо в браузъра. Може да се добави на началния екран като приложение и работи и без интернет.'),
    ('Как може училището ни да се включи?', 'Учителят поръчва абонамент за клас, активира кода в акаунта си и в <a href="tablo.html">„Табло“</a> пише имената на учениците. Всеки ученик получава потребител и парола – отпечатвате картите и ги раздавате. Вижте <a href="uchilishta.html">Сметко за училища</a>.' if SALES_OPEN else 'Пишете ни на <a href="mailto:info@smetko.com">info@smetko.com</a> – в момента подбираме училища за пилотния проект. Учителите получават код за клас, а в <a href="tablo.html">„Табло“</a> пишат имената на учениците и отпечатват картите им за вход.'),
]


def class_cards():
    out = ''
    for g, d in GRADES.items():
        lis = ''.join(f'<li>{t}</li>' for t in d['short'])
        out += f'''<article class="card class-card {d['c']}"><div class="cc-num">{g}</div><h3>{g}. клас</h3><ul>{lis}</ul>
<div class="cc-actions"><a class="btn btn-sm" href="game.html?grade={g}&amp;mode=adventure">Играй</a><a class="btn btn-sm btn-ghost" href="matematika-{g}-klas.html">Теми</a></div></article>'''
    return out


# ================= index.html =================
PRICES_HOME = '<section class="section soft">\n  <div class="wrap">\n    <div class="section-head"><h2 class="lined">Честни цени</h2><p>Безплатен план за всички. Пълен достъп с абонамент – за детето или за целия клас.</p></div>\n    <div class="plans three">\n      <div class="plan"><h3><span class="plan-ico">🦉</span> <span data-plan="single">Бухалче</span><small class="plan-kind">Индивидуален</small></h3><div class="who">1 дете + отчет за родителя</div><div class="price"><span data-price="single12">18</span> € <small>/ 1 година</small></div><div class="per">или <span data-price="single6">10</span> € за 6 месеца</div><ul><li>Всички мисии по учебника</li><li>Неограничена тренировка</li><li>Отчет за родителя</li></ul><a class="btn btn-white" href="pricing.html">Детайли</a></div>\n      <div class="plan featured"><span class="ribbon">Най-изгоден</span><h3><span class="plan-ico">🏡</span> <span data-plan="family">Гнездо</span><small class="plan-kind">Семеен</small></h3><div class="who">До 4 деца + родител</div><div class="price"><span data-price="family12">30</span> € <small>/ 1 година</small></div><div class="per">или <span data-price="family6">18</span> € за 6 месеца</div><ul><li>Отделен код за всяко дете</li><li>Отчет за всяко дете</li><li>Подходящ за подарък</li></ul><a class="btn" href="pricing.html">Детайли</a></div>\n      <div class="plan"><h3><span class="plan-ico">🐦</span> <span data-plan="class">Ято</span><small class="plan-kind">Цял клас</small></h3><div class="who">30 ученици + 1 + 2 учители</div><div class="price"><span data-price="class12">80</span> € <small>/ 1 година</small></div><div class="per">или <span data-price="class6">45</span> € за 6 месеца</div><ul><li>Класация на класа</li><li>Отчет по теми за учителя</li><li>Фактура</li></ul><a class="btn btn-white" href="pricing.html">Детайли</a></div>\n    </div>\n  </div>\n</section>' if SALES_OPEN else '<section class="section soft">\n  <div class="wrap">\n    <div class="soon-band">\n      <div class="owl" data-owl="happy"></div>\n      <div><span class="eyebrow">Затворен тест</span><h2>Абонаментите – очаквайте скоро</h2>\n      <p>Сега тестваме Сметко със затворена група родители, учители и училища. Пълният достъп е само с код за достъп от нас, а безплатният план е отворен за всички.</p>\n      <div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Безплатен план</a><a class="btn btn-white" href="pricing.html#activate">🔑 Имам код</a><a class="btn btn-white" href="mailto:info@smetko.com?subject=Затворен%20тест">✉️ Искам да участвам</a></div></div>\n    </div>\n  </div>\n</section>'

index = head('Сметко – математика като игра за 1.–4. клас',
             'Онлайн математически игри за 1., 2., 3. и 4. клас по учебната програма на МОН и по уроците в учебника на детето. Мисии, точки и значки – без реклами.',
             'index.html', [ORG, {"@context": "https://schema.org", "@type": "WebSite", "name": "Сметко", "alternateName": "Smetko", "url": SITE + '/', "inLanguage": "bg"}, {"@context": "https://schema.org", "@type": "WebApplication", "name": "Сметко", "url": SITE,
                                  "applicationCategory": "EducationalApplication", "operatingSystem": "Всички (уеб браузър)", "inLanguage": "bg",
                                  "educationalLevel": "1.–4. клас", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}}, faq_ld(FAQ_INDEX)],
             'home') + header(over=True) + f'''
<main id="main">
<section class="hero2">
  <span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span>
  <div class="wrap hero2-grid">
    <div class="hero2-copy">
      <h1>Математика като игра<br>за 1.–4. клас!</h1>
      <a class="btn btn-xl" href="game.html">Започни мисия</a>
      <p class="hero2-sub">Започни своето математическо приключение!</p>
      <div class="hero2-grades" aria-label="Бърз избор на клас"><span>Избери клас:</span>
        <a class="gpill g1" href="game.html?grade=1&amp;mode=adventure" aria-label="1. клас">1</a><a class="gpill g2" href="game.html?grade=2&amp;mode=adventure" aria-label="2. клас">2</a><a class="gpill g3" href="game.html?grade=3&amp;mode=adventure" aria-label="3. клас">3</a><a class="gpill g4" href="game.html?grade=4&amp;mode=adventure" aria-label="4. клас">4</a>
      </div>
    </div>
    <div class="hero2-owl"><div class="owl" data-owl="hero"></div></div>
  </div>
  {HILLS}
</section>

<section class="ch-strip"><div class="wrap"><div class="hw-cards" data-hw-cards hidden></div><div class="ch-card" data-challenge-card hidden></div></div></section>

<section class="how2" id="kak-raboti">
  <div class="wrap">
    <h2 class="lined">Как работи?</h2>
    <div class="steps2">
      <div class="step2"><div class="step2-img">{STEP1}</div><p class="step2-text"><span>1.</span> Решавай забавни мисии</p></div>
      <div class="arrow2" aria-hidden="true">›</div>
      <div class="step2"><div class="step2-img">{STEP2}</div><p class="step2-text"><span>2.</span> Събирай точки и значки</p></div>
      <div class="arrow2" aria-hidden="true">›</div>
      <div class="step2"><div class="step2-img">{STEP3}</div><p class="step2-text"><span>3.</span> Печели нови нива!</p></div>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">По твоя учебник</h2><p>Избираш учебника, по който учиш, и получаваш по една мисия за всеки урок в него – над 100 мисии за година.</p></div>
    <div class="book-strip">
      <div class="book-card"><b>Учебна програма на МОН</b><small>общ ред за всички учебници</small></div>
      <div class="book-card"><b>Просвета</b><small>1., 2., 3. и 4. клас</small></div>
      <div class="book-card"><b>Просвета Плюс</b><small>1., 2., 3. и 4. клас</small></div>
      <div class="book-card"><b>Бит и Техника</b><small>1., 2., 3. и 4. клас</small></div>
      <div class="book-card"><b>Архимед</b><small>1. клас</small></div>
      <div class="book-card more"><b>Скоро още</b><small>Клет, Анубис, Булвест</small></div>
    </div>
    <p class="hint book-note">Сметко не е свързан с издателствата и не е одобрен от тях. Имената на учебниците посочват само по кой учебник са подредени мисиите; задачите са създадени от Сметко.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Три начина да играеш</h2><p>За бързи умове, за изследователи и за спокойна тренировка.</p></div>
    <div class="grid grid-3">
      <article class="card mode-card quick"><div class="mode-ico">⚡</div><h3>Бързо сметни</h3><p>60 секунди, колкото можеш повече задачи. Бонус за бързина и рекорд за побиване.</p><a class="btn btn-sm" href="game.html?mode=quick&amp;start=0">Играй</a></article>
      <article class="card mode-card adv"><div class="mode-ico">🗺️</div><h3>Приключение</h3><p>Мисии по пътеката към върха, подредени като уроците в учебника. До 3 звезди на мисия.</p><a class="btn btn-sm btn-green" href="game.html?mode=adventure&amp;start=0">Играй</a></article>
      <article class="card mode-card prac"><div class="mode-ico">🧘</div><h3>Тренировка</h3><p>Без часовник и без стрес. При грешка Сметко показва правилното решение.</p><a class="btn btn-sm btn-purple" href="game.html?mode=practice&amp;start=0">Играй</a></article>
    </div>
  </div>
</section>

<section class="section soft" id="klasove">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Задачи за всеки клас</h2><p>Темите и редът им следват учебните програми на МОН по математика.</p></div>
    <div class="grid grid-4">{class_cards()}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Безплатни помагала</h2><p>Онлайн тестове с автоматична проверка, таблици и подготовка за НВО – без регистрация.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="testove-po-matematika.html" style="--c:#2F80ED"><span>✏️</span><b>Тестове по математика</b><small>За всяка тема от 1. до 4. клас</small></a>
      <a class="hub-card" href="tablica-za-umnozhenie.html" style="--c:#FF5A5F"><span>✖️</span><b>Таблица за умножение</b><small>За печат, трикове и тест</small></a>
      <a class="hub-card" href="nvo-4-klas-matematika.html" style="--c:#8E6CF0"><span>⏱️</span><b>НВО 4. клас</b><small>Тренировъчен тест с часовник</small></a>
      <a class="hub-card" href="vhodno-nivo-matematika.html" style="--c:#FF9F1C"><span>🌱</span><b>Входно ниво</b><small>Тестове за 1.–4. клас</small></a>
      <a class="hub-card" href="rimski-cifri.html" style="--c:#19B5A5"><span>Ⅻ</span><b>Римски цифри</b><small>Таблица и преобразувател</small></a>
      <a class="hub-card" href="merni-edinici.html" style="--c:#4CBB4A"><span>📏</span><b>Мерни единици</b><small>Дължина, маса, време, лице</small></a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <article class="aud-card parents" id="roditeli">
      <span class="eyebrow">За родители</span>
      <h2>Спокойствие за вас, игра за детето</h2>
      <ul>
        <li>Без реклами и без събиране на лични данни на детето</li>
        <li>10 минути на ден затвърждават наученото в училище</li>
        <li>Същите теми и ред като в учебника на детето</li>
        <li>Седмичен отчет за напредъка <span class="soon">скоро</span></li>
      </ul>
      <a class="btn btn-white" href="about.html#roditeli">Научете повече</a>
    </article>
    <article class="aud-card teachers" id="uchiteli">
      <span class="eyebrow">За учители</span>
      <h2>Помощник в час и за домашна работа</h2>
      <ul>
        <li>„Бързо сметни“ на интерактивната дъска</li>
        <li>Линк за домашна по конкретна тема</li>
        <li>Работни листове за печат с отговори</li>
        <li>Класация на класа и обща класация между училищата</li>
      </ul>
      <a class="btn btn-blue" href="uchilishta.html">Сметко за училища</a>
    </article>
  </div>
</section>

{PRICES_HOME}

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Често задавани въпроси</h2></div>
    {faq(FAQ_INDEX)}
  </div>
</section>

<section class="section soft">
  <div class="wrap">
    <div class="cta-band">
      <div class="owl" data-owl="cheer"></div>
      <div><h2>Готов ли си за първата мисия?</h2><p>Отнема 2 минути. Без регистрация.</p></div>
      <a class="btn btn-white btn-lg" href="game.html">Започни сега</a>
    </div>
  </div>
</section>
</main>
''' + FOOTER + scripts(['js/challenge.js', 'js/homework.js'])
write('index.html', index)

# ================= game.html =================
game = head('Математически игри онлайн за 1.–4. клас – Сметко', 'Безплатни математически игри онлайн за 1., 2., 3. и 4. клас: мисии по уроците в учебника, „Бързо сметни“ и тренировка по темите от програмата на МОН.', 'game.html', [], 'game-page') + header(game=True) + '''
<main id="main">
<h1 class="sr-only">Математически игри за 1.–4. клас</h1>
<noscript><div class="noscript">За да играете, моля, включете JavaScript в браузъра.</div></noscript>

<section class="screen" id="screen-setup" aria-label="Избор на игра">
  <div class="game-wrap">
    <div class="hw-cards" data-hw-cards hidden></div>
    <div id="dt-box"></div>
    <div class="today">
      <div class="owl" data-owl="hello"></div>
      <div class="goal"><div id="rank-name">Ниво 1: Новак</div><div id="goal-text" class="goal-text">Днешна цел</div><div class="goal-bar"><i id="goal-bar"></i></div></div>
      <div class="streak">🔥<b id="streak-num">0</b>дни</div>
    </div>
    <div class="panel">
      <div class="step-label">1. Избери клас</div>
      <div class="grade-tabs">
        <button class="grade-tab" data-g="1"><b>1</b>клас</button>
        <button class="grade-tab" data-g="2"><b>2</b>клас</button>
        <button class="grade-tab" data-g="3"><b>3</b>клас</button>
        <button class="grade-tab" data-g="4"><b>4</b>клас</button>
      </div>
    </div>
    <div class="panel">
      <div class="step-label">2. Избери игра</div>
      <div class="modes">
        <button class="mode-btn" data-mode="adventure"><span class="m-ico">🗺️</span><b>Приключение</b><small>Мисии по учебника</small></button>
        <button class="mode-btn" data-mode="quick"><span class="m-ico">⚡</span><b>Бързо сметни</b><small>60 секунди, нов рекорд</small></button>
        <button class="mode-btn" data-mode="practice"><span class="m-ico">🧘</span><b>Тренировка</b><small>Без часовник</small></button>
        <button class="mode-btn" data-mode="challenge"><span class="m-ico">🥇</span><b>Предизвикателство</b><small>Тема на седмицата</small></button>
      </div>
      <div id="ch-box" class="ch-card ch-in" hidden></div>
      <div id="book-wrap" class="book-wrap">
        <label class="step-label" for="book-select">3. По кой учебник учиш?</label>
        <select id="book-select" class="select"></select>
        <p class="hint">Мисиите се подреждат по заглавията на уроците в учебника. Не намираш своя? Избери „По учебната програма“ – общият ред за всички учебници. <span class="book-note">Сметко не е свързан с издателствата и не е одобрен от тях. Имената на учебниците посочват само по кой учебник са подредени мисиите; задачите са създадени от Сметко.</span></p>
      </div>
      <div id="topic-wrap" style="margin-top:18px">
        <div class="step-label">3. Избери тема</div>
        <div class="topic-chips" id="topic-chips"></div>
      </div>
      <div class="start-row"><button class="btn btn-lg" id="start-btn">Започни!</button></div>
    </div>
    <button class="a11y-link" data-a11y-open><span class="a11y-link-ico" aria-hidden="true">🤝</span><span><b>Помощни настройки</b><small>За деца със СОП, дислексия или нужда от по-спокойно темпо: четене на глас, едър текст, спокойно темпо, втори опит…</small></span><em class="a11y-count" data-a11y-count hidden></em></button>
  </div>
</section>

<section class="screen" id="screen-map" aria-label="Карта на мисиите">
  <div class="game-wrap">
    <div class="map-head"><button class="icon-btn" id="map-back" aria-label="Назад">←</button><h2 id="map-title">Приключение</h2><span class="map-stars" id="map-stars">★ 0</span></div>
    <div class="map" id="map"></div>
  </div>
</section>

<section class="screen" id="screen-play" aria-label="Игра">
  <div class="game-wrap">
    <div class="play-top">
      <button class="icon-btn" id="exit-btn" aria-label="Изход">✕</button>
      <div class="progress" id="progress"><i></i></div>
      <span class="timer-num" id="timer-num" hidden>60</span>
      <button class="btn btn-sm btn-purple" id="end-btn" hidden style="margin-left:auto">Край</button>
    </div>
    <div class="score"><span class="pill" id="play-mode">Игра</span><span class="pill combo" id="combo"></span><span class="pill" id="level-pill">Трудност 1</span><span class="pill" id="pts">★ 0</span></div>
    <div class="play-grid"><div class="play-main">
    <div class="stage"><div class="owl" id="play-owl" data-owl="hello"></div><div class="bubble" id="bubble" aria-live="polite">Да започваме!</div></div>
    <div class="qcard" id="qcard"><div id="qbody"></div></div>
    <button class="fb-btn" type="button" data-feedback>🚩 Нещо не е наред със задачата?</button>
    </div><div class="play-side">
    <div class="keypad" id="keypad">
      <button class="key" data-k="1">1</button><button class="key" data-k="2">2</button><button class="key" data-k="3">3</button>
      <button class="key" data-k="4">4</button><button class="key" data-k="5">5</button><button class="key" data-k="6">6</button>
      <button class="key" data-k="7">7</button><button class="key" data-k="8">8</button><button class="key" data-k="9">9</button>
      <button class="key del" data-k="del" aria-label="Изтрий">⌫</button><button class="key" data-k="0">0</button><button class="key ok" data-k="ok" aria-label="Провери">✓</button>
    </div>
    <div class="choices" id="choices" hidden></div>
    <div class="next-row" id="next-row" hidden><button class="btn btn-green btn-lg" id="next-btn">Напред →</button></div>
    <p class="kbd-hint">⌨️ Можеш да пишеш с клавиатурата: цифри, <kbd>Enter</kbd> – провери, <kbd>⌫</kbd> – изтрий</p>
    </div></div>
  </div>
</section>

<section class="screen" id="screen-result" aria-label="Резултат">
  <div class="game-wrap"><div class="panel result" id="result"></div></div>
</section>
</main>
''' + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/challenge.js', 'js/homework.js', 'js/a11y.js', 'js/wardrobe.js', 'js/game.js'])
write('game.html', game)

# ================= class pages =================
for g, d in GRADES.items():
    items = ''.join(f'''<div class="topic-item" style="--c:{d['color']}"><span class="t-ico">{i + 1}</span><a class="t-link" href="{TOPICS[tid]['slug']}.html">{name}<small>Тема {i + 1} · обяснение, задачи и онлайн тест</small></a><a class="t-play" href="game.html?grade={g}&amp;mode=practice&amp;topic={tid}" aria-label="Тренировка: {name}">▶</a></div>''' for i, (tid, name) in enumerate(d['topics']))
    exs = ''.join(f'<li><b>{e}</b></li>' for e in d['ex'])
    books = ''.join(f'<span class="tag">{b}</span>' for b in BOOKS[g])
    faqs = [(f'Задачите по кой учебник са?', f'В „Приключение“ детето избира учебника си. За {g}. клас мисиите вече са подредени по уроците на: {", ".join(BOOKS[g])}. За останалите учебници мисиите следват учебната програма на МОН – общия ред на всички одобрени учебници.'),
            ('Мога ли да тренирам само една тема?', 'Да. Изберете темата от списъка горе. В „Тренировка“ няма часовник, а при грешка Сметко показва правилното решение.'),
            ('Трудността нагажда ли се?', 'Да. В „Бързо сметни“ и „Тренировка“ задачите стават по-трудни след серия верни отговори и по-лесни след няколко грешки.')]
    title = f'Математика за {g}. клас – задачи и игри онлайн | Сметко'
    desc = f'Задачи, онлайн тестове и игри по математика за {g}. клас по програмата на МОН – всички {len(d["topics"])} теми с обяснения, примерни задачи и работни листове.'
    ld = [crumbs([('Начало', ''), (f'Математика {g}. клас', f'matematika-{g}-klas.html')]),
          {"@context": "https://schema.org", "@type": "LearningResource", "name": f"Математика за {g}. клас – Сметко", "url": f"{SITE}/matematika-{g}-klas.html",
           "inLanguage": "bg", "educationalLevel": f"{g}. клас", "learningResourceType": "Интерактивна игра", "teaches": [t[1] for t in d['topics']],
           "isAccessibleForFree": True}, faq_ld(faqs)]
    html = head(title, desc, f'matematika-{g}-klas.html', ld, og=f'assets/og/matematika-{g}-klas.jpg') + header() + page_hero(
        f'Математика за {g}. клас', f'Задачи по учебната програма на МОН за {g}. клас. Мисии по уроците в твоя учебник, точки и значки.', f'{g}. клас',
        ['hello', 'happy', 'think', 'cheer'][g - 1],
        f'<div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html?grade={g}&amp;mode=adventure">🗺️ Приключение</a><a class="btn btn-white" href="game.html?grade={g}&amp;mode=quick">⚡ Бързо сметни</a></div>') + f'''
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Темите по програмата</h2><p>{len(d['topics'])} теми, в реда на учебната програма на МОН. Избери тема и тренирай без часовник.</p></div>
    <div class="topic-list">{items}</div>
  </div>
</section>
<section class="section soft">
  <div class="wrap prose">
    <h2>Какво учат децата в {g}. клас по математика</h2>
    <p>{d['about']}</p>
    <h3>Мисии по учебник</h3>
    <p>В „Приключение“ избираш учебника си и мисиите носят заглавията на уроците в него. За {g}. клас вече са налични: {books}</p>
    <p class="hint">Сметко не е свързан с издателствата и не е одобрен от тях. Имената на учебниците посочват само по кой учебник са подредени мисиите; задачите са създадени от Сметко.</p>
    <h3>Примерни задачи</h3>
    <ul>{exs}</ul>
    <div class="callout">Съвет: 10 минути на ден са по-полезни от един час веднъж седмично. Сметко отбелязва поредните дни игра с огънче 🔥.</div>
  </div>
</section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(faqs)}</div></section>
<section class="section soft">
  <div class="wrap" style="text-align:center">
    <h2>Други класове</h2>
    <div class="grade-buttons" style="margin:20px auto 0">{''.join(f'<a class="grade-btn g{x}" href="matematika-{x}-klas.html"><b>{x}</b><small>клас</small></a>' for x in range(1, 5))}</div>
  </div>
</section>
</main>
''' + FOOTER + scripts()
    write(f'matematika-{g}-klas.html', html)

# ================= pricing.html =================
FAQ_PRICE = [
    ('Как се плаща?', 'Натиснете „Поръчай“ под плана, попълнете формата и платете по банков път – данните за плащане излизат веднага и идват и на имейла ви. След плащането получавате кода на имейла, обикновено до 1 работен ден. При нужда издаваме фактура. Плащане с карта направо от сайта предстои.'),
    ('Как работи абонаментът за клас?', 'Получавате един код. Активирате го в „Абонаменти“, а в <a href="tablo.html">„Табло“</a> пишете имената на учениците (до 30). Всеки получава потребител и парола за вход – картите се отпечатват с един бутон. Там са и домашните, отчетът по теми и класацията на класа.'),
    ('Има ли безплатен план?', 'Да. Безплатно са „Бързо сметни“ за всички класове, първите <span data-cfg="freeMissions">3</span> мисии от всеки клас, <span data-cfg="freePractice">20</span> задачи на ден в „Тренировка“ и работните листове. Точките, нивата, значките и класациите са с абонамент.'),
    ('Подновява ли се абонаментът автоматично?', 'Не. Абонаментът е за 6 месеца или 1 година и спира сам. Преди края ви напомняме, за да подновите навреме.'),
    ('Как плащат училищата?', 'С фактура и банков превод. За 3 или повече класа има <span data-price="disc3">15</span>% отстъпка, а за 8 или повече класа – <span data-price="disc8">25</span>%.'),
    ('Мога ли да се откажа?', 'Да. Правата ви при отказ са описани в <a href="terms.html">Общите условия</a>, а формулярът за отказ е <a href="otkaz.html">тук</a>.'),
]
paid = '<li>Мисии по учебника за всички класове</li><li>Неограничена тренировка</li><li>Точки, нива и значки</li><li>Всички класации</li>'
pricing = head('Абонаменти и цени – Сметко, математика за 1.–4. клас', 'Абонаменти за Сметко за 6 месеца и 1 година: индивидуален, семеен (4 деца) и за цял клас. Безплатен план и отстъпки за училища.',
               'pricing.html', [crumbs([('Начало', ''), ('Абонаменти', 'pricing.html')]), faq_ld(FAQ_PRICE)]) + header('pricing') + page_hero(
    'Абонаменти', 'По-малко от цената на една тетрадка на месец. Без реклами. Един код – активира се веднъж в акаунта ви.', 'Абонаменти', 'happy',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#activate">🔑 Имам код</a><a class="btn btn-white" href="#plans">Виж абонаментите</a></div>') + f'''
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="section-head" id="plans"><h2 class="lined">Изберете абонамент</h2><p>Изберете срок – цените се сменят веднага.</p></div>
    <div class="period-toggle" role="group" aria-label="Срок на абонамента"><button data-period="12" aria-pressed="true">1 година</button><button data-period="6" aria-pressed="false">6 месеца</button></div>
    <div class="plans">
      <div class="plan"><h3><span class="plan-ico">🐣</span> <span data-plan="free">Пухче</span><small class="plan-kind">Безплатно</small></h3><div class="who">Да опознаете Сметко</div><div class="price">0 €</div><div class="per">завинаги</div>
        <ul><li>„Бързо сметни“ за всички класове</li><li>Първите <span data-cfg="freeMissions">3</span> мисии от всеки клас</li><li>Тренировка до <span data-cfg="freePractice">20</span> задачи на ден</li><li class="no">Всички мисии по учебника</li><li class="no">Точки, нива и значки</li><li class="no">Класации</li></ul>
        <a class="btn btn-white" href="game.html">Играй сега</a></div>
      <div class="plan"><h3><span class="plan-ico">🦉</span> <span data-plan="single">Бухалче</span><small class="plan-kind">Индивидуален</small></h3>
        <div class="pp" data-p="12"><div class="price"><span data-price="single12">18</span> € <small>/ 1 година</small></div><div class="per"><span data-per="single12">1.50 € на месец</span></div></div>
        <div class="pp" data-p="6" hidden><div class="price"><span data-price="single6">10</span> € <small>/ 6 месеца</small></div><div class="per"><span data-per="single6">≈ 1.67 € на месец</span></div></div>
        <dl class="profiles"><div><dt>Детски профили</dt><dd>1</dd></div><div><dt>Отчет за родителя</dt><dd>✓</dd></div></dl>
        <ul>{paid}<li>1 детски профил – на всяко устройство</li><li>Отчет за родителя в профила</li></ul><button class="btn btn-white" data-subscribe="Индивидуален">Поръчай</button></div>
      <div class="plan featured"><span class="ribbon">Най-изгоден</span><h3><span class="plan-ico">🏡</span> <span data-plan="family">Гнездо</span><small class="plan-kind">Семеен</small></h3>
        <div class="pp" data-p="12"><div class="price"><span data-price="family12">30</span> € <small>/ 1 година</small></div><div class="per"><span data-per="family12">7.50 € на дете</span></div></div>
        <div class="pp" data-p="6" hidden><div class="price"><span data-price="family6">18</span> € <small>/ 6 месеца</small></div><div class="per"><span data-per="family6">4.50 € на дете</span></div></div>
        <dl class="profiles"><div><dt>Детски профили</dt><dd>4</dd></div><div><dt>Родителски профили</dt><dd>1</dd></div></dl>
        <ul>{paid}<li>До 4 деца – всяко със свой профил</li><li>Отчет за всяко дете</li></ul><button class="btn" data-subscribe="Семеен">Поръчай</button></div>
      <div class="plan"><h3><span class="plan-ico">🐦</span> <span data-plan="class">Ято</span><small class="plan-kind">Цял клас</small></h3>
        <div class="pp" data-p="12"><div class="price"><span data-price="class12">80</span> € <small>/ 1 година</small></div><div class="per"><span data-per="class12">≈ 2.67 € на ученик</span></div></div>
        <div class="pp" data-p="6" hidden><div class="price"><span data-price="class6">45</span> € <small>/ 6 месеца</small></div><div class="per"><span data-per="class6">1.50 € на ученик</span></div></div>
        <dl class="profiles"><div><dt>Детски профили в клас</dt><dd>30</dd></div><div><dt>Учителски профили</dt><dd>1 + 2</dd></div></dl>
        <ul>{paid}<li>„Табло“: ученици, домашни, отчет по теми</li><li>Карти с име и парола за всеки ученик</li></ul><button class="btn btn-white" data-subscribe="Цял клас">Поръчай</button></div>
    </div>
  </div>
</section>
<section class="section soft" id="activate">
  <div class="wrap">
    <div class="panel act-panel">
      <form id="act-form" autocomplete="off">
        <div class="act-ico">🔑</div><h2>Имате код за абонамент?</h2>
        <p class="hint" id="act-who">Влезте в акаунта си, за да активирате кода.</p>
        <div class="act-row"><input id="act-code" class="input code-input" placeholder="SMET-XXXX-XXXX" maxlength="16" autocapitalize="characters" spellcheck="false" aria-label="Код за абонамент"><button class="btn btn-green btn-lg" type="submit">Активирай</button></div>
        <p class="code-err" id="act-err" role="alert"></p>
        <div id="act-subs"></div>
        <p class="hint act-note">Кодът идва по имейл след поръчката и се въвежда <b>само веднъж</b>. Семейният и индивидуалният абонамент важат за децата в профила ви на всяко устройство. С абонамент за клас в „Табло“ създавате учениците – всеки с име и парола.</p>
      </form>
      <div id="act-ok" hidden></div>
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">За училища</h2></div>
    <div class="plans three" style="max-width:420px;margin:0 auto;grid-template-columns:1fr">
      <div class="plan"><h3><span class="plan-ico">🌳</span> <span data-plan="school">Гора</span><small class="plan-kind">Училище</small></h3><div class="who">Няколко класа или цялото училище</div><div class="price" style="font-size:2rem">по запитване</div><div class="per">до −<span data-price="disc8">25</span>% отстъпка</div>
        <ul><li>−<span data-price="disc3">15</span>% за 3 или повече класа</li><li>−<span data-price="disc8">25</span>% за 8 или повече класа</li><li>Фактура и банков превод</li><li>Картички и класация за всеки клас</li><li>Място в общата класация на училищата</li></ul><button class="btn btn-blue" data-subscribe="Цял клас" data-qty="3">Поръчай за няколко класа</button> <a class="btn btn-white" href="uchilishta.html" style="margin-top:8px">Сметко за училища</a></div>
    </div>
    <p class="price-note">Всички цени са в евро. Информацията за ДДС ще бъде посочена след регистрацията на търговеца.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Какво включва всеки план</h2></div>
    <div class="table-wrap"><table class="compare">
      <thead><tr><th>Възможност</th><th class="c">Безплатно</th><th class="c">Абонамент</th></tr></thead>
      <tbody>
        <tr><td>„Бързо сметни“ (60 секунди)</td><td class="c">✓</td><td class="c">✓</td></tr>
        <tr><td>Мисии в „Приключение“ по учебника</td><td class="c"><span data-cfg="freeMissions">3</span> на клас</td><td class="c">всички (по 1 за урок)</td></tr>
        <tr><td>„Тренировка“ по теми</td><td class="c"><span data-cfg="freePractice">20</span> задачи/ден</td><td class="c">неограничено</td></tr>
        <tr><td>Работни листове за печат</td><td class="c">✓</td><td class="c">✓</td></tr>
        <tr><td>Точки, нива и значки</td><td class="c">–</td><td class="c">✓</td></tr>
        <tr><td>Без реклами</td><td class="c">✓</td><td class="c">✓</td></tr>
        <tr><td>Седмично предизвикателство</td><td class="c">✓</td><td class="c">✓ + класация</td></tr>
        <tr><td>Акаунт за родител и детски профили</td><td class="c">✓</td><td class="c">✓</td></tr>
        <tr><td>Пълен достъп на всички устройства на детето</td><td class="c">–</td><td class="c">✓ (с акаунт)</td></tr>
        <tr><td>Отчет за родителя по теми</td><td class="c">✓</td><td class="c">✓</td></tr>
        <tr><td>Класация на класа и обща класация на училищата</td><td class="c">–</td><td class="c">✓</td></tr>
      </tbody>
    </table></div>
  </div>
</section>
<section class="section soft"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси за плащането</h2></div>{faq(FAQ_PRICE)}</div></section>
</main>
''' + FOOTER + scripts()
write('pricing.html', pricing)
if not SALES_OPEN:  # продажбите са спрени: страницата е „Очаквайте скоро“; остава само активирането на код (за пилотния проект)
    import re as _re
    act = _re.search(r'<section class="section soft" id="activate">.*?</section>', pricing, _re.S).group(0)
    act = act.replace('<h2>Имате код за абонамент?</h2>', '<h2>Имате код за достъп?</h2>')
    act = _re.sub(r'<p class="hint act-note">.*?</p>', '<p class="hint act-note">Кодът за достъп идва от нас по имейл и се въвежда <b>само веднъж</b>. Кодът за родители важи за децата в профила ви на всяко устройство. С код за клас в „Табло“ създавате учениците – всеки с име и парола.</p>', act, flags=_re.S)
    FAQ_SOON = [('Какво е затвореният тест?', 'Преди да пуснем абонаментите, тестваме Сметко с малка група родители, учители и училища. Участниците получават от нас код за достъп с пълен достъп до всичко – мисии, точки, значки, класации, Табло и отчети.'),
                ('Как да се включа?', 'Пишете ни на <a href="mailto:info@smetko.com?subject=Затворен%20тест">info@smetko.com</a> – кой сте (родител, учител, училище) и в кой клас е детето. Местата в теста са ограничени.'),
                ('Мога ли да пробвам без код?', 'Да. Безплатният план е отворен за всички: „Бързо сметни“, първите мисии от всеки клас, задачи в „Тренировка“, онлайн тестове и работни листове.'),
                ('Имам код. Какво правя?', 'Влезте в акаунта си (или си направете безплатен) и въведете кода по-долу. Кодът се въвежда само веднъж.'),
                ('Кога ще има абонаменти?', 'След края на теста. Ако искате да ви уведомим, пишете ни на <a href="mailto:info@smetko.com">info@smetko.com</a>.')]
    pricing = head('Абонаменти – очаквайте скоро | Сметко', 'Абонаментите за Сметко – математика като игра за 1.–4. клас – очаквайте скоро. Сега тече затворен тест: пълният достъп е с код за достъп, безплатният план е отворен за всички.',
                   'pricing.html', [crumbs([('Начало', ''), ('Абонаменти', 'pricing.html')]), faq_ld(FAQ_SOON)]) + header('pricing') + page_hero(
        'Абонаменти', 'Очаквайте скоро! Сега Сметко е в затворен тест – пълният достъп е само с код за достъп.', 'Абонаменти', 'happy',
        '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#activate">🔑 Имам код</a><a class="btn btn-white" href="game.html">🎮 Безплатен план</a></div>') + f'''
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="soon-band soon-big">
      <div class="owl" data-owl="cheer"></div>
      <div><span class="eyebrow">Затворен тест</span><h2>Абонаментите идват скоро</h2>
      <p>Сега тестваме Сметко със затворена група родители, учители и училища, за да предложим планове, които наистина помагат. Пълният достъп е само за участниците с код за достъп от нас. Безплатният план остава отворен за всички: „Бързо сметни“, първите мисии от всеки клас, „Тренировка“, онлайн тестове и работни листове.</p>
      <div class="hero-cta"><a class="btn btn-white" href="mailto:info@smetko.com?subject=Затворен%20тест">✉️ Искам да участвам</a><a class="btn btn-white" href="anketa.html">📝 Анкета за участниците</a></div></div>
    </div>
  </div>
</section>
{act}
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(FAQ_SOON)}</div></section>
</main>
''' + FOOTER + scripts()
    write('pricing.html', pricing)

# ================= about.html =================
about = head('За родители и учители – Сметко', 'Как Сметко помага на децата да обикнат математиката. Информация за родители и начални учители: безопасност, употреба в час и за домашна работа.',
             'about.html', [crumbs([('Начало', ''), ('За Сметко', 'about.html')])]) + header('parents') + page_hero(
    'За Сметко', 'Сметко е бухал с очила и голямо сърце за числата. Мисията му е всяко дете в начален етап да смята уверено и с удоволствие.', 'За Сметко') + '''
<main id="main">
<section class="section">
  <div class="wrap prose">
    <h2>Защо Сметко?</h2>
    <p>Математиката в 1.–4. клас се гради като кула: ако таблицата за умножение или преминаването през десетицата не са затвърдени, всичко след тях става по-трудно. А затвърждаването става с упражнение – много и редовно упражнение.</p>
    <p>Сметко превръща упражнението в игра. Задачите се генерират по темите на учебната програма на МОН, а мисиите следват уроците в учебника, по който учи детето. Затова то упражнява точно това, което учат в клас в момента.</p>
  </div>
</section>
<section class="section soft" id="roditeli">
  <div class="wrap prose">
    <span class="eyebrow">За родители</span>
    <h2>Как да използвате Сметко у дома</h2>
    <ul>
      <li><b>Изберете учебника на детето.</b> В „Приключение“ мисиите носят заглавията на уроците от неговия учебник.</li>
      <li><b>По малко, но всеки ден.</b> 10–15 минути дневно дават повече от един дълъг час седмично.</li>
      <li><b>Насочете „Тренировка“ към трудната тема.</b> Без часовник и без стрес.</li>
      <li><b>Похвалете усилието, не само резултата.</b> Сметко окуражава при грешка и показва правилния отговор.</li>
    </ul>
    <h3>Безопасност и поверителност</h3>
    <ul>
      <li>Няма реклами и рекламно проследяване; статистика – само със съгласие.</li>
      <li>Децата не въвеждат имейл. Родителят прави профил с име или прякор, а учителят – потребител за всеки ученик (без фамилия).</li>
      <li>В класациите се виждат само име, клас и училище, и то само от абонати. Подробно: <a href="privacy-policy.html">Политика за поверителност</a>.</li>
    </ul>
  </div>
</section>
<section class="section" id="uchiteli">
  <div class="wrap prose">
    <span class="eyebrow">За учители</span>
    <h2>Сметко в класната стая</h2>
    <ul>
      <li><b>Загрявка в началото на часа.</b> „Бързо сметни“ на интерактивната дъска – целият клас решава заедно 60 секунди.</li>
      <li><b>Домашна работа с един линк.</b> Генерирайте линк към тема или мисия от <a href="uchilishta.html#domashna">страницата за училища</a>.</li>
      <li><b>Работни листове.</b> <a href="rabotni-listove.html">Генерирайте задачи за печат</a> по тема, с отговори за учителя.</li>
      <li><b>По вашия учебник.</b> Мисиите следват уроците в учебника, по който работи класът.</li>
      <li><b>„Табло“ за учителя.</b> Ученици с име и парола, домашни със срок, отчет по теми и класация на класа – на <a href="tablo.html">smetko.com/tablo</a>.</li>
    </ul>
    <p><a class="btn btn-blue" href="uchilishta.html">Сметко за училища</a></p>
  </div>
</section>
<section class="section soft" id="kontakt">
  <div class="wrap prose" style="text-align:center">
    <h2>Контакт</h2>
    <p>Въпроси, идеи, открита грешка в задача? Пишете ни – четем всяко писмо.</p>
    <p><a class="btn" href="mailto:info@smetko.com">info@smetko.com</a></p>
  </div>
</section>
</main>
''' + FOOTER + scripts()
write('about.html', about)

# ================= achievements.html =================
ach = head('Постижения, значки и класации – Сметко', 'Точки, нива, 51 значки и рекорди в Сметко – математическата игра за 1.–4. клас. Вижте своя напредък и класацията на класа.', 'achievements.html') + header('ach') + page_hero(
    'Постижения и класации', '<span id="rank-line">Ниво 1: Новак</span>', 'Постижения', 'cheer',
    '<div style="max-width:420px"><div class="rank-bar"><i id="rank-bar" style="width:0"></i></div><p class="rank-next" id="rank-next"></p></div>') + '''
<main id="main">
<section class="section"><div class="wrap"><div class="stat-row" id="stats"></div></div></section>
<section class="section wd-sec"><div class="wrap"><div class="wd-panel panel"><div class="wd-me-big" data-owl="cheer"></div><div><h2>👕 Гардеробът на Сметко</h2><p>Шапки, корона, наметало на герой… Отключват се със звездите от мисиите и със задачата на деня. По празници има и специални предмети!</p>
  <p class="wd-prog" id="wd-prog"></p><button class="btn btn-purple" type="button" data-wardrobe>Облечи Сметко <b class="dt-new" data-wardrobe-new hidden></b></button></div></div></div></section>
<section class="section soft"><div class="wrap"><div class="section-head"><h2 class="lined">Значки</h2><p id="badge-count"></p></div><div id="badges" class="badge-groups"></div></div></section>
<section class="section" id="myclass-sec" hidden><div class="wrap"><div class="section-head"><h2 class="lined">Моят клас</h2><p id="myclass-sub"></p></div><div id="myclass"></div></div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2 class="lined">Звезди и рекорди</h2><p>Звезди от „Приключение“ и най-добри резултати в „Бързо сметни“.</p></div><div class="grid grid-4" id="grades"></div></div></section>
<section class="section soft">
  <div class="wrap prose" style="text-align:center">
    <h2>Класации</h2>
    <p>''' + ('С абонамент' if SALES_OPEN else 'С код за достъп') + ''' резултатите ти влизат в класацията на класа и в <a href="liga.html">общата класация</a> – срещу ученици, класове и училища от цялата страна. Всяка седмица започва нова битка!</p>
    <p><a class="btn btn-lg" href="liga.html">🏆 Обща класация</a> <a class="btn btn-lg btn-white" href="game.html?mode=quick&amp;start=0">⚡ Побий рекорда</a></p>
    <p class="small-note">Прогресът се пази на това устройство. <button class="btn btn-sm btn-ghost" id="reset-btn">Изтрий прогреса</button></p>
    <p class="small-note"><a href="profil.html">👨‍👩‍👧 Отчет за родителя</a> · <a href="tablo.html">📋 Табло за учителя</a></p>
  </div>
</section>
</main>
''' + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/tools.js', 'js/wardrobe.js', 'js/achievements.js'])
write('achievements.html', ach)

# ================= uchilishta.html (училища) =================
school = head('Сметко за училища – Табло за учителя, домашни, класации', 'Сметко за начални учители: абонамент за целия клас, Табло с ученици, домашни със срок, отчет по теми, класации и работни листове.',
              'uchilishta.html', [crumbs([('Начало', ''), ('За училища', 'uchilishta.html')])]) + header() + page_hero(
    'Сметко за училища', 'Абонамент за целия клас, „Табло“ за учителя, домашни със срок и работни листове – по учебника, по който работите.', 'За училища', 'hero',
    '<div class="hero-cta"><a class="btn btn-lg" href="tablo.html">📋 Табло</a><a class="btn btn-white" href="' + ('pricing.html#plans">Абонамент за клас' if SALES_OPEN else 'mailto:info@smetko.com?subject=Пилотен%20проект">✉️ Пилотен проект') + '</a></div>') + """
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Как работи</h2></div>
    <div class="grid grid-4 steps-num">
      <div class="card"><b class="n">1</b><h3>Абонамент за клас</h3><p>Поръчвате от <a href="pricing.html#plans">„Абонаменти“</a> и получавате <b>един код</b> по имейл. Активирате го веднъж в акаунта си.</p></div>
      <div class="card"><b class="n">2</b><h3>Пишете имената</h3><p>В <a href="tablo.html">„Табло“</a> поставяте списъка с ученици. Всеки получава <b>потребител и парола</b> – отпечатвате картите с един бутон.</p></div>
      <div class="card"><b class="n">3</b><h3>Децата влизат и играят</h3><p>От smetko.com → „Вход“ → „Ученик“. Прогресът им се пази – продължават от училищния таблет и от телефона у дома.</p></div>
      <div class="card"><b class="n">4</b><h3>Вие виждате всичко</h3><p>Кой е играл, точност, слаби теми, домашни със срок и класация на класа. Забравена парола? Нова с едно натискане.</p></div>
    </div>
    <div class="panel liga-promo"><div><h3>🏆 Обща класация между училищата</h3><p>Класовете и училищата се състезават всяка седмица и през цялата година – честно, по <b>точки на ученик</b>. Учителите имат своя класация, а децата виждат на кое място са сред всички ученици. <a href="liga.html">Виж класацията →</a></p></div></div>
    <div class="callout" style="margin-top:24px">Учениците <b>не въвеждат имейл или фамилия</b> – учителят пише само име и първа буква на фамилията. В класациите се виждат само от абонати. Подробно: <a href="privacy-policy.html">Политика за поверителност</a>.</div>
  </div>
</section>
<section class="section soft" id="domashna">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Линк за домашна работа</h2><p>Изберете клас, игра и тема или учебник – копирайте линка и го пратете на родителите (например в Школо).</p></div>
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Клас<select id="hw-grade" class="select"><option value="1">1. клас</option><option value="2">2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
        <label>Игра<select id="hw-mode" class="select"><option value="practice">Тренировка по тема</option><option value="adventure">Приключение (мисии по учебник)</option><option value="quick">Бързо сметни (60 сек.)</option></select></label>
        <label id="hw-topic-l">Тема<select id="hw-topic" class="select"></select></label>
        <label id="hw-book-l" hidden>Учебник<select id="hw-book" class="select"></select></label>
      </div>
      <div class="hw-out"><input id="hw-link" class="input" readonly aria-label="Линк"><button class="btn btn-sm" id="hw-copy">Копирай</button><a class="btn btn-sm btn-ghost" id="hw-open" target="_blank" rel="noopener">Отвори</a></div>
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Работни листове</h2><p>Задачи за печат по всяка тема от програмата, с отговори за учителя.</p></div>
    <p style="text-align:center"><a class="btn btn-lg btn-green" href="rabotni-listove.html">🖨️ Създай работен лист</a></p>
  </div>
</section>
<section class="section soft" id="dokumenti">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Документи за училището</h2><p>Образци, готови за печат. Преди подписване ги прегледайте с длъжностното лице по защита на данните на училището.</p></div>
    <div class="grid grid-3 docs-list">
      <a class="card doc-card" href="dogovor-uchilishte.html"><b>📄 Договор за достъп за училище</b><small>Кодове за класовете, срок, цена, данни</small></a>
      <a class="card doc-card" href="pismo-roditeli.html"><b>✉️ Информационно писмо до родителите</b><small>С декларация за информираност</small></a>
      <a class="card doc-card" href="dogovor-danni.html"><b>🔒 Договор за обработване на лични данни</b><small>По чл. 28 от GDPR</small></a>
      <a class="card doc-card" href="privacy-policy.html"><b>🛡️ Политика за поверителност</b><small>Какви данни обработваме</small></a>
      <a class="card doc-card" href="terms.html"><b>📘 Общи условия</b><small>Правила, абонаменти, акаунти</small></a>
      <a class="card doc-card" href="pravna-informacia.html"><b>📚 Всички документи</b><small>Правна информация на едно място</small></a>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/tools.js'])
if not SALES_OPEN:
    school = school.replace('<h3>Абонамент за клас</h3><p>Поръчвате от <a href="pricing.html#plans">„Абонаменти“</a> и получавате <b>един код</b> по имейл. Активирате го веднъж в акаунта си.</p>',
                            '<h3>Код за класа</h3><p>Абонаментите – <b>очаквайте скоро</b>. Сега подбираме училища за пилотния проект: <a href="mailto:info@smetko.com?subject=Пилотен%20проект">пишете ни</a> и ще получите код за класа. Активирате го веднъж в <a href="pricing.html#activate">„Абонаменти“</a>.</p>')
write('uchilishta.html', school)

# ================= kod.html, klasaciya.html, otchet.html → пренасочване (стари връзки) =================
def redirect_page(name, to, title):
    html = head(title + ' – Сметко', title, name, noindex=True).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="refresh" content="0; url=' + to + '">') + header() + \
        '<main id="main"><section class="section"><div class="wrap" style="text-align:center"><p class="lead-dark">Страницата е преместена. <a href="' + to + '">Продължете тук →</a></p></div></section></main><script>location.replace("' + to + '")</script>' + FOOTER + scripts()
    write(name, html)
redirect_page('kod.html', 'pricing.html#activate', 'Активиране на абонамент')
redirect_page('klasaciya.html', 'tablo.html', 'Табло за учителя')
for g in range(1, 5):
    redirect_page(f'class-{g}.html', f'matematika-{g}-klas.html', f'Математика {g}. клас')

# ================= liga.html (общи класации) =================
LIGA_FAQ = [
    ('Как се класират училищата и класовете?', 'По <b>точки на ученик</b>: всички точки на учениците се делят на броя ученици в класа. Така малък клас, в който играят всички, може да изпревари голям клас. Училище влиза в класацията с поне 5 ученици с код, а клас – с поне 3.'),
    ('Кои точки се броят?', 'Само спечелените, откакто ученикът е в класа или детето – в абонамента. „Тази седмица“ започва отначало всеки понеделник, а „Цялата година“ брои точките от 15 септември до 30 юни.'),
    ('Може ли някой да си „напише“ точки?', 'Сървърът проверява дали точките растат правдоподобно: до 35 точки за верен отговор и не повече от един верен отговор в секунда. Необичайни резултати не влизат в класацията.'),
    ('Кой вижда прякора на детето?', 'Всички класации се виждат само от абонати – деца, родители и учители с активен абонамент (индивидуален, семеен или за клас). Показват се прякор (без фамилия), клас и училище. Учителят може да скрие ученик или да изключи целия клас от общата класация.'),
    ('Как да включа класа си?', 'С абонамент за клас: в <a href="tablo.html">„Табло“ → „Настройки“</a> впишете класа и училището и оставете отметката „участва в общата класация“.'),
]
liga_pg = head('Обща класация – училища, класове и ученици | Сметко', 'Седмична и годишна класация на училищата, класовете, учителите и учениците, които играят Сметко.', 'liga.html',
               [crumbs([('Начало', ''), ('Обща класация', 'liga.html')]), faq_ld(LIGA_FAQ)], 'liga-page') + header('ach') + page_hero(
    'Обща класация', 'Училища, класове, учители и ученици от цялата страна – ' + ('за всички с абонамент' if SALES_OPEN else 'за участниците в затворения тест') + '. Всяка седмица започва нова битка!', 'Обща класация', 'cheer',
    '<div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Играй и печели точки</a><a class="btn btn-white" href="achievements.html#myclass-sec">Моят клас</a></div>') + """
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="liga-controls panel">
      <div class="liga-tabs" role="tablist" aria-label="Класация">
        <button role="tab" data-scope="schools" aria-selected="true">🏫 <span>Училища</span></button>
        <button role="tab" data-scope="classes" aria-selected="false">🎒 <span>Класове</span></button>
        <button role="tab" data-scope="teachers" aria-selected="false">🧑‍🏫 <span>Учители</span></button>
        <button role="tab" data-scope="students" aria-selected="false">⭐ <span>Ученици</span></button>
        <button role="tab" data-scope="challenge" aria-selected="false">🥇 <span>Седмица</span></button>
      </div>
      <div class="liga-filters">
        <div class="seg" role="group" aria-label="Период"><button data-period="week" aria-pressed="true">Тази седмица</button><button data-period="all" aria-pressed="false">Цялата година</button></div>
        <label class="liga-grade">Клас <select id="liga-grade"><option value="0">Всички</option><option value="1">1. клас</option><option value="2">2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
      </div>
    </div>
    <div id="liga-mine"></div>
    <div id="liga-out" aria-live="polite"><p class="lead-dark" style="text-align:center">Зареждам класацията…</p></div>
  </div>
</section>
<section class="section soft"><div class="wrap">
  <div class="section-head"><h2 class="lined">Правила</h2></div>
""" + faq(LIGA_FAQ) + """
</div></section>
</main>
""" + FOOTER + scripts(['js/challenge.js', 'js/league.js'])
write('liga.html', liga_pg)

# ================= novini.html (новини) =================
news_pg = head('Новини – Сметко, математика като игра за 1.–4. клас', 'Новини от Сметко: нови мисии и учебници, седмични предизвикателства, класации, промоции и подобрения в играта по математика за 1.–4. клас.', 'novini.html', [crumbs([('Начало', ''), ('Новини', 'novini.html')])], 'news-page') + header('news') + page_hero(
    'Новини', 'Какво ново има в Сметко – мисии, предизвикателства, класации и подаръци.', 'Новини', 'cheer') + """
<main id="main">
<section class="section"><div class="wrap"><div class="news-list" id="news-list"><p class="lead-dark" style="text-align:center">Зареждам новините…</p></div></div></section>
</main>
""" + FOOTER + scripts()
write('novini.html', news_pg)

# ================= otchet.html (отчет за родителя) =================
rep_pg = head('Отчет за родителя – Сметко', 'Отчет за напредъка на детето в Сметко: активност, точност, силни теми и теми за упражнение.', 'otchet.html', [crumbs([('Начало', ''), ('Отчет за родителя', 'otchet.html')])], 'report-page') + header() + page_hero(
    'Отчет за родителя', 'Колко играе детето, колко точно смята, в кои теми е силно и какво да упражните заедно.', 'Отчет за родителя', 'think') + """
<main id="main">
<section class="section"><div class="wrap">
  <div class="panel rp-acct"><div><b>👨‍👩‍👧 Отчетите на всички деца – в профила ви</b><p class="hint">Влезте в акаунта си – там е отчетът за всяко дете, от всяко устройство.</p></div><a class="btn" href="profil.html">Моят профил</a></div>
  <h2 class="lined" style="margin-top:26px">📱 На това устройство</h2>
  <div id="rp-local"></div>
  <p class="doc-actions" style="text-align:center"><button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ Печат / PDF</button></p>
</div></section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/report.js', 'js/diploma.js', 'js/tools.js'])
write('otchet.html', rep_pg)


# ================= акаунти: вход, регистрация, забравена парола, моят профил =================
def pw_field(id_, ph, ac):
    return f'<div class="pw-wrap"><input id="{id_}" class="input" type="password" placeholder="{ph}" autocomplete="{ac}" required minlength="{8 if ac == "new-password" else 1}"><button type="button" class="pw-eye" data-pw="{id_}" aria-label="Покажи паролата">👁️</button></div>'

login_pg = head('Вход за родители, учители и ученици – Сметко', 'Вход в Сметко: родители и учители с имейл и парола, ученици – с потребител и парола от учителя.', 'vhod.html', [], 'acct-page-body') + header() + page_hero(
    'Вход', 'Родители и учители – с имейл. Ученици – с името и паролата от картата от учителя.', 'Вход', 'hello') + f"""
<main id="main">
<section class="section"><div class="wrap acct-wrap">
  <div class="panel acct-form-wrap">
    <div class="login-tabs" role="tablist"><button data-lt="adult" aria-selected="true">👤 Родител / учител</button><button data-lt="kid" aria-selected="false">🎒 Ученик</button></div>
    <form class="acct-form" id="login-form">
      <div class="g-auth" id="g-login" hidden><div class="g-btn"></div><p class="g-or"><span>или с имейл и парола</span></p></div>
      <label class="step-label" for="l-email">Имейл</label>
      <input id="l-email" class="input" type="email" autocomplete="email" inputmode="email" placeholder="ime@primer.bg" required>
      <label class="step-label" for="l-pass">Парола</label>
      {pw_field('l-pass', 'Вашата парола', 'current-password')}
      <p class="acct-forgot"><a href="zabravena-parola.html">Забравена парола?</a></p>
      <button class="btn btn-lg btn-green" type="submit">Влез</button>
      <p class="code-err" id="login-err" role="alert"></p>
      <p class="hint acct-alt">Нямате акаунт? <a href="registracia.html"><b>Регистрирайте се безплатно</b></a></p>
    </form>
    <form class="acct-form" id="kid-form" hidden autocomplete="off">
      <label class="step-label" for="k-user">Потребител</label>
      <input id="k-user" class="input kid-input" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="напр. ani47" required>
      <label class="step-label" for="k-pass">Парола</label>
      {pw_field('k-pass', 'напр. zaek42', 'current-password').replace('class="input"', 'class="input kid-input" autocapitalize="none" spellcheck="false"')}
      <button class="btn btn-lg btn-green" type="submit">Влез и играй</button>
      <p class="code-err" id="kid-err" role="alert"></p>
      <p class="hint acct-alt">Потребителят и паролата са на картата от учителя. Забравил си ги? Попитай учителя.</p>
      <p class="hint acct-alt">👪 <b>Родител сте?</b> Влезте в своя акаунт (раздел „Родител/учител“) и свържете детето в „Моят профил“ → „Ученици от клас“ – ще виждате отчета и домашните му.</p>
    </form>
  </div>
  <aside class="panel acct-side">
    <div class="owl" data-owl="cheer" style="width:110px"></div>
    <h2>Как се влиза?</h2>
    <p><b>👨‍👩‍👧 Родители</b> – с имейла и паролата си или с Google профила. Детето избира своя профил и продължава от всяко устройство.</p>
    <p><b>👩‍🏫 Учители</b> – с имейла и паролата си или с Google профила. Класът ви е в <a href="tablo.html">„Табло“</a>.</p>
    <p><b>🎒 Ученици от клас</b> – с потребителя и паролата от картата от учителя.</p>
    <hr>
    <p class="hint">Само ще пробвате? Безплатният план работи и без вход: <a href="game.html">Играй</a>.</p>
  </aside>
</div></section>
</main>
""" + FOOTER + scripts()
write('vhod.html', login_pg)

reg_pg = head('Регистрация – Сметко', 'Безплатна регистрация в Сметко за родители и учители: профили за децата, прогрес на всяко устройство, отчети и класове.', 'registracia.html', [], 'acct-page-body') + header() + page_hero(
    'Регистрация', 'Безплатна е и отнема 30 секунди. Абонаментът се активира с код в „Абонаменти“.', 'Регистрация', 'happy') + f"""
<main id="main">
<section class="section"><div class="wrap acct-wrap">
  <form class="panel acct-form" id="reg-form" novalidate>
    <h2>Създайте акаунт</h2>
    <p class="act-pending" id="reg-pending" hidden>🔑 След регистрацията ще активираме кода <b></b>.</p>
    <div class="role-pick" role="radiogroup" aria-label="Аз съм">
      <label><input type="radio" name="role" value="parent" checked><span><i>👨‍👩‍👧</i><b>Родител</b><small>Профили за децата и отчети</small></span></label>
      <label><input type="radio" name="role" value="teacher"><span><i>👩‍🏫</i><b>Учител</b><small>Табло: ученици, домашни</small></span></label>
    </div>
    <p class="act-pending g-pending" id="reg-g" hidden>✅ Продължавате с Google като <b></b>. Изберете дали сте родител или учител, отметнете съгласието и натиснете бутона. <button type="button" class="ck-link" id="reg-g-x">Друг начин</button></p>
    <div class="g-auth" id="g-reg" hidden><div class="g-btn"></div><p class="g-or"><span>или с имейл и парола</span></p></div>
    <label class="step-label" for="r-name">Вашето име</label>
    <input id="r-name" class="input" autocomplete="name" maxlength="60" placeholder="напр. Мария Иванова" required>
    <label class="step-label" for="r-email">Имейл</label>
    <input id="r-email" class="input" type="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="ime@primer.bg" required>
    <label class="step-label" for="r-pass">Парола <small>(поне 8 знака)</small></label>
    {pw_field('r-pass', 'Измислете парола', 'new-password')}
    <label class="check acct-terms"><input type="checkbox" id="r-terms" required><span>Приемам <a href="terms.html" target="_blank">Общите условия</a> и съм запознат(а) с <a href="privacy-policy.html" target="_blank">Политиката за поверителност</a>. Аз съм пълнолетен(на).</span></label>
    <button class="btn btn-lg btn-green" type="submit">Създай акаунт</button>
    <p class="code-err" id="reg-err" role="alert"></p>
    <p class="hint acct-alt">Вече имате акаунт? <a href="vhod.html"><b>Влезте</b></a></p>
  </form>
  <aside class="panel acct-side">
    <h2>Какво получавате</h2>
    <ul class="acct-benefits">
      <li><b>📱 Всяко устройство</b> Детето продължава от телефона, таблета или компютъра – звездите и точките не се губят.</li>
      <li><b>👧👦 До 4 деца</b> Отделен профил с име и картинка за всяко дете.</li>
      <li><b>🔑 Един код – веднъж</b> Кодът за абонамент се въвежда само веднъж, в „Абонаменти“.</li>
      <li><b>📊 Отчети</b> Силни теми и теми за упражнение по уроците.</li>
      <li><b>👩‍🏫 За учители</b> „Табло“: ученици с име и парола, домашни със срок, отчет по теми и класация.</li>
    </ul>
    <p class="hint">Децата не въвеждат имейл. Учениците от клас влизат с име и парола от учителя.</p>
  </aside>
</div></section>
</main>
""" + FOOTER + scripts(['js/tools.js'])
write('registracia.html', reg_pg)

fp_pg = head('Забравена парола – Сметко', 'Възстановяване на паролата за акаунт в Сметко.', 'zabravena-parola.html', [], 'acct-page-body', noindex=True) + header() + page_hero(
    'Забравена парола', 'Ще ви изпратим връзка за нова парола на имейла на акаунта.', 'Забравена парола', 'think') + f"""
<main id="main">
<section class="section"><div class="wrap acct-wrap one">
  <form class="panel acct-form" id="forgot-form">
    <h2>Нова парола</h2>
    <label class="step-label" for="f-email">Имейл на акаунта</label>
    <input id="f-email" class="input" type="email" autocomplete="email" inputmode="email" placeholder="ime@primer.bg" required>
    <button class="btn btn-lg" type="submit">Изпрати връзка</button>
    <p class="code-err" id="forgot-err" role="alert"></p>
    <p class="hint acct-alt"><a href="vhod.html">← Обратно към входа</a></p>
  </form>
  <form class="panel acct-form" id="reset-form" hidden>
    <h2>Задайте нова парола</h2>
    <label class="step-label" for="n-pass">Нова парола <small>(поне 8 знака)</small></label>
    {pw_field('n-pass', 'Нова парола', 'new-password')}
    <button class="btn btn-lg btn-green" type="submit">Запази и влез</button>
    <p class="code-err" id="reset-err" role="alert"></p>
  </form>
</div></section>
</main>
""" + FOOTER + scripts()
write('zabravena-parola.html', fp_pg)

prof_pg = head('Моят профил – Сметко', 'Детски профили, абонамент и отчети.', 'profil.html', [], 'acct-page-body', noindex=True) + header() + """
<main id="main">
<section class="section acct-main"><div class="wrap"><a class="survey-cta" href="anketa.html" data-survey-cta hidden><span aria-hidden="true">📝</span><span><b>Анкета за затворения тест</b><small>3 минути – помогнете ни да решим какво да подобрим и какви да са абонаментите.</small></span><em>Попълни</em></a><div id="acct-page"></div></div></section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/report.js', 'js/tools.js'])
write('profil.html', prof_pg)

tablo_pg = head('Табло – Сметко', 'Табло за учителя: ученици с име и парола, домашни, отчет по теми, класация и грамоти.', 'tablo.html', [], 'tablo-page', noindex=True) + header() + """
<main id="main">
<section class="section tb-main"><div class="wrap"><a class="survey-cta" href="anketa.html" data-survey-cta hidden><span aria-hidden="true">📝</span><span><b>Анкета за затворения тест</b><small>3 минути – помогнете ни да решим какво да подобрим и какви да са абонаментите.</small></span><em>Попълни</em></a><div id="tablo"></div></div></section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/report.js', 'js/diploma.js', 'js/tools.js', 'js/a11y.js', 'js/tablo.js'])
write('tablo.html', tablo_pg)

# ================= za-nas.html (за нас) =================
about_us = head('За нас – Сметко, математика като игра за 1.–4. клас', 'Кои сме и защо направихме Сметко – математика като игра за 1.–4. клас, по учебната програма на МОН и по учебника на детето.', 'za-nas.html',
                [crumbs([('Начало', ''), ('За нас', 'za-nas.html')]), ORG], 'about-us') + header('about') + page_hero(
    'За нас', 'Направихме Сметко, защото математиката в началното училище заслужава да бъде толкова интересна, колкото любимата игра.', 'За нас', 'hello') + """
<main id="main">
<section class="section"><div class="wrap prose about-story">
  <h2>Как започна всичко</h2>
  <p>Децата обичат да четат с приложения, да учат езици с игри, да се състезават с приятели. А математиката? Тя често остава „скучното домашно“. Ние вярваме, че това може да се промени – с кратки задачи, ясна цел и мъничко магия.</p>
  <p>Така се роди <b>Сметко</b> – мъдро бухалче, което води децата от 1. до 4. клас през мисии, точно по уроците от учебника им. Всяка задача е съобразена с учебната програма на МОН, а всяка мисия носи заглавието на урока, който децата учат в клас.</p>
  <h2>В какво вярваме</h2>
</div>
<div class="wrap"><div class="grid grid-4 values">
  <div class="card"><span class="v-ico">📚</span><h3>По учебника</h3><p>Мисиите следват уроците от учебника на детето – урок по урок, в същия ред.</p></div>
  <div class="card"><span class="v-ico">🛡️</span><h3>Безопасно</h3><p>Без реклами, без чат, без лични данни на децата. Само прякор – и то по желание.</p></div>
  <div class="card"><span class="v-ico">⏱️</span><h3>Кратко и редовно</h3><p>10–15 минути на ден са достатъчни. Серията дни и значките помагат навикът да остане.</p></div>
  <div class="card"><span class="v-ico">🤝</span><h3>Заедно с учителя</h3><p>Класации, отчети по теми и работни листове – помощник в час, а не заместител.</p></div>
</div></div>
<div class="wrap prose about-story">
  <h2>За кого е Сметко</h2>
  <p><b>За децата</b> – да смятат смело и да се радват на всеки успех. <b>За родителите</b> – да виждат напредъка и да знаят какво да упражнят заедно. <b>За учителите</b> – да имат лесен начин да мотивират целия клас и да виждат кои теми затрудняват учениците.</p>
  <h2>Числата зад Сметко</h2>
</div>
<div class="wrap"><div class="stat-row about-nums">
  <div class="stat"><b>1.–4.</b><span>клас</span></div><div class="stat"><b>100+</b><span>мисии за всеки учебник</span></div><div class="stat"><b>200+</b><span>вида задачи</span></div><div class="stat"><b>0</b><span>реклами</span></div>
</div></div>
<div class="wrap prose about-story">
  <h2>Пишете ни</h2>
  <p>Имате идея, въпрос или искате учебникът ви да бъде добавен? Ще се радваме да чуем от вас на <a href="mailto:info@smetko.com">info@smetko.com</a>. Четем всяко писмо.</p>
  <p class="about-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Опитай Сметко</a> <a class="btn btn-lg btn-white" href="blog/">✍️ Прочети блога</a></p>
</div></section>
</main>
""" + FOOTER + scripts()
write('za-nas.html', about_us)

# ================= gramota.html (грамоти за печат) =================
dipl_pg = head('Грамоти – Сметко', 'Грамоти за печат от Сметко.', 'gramota.html', [], 'dipl-page', noindex=True) + """
<div class="dipl-tools" id="dipl-tools">
  <div><b>🎓 Грамоти за печат</b><p>Може да поправите имената и подписите направо върху грамотата (докоснете текста). Печат: A4, хоризонтално, с фонови цветове, без полета.</p></div>
  <div class="dt-row" id="dipl-pick"><label>Кои грамоти <select id="dipl-which" class="select"><option value="all">Всички</option><option value="top">Само I, II и III място</option><option value="pick">Избрани от списъка</option></select></label><details><summary>Списък</summary><div id="dipl-list" class="dipl-list"></div></details></div>
  <button class="btn btn-lg" id="dipl-print">🖨️ Печат</button>
</div>
<main id="dipl-out"></main>
""" + scripts(['js/diploma.js'])
write('gramota.html', dipl_pg)

# ================= blog/_layout.html (шаблон за блога; попълва се от blog/index.php) =================
os.makedirs(os.path.join(OUT, 'blog'), exist_ok=True)
blog_layout = head('{{TITLE}}', '{{DESC}}', 'blog/', [], 'blog-page').replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">', 1)
blog_layout = blog_layout.replace('<link rel="canonical" href="https://smetko.com/blog/">', '<link rel="canonical" href="{{CANON}}">').replace('content="https://smetko.com/blog/"', 'content="{{CANON}}"').replace('</head>', '{{HEAD}}</head>', 1)
blog_layout += header('blog') + '<main id="main">{{BODY}}</main>\n' + FOOTER + scripts()
write('blog/_layout.html', blog_layout)

# ================= rabotni-listove.html =================
ws = head('Работни листове по математика 1.–4. клас – Сметко', 'Генератор на работни листове по математика за 1.–4. клас по темите на учебната програма, с отговори за учителя. Безплатно, за печат.',
          'rabotni-listove.html', [crumbs([('Начало', ''), ('Работни листове', 'rabotni-listove.html')])], 'ws-page') + header() + '''
<main id="main">
<section class="section ws-controls">
  <div class="wrap">
    <div class="breadcrumbs"><a href="index.html">Начало</a> › Работни листове</div>
    <h1>Работни листове</h1>
    <p class="lead-dark">Изберете клас и тема – Сметко генерира задачи за печат. Всеки път са нови.</p>
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Клас<select id="ws-grade" class="select"><option value="1">1. клас</option><option value="2">2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
        <label>Тема<select id="ws-topic" class="select"></select></label>
        <label>Трудност<select id="ws-level" class="select"><option value="1">Лесно</option><option value="2" selected>Средно</option><option value="3">Трудно</option></select></label>
        <label>Брой задачи<select id="ws-count" class="select"><option>12</option><option selected>20</option><option>30</option></select></label>
      </div>
      <div class="ws-actions"><label class="check"><input type="checkbox" id="ws-answers" checked> Страница с отговори</label><button class="btn btn-sm btn-ghost" id="ws-new">🔄 Нови задачи</button><button class="btn" id="ws-print">🖨️ Печат</button></div>
    </div>
  </div>
</section>
<section class="ws-sheet-wrap"><div class="ws-sheet" id="ws-sheet"></div><div class="ws-sheet ws-answers" id="ws-key"></div></section>
</main>
''' + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/tools.js'])
write('rabotni-listove.html', ws)

# ================= 404 =================
nf = head('Страницата не е намерена – Сметко', 'Страницата не е намерена.', '404.html', noindex=True).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">') + header() + page_hero(
    'Ох! 404', 'Сметко претърси навсякъде, но тази страница я няма. Може би е отлетяла?', '404', 'think',
    '<div class="hero-cta"><a class="btn btn-lg" href="index.html">Към началото</a><a class="btn btn-white" href="game.html">Играй</a></div>') + '<main id="main"></main>' + FOOTER + scripts()
write('404.html', nf)

legal.build()
subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin_names.js')], check=True)  # имена на мисии и задачи за админ → Активност
import survey  # noqa: анкета за затворения тест (anketa.html + api/survey_q.json)
import seo  # noqa: страници по теми, помагала, sitemap-pages.xml
print('ok')
