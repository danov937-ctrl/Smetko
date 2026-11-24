# -*- coding: utf-8 -*-
"""Генерира основните страници на smetko.com. Стартиране: python3 tools/build.py"""
import os, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_content import TOPICS  # noqa
from icons import ico  # noqa
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
    ('Безплатен ли е Сметко?', 'Да – <b>целият</b>, за неопределено време. Всички мисии по учебника, „Бързо сметни“, неограничена „Тренировка“, точките, значките, класациите, тестовете, работните листове, <a href="nvo-sbornik.html">сборникът за НВО</a> и отчетът за родителя са отворени за всички. Без абонамент, без код и без карта. <a href="pricing.html">Какво точно влиза</a>.' if FREE_MODE else ('Има безплатен план: „Бързо сметни“, първите <span data-cfg="freeMissions">3</span> мисии от всеки клас и <span data-cfg="freePractice">20</span> задачи на ден в „Тренировка“. Пълният достъп се отключва с код от учителя или с абонамент. Вижте <a href="pricing.html">цените</a>.' if SALES_OPEN else 'Има безплатен план за всички. Сега Сметко е в затворен тест – пълният достъп е само за участниците с код за достъп.')),
    ('Трябва ли ми код или регистрация?' if FREE_MODE else ('Как се активира абонамент?' if SALES_OPEN else 'Кога ще има абонаменти?'), 'Не. Може да играете направо, без нищо. Безплатният акаунт е полезен само защото пази напредъка на всички устройства и дава отчет на родителя. Код трябва единствено на учителите, които водят клас – пишете ни на <a href="mailto:info@smetko.com?subject=Клас%20в%20Сметко">info@smetko.com</a>.' if FREE_MODE else 'След поръчката получавате един код по имейл. Влезте в акаунта си и въведете кода в <a href="pricing.html#activate">„Абонаменти“</a> – веднъж.'),
    ('Трябва ли регистрация?', 'За да опитате – не: безплатният план работи веднага. За пълен достъп родителят или учителят прави безплатен акаунт. Децата не въвеждат имейл: родителят им прави профили, а учениците от клас влизат с име и парола от учителя.'),
    ('Има ли реклами?', 'Не. Сметко е чиста детска среда, без рекламни банери и без рекламно проследяване. Статистика за посещенията се събира само ако възрастният я приеме в банера за бисквитки.'),
    ('На какво устройство работи?', 'На телефон, таблет, компютър и интерактивна дъска, направо в браузъра. Може да се добави на началния екран като приложение и работи и без интернет.'),
    ('Как може училището ни да се включи?', 'Безплатно е и за училищата. Учителят ни пише на <a href="mailto:info@smetko.com?subject=Клас%20в%20Сметко">info@smetko.com</a>, получава код за класа си и в <a href="tablo.html">„Табло“</a> пише имената на учениците – всеки получава потребител и парола за печат. Вижте <a href="uchilishta.html">Сметко за училища</a>.' if FREE_MODE else 'Учителят поръчва абонамент за клас, активира кода в акаунта си и в <a href="tablo.html">„Табло“</a> пише имената на учениците. Вижте <a href="uchilishta.html">Сметко за училища</a>.'),
]


def class_cards():
    out = ''
    for g, d in GRADES.items():
        lis = ''.join(f'<li>{t}</li>' for t in d['short'])
        out += f'''<article class="card class-card {d['c']}"><div class="cc-num">{g}</div><h3>{g}. клас</h3><ul>{lis}</ul>
<div class="cc-actions"><a class="btn btn-sm" href="game.html?grade={g}&amp;mode=adventure">Играй</a><a class="btn btn-sm btn-ghost" href="matematika-{g}-klas.html">Теми</a></div></article>'''
    return out


# ================= index.html =================
PRICES_HOME = '''<section class="section soft">
  <div class="wrap">
    <div class="soon-band free-band">
      <div class="owl" data-owl="cheer"></div>
      <div><span class="eyebrow">Без абонамент</span><h2>Сметко е безплатен – целият</h2>
      <p>Всички мисии по учебника, неограничена тренировка, класациите, тестовете, работните листове и отчетът
      за родителя са отворени за всяко дете и за всяко училище. Без код, без карта, <b>за неопределено време</b>.</p>
      <div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Започни сега</a><a class="btn btn-white" href="pricing.html">Какво влиза</a></div></div>
    </div>
  </div>
</section>''' if FREE_MODE else ('<section class="section soft">\n  <div class="wrap">\n    <div class="section-head"><h2 class="lined">Честни цени</h2><p>Безплатен план за всички. Пълен достъп с абонамент – за детето или за целия клас.</p></div>\n    <div class="plans three">\n      <div class="plan"><h3><span class="plan-ico">🦉</span> <span data-plan="single">Бухалче</span><small class="plan-kind">Индивидуален</small></h3><div class="who">1 дете + отчет за родителя</div><div class="price"><span data-price="single12">18</span> € <small>/ 1 година</small></div><div class="per">или <span data-price="single6">10</span> € за 6 месеца</div><ul><li>Всички мисии по учебника</li><li>Неограничена тренировка</li><li>Отчет за родителя</li></ul><a class="btn btn-white" href="pricing.html">Детайли</a></div>\n      <div class="plan featured"><span class="ribbon">Най-изгоден</span><h3><span class="plan-ico">🏡</span> <span data-plan="family">Гнездо</span><small class="plan-kind">Семеен</small></h3><div class="who">До 4 деца + родител</div><div class="price"><span data-price="family12">30</span> € <small>/ 1 година</small></div><div class="per">или <span data-price="family6">18</span> € за 6 месеца</div><ul><li>Отделен код за всяко дете</li><li>Отчет за всяко дете</li><li>Подходящ за подарък</li></ul><a class="btn" href="pricing.html">Детайли</a></div>\n      <div class="plan"><h3><span class="plan-ico">🐦</span> <span data-plan="class">Ято</span><small class="plan-kind">Цял клас</small></h3><div class="who">30 ученици + 1 + 2 учители</div><div class="price"><span data-price="class12">80</span> € <small>/ 1 година</small></div><div class="per">или <span data-price="class6">45</span> € за 6 месеца</div><ul><li>Класация на класа</li><li>Отчет по теми за учителя</li><li>Фактура</li></ul><a class="btn btn-white" href="pricing.html">Детайли</a></div>\n    </div>\n  </div>\n</section>' if SALES_OPEN else '<section class="section soft">\n  <div class="wrap">\n    <div class="soon-band">\n      <div class="owl" data-owl="happy"></div>\n      <div><span class="eyebrow">Затворен тест</span><h2>Абонаментите – очаквайте скоро</h2>\n      <p>Сега тестваме Сметко със затворена група родители, учители и училища. Пълният достъп е само с код за достъп от нас, а безплатният план е отворен за всички.</p>\n      <div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Безплатен план</a><a class="btn btn-white" href="pricing.html#activate">🔑 Имам код</a><a class="btn btn-white" href="mailto:info@smetko.com?subject=Затворен%20тест">✉️ Искам да участвам</a></div></div>\n    </div>\n  </div>\n</section>')

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
    <div class="section-head"><h2 class="lined">Три начина да играеш</h2><p>Приключението следва учебника и е мястото, от което се започва. Другите два са за между другото – за състезание със себе си и за спокойно упражнение.</p></div>
    <div class="mode-split">
      <article class="card mode-card adv"><div class="mode-ico">{ico('map')}</div><h3>Приключение</h3><p>Основният начин: мисии по пътеката към върха, подредени като уроците в учебника – по една за всеки урок. До 3 звезди на мисия и ново ниво, когато стигнеш догоре.</p><a class="btn btn-green" href="game.html?mode=adventure&amp;start=0">Започни приключението</a></article>
      <article class="card mode-card quick"><div class="mode-ico">{ico('bolt')}</div><h3>Бързо сметни</h3><p>60 секунди, колкото можеш повече задачи. Бонус за бързина и рекорд за побиване.</p><a class="btn btn-sm" href="game.html?mode=quick&amp;start=0">Играй</a></article>
      <article class="card mode-card prac"><div class="mode-ico">{ico('leaf')}</div><h3>Тренировка</h3><p>Без часовник и без стрес. При грешка Сметко показва правилното решение.</p><a class="btn btn-sm btn-purple" href="game.html?mode=practice&amp;start=0">Играй</a></article>
    </div>
  </div>
</section>

<section class="section soft" id="klasove">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Задачи за всеки клас</h2><p>Темите и редът им следват учебните програми на МОН по математика.</p></div>
    <div class="grid grid-4">{class_cards()}</div>
  </div>
</section>

