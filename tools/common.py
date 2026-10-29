# -*- coding: utf-8 -*-
"""Общи части на страниците (head, хедър, футър). Използва се от build.py.
Стартиране: python3 tools/build.py  → обновява HTML файловете в public_html/"""
import json, os, re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public_html')
SITE = 'https://smetko.com'
VER = '27'
EMAIL = 'info@smetko.com'
# Продажбите (цени, поръчки) са спрени до края на проучването. За пускане: True тук и SALES_OPEN в public_html/api/lib.php, после build.
SALES_OPEN = False

# Собственик на Сметко – физическо лице (без фирма). Продажбите минават през Paddle като търговец (Merchant of Record).
# Попълнете името и адреса за кореспонденция → python3 tools/build.py. Докато са празни, в документите стои „[ПОПЪЛНЕТЕ…]“
# (може да се попълнят и от админ → Настройки → „Собственик“, но за одобрението от Paddle е по-добре да са тук – в самия HTML).
OWNER_NAME = 'Александър Драгомиров Данов'
OWNER_ADDR = ''   # адрес за кореспонденция (напр. пощенска кутия или виртуален офис); празно → „България, адресът се предоставя при поискване“
TERMS_DATE = '29.10.2026'
F_NAME = f'<span>{OWNER_NAME}</span>' if OWNER_NAME else '<span data-co="name"><mark class="fill">[ПОПЪЛНЕТЕ: име и фамилия на собственика]</mark></span>'
F_ADDR = f'<span>{OWNER_ADDR}</span>' if OWNER_ADDR else f'<span>България (пълният адрес за кореспонденция се предоставя при поискване на <a href="mailto:{EMAIL}">{EMAIL}</a>)</span>'
F_DATE = TERMS_DATE
PADDLE = 'Paddle.com Market Limited (30 Old Bailey, Лондон EC4M 7AU, Великобритания, рег. № 08172165)'
PADDLE_TERMS = 'https://www.paddle.com/legal/buyer-terms'
PADDLE_PRIVACY = 'https://www.paddle.com/legal/privacy'

LOGO = ('<a class="logo" href="index.html" aria-label="Сметко – начало"><span class="owl-mini" data-owl="idle"></span>'
        '<span class="logo-word"><span>С</span><span>м</span><span>е</span><span>т</span><span>к</span><span>о</span></span></a>')


def head(title, desc, path, ld=None, body_class='', noindex=False, og=None):
    lds = ''.join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False) for x in (ld or []))
    canon = SITE + '/' + ('' if path == 'index.html' else path)
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    return f'''<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#3299FF">
<meta name="smetko-sales" content="{1 if SALES_OPEN else 0}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Сметко">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/{og or 'assets/images/og-image.png'}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="bg_BG">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/nunito.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="css/style.css?v={VER}">
<link rel="stylesheet" href="css/animations.css?v={VER}">
{lds}</head>
<body{(' class="' + body_class + '"') if body_class else ''}>
'''


NAV_HTML = '''<nav class="nav" aria-label="Основно меню">
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true">Мисии <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="game.html"><b>Всички игри</b><small>Приключение, Бързо сметни, Тренировка</small></a>
          <a href="matematika-1-klas.html"><b>1. клас</b><small>Числата до 20 и кръглите десетици</small></a>
          <a href="matematika-2-klas.html"><b>2. клас</b><small>До 100 и таблицата за умножение</small></a>
          <a href="matematika-3-klas.html"><b>3. клас</b><small>До 1000, умножение и деление</small></a>
          <a href="matematika-4-klas.html"><b>4. клас</b><small>Многоцифрени числа, лице, тела</small></a>
          <a href="testove-po-matematika.html"><b>✏️ Онлайн тестове</b><small>По теми, входно ниво, НВО 4. клас</small></a>
          <a href="tablica-za-umnozhenie.html"><b>✖️ Таблица за умножение</b><small>За печат, трикове и тест</small></a>
        </div></div>
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true" data-nav="ach">Класации <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="liga.html"><b>Обща класация</b><small>Училища, класове, учители, ученици</small></a>
          <a href="achievements.html"><b>Моите постижения</b><small>Точки, значки и моят клас</small></a>
          <a href="tablo.html"><b>Класация на класа</b><small>За учителя – в „Табло“</small></a>
        </div></div>
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true">Учители <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="uchilishta.html"><b>Сметко в училище</b><small>Абонамент за класа и документи</small></a>
          <a href="tablo.html"><b>📋 Табло</b><small>Ученици, домашни, отчети, класация</small></a>
          <a href="rabotni-listove.html"><b>Работни листове</b><small>Задачи за печат с отговори</small></a>
          <a href="uchilishta.html#domashna"><b>Линк за домашна</b><small>Конкретна тема с един линк</small></a>
          <a href="about.html#uchiteli"><b>Как работи в клас</b><small>Идеи за часа по математика</small></a>
          <a href="deca-sas-sop.html"><b>🤝 Ученици със СОП</b><small>Помощни настройки за всяко дете</small></a>
        </div></div>
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true" data-nav="parents">Родители <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="about.html#roditeli"><b>За родители</b><small>Как Сметко помага на детето</small></a>
          <a href="deca-sas-sop.html"><b>🤝 Деца със СОП</b><small>Четене на глас, едър текст, спокойно темпо</small></a>
          <a href="profil.html"><b>Отчет за родителя</b><small>В профила ви – за всяко дете</small></a>
          <a href="testove-po-matematika.html"><b>Онлайн тестове</b><small>По теми, входно ниво, НВО 4. клас</small></a>
        </div></div>
      <a href="blog/" data-nav="blog">Блог</a>
      <a href="novini.html" data-nav="news" class="nav-news">Новини<b data-news-count hidden></b></a>
      <a href="za-nas.html" data-nav="about">За нас</a>
      <a href="pricing.html" data-nav="pricing">Абонаменти</a>
    </nav>'''