<section class="section nvo-home"><div class="wrap">
  <div class="nvo-hero" data-nvo-when>
    <div class="nvo-hero-l">
      <span class="eyebrow">Национално външно оценяване · 4. клас</span>
      <h2>Остават <b data-nvo-days>—</b> дни до НВО по математика</h2>
      <p>Изпитът е на <b data-nvo-date>4 юни 2027 г.</b>: 25 задачи, 60 минути, 100 точки. Всичко за подготовката –
      форматът по модела на МОН, пробни тестове с часовник и сборник за печат с 32 теста – е събрано на едно място и е безплатно.</p>
      <div class="hero-cta">
        <a class="btn btn-lg btn-green" href="nvo-4-klas-matematika.html">🎯 Към подготовката за НВО</a>
        <a class="btn btn-white" href="nvo-sbornik.html">📘 Сборник: 32 теста</a>
      </div>
    </div>
    <div class="nvo-hero-r">
      <a href="nvo-4-klas-probni-testove.html"><b>⏱️</b><span>Пробни тестове</span><small>3 варианта с часовник</small></a>
      <a href="nvo-sbornik.html"><b>📘</b><span>Сборник за печат</span><small>32 теста, 564 задачи</small></a>
      <a href="podgotovka-nvo-3-klas.html"><b>🌱</b><span>Подготовка от 3. клас</span><small>В 3. клас НВО няма</small></a>
      <a href="nvo-4-klas-priem-5-klas.html"><b>🏫</b><span>Приемът в 5. клас</span><small>Кога има значение</small></a>
    </div>
  </div>
</div></section>

<section class="section" id="pomagala">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Безплатни помагала</h2><p>Онлайн тестове с автоматична проверка, таблици и подготовка за НВО – без регистрация.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="testove-po-matematika.html" style="--c:#2F80ED"><span>{ico('pencil')}</span><b>Тестове по математика</b><small>За всяка тема от 1. до 4. клас</small></a>
      <a class="hub-card" href="tablica-za-umnozhenie.html" style="--c:#FF5A5F"><span>{ico('grid')}</span><b>Таблица за умножение</b><small>За печат, трикове и тест</small></a>
      <a class="hub-card" href="nvo-4-klas-matematika.html" style="--c:#8E6CF0"><span>{ico('board')}</span><b>НВО 4. клас</b><small>Форматът и тренировъчен тест</small></a>
      <a class="hub-card" href="nvo-4-klas-probni-testove.html" style="--c:#4CBB4A"><span>{ico('clock')}</span><b>Пробни тестове за НВО</b><small>3 варианта, 25 задачи, 60 мин.</small></a>
      <a class="hub-card" href="nvo-sbornik.html" style="--c:#8E6CF0"><span>{ico('book')}</span><b>Сборник за НВО</b><small>32 теста за печат – безплатен PDF</small></a>
      <a class="hub-card" href="vhodno-nivo-matematika.html" style="--c:#FF9F1C"><span>{ico('seed')}</span><b>Входно ниво</b><small>Тестове за 1.–4. клас</small></a>
      <a class="hub-card" href="rimski-cifri.html" style="--c:#19B5A5"><span>Ⅻ</span><b>Римски цифри</b><small>Таблица и преобразувател</small></a>
      <a class="hub-card" href="merni-edinici.html" style="--c:#4CBB4A"><span>{ico('ruler')}</span><b>Мерни единици</b><small>Дължина, маса, време, лице</small></a>
      <a class="hub-card" href="koleden-kalendar.html" style="--c:#E0452F"><span>{ico('star')}</span><b>Коледен календар</b><small>24 задачи за декември, с печат</small></a>
      <a class="hub-card" href="zadachi-na-daskata.html" style="--c:#2F80ED"><span>{ico('board')}</span><b>Задачи на дъската</b><small>За час – на цял екран, с отговор</small></a>
      <a class="hub-card" href="chasovnik.html" style="--c:#19B5A5"><span>{ico('clock')}</span><b>Часовникът</b><small>Колко е часът – с подвижни стрелки</small></a>
      <a class="hub-card" href="tekstovi-zadachi.html" style="--c:#FF7A1A"><span>{ico('write')}</span><b>Текстови задачи</b><small>С подсказки стъпка по стъпка</small></a>
      <a class="hub-card" href="obikolka-i-lice.html" style="--c:#4CBB4A"><span>{ico('grid')}</span><b>Обиколка и лице</b><small>Правоъгълник, който се тегли</small></a>
      <a class="hub-card" href="geometria.html" style="--c:#E0452F"><span>{ico('ruler')}</span><b>Геометрия 1.–4. клас</b><small>Фигури, ъгли, тела – с тестове</small></a>
      <a class="hub-card" href="chislova-os.html" style="--c:#2F80ED"><span>{ico('chart')}</span><b>Числова ос</b><small>Мястото на числото, с пръст</small></a>
      <a class="hub-card" href="dvuboy.html" style="--c:#8E6CF0"><span>{ico('trophy')}</span><b>Двубой за двама</b><small>На едно устройство, с рундове</small></a>
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
      <span class="q-count" id="q-count" hidden></span>
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
def nvo_band(g):
    """Лента към раздела за НВО – само за 3. и 4. клас, където е по темата."""
    if g == 4:
        return '''<section class="section"><div class="wrap"><div class="nvo-band">
  <div class="owl" data-owl="cheer"></div>
  <div><span class="eyebrow">Национално външно оценяване</span><h2>НВО по математика в 4. клас</h2>
  <p>Изпитът е в началото на юни: 25 задачи, 60 минути, 100 точки. Вижте точния формат по модела на МОН, план за подготовка и пробни тестове с часовник.</p>
  <div class="hero-cta"><a class="btn btn-lg btn-green" href="nvo-4-klas-matematika.html">📋 Форматът на изпита</a><a class="btn btn-white" href="nvo-4-klas-probni-testove.html">⏱️ Пробни тестове</a></div></div>
</div></div></section>'''
    if g == 3:
        return '''<section class="section"><div class="wrap"><div class="nvo-band">
  <div class="owl" data-owl="happy"></div>
  <div><span class="eyebrow">Поглед напред</span><h2>В 3. клас няма НВО – но тази година го решава</h2>
  <p>Националното външно оценяване е в 4., 7. и 10. клас. Материалът от 3. клас обаче е основата на изпита догодина. Вижте какво наистина помага сега – по 10 минути на ден.</p>
  <div class="hero-cta"><a class="btn btn-lg btn-green" href="podgotovka-nvo-3-klas.html">🌱 Подготовка от 3. клас</a></div></div>
</div></div></section>'''
    return ''


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
{nvo_band(g)}
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
    ('Как се плаща?', 'Натиснете бутона под плана – отваря се защитената форма за плащане на Paddle (с карта, Apple Pay или Google Pay). Поръчките се обработват от нашия онлайн търговец Paddle.com, който е търговецът (Merchant of Record) и издава документа за покупката. Абонаментът се включва в акаунта ви веднага след плащането.'),
    ('Как работи абонаментът за клас?', 'Получавате един код. Активирате го в „Абонаменти“, а в <a href="tablo.html">„Табло“</a> пишете имената на учениците (до 30). Всеки получава потребител и парола за вход – картите се отпечатват с един бутон. Там са и домашните, отчетът по теми и класацията на класа.'),
    ('Има ли безплатен план?', 'Да. Безплатно са „Бързо сметни“ за всички класове, първите <span data-cfg="freeMissions">3</span> мисии от всеки клас, <span data-cfg="freePractice">20</span> задачи на ден в „Тренировка“ и работните листове. Точките, нивата, значките и класациите са с абонамент.'),
    ('Подновява ли се абонаментът автоматично?', 'Не. Абонаментът е за 6 месеца или 1 година и спира сам. Преди края ви напомняме, за да подновите навреме.'),
    ('Как плащат училищата?', 'С карта или по банков път срещу фактура, издадена от Paddle. За 3 или повече класа има <span data-price="disc3">15</span>% отстъпка, а за 8 или повече класа – <span data-price="disc8">25</span>%.'),
    ('Мога ли да си върна парите?', 'Да. В срок от 14 дни от покупката връщаме цялата сума, без да питаме защо – на <a href="https://paddle.net" rel="noopener">paddle.net</a> или с имейл до нас. Вижте <a href="vrashtane.html">Политиката за връщане на парите</a>.'),
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
        <ul><li>−<span data-price="disc3">15</span>% за 3 или повече класа</li><li>−<span data-price="disc8">25</span>% за 8 или повече класа</li><li>Фактура от Paddle, карта или банков превод</li><li>Картички и класация за всеки клас</li><li>Място в общата класация на училищата</li></ul><button class="btn btn-blue" data-subscribe="Цял клас" data-qty="3">Поръчай за няколко класа</button> <a class="btn btn-white" href="uchilishta.html" style="margin-top:8px">Сметко за училища</a></div>
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
if FREE_MODE:  # всичко е безплатно за всички: страницата обяснява режима, активирането остава за класовете
    import re as _re
    act = _re.search(r'<section class="section soft" id="activate">.*?</section>', pricing, _re.S).group(0)
    act = act.replace('<h2>Имате код за абонамент?</h2>', '<h2>Имате код за клас от учителя?</h2>')
    act = act.replace('aria-label="Код за абонамент"', 'aria-label="Код за клас"')
    act = _re.sub(r'<p class="hint act-note">.*?</p>',
                  '<p class="hint act-note">Код трябва само на учителите, които водят клас – с него в „Табло“ се създават учениците. За децата и родителите <b>код не е нужен</b>: всичко е отключено още с безплатната регистрация.</p>', act, flags=_re.S)
    FAQ_FREE = [
        ('Наистина ли всичко е безплатно?', 'Да. Всички мисии по учебника, „Бързо сметни“, неограничена „Тренировка“, точките, значките, гардеробът на Сметко, класациите, онлайн тестовете, работните листове, <a href="nvo-sbornik.html">сборникът за НВО</a> и отчетът за родителя са отворени за всички. Без код, без абонамент и без карта.'),
        ('За колко време?', 'За неопределено време. Няма краен срок и няма пробен период, който да изтече. Ако някога това се промени, ще го съобщим предварително в <a href="novini.html">Новини</a> и по имейл.'),
        ('Има ли нещо скрито – реклами, продажба на данни?', 'Не. В Сметко няма реклами и не продаваме данни. Събираме само това, което е нужно, за да работи играта – вижте <a href="privacy-policy.html">Политиката за поверителност</a>.'),
        ('Трябва ли ми регистрация?', 'Не е задължителна. Може да играете и без акаунт. С безплатен акаунт напредъкът се пази на всички устройства, а родителят получава отчет за детето.'),
        ('А за училища и класове?', 'Също безплатно. Учителят ни пише на <a href="mailto:info@smetko.com?subject=Клас%20в%20Сметко">info@smetko.com</a>, получава код за класа си и в <a href="tablo.html">„Табло“</a> създава учениците – всеки с име и парола за печат. Вижте <a href="uchilishta.html">Сметко за училища</a>.'),
        ('Защо е безплатно?', 'Защото в момента най-важното е Сметко да стигне до повече деца и да стане по-добър от обратната връзка. Ако някога има платени неща, те ще са допълнение, а не заключване на сегашното.'),
    ]
    pricing = head('Безплатно за всички | Сметко', 'Сметко е безплатен за неопределено време: всички мисии, тренировка, тестове, класации и отчети – без абонамент, без код и без карта. Безплатно и за училищата.',
                   'pricing.html', [crumbs([('Начало', ''), ('Безплатно', 'pricing.html')]), faq_ld(FAQ_FREE)]) + header('pricing') + page_hero(
        'Безплатно за всички', 'Целият Сметко е отворен – без абонамент, без код и без карта. За неопределено време.', 'Безплатно', 'cheer',
        '<div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Започни сега</a><a class="btn btn-white" href="registracia.html">Направи безплатен акаунт</a></div>') + f'''
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="soon-band soon-big free-band">
      <div class="owl" data-owl="cheer"></div>
      <div><span class="eyebrow">Без абонамент</span><h2>Всичко в Сметко е безплатно</h2>
      <p>Няма платен план, няма пробен период и няма заключени мисии. Всички задачи по учебната програма,
      класациите, отчетите и помагалата са отворени за всяко дете, за всеки родител и за всяко училище –
      <b>за неопределено време</b>.</p>
      <div class="hero-cta"><a class="btn btn-lg btn-green" href="game.html">🎮 Към мисиите</a><a class="btn btn-white" href="uchilishta.html">🏫 За училища</a></div></div>
    </div>
  </div>
</section>

<section class="section soft"><div class="wrap">
  <div class="section-head"><h2 class="lined">Какво влиза</h2><p>Тоест всичко. Списъкът е тук само за да се види колко е.</p></div>
  <div class="free-grid">
    <div class="free-card" style="--c:#2F80ED"><span>{ico('map')}</span><b>Всички мисии</b><p>По уроците от учебника на детето – над 110 мисии за всеки клас, от 1. до 4.</p></div>
    <div class="free-card" style="--c:#FF7A1A"><span>{ico('bolt')}</span><b>Бързо сметни и Тренировка</b><p>Без дневен лимит и без ограничение по теми.</p></div>
    <div class="free-card" style="--c:#E0A500"><span>{ico('star')}</span><b>Точки, значки и гардероб</b><p>Задача на деня, серии, сезонни събития и всички дрешки за Сметко.</p></div>
    <div class="free-card" style="--c:#FF5A5F"><span>{ico('trophy')}</span><b>Класации</b><p>Класация на класа и общата класация на училищата от цялата страна.</p></div>
    <div class="free-card" style="--c:#19B5A5"><span>{ico('chart')}</span><b>Отчет за родителя</b><p>Кои теми са сигурни и къде се запъва детето, плюс седмичен имейл.</p></div>
    <div class="free-card" style="--c:#8E6CF0"><span>{ico('board')}</span><b>Табло за учителя</b><p>Ученици, домашни с краен срок, отчет по теми и карти за вход за печат.</p></div>
    <div class="free-card"><span>{ico('pencil')}</span><b>Тестове и помагала</b><p>Онлайн тестове по теми, входно и изходно ниво, подготовка за НВО, работни листове.</p></div>
    <div class="free-card" style="--c:#8E6CF0"><span>{ico('book')}</span><b>Сборникът за НВО</b><p>32 теста и 564 задачи за печат, с ключ и критерии – <a href="nvo-sbornik.html">целият PDF</a>, без регистрация.</p></div>
    <div class="free-card" style="--c:#4CBB4A"><span>{ico('heart')}</span><b>Настройки за деца със СОП</b><p>Четене на глас, едър текст, по-малко задачи, спокойно темпо.</p></div>
  </div>
</div></section>

<section class="section"><div class="wrap narrow-wrap prose">
  <h2>Защо е безплатно</h2>
  <p>Сметко е направен, за да помага на децата да смятат уверено. В момента това става най-добре, ако стигне
  до колкото се може повече деца, класове и учители – и ако хората, които го ползват, ни казват какво липсва.
  Затова няма абонамент и няма заключени части.</p>
  <p>Няма реклами и не продаваме данни. Събираме само това, което е нужно, за да работи играта – какво точно,
  пише в <a href="privacy-policy.html">Политиката за поверителност</a>.</p>
  <p>Ако някога се появи нещо платено, то ще е <b>допълнение</b>, а не заключване на това, което днес е отворено,
  и ще го съобщим предварително.</p>
  <p class="center-note"><a class="btn btn-lg btn-green" href="game.html">🎮 Започни безплатно</a></p>
</div></section>

{act}
<section class="section soft"><div class="wrap"><div class="section-head"><h2 class="lined">Въпроси</h2></div>{faq(FAQ_FREE)}</div></section>
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
      <li><b>Загрявка в началото на часа.</b> <a href="zadachi-na-daskata.html">„Задачи на дъската“</a> – по една задача на цял екран, целият клас отговаря заедно. Или „Бързо сметни“ за 60 секунди със състезателен дух.</li>
      <li><b>Домашна работа с един линк.</b> Генерирайте линк към тема или мисия от <a href="uchilishta.html#domashna">страницата за училища</a>.</li>
      <li><b>Работни листове и контролни.</b> <a href="rabotni-listove.html">Генерирайте задачи за печат</a> по тема – или <a href="rabotni-listove.html?kind=test">контролна работа с два равностойни варианта А и Б</a>, с готов ключ за проверка.</li>
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
    <p>''' + ('Резултатите ти' if FREE_MODE else ('С абонамент резултатите ти' if SALES_OPEN else 'С код за достъп резултатите ти')) + ''' влизат в класацията на класа и в <a href="liga.html">общата класация</a> – срещу ученици, класове и училища от цялата страна. Всяка седмица започва нова битка!</p>
    <p><a class="btn btn-lg" href="liga.html">🏆 Обща класация</a> <a class="btn btn-lg btn-white" href="game.html?mode=quick&amp;start=0">⚡ Побий рекорда</a></p>
    <p class="small-note">Прогресът се пази на това устройство. <button class="btn btn-sm btn-ghost" id="reset-btn">Изтрий прогреса</button></p>
    <p class="small-note"><a href="profil.html">👨‍👩‍👧 Отчет за родителя</a> · <a href="tablo.html">📋 Табло за учителя</a></p>
  </div>
</section>
</main>
''' + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/tools.js', 'js/wardrobe.js', 'js/achievements.js'])
write('achievements.html', ach)

# ================= uchilishta.html (училища) =================
school = head('Сметко за училища – Табло за учителя, домашни, класации', 'Сметко за начални учители – безплатно за целия клас: Табло с ученици, домашни със срок, отчет по теми, класации и работни листове за печат.',
              'uchilishta.html', [crumbs([('Начало', ''), ('За училища', 'uchilishta.html')])]) + header() + page_hero(
    'Сметко за училища', 'Абонамент за целия клас, „Табло“ за учителя, домашни със срок и работни листове – по учебника, по който работите.', 'За училища', 'hero',
    '<div class="hero-cta"><a class="btn btn-lg" href="tablo.html">📋 Табло</a><a class="btn btn-white" href="' + ('mailto:info@smetko.com?subject=Клас%20в%20Сметко">✉️ Искам код за класа' if FREE_MODE else ('pricing.html#plans">Абонамент за клас' if SALES_OPEN else 'mailto:info@smetko.com?subject=Пилотен%20проект">✉️ Пилотен проект')) + '</a></div>') + """
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
    <p style="text-align:center"><a class="btn btn-lg btn-green" href="rabotni-listove.html">🖨️ Създай работен лист</a> <a class="btn btn-white" href="rabotni-listove.html?kind=test">📄 Контролно с 2 варианта</a></p>
    <div class="callout" style="margin-top:22px">🎄 <b>За декември:</b> <a href="koleden-kalendar.html">коледният календар</a> дава по една задача на ден от 1 до 24 декември – една и съща за целия клас, удобна за дъската. Има и лист с 24-те задачи за печат, с отговорите най-отзад.</div>
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
      <a class="card doc-card" href="terms.html"><b>📘 Общи условия</b><small>Правила за ползване и акаунти</small></a>
      <a class="card doc-card" href="pravna-informacia.html"><b>📚 Всички документи</b><small>Правна информация на едно място</small></a>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/textbooks.js', 'js/tools.js'])
if not SALES_OPEN:
    school = school.replace('<h3>Абонамент за клас</h3><p>Поръчвате от <a href="pricing.html#plans">„Абонаменти“</a> и получавате <b>един код</b> по имейл. Активирате го веднъж в акаунта си.</p>',
                            '<h3>Код за класа – безплатно</h3><p>Пишете ни на <a href="mailto:info@smetko.com?subject=Клас%20в%20Сметко">info@smetko.com</a> кое е училището и кой клас водите. Получавате <b>един код</b> по имейл и го активирате веднъж в акаунта си. Без плащане и без срок.</p>')
write('uchilishta.html', school)

# ================= kod.html, klasaciya.html, otchet.html → пренасочване (стари връзки) =================
def redirect_page(name, to, title):
    html = head(title + ' – Сметко', title, name, noindex=True).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="refresh" content="0; url=' + to + '">') + header() + \
        '<main id="main"><section class="section"><div class="wrap" style="text-align:center"><p class="lead-dark">Страницата е преместена. <a href="' + to + '">Продължете тук →</a></p></div></section></main><script>location.replace("' + to + '")</script>' + FOOTER + scripts()
    write(name, html)
redirect_page('kod.html', 'pricing.html#activate', 'Активиране на код за клас' if FREE_MODE else 'Активиране на абонамент')
redirect_page('klasaciya.html', 'tablo.html', 'Табло за учителя')
for g in range(1, 5):
    redirect_page(f'class-{g}.html', f'matematika-{g}-klas.html', f'Математика {g}. клас')

# ================= liga.html (общи класации) =================
LIGA_FAQ = [
    ('Как се класират училищата и класовете?', 'По <b>точки на ученик</b>: всички точки на учениците се делят на броя ученици в класа. Така малък клас, в който играят всички, може да изпревари голям клас. Училище влиза в класацията с поне 5 ученици с код, а клас – с поне 3.'),
    ('Кои точки се броят?', 'Само спечелените, откакто ученикът е в класа. „Тази седмица“ започва отначало всеки понеделник, а „Цялата година“ брои точките от 15 септември до 30 юни.'),
    ('Може ли някой да си „напише“ точки?', 'Сървърът проверява дали точките растат правдоподобно: до 35 точки за верен отговор и не повече от един верен отговор в секунда. Необичайни резултати не влизат в класацията.'),
    ('Кой вижда прякора на детето?', 'Класациите се виждат от всички потребители на Сметко. Показват се прякор (без фамилия), клас и училище. Учителят може да скрие ученик или да изключи целия клас от общата класация.'),
    ('Как да включа класа си?', 'Безплатно е: поискайте код за класа на <a href="mailto:info@smetko.com?subject=Клас%20в%20Сметко">info@smetko.com</a>, после в <a href="tablo.html">„Табло“ → „Настройки“</a> впишете класа и училището и оставете отметката „участва в общата класация“.'),
]
liga_pg = head('Обща класация – училища, класове и ученици | Сметко', 'Седмична и годишна класация на училищата, класовете, учителите и учениците, които играят Сметко.', 'liga.html',
               [crumbs([('Начало', ''), ('Обща класация', 'liga.html')]), faq_ld(LIGA_FAQ)], 'liga-page') + header('ach') + page_hero(
    'Обща класация', 'Училища, класове, учители и ученици от цялата страна – ' + ('за всички, безплатно' if FREE_MODE else ('за всички с абонамент' if SALES_OPEN else 'за участниците в затворения тест')) + '. Всяка седмица започва нова битка!', 'Обща класация', 'cheer',
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
      <li><b>🎁 Безплатно, без карта</b> Всичко в Сметко е отворено – регистрацията е само за да се пази прогресът.</li>
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
<section class="section acct-main"><div class="wrap"><a class="survey-cta" href="anketa.html" data-survey-cta hidden><span aria-hidden="true">📝</span><span><b>Анкета за Сметко</b><small>3 минути – помогнете ни да решим какво да подобрим.</small></span><em>Попълни</em></a><div id="acct-page"></div></div></section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/lesson-map.js', 'js/report.js', 'js/tools.js'])
write('profil.html', prof_pg)

tablo_pg = head('Табло – Сметко', 'Табло за учителя: ученици с име и парола, домашни, отчет по теми, класация и грамоти.', 'tablo.html', [], 'tablo-page', noindex=True) + header() + """
<main id="main">
<section class="section tb-main"><div class="wrap"><a class="survey-cta" href="anketa.html" data-survey-cta hidden><span aria-hidden="true">📝</span><span><b>Анкета за Сметко</b><small>3 минути – помогнете ни да решим какво да подобрим.</small></span><em>Попълни</em></a><div id="tablo"></div></div></section>
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
<style>@media print { @page { size: A4 landscape; margin: 0; } }</style>
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
# видът и картинката се сменят за всяка статия (blog/index.php ги попълва)
blog_layout = blog_layout.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="{{OGTYPE}}">')
blog_layout = blog_layout.replace('<meta property="og:image" content="https://smetko.com/assets/images/og-image.png">',
                                  '<meta property="og:image" content="{{OGIMG}}">')