MOBILE_NAV = '''<nav class="mobile-nav" aria-label="Мобилно меню">
    <div class="m-auth" data-acct-m><a class="btn btn-ghost" href="vhod.html">Вход</a><a class="btn btn-teal" href="registracia.html">Регистрация</a></div>
    <a href="game.html">🎮 Мисии и игри</a>
    <div class="m-grades"><a href="matematika-1-klas.html">1. клас</a><a href="matematika-2-klas.html">2. клас</a><a href="matematika-3-klas.html">3. клас</a><a href="matematika-4-klas.html">4. клас</a></div>
    <a href="testove-po-matematika.html">✏️ Онлайн тестове</a>
    <a href="tablica-za-umnozhenie.html">✖️ Таблица за умножение</a>
    <a href="liga.html">🏆 Обща класация</a>
    <a href="achievements.html">⭐ Моите постижения</a>
    <a href="novini.html">📰 Новини <b class="m-news" data-news-count hidden></b></a>
    <a href="tablo.html">📋 Табло за учители</a>
    <a href="uchilishta.html">🏫 За учители и училища</a>
    <a href="rabotni-listove.html">🖨️ Работни листове</a>
    <a href="about.html#roditeli">👨‍👩‍👧 За родители</a>
    <a href="deca-sas-sop.html">🤝 Деца със СОП</a>
    <a href="otchet.html">📊 Отчет за родителя</a>
    <a href="blog/">✍️ Блог</a>
    <a href="za-nas.html">🦉 За нас</a>
    <a href="pricing.html">💶 Абонаменти</a>
  </nav>'''


def header(active='', over=False, game=False):
    nav = NAV_HTML.replace(f'data-nav="{active}"', 'aria-current="page"') if active else NAV_HTML
    snd = ('<button class="icon-btn a11y-btn" data-a11y-open aria-label="Помощни настройки (СОП)" title="Помощни настройки">🤝</button>'
           '<button class="icon-btn" id="sound-btn" aria-label="Звук">🔊</button>') if game else ''
    cls = 'site-header' + (' over' if over else '') + (' game-header' if game else '')
    return f'''<a class="skip" href="#main">Към съдържанието</a>
<header class="{cls}">
  <div class="wrap">
    {LOGO}
    {nav}
    <div class="header-actions">
      {snd}<a class="news-bell" href="novini.html" title="Новини" aria-label="Новини">🔔<b data-news-count hidden></b></a><a class="points-chip" href="achievements.html" data-points title="Моите точки"><span class="star">★</span> 0</a>
      <a class="acct-btn" href="vhod.html" data-acct title="Вход за родители и учители" aria-label="Вход"><span class="acct-ico">👤</span><span class="acct-txt">Вход</span></a>
      <a class="btn btn-teal btn-sm btn-register" href="registracia.html" data-acct-reg>Регистрация</a>
      <button class="menu-btn" aria-label="Меню" aria-expanded="false"><span></span></button>
    </div>
  </div>
  {MOBILE_NAV}
</header>
'''