blog_layout += header('blog') + '<main id="main">{{BODY}}</main>\n' + FOOTER + scripts()
write('blog/_layout.html', blog_layout)

# статия без своя картинка се споделя с общата – напомняме да се пусне tools/og.py
try:
    import subprocess as _sp, json as _js
    _posts = _js.loads(_sp.run(['php', '-r', "foreach (glob('%s/api/blog_posts*.php') as $f) require_once $f;"
                                "echo json_encode(array_column(blog_posts(), 'slug'));" % os.path.abspath(OUT)],
                               capture_output=True, text=True).stdout or '[]')
    _miss = [x for x in _posts if not os.path.exists(os.path.join(OUT, 'assets', 'blog', x + '.jpg'))]
    if _miss:
        print('  ! %d статии са без картинка за споделяне – пуснете: python3 tools/og.py (%s)' % (len(_miss), ', '.join(_miss[:3])))
except Exception:
    pass

# ================= rabotni-listove.html =================
ws = head('Работни листове и контролни по математика 1.–4. клас за печат – Сметко', 'Генератор на работни листове, контролни работи с два варианта (А и Б) и пробни тестове за НВО по математика за 1.–4. клас. С отговори за учителя. Безплатно, за печат.',
          'rabotni-listove.html', [crumbs([('Начало', ''), ('Работни листове', 'rabotni-listove.html')])], 'ws-page') + header() + '''
<main id="main">
<section class="section ws-controls">
  <div class="wrap">
    <div class="breadcrumbs"><a href="/">Начало</a> › Работни листове</div>
    <h1>Работни листове и контролни</h1>
    <p class="lead-dark">Изберете какво ви трябва – Сметко генерира задачите за печат. Всеки път са нови, а отговорите са на отделна страница.</p>
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Какво правим<select id="ws-kind" class="select"><option value="sheet">Работен лист</option><option value="test">Контролна работа · 2 варианта</option><option value="week">Домашно за седмица · 5 × 4 задачи</option><option value="nvo">Пробен тест за НВО · 4. клас</option></select></label>
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

# ================= коледен календар =================
adv = head('Коледен календар със задачи по математика – 24 дни | Сметко',
           'Безплатен коледен календар със задачи по математика за 1.–4. клас: по една задача на ден от 1 до 24 декември, с проверка на отговора. И лист за печат, за да си направите календар у дома или в класа.',
           'koleden-kalendar.html', [crumbs([('Начало', ''), ('Коледен календар', 'koleden-kalendar.html')])]) + header() + \
    page_hero('Коледен календар със задачи',
              'По една задача на ден от 1 до 24 декември. Всяка врата се отваря на своя ден, задачата е една и съща за всички в класа, а отговорът се проверява веднага.',
              'Начало › Коледен календар', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#advent">Към календара</a>'
              '<button type="button" class="btn btn-white" id="ac-print">🖨 Лист за печат</button></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="ac-bar">
      <label>Клас <select id="ac-grade" class="select"><option value="1">1. клас</option><option value="2">2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
      <p class="hint">Задачите стават по-трудни към Коледа. Отворените дни се помнят в този браузър.</p>
    </div>
    <div id="advent" data-grade=""></div>
  </div>
</section>

<section class="section soft">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Как се ползва</h2><p>Календарът е направен така, че да върши работа и у дома, и в клас, без да се превръща в домашно.</p></div>
    <div class="grid grid-3">
      <article class="card"><h3>{ico('star')} За децата</h3><p>Една врата на ден, не повече. Задачата е същата за всички съученици, така че има за какво да се спори на другия ден. Решените дни остават със звезда.</p></article>
      <article class="card"><h3>{ico('heart')} За родителите</h3><p>Пет минути сутрин са достатъчни, за да не изстине смятането през декември. Ако задачата не става, решете я заедно – декември не е месец за битки.</p></article>
      <article class="card"><h3>{ico('school')} За учителите</h3><p>Една задача на дъската като сутрешен ритуал. Листът за печат дава и 24-те задачи наведнъж, с отговорите най-отзад – изрязват се и се слагат в пликчета.</p></article>
    </div>
    <p class="center-note"><button type="button" class="btn btn-lg" onclick="document.getElementById('ac-print').click()">🖨 Свали 24-те задачи за печат</button></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Какво има вътре</h2><p>Задачите идват от същия генератор, който движи мисиите – по програмата на МОН за избрания клас.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="game.html" style="--c:#4CBB4A"><span>{ico('map')}</span><b>Мисии по учебника</b><small>Ако детето иска повече от една задача</small></a>
      <a class="hub-card" href="rabotni-listove.html" style="--c:#2F80ED"><span>{ico('sheet')}</span><b>Работни листове</b><small>Лист със задачи по тема, за печат</small></a>
      <a class="hub-card" href="/blog/adventen-kalendar-zadachi" style="--c:#FF7A1A"><span>{ico('book')}</span><b>Как да си направим календар</b><small>24 идеи за задачи от всекидневието</small></a>
    </div>
  </div>
</section>
<section class="ws-sheet-wrap"><div class="ws-sheet" id="ac-sheet" hidden></div></section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/advent.js'])
write('koleden-kalendar.html', adv)

# ================= на дъската =================
bd = head('Задачи на дъската – математика за 1.–4. клас на интерактивна дъска | Сметко',
          'Задачи по математика на цял екран за интерактивна дъска или проектор: избирате клас, тема и трудност, а Сметко показва по една задача. Интервал показва отговора. Безплатно и без регистрация.',
          'zadachi-na-daskata.html', [crumbs([('Начало', ''), ('За учители', 'uchilishta.html'), ('На дъската', 'zadachi-na-daskata.html')])]) + header() + \
    page_hero('Задачи на дъската',
              'За фронтална работа в час: по една задача на цял екран, с голям шрифт. Интервал показва отговора, стрелка надясно дава следваща. Нищо не се записва и не се оценява.',
              '<a href="uchilishta.html">За учители</a> › На дъската', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#bd">Започни</a>'
              '<a class="btn btn-white" href="rabotni-listove.html">🖨 Работни листове</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="panel tool-panel bd-tools">
      <div class="tool-grid">
        <label>Клас<select id="bd-grade" class="select"><option value="1">1. клас</option><option value="2" selected>2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
        <label>Тема<select id="bd-topic" class="select"></select></label>
        <label>Трудност<select id="bd-level" class="select"><option value="1">Лесно</option><option value="2" selected>Средно</option><option value="3">Трудно</option></select></label>
      </div>
      <p class="hint">Клавиши: <b>интервал</b> – отговорът, <b>→</b> – следваща задача.</p>
    </div>

    <div class="bd" id="bd">
      <div class="bd-top"><span id="bd-count">Задача 1</span><button type="button" class="btn btn-sm btn-white" id="bd-full">⛶ Цял екран</button></div>
      <p class="bd-q" id="bd-q"></p>
      <div class="bd-fig" id="bd-fig" hidden></div>
      <div class="bd-opts" id="bd-opts" hidden></div>
      <p class="bd-a" id="bd-a" hidden></p>
      <div class="bd-btns">
        <button type="button" class="btn btn-lg btn-green" id="bd-show">Покажи отговора</button>
        <button type="button" class="btn btn-lg btn-white" id="bd-next">Пропусни</button>
      </div>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Как се ползва в час</h2><p>Измислено е за петте минути в началото на часа, но върши работа и при обобщение.</p></div>
    <div class="grid grid-3">
      <article class="card"><h3>{ico('bolt')} Загрявка</h3><p>Пет задачи по темата от миналия час, преди да се започне новото. Децата отговарят от място, без вдигане на ръка.</p></article>
      <article class="card"><h3>{ico('radio')} Цял клас отговаря</h3><p>Всички пишат отговора на листче или на малка дъска и го вдигат едновременно. Виждате кой е схванал, без да изпитвате.</p></article>
      <article class="card"><h3>{ico('target')} Състезание по редове</h3><p>Ред срещу ред, точка за всеки верен отговор. Трудността се вдига в движение от менюто горе.</p></article>
    </div>
    <p class="center-note"><a class="btn btn-lg" href="uchilishta.html">Какво още има за учители</a></p>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/tools.js', 'js/board.js'])
write('zadachi-na-daskata.html', bd)

# ================= часовникът =================
CK_FACE = """<svg id="ck-face" viewBox="0 0 200 200" class="ck-svg" tabindex="0" role="img" aria-label="Часовник – стрелките се местят с пръст, с мишка или със стрелките на клавиатурата"><circle cx="100" cy="100" r="96" fill="#fff" stroke="#1D2B4F" stroke-width="4"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(0 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(6 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(12 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(18 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(24 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(30 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(36 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(42 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(48 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(54 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(60 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(66 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(72 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(78 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(84 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(90 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(96 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(102 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(108 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(114 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(120 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(126 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(132 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(138 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(144 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(150 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(156 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(162 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(168 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(174 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(180 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(186 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(192 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(198 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(204 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(210 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(216 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(222 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(228 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(234 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(240 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(246 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(252 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(258 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(264 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(270 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(276 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(282 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(288 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(294 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(300 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(306 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(312 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(318 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(324 100 100)"/><line x1="100" y1="8" x2="100" y2="18" stroke="#1D2B4F" stroke-width="3" stroke-linecap="round" transform="rotate(330 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(336 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(342 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(348 100 100)"/><line x1="100" y1="11" x2="100" y2="14" stroke="#B9C8E0" stroke-width="1.6" stroke-linecap="round" transform="rotate(354 100 100)"/><text x="134.0" y="48.1" text-anchor="middle" class="ck-n">1</text><text x="158.9" y="73.0" text-anchor="middle" class="ck-n">2</text><text x="168.0" y="107.0" text-anchor="middle" class="ck-n">3</text><text x="158.9" y="141.0" text-anchor="middle" class="ck-n">4</text><text x="134.0" y="165.9" text-anchor="middle" class="ck-n">5</text><text x="100.0" y="175.0" text-anchor="middle" class="ck-n">6</text><text x="66.0" y="165.9" text-anchor="middle" class="ck-n">7</text><text x="41.1" y="141.0" text-anchor="middle" class="ck-n">8</text><text x="32.0" y="107.0" text-anchor="middle" class="ck-n">9</text><text x="41.1" y="73.0" text-anchor="middle" class="ck-n">10</text><text x="66.0" y="48.1" text-anchor="middle" class="ck-n">11</text><text x="100.0" y="39.0" text-anchor="middle" class="ck-n">12</text><g id="ck-h" data-hand="h"><line x1="100" y1="112" x2="100" y2="52" stroke="#1D2B4F" stroke-width="9" stroke-linecap="round"/><line x1="100" y1="112" x2="100" y2="52" stroke="transparent" stroke-width="26"/></g><g id="ck-m" data-hand="m"><line x1="100" y1="116" x2="100" y2="24" stroke="#2F80ED" stroke-width="6" stroke-linecap="round"/><line x1="100" y1="116" x2="100" y2="24" stroke="transparent" stroke-width="24"/></g><circle cx="100" cy="100" r="7" fill="#FF7A1A" stroke="#fff" stroke-width="2"/></svg>"""
ck = head('Часовникът: как се чете часът – упражнения за 1.–4. клас | Сметко',
          'Научете детето да чете часовника: подвижен часовник със стрелки, упражнения „Колко е часът“ и „Нагласи часовника“, цели часове, половин час и по пет минути. Безплатно, без регистрация.',
          'chasovnik.html', [crumbs([('Начало', ''), ('Часовникът', 'chasovnik.html')])]) + header() + \
    page_hero('Колко е часът?',
              'Подвижен часовник за упражнение: стрелките се местят с пръст, с мишка или със стрелките на клавиатурата. Два вида задачи – да се прочете часът и да се нагласи часовникът.',
              'Начало › Часовникът', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#clock">Към часовника</a>'
              '<a class="btn btn-white" href="merni-edinici.html">Мерни единици</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Какво правим<select id="ck-mode" class="select"><option value="read">Колко е часът?</option><option value="set">Нагласи часовника</option></select></label>
        <label>Точност<select id="ck-step" class="select"><option value="60">Цели часове</option><option value="30">И половина</option><option value="15">През 15 минути</option><option value="5" selected>През 5 минути</option><option value="1">Точна минута</option></select></label>
      </div>
    </div>
    <div class="ck" id="clock">
      <div class="ck-left">{CK_FACE}</div>
      <div class="ck-right">
        <p class="ck-task" id="ck-task"></p>
        <p class="ck-digi" id="ck-digi">10:10</p>
        <p class="ck-words" id="ck-words"></p>
        <div class="ck-row">
          <input id="ck-ans" class="fld-in" inputmode="numeric" autocomplete="off" placeholder="7:45" aria-label="Колко е часът">
          <button type="button" class="btn btn-green" id="ck-check">Провери</button>
          <button type="button" class="btn btn-white" id="ck-new">Нова задача</button>
        </div>
        <p class="ck-fb" id="ck-fb" aria-live="polite"></p>
        <p class="hint">Малката стрелка показва часовете, голямата – минутите. Пипнете по-близо до центъра, за да местите часовата стрелка, и към ръба – за минутната.</p>
      </div>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap prose">
    <h2 class="lined">Как се чете часовникът</h2>
    <p>Четенето на часовник е едно от малкото умения по математика, които се ползват всеки ден цял живот. В училище влиза в <b>1. клас</b> с целите часове, в <b>2. клас</b> идват половин час и петнайсетте минути, а в <b>3.–4. клас</b> се смята с часове и минути – колко време е минало и в колко часа ще бъде нещо.</p>
    <h3>Първо голямата и малката стрелка</h3>
    <p>Най-честото объркване е кое какво показва. Малката стрелка е дебела и къса – тя сочи <b>часа</b>. Голямата е дълга и тънка – тя сочи <b>минутите</b>. Ако детето ги бърка, сложете пръст върху малката и попитайте само „кой час е минала?“</p>
    <h3>Числата значат две неща</h3>
    <p>Това е истинската трудност: цифрата 3 значи „3 часа“ за малката стрелка и „15 минути“ за голямата. Броенето по пет – 5, 10, 15, 20 – е ключът и е добре да е наред, преди да се започне с минутите. Затова и часовникът се учи най-лесно след <a href="tablica-za-umnozhenie.html">таблицата за 5</a>.</p>
    <h3>„Без петнайсет“ и „и половина“</h3>
    <p>На български часът се казва по два начина: <b>7 и 40</b> или <b>8 без 20</b>. Детето трябва да разбира и двата, защото вкъщи се говори по единия, а в задачите се пише по другия. Правилото е просто: до 30 минути се казва „и“, след 30 – „без“, като часът става следващият.</p>
    <h3>12 или 24 часа</h3>
    <p>Часовникът със стрелки показва 12 часа, а разписанията и телефонът – 24. 15:30 на екрана е 3 и половина на стрелките. Най-лесно се обяснява с деня: след обяд се вади 12.</p>
    <h3>Колко време мина</h3>
    <p>В 3. и 4. клас задачите стават такива: „Филмът започва в 17:40 и трае 95 минути. В колко часа свършва?“ Тук се брои на части – първо до цял час, после остатъкът. 17:40 + 20 минути прави 18:00, остават още 75, значи 19:15. Същият тип задача се пада и на <a href="nvo-4-klas-matematika.html">НВО в 4. клас</a>.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Накъде оттук</h2><p>Часът върви заедно с мерните единици и с задачите за време.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="merni-edinici.html" style="--c:#4CBB4A"><span>{ico('ruler')}</span><b>Мерни единици</b><small>Дължина, маса, време, лице</small></a>
      <a class="hub-card" href="rabotni-listove.html" style="--c:#2F80ED"><span>{ico('sheet')}</span><b>Работни листове</b><small>Задачи за печат по тема</small></a>
      <a class="hub-card" href="zadachi-na-daskata.html" style="--c:#8E6CF0"><span>{ico('board')}</span><b>Задачи на дъската</b><small>За час – на цял екран</small></a>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/clock.js'])
write('chasovnik.html', ck)

# ================= текстови задачи =================
wt = head('Текстови задачи по математика за 1.–4. клас – с решение стъпка по стъпка | Сметко',
          'Текстови задачи по математика за 1., 2., 3. и 4. клас с подсказки стъпка по стъпка: как се намира въпросът, кое действие се избира и как се проверява отговорът. Безплатно, без регистрация.',
          'tekstovi-zadachi.html', [crumbs([('Начало', ''), ('Текстови задачи', 'tekstovi-zadachi.html')])]) + header() + \
    page_hero('Текстови задачи стъпка по стъпка',
              'Мястото, където се къса при повечето деца – не в смятането, а в разбирането какво се пита. Тук задачата идва с пет стъпки, които се отварят една по една, когато потрябват.',
              'Начало › Текстови задачи', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#wt">Към задачите</a>'
              '<a class="btn btn-white" href="/blog/tekstovi-zadachi-5-stapki">Как се решават</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Клас<select id="wt-grade" class="select"><option value="1">1. клас</option><option value="2" selected>2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
      </div>
      <p class="hint">Първо опитайте сами. „Подскажи“ отваря по една стъпка – не отговора.</p>
    </div>
    <div class="wt" id="wt">
      <div class="wt-main">
        <p class="wt-q" id="wt-q"></p>
        <div class="wt-row">
          <input id="wt-ans" class="fld-in" inputmode="numeric" autocomplete="off" aria-label="Отговор">
          <button type="button" class="btn btn-green" id="wt-check">Провери</button>
          <button type="button" class="btn btn-sm btn-white" id="wt-hint">Подскажи</button>
          <button type="button" class="btn btn-sm btn-white" id="wt-new">Нова задача</button>
        </div>
        <p class="wt-fb" id="wt-fb" aria-live="polite"></p>
      </div>
      <ol class="wt-steps" id="wt-steps"></ol>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap prose">
    <h2 class="lined">Защо тъкмо текстовите задачи</h2>
    <p>Дете, което смята безпогрешно, често се проваля на текстова задача. Причината почти никога не е смятането – то се проваля, преди да стигне до него: не е разбрало какво се пита или е избрало действието по усет, вместо по смисъл.</p>
    <p>Затова и на <a href="nvo-4-klas-matematika.html">НВО в 4. клас</a> точно тези задачи носят най-много точки и се губят най-много точки. Последните пет задачи на изпита са текстови и искат записано решение, а не само отговор.</p>

    <h3>Капаните, които хващат всички</h3>
    <ul class="check-list">
      <li><b>Думата вместо смисъла.</b> „Повече“ не значи винаги събиране. „Иван има 12 стикера, това е с 5 повече от Мария“ – тук се вади.</li>
      <li><b>Отговор без въпрос.</b> Детето смята всичко, което може, и дава първото получено число. Проверката е едно изречение: „Това ли питаха?“</li>
      <li><b>Забравена втора стъпка.</b> В задачите с две действия междинният отговор се взема за краен. Помага въпросът: „Това отговаря ли вече на въпроса?“</li>
      <li><b>Липсваща мерна единица.</b> „24“ не е отговор на „колко метра“. На изпит това струва точка.</li>
    </ul>

    <h3>Какво се иска по класове</h3>
    <p><b>1. клас.</b> Една стъпка, числата до 20. Задачите са кратки и почти винаги за събиране или изваждане.</p>
    <p><b>2. клас.</b> Числата до 100 и първите задачи с две действия. Влиза и умножението – „по 4 в кутия, 5 кутии“.</p>
    <p><b>3. клас.</b> Две действия стават правило, появява се деление с остатък и косвената форма („с 5 по-малко от…“).</p>
    <p><b>4. клас.</b> Многоцифрени числа, задачи с данни от таблица, с обиколка и лице, с пари и време. И задачата с три подусловия, която на изпита носи най-много точки.</p>

    <h3>Как да помогнете, без да решавате вместо детето</h3>
    <p>Четирите въпроса вършат работа за почти всяка задача: <b>Какво знаем? Какво питат? Станаха ли повече, или по-малко? Можеш ли да го нарисуваш?</b> С времето детето започва да си ги задава само – а това е целта. Повече за това има в статията <a href="/blog/tekstovi-zadachi-5-stapki">как се решават текстови задачи в пет стъпки</a>.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Накъде оттук</h2><p>Текстовите задачи вървят с четенето на условие, с мерните единици и с подготовката за НВО.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="rabotni-listove.html" style="--c:#2F80ED"><span>{ico('sheet')}</span><b>Работни листове</b><small>Задачи за печат по тема</small></a>
      <a class="hub-card" href="nvo-4-klas-razshiren-otgovor.html" style="--c:#8E6CF0"><span>{ico('write')}</span><b>Задачите с решение на НВО</b><small>Как се пише решение за точки</small></a>
      <a class="hub-card" href="chasovnik.html" style="--c:#19B5A5"><span>{ico('clock')}</span><b>Часовникът</b><small>Задачите за време започват оттук</small></a>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/wordtask.js'])
write('tekstovi-zadachi.html', wt)

# ================= обиколка и лице =================
ar = head('Обиколка и лице на правоъгълник – упражнения за 3. и 4. клас | Сметко',
          'Обиколка и лице на правоъгълник и квадрат: подвижен правоъгълник на квадратчета, формулите с числа и упражнения. Защо обиколката е в сантиметри, а лицето в квадратни сантиметри.',
          'obikolka-i-lice.html', [crumbs([('Начало', ''), ('Обиколка и лице', 'obikolka-i-lice.html')])]) + header() + \
    page_hero('Обиколка и лице',
              'Двете неща, които се бъркат най-много в 3. и 4. клас. Тук правоъгълникът се тегли с пръст по квадратчетата и се вижда разликата: обиколката е пътят отвън, лицето са квадратчетата вътре.',
              'Начало › Обиколка и лице', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#ar">Към упражнението</a>'
              '<a class="btn btn-white" href="merni-edinici.html">Мерни единици</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Какво търсим<select id="ar-mode" class="select"><option value="mix" selected>Разбъркано</option><option value="per">Обиколка</option><option value="area">Лице</option></select></label>
      </div>
      <p class="hint">Оранжевото кръгче тегли правоъгълника. Едно квадратче е 1 см.</p>
    </div>
    <div class="ar" id="ar">
      <div class="ar-left"><svg id="ar-svg" class="ar-svg" role="img" aria-label="Правоъгълник на квадратчета"></svg></div>
      <div class="ar-right">
        <p class="ar-task" id="ar-task"></p>
        <div class="ar-row">
          <input id="ar-ans" class="fld-in" inputmode="numeric" autocomplete="off" aria-label="Отговор">
          <button type="button" class="btn btn-green" id="ar-check">Провери</button>
          <button type="button" class="btn btn-sm btn-white" id="ar-show">Покажи</button>
          <button type="button" class="btn btn-sm btn-white" id="ar-new">Нов правоъгълник</button>
        </div>
        <p class="ar-fb" id="ar-fb" aria-live="polite"></p>
        <div class="ar-out" id="ar-out"></div>
      </div>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap prose">
    <h2 class="lined">Как да не се бъркат</h2>
    <p>Едно изречение върши повече от две формули: <b>обиколката е въжето около двора, лицето е тревата вътре.</b> Детето, което го е чуло така, спира да ги бърка.</p>
    <h3>Обиколка</h3>
    <p>Обиколката е сборът на всички страни. При правоъгълник всяка страна е по две, затова <b>P = 2 · (a + b)</b>. При квадрат и четирите са еднакви: <b>P = 4 · a</b>.</p>
    <p>Най-честата грешка е да се съберат само двете различни страни. Проверката е проста: обиколката трябва да е повече от сбора на двете.</p>
    <h3>Лице</h3>
    <p>Лицето е колко квадратчета се побират вътре. Затова <b>S = a · b</b> – редове по колони. Начертайте правоъгълник 4 на 6 в тетрадката на квадратчета и ги пребройте: точно 24. Така формулата не се учи наизуст, а става очевидна.</p>
    <h3>Мерните единици са част от отговора</h3>
    <p>Обиколката се мери в сантиметри, защото е дължина. Лицето – в <b>квадратни</b> сантиметри, защото се брои на квадратчета. Отговор „24 см“ на задача за лице е грешен, дори числото да е вярно – а на <a href="nvo-4-klas-matematika.html">НВО в 4. клас</a> това струва точка.</p>
    <h3>Обратната задача</h3>
    <p>В 4. клас се пита и наобратно: „Лицето е 24 кв. см, едната страна е 4 см – колко е другата?“ Тук се дели: 24 : 4 = 6. Същото и с обиколката: ако P = 20 см и едната страна е 6 см, то двете страни правят 10, значи другата е 4.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Накъде оттук</h2><p>Геометрията в 4. клас е около една четвърт от изпита.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="merni-edinici.html" style="--c:#4CBB4A"><span>{ico('ruler')}</span><b>Мерни единици</b><small>Дължина, маса, време, лице</small></a>
      <a class="hub-card" href="nvo-4-klas-matematika.html" style="--c:#8E6CF0"><span>{ico('board')}</span><b>НВО 4. клас</b><small>Форматът и какво се пита</small></a>
      <a class="hub-card" href="/blog/geometria-po-klasove" style="--c:#FF7A1A"><span>{ico('book')}</span><b>Геометрията по класове</b><small>Какво точно се иска кога</small></a>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/area.js'])
write('obikolka-i-lice.html', ar)

# ================= геометрия =================
def geo_skills():
    """Геометричните умения по класове – четат се от js/math-engine.js, за да не се разминават."""
    import json, subprocess, os as _os
    root = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
    js = ("const fs=require('fs'),vm=require('vm');const c={window:{},Math:Object.create(Math),console};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
          "const E=c.window.Smetko.MathEngine,o={};"
          "for(let g=1;g<=4;g++)o[g]=E.setSkills(g,'geo');"
          "process.stdout.write(JSON.stringify(o));")
    out = subprocess.run(['node', '-e', js, _os.path.join(root, 'public_html', 'js', 'math-engine.js')],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

GS = geo_skills()
GEO_LEARN = {
    '1': ('Разпознаване', ['точка, права и крива линия, отсечка', 'триъгълник, квадрат, правоъгълник и кръг',
                           'намиране и броене на фигури в чертеж', 'сравняване по дължина – по-дълго и по-късо']),
    '2': ('Измерване и чертане', ['отсечка с дадена дължина в сантиметри', 'измерване с линийка от нулата',
                                  'многоъгълник: страни и върхове', 'обиколка на триъгълник, правоъгълник и квадрат',
                                  'свойства на правоъгълника и квадрата']),
    '3': ('Ъгли и триъгълници', ['прав, остър и тъп ъгъл', 'видове триъгълници по ъгли и по страни',
                                 'обиколка и намиране на страна по обиколката', 'права, лъч и отсечка – разликата']),
    '4': ('Лице, окръжност и тела', ['лице на правоъгълник и квадрат', 'страна по дадено лице',
                                     'съставни фигури от два правоъгълника', 'окръжност: център, радиус и диаметър',
                                     'куб, паралелепипед, цилиндър, конус, пирамида, сфера',
                                     'квадратен сантиметър, квадратен метър, декар']),
}
geo_secs = ''
for g in ('1', '2', '3', '4'):
    ttl, items = GEO_LEARN[g]
    geo_secs += f"""
  <article class="geo-grade" id="klas-{g}">
    <div class="section-head"><h2 class="lined">{g}. клас · {ttl}</h2><p>Какво се иска по програмата и тест, с който се проверява.</p></div>
    <div class="geo-two">
      <ul class="check-list">{''.join('<li>' + x + '</li>' for x in items)}</ul>
      <div class="qz" data-grade="{g}" data-skills="{','.join(GS[g])}" data-n="8" data-level="2"
           data-title="Тест по геометрия · {g}. клас"></div>
    </div>
  </article>"""

ge = head('Геометрия за 1.–4. клас: фигури, ъгли, обиколка, лице и тела | Сметко',
          'Геометрията в началното училище по класове: фигури и линии, измерване с линийка, ъгли и триъгълници, обиколка и лице, окръжност и геометрични тела. С безплатни тестове и задачи с чертежи.',
          'geometria.html', [crumbs([('Начало', ''), ('Геометрия', 'geometria.html')])]) + header() + \
    page_hero('Геометрия в началното училище',
              'Малко часове, много загубени точки. Тук е подредено какво се учи във всеки клас, къде се къса и има тест с чертежи за всяка възраст.',
              'Начало › Геометрия', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#klas-1">Към тестовете</a>'
              '<a class="btn btn-white" href="rabotni-listove.html">🖨 Лист по геометрия</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">{geo_secs}
  </div>
</section>

<section class="section soft">
  <div class="wrap prose">
    <h2 class="lined">Къде се къса най-често</h2>
    <h3>Линийката се чете от нулата</h3>
    <p>Най-честата грешка във 2. клас няма нищо общо с геометрията: детето слага началото на линийката до края ѝ, а не до нулата, или чете докъде свършва отсечката, вместо да извади началото. Ако отсечката започва на 3 и свършва на 11, тя е <b>8 см</b>, а не 11.</p>
    <h3>Обиколка или лице</h3>
    <p>Обиколката е въжето около двора, лицето е тревата вътре. Това е цялата разлика и тя се упражнява най-бързо на <a href="obikolka-i-lice.html">подвижния правоъгълник</a>, където квадратчетата се броят.</p>
    <h3>Мерните единици са част от отговора</h3>
    <p>Дължина и обиколка – в сантиметри. Лице – в <b>квадратни</b> сантиметри. Отговор с вярно число, но грешна единица, се брои за грешен на изпит.</p>
    <h3>Две страни вместо четири</h3>
    <p>При обиколка на правоъгълник децата събират само двете различни страни. Всяка от тях обаче е по две: P = 2 · (a + b).</p>
    <h3>Тялото не е фигура</h3>
    <p>Квадратът е фигура, кубът е тяло. В 4. клас се пита за стени, върхове и ръбове – кубът има 6 стени, 8 върха и 12 ръба.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Къде да упражнявате</h2><p>Геометрията се учи с ръце – с линийка, с квадратчета и с рисуване.</p></div>
    <div class="hub-top">
      <a class="hub-card" href="obikolka-i-lice.html" style="--c:#4CBB4A"><span>{ico('grid')}</span><b>Обиколка и лице</b><small>Правоъгълник, който се тегли</small></a>
      <a class="hub-card" href="rabotni-listove.html" style="--c:#2F80ED"><span>{ico('sheet')}</span><b>Лист по геометрия</b><small>Изберете клас и тема „Геометрия“</small></a>
      <a class="hub-card" href="merni-edinici.html" style="--c:#19B5A5"><span>{ico('ruler')}</span><b>Мерни единици</b><small>Дължина, лице, маса, време</small></a>
      <a class="hub-card" href="nvo-4-klas-matematika.html" style="--c:#8E6CF0"><span>{ico('board')}</span><b>НВО 4. клас</b><small>Фигурите носят четвърт от точките</small></a>
      <a class="hub-card" href="/blog/geometria-po-klasove" style="--c:#FF7A1A"><span>{ico('book')}</span><b>Геометрията по класове</b><small>Статия за родители</small></a>
      <a class="hub-card" href="zadachi-na-daskata.html" style="--c:#E0452F"><span>{ico('board')}</span><b>Задачи на дъската</b><small>За час, на цял екран</small></a>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/quiz.js'])
write('geometria.html', ge)

# ================= числова ос =================
nl = head('Числова ос: упражнения за 1.–4. клас | Сметко',
          'Числовата ос на живо: намери числото, прочети къде сочи стрелката и закръгли с оста. За числата до 10, до 20, до 100 и до 1000. Безплатно, без регистрация.',
          'chislova-os.html', [crumbs([('Начало', ''), ('Числова ос', 'chislova-os.html')])]) + header() + \
    page_hero('Числовата ос',
              'Числата не са само знаци – те имат място. Тук оста се пипа: стрелката се плъзга с пръст, а задачите са три вида, от броене до закръгляване.',
              'Начало › Числова ос', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#nl">Към оста</a>'
              '<a class="btn btn-white" href="geometria.html">Геометрия</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="panel tool-panel">
      <div class="tool-grid">
        <label>Какво правим<select id="nl-mode" class="select"><option value="find">Намери числото</option><option value="read">Кое число сочи стрелката</option><option value="round">Закръгли с оста</option></select></label>
        <label>Докъде<select id="nl-span" class="select"><option value="10">До 10</option><option value="20" selected>До 20</option><option value="100">До 100</option><option value="1000">До 1000</option></select></label>
      </div>
      <p class="hint">Стрелката се плъзга с пръст или с мишка.</p>
    </div>
    <div class="nl" id="nl">
      <p class="nl-task" id="nl-task"></p>
      <svg id="nl-svg" class="nl-svg" viewBox="0 0 600 110" role="img" aria-label="Числова ос"></svg>
      <div class="nl-row">
        <input id="nl-ans" class="fld-in" inputmode="numeric" autocomplete="off" aria-label="Отговор">
        <button type="button" class="btn btn-green" id="nl-check">Провери</button>
        <button type="button" class="btn btn-sm btn-white" id="nl-new">Нова задача</button>
      </div>
      <p class="nl-fb" id="nl-fb" aria-live="polite"></p>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap prose">
    <h2 class="lined">Защо оста помага</h2>
    <p>Числото, написано на лист, е знак. На оста то е <b>място</b> – и изведнъж става ясно защо 7 е по-голямо от 4, какво значи „между“ и защо 68 се закръгля до 70, а не до 60.</p>
    <h3>1. клас: броене и съседи</h3>
    <p>Оста до 10 и до 20 показва кое число е преди и кое след, и че разстоянието между съседните числа е едно и също. Оттук се вижда и че събирането е движение надясно, а изваждането – наляво.</p>
    <h3>2.–3. клас: десетици и стотици</h3>
    <p>На оста до 100 делението вече е по 10. Числото 47 не стои върху деление – то е между 40 и 50, по-близо до 50. Точно тази картинка липсва на децата, които „сравняват“ числата по големината на цифрите.</p>
    <h3>4. клас: закръгляване</h3>
    <p>Закръгляването е правило, но на оста е очевидно: гледа се до кое кръгло число има по-малко. Ако е точно по средата – закръгля се нагоре. Повече упражнения има в <a href="geometria.html">геометрията</a> и в <a href="rabotni-listove.html">работните листове</a>.</p>
    <h3>Къде се къса</h3>
    <ul class="check-list">
      <li>Броене на деленията вместо на разстоянията – ако оста започва от 0, числото е толкова, колкото са стъпките.</li>
      <li>Оста не винаги започва от нула – на изпит може да тръгва от 200.</li>
      <li>Делението не винаги е 1 – при ос до 1000 всяко деление е 100.</li>
    </ul>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/numline.js'])
write('chislova-os.html', nl)

# ================= двубой =================
du = head('Двубой по математика: двама играчи на едно устройство | Сметко',
          'Игра за двама на един телефон или таблет: редувате се, задачите са от едно и също умение, бързият верен отговор носи двойно. Безплатно, без регистрация.',
          'dvuboy.html', [crumbs([('Начало', ''), ('Двубой', 'dvuboy.html')])]) + header() + \
    page_hero('Двубой',
              'Двама на едно устройство. Телефонът се подава, задачите са от едно и също умение за двамата, а верният отговор под 10 секунди носи два пъти повече.',
              'Начало › Двубой', 'hero',
              '<div class="hero-cta"><a class="btn btn-lg btn-green" href="#du">Започнете</a>'
              '<a class="btn btn-white" href="game.html">Сам срещу Сметко</a></div>') + \
    f"""
<main id="main">
<section class="section">
  <div class="wrap">
    <div class="du" id="du">
      <div id="du-setup" class="du-setup">
        <div class="tool-grid">
          <label>Първи играч<input id="du-n1" class="select" maxlength="14" placeholder="Играч 1" autocomplete="off"></label>
          <label>Втори играч<input id="du-n2" class="select" maxlength="14" placeholder="Играч 2" autocomplete="off"></label>
          <label>Клас<select id="du-grade" class="select"><option value="1">1. клас</option><option value="2" selected>2. клас</option><option value="3">3. клас</option><option value="4">4. клас</option></select></label>
          <label>Трудност<select id="du-level" class="select"><option value="1">Лесно</option><option value="2" selected>Средно</option><option value="3">Трудно</option></select></label>
          <label>Рундове<select id="du-rounds" class="select"><option value="3">3</option><option value="5" selected>5</option><option value="10">10</option></select></label>
        </div>
        <p class="center-note"><button type="button" class="btn btn-lg btn-green" id="du-start">Започни двубоя</button></p>
      </div>

      <div id="du-play" class="du-play" hidden>
        <div class="du-top"><span id="du-round"></span><span class="du-scores" id="du-score"></span></div>
        <div class="du-turn">На ход е <span class="du-who" id="du-who"></span></div>
        <div class="du-time"><span id="du-bar"></span></div>
        <p class="du-q" id="du-q"></p>
        <div class="du-fig" id="du-fig" hidden></div>
        <div class="du-chs" id="du-chs" hidden></div>
        <div class="du-row"><input id="du-ans" class="fld-in" inputmode="numeric" autocomplete="off" aria-label="Отговор">
          <button type="button" class="btn btn-green" id="du-ok">Отговори</button></div>
        <p class="du-fb" id="du-fb" aria-live="polite"></p>
      </div>

      <div id="du-over" class="du-over" hidden></div>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap">
    <div class="section-head"><h2 class="lined">Как се играе</h2><p>Измислено е за две деца у дома и за два отбора в клас.</p></div>
    <div class="grid grid-3">
      <article class="card"><h3>{ico('star')} Еднакви задачи</h3><p>Във всеки рунд двамата получават задача от едно и също умение, само с различни числа. Никой не може да каже, че другият е изтеглил по-лесното.</p></article>
      <article class="card"><h3>{ico('bolt')} Бързината носи двойно</h3><p>Верен отговор под 10 секунди дава 2 точки вместо 1. Има 20 секунди на задача – достатъчно, за да се мисли, но не и да се брои на пръсти.</p></article>
      <article class="card"><h3>{ico('school')} И за цял клас</h3><p>Два отбора, по един представител на рунд. На <a href="zadachi-na-daskata.html">дъската</a> върви и без телефон – там задачата е обща, а отговорите се вдигат на листчета.</p></article>
    </div>
  </div>
</section>
</main>
""" + FOOTER + scripts(['js/math-engine.js', 'js/duel.js'])
write('dvuboy.html', du)

# ================= 404 =================
nf = head('Страницата не е намерена – Сметко', 'Страницата не е намерена.', '404.html', noindex=True).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">') + header() + page_hero(
    'Ох! 404', 'Сметко претърси навсякъде, но тази страница я няма. Може би е отлетяла?', '404', 'think',
    '<div class="hero-cta"><a class="btn btn-lg" href="/">Към началото</a><a class="btn btn-white" href="game.html">Играй</a></div>') + '<main id="main"></main>' + FOOTER + scripts()
write('404.html', nf)

legal.build()
subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin_names.js')], check=True)  # имена на мисии и задачи за админ → Активност
import survey  # noqa: анкетата (anketa.html + api/survey_q.json)
import seo  # noqa: страници по теми, помагала, sitemap-pages.xml
print('ok')