FOOTER = '''<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        ''' + LOGO + '''
        <p style="margin-top:14px">Математика като игра за 1.–4. клас – по учебната програма на МОН и по заглавията на уроците в учебника на детето.</p>
      </div>
      <div><h4>Игри</h4><ul>
        <li><a href="game.html">Мисии</a></li>
        <li><a href="matematika-1-klas.html">Математика 1. клас</a></li>
        <li><a href="matematika-2-klas.html">Математика 2. клас</a></li>
        <li><a href="matematika-3-klas.html">Математика 3. клас</a></li>
        <li><a href="matematika-4-klas.html">Математика 4. клас</a></li>
      </ul></div>
      <div><h4>Помагала</h4><ul>
        <li><a href="testove-po-matematika.html">Тестове по математика</a></li>
        <li><a href="tablica-za-umnozhenie.html">Таблица за умножение</a></li>
        <li><a href="nvo-4-klas-matematika.html">НВО 4. клас математика</a></li>
        <li><a href="vhodno-nivo-matematika.html">Входно ниво</a> · <a href="izhodno-nivo-matematika.html">Изходно ниво</a></li>
        <li><a href="rimski-cifri.html">Римски цифри</a></li>
        <li><a href="merni-edinici.html">Мерни единици</a></li>
        <li><a href="rabotni-listove.html">Работни листове</a></li>
      </ul></div>
      <div><h4>За възрастните</h4><ul>
        <li><a href="about.html#roditeli">За родители</a></li>
        <li><a href="deca-sas-sop.html">Деца със СОП</a></li>
        <li><a href="otchet.html">Отчет за родителя</a></li>
        <li><a href="blog/">Блог</a></li>
        <li><a href="za-nas.html">За нас</a></li>
        <li><a href="uchilishta.html">За учители и училища</a></li>
        <li><a href="rabotni-listove.html">Работни листове</a></li>
        <li><a href="pricing.html">Абонаменти</a></li>
        <li><a href="vhod.html">Вход</a> · <a href="registracia.html">Регистрация</a></li>
        <li><a href="tablo.html">Табло за учители</a></li>
        <li><a href="novini.html">Новини</a></li>
      </ul></div>
      <div><h4>Правна информация</h4><ul>
        <li><a href="terms.html">Общи условия</a></li>
        <li><a href="privacy-policy.html">Поверителност</a></li>
        <li><a href="vrashtane.html">Връщане на парите</a></li>
        <li><a href="cookies.html">Бисквитки</a> · <button class="ck-foot" data-consent>🍪 Настройки</button></li>
        <li><a href="pravna-informacia.html">Всички документи</a></li>
        <li><a href="mailto:''' + EMAIL + '''">''' + EMAIL + '''</a></li>
        <li><button class="ck-foot" data-feedback>🚩 Съобщи за проблем</button></li>
      </ul></div>
    </div>
    <div class="footer-bottom"><span>© <span data-year>2026</span> Сметко · smetko.com</span><span>Без реклами. Без лични данни на децата.</span></div>
  </div>
</footer>
'''


def scripts(extra=()):
    base = ['js/owl.js', 'js/gamification.js', 'js/audio.js', 'js/access.js', 'js/account.js', 'js/app.js']
    order = base[:5] + [e for e in extra if e not in ('js/game.js', 'js/achievements.js', 'js/tools.js')] + ['js/app.js'] + \
        [e for e in extra if e in ('js/game.js', 'js/achievements.js', 'js/tools.js')]
    return ''.join(f'<script src="{s}?v={VER}" defer></script>\n' for s in order) + '</body>\n</html>\n'


def write(name, html):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(html)


ORG = {"@context": "https://schema.org", "@type": "Organization", "name": "Сметко", "url": SITE,
       "logo": SITE + "/assets/icons/icon-512.png", "email": EMAIL}


def crumbs(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + '/' + u} for i, (n, u) in enumerate(items)]}


def faq(items):
    return '<div class="faq">' + ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in items) + '</div>'


def faq_ld(items):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in items]}


def page_hero(title, lead, crumb, owl='hello', extra=''):
    return f'''<section class="page-hero">
  <span class="cloud c1"></span><span class="cloud c2"></span>
  <div class="wrap">
    <div>
      <div class="breadcrumbs"><a href="index.html">Начало</a> › {crumb}</div>
      <h1>{title}</h1>
      <p class="lead">{lead}</p>
      {extra}
    </div>
    <div class="owl" data-owl="{owl}"></div>
  </div>
</section>
'''


def doc_page(name, title, desc, crumb, body, owl='think'):
    """Страница с правен документ/образец."""
    html = head(title + ' – Сметко', desc, name) + header() + f'''
<main id="main">
<section class="section doc"><div class="wrap prose">
<div class="breadcrumbs"><a href="index.html">Начало</a> › <a href="pravna-informacia.html">Правна информация</a> › {crumb}</div>
{body}
<p class="doc-actions"><button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ Печат / PDF</button> <a class="btn btn-ghost btn-sm" href="pravna-informacia.html">Всички документи</a></p>
</div></section>
</main>
''' + FOOTER + scripts()
    write(name, html)
