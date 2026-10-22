# -*- coding: utf-8 -*-
"""Общи части на страниците (head, хедър, футър). Използва се от build.py.
Стартиране: python3 tools/build.py  → обновява HTML файловете в public_html/"""
import json, os, re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public_html')
SITE = 'https://smetko.com'
VER = '12'
EMAIL = 'info@smetko.com'

# Данни за търговеца — попълват се след регистрация на фирмата (търсете „[ПОПЪЛНЕТЕ“ във всички файлове)
F_NAME = '<span data-co="name"><mark class="fill">[ПОПЪЛНЕТЕ: наименование на дружеството]</mark></span>'
F_EIK = '<span data-co="eik"><mark class="fill">[ПОПЪЛНЕТЕ: ЕИК]</mark></span>'
F_ADDR = '<span data-co="addr"><mark class="fill">[ПОПЪЛНЕТЕ: седалище и адрес на управление]</mark></span>'
F_VAT = '<span data-co="vat"><mark class="fill">[ПОПЪЛНЕТЕ: ДДС номер, ако има регистрация]</mark></span>'
F_DATE = '<span data-co="date"><mark class="fill">[ПОПЪЛНЕТЕ: дата]</mark></span>'

LOGO = ('<a class="logo" href="index.html" aria-label="Сметко – начало"><span class="owl-mini" data-owl="idle"></span>'
        '<span class="logo-word"><span>С</span><span>м</span><span>е</span><span>т</span><span>к</span><span>о</span></span></a>')


def head(title, desc, path, ld=None, body_class='', noindex=False):
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="Сметко">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/assets/images/og-image.png">
<meta property="og:locale" content="bg_BG">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css?v={VER}">
<link rel="stylesheet" href="css/animations.css?v={VER}">
{lds}</head>
<body{(' class="' + body_class + '"') if body_class else ''}>
'''


NAV_HTML = '''<nav class="nav" aria-label="Основно меню">
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true">Мисии <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="game.html"><b>Всички игри</b><small>Приключение, Бързо сметни, Тренировка</small></a>
          <a href="class-1.html"><b>1. клас</b><small>Числата до 20 и кръглите десетици</small></a>
          <a href="class-2.html"><b>2. клас</b><small>До 100 и таблицата за умножение</small></a>
          <a href="class-3.html"><b>3. клас</b><small>До 1000, умножение и деление</small></a>
          <a href="class-4.html"><b>4. клас</b><small>Многоцифрени числа, лице, тела</small></a>
        </div></div>
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true" data-nav="ach">Класации <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="liga.html"><b>Обща класация</b><small>Училища, класове, учители, ученици</small></a>
          <a href="achievements.html"><b>Моите постижения</b><small>Точки, значки и моят клас</small></a>
          <a href="klasaciya.html"><b>Класация на класа</b><small>За учителя – с код и ПИН</small></a>
        </div></div>
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true">Учители <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="uchilishta.html"><b>Сметко в училище</b><small>Кодове за класа и документи</small></a>
          <a href="klasaciya.html"><b>Класация на класа</b><small>С кода и ПИН-а от картичката</small></a>
          <a href="rabotni-listove.html"><b>Работни листове</b><small>Задачи за печат с отговори</small></a>
          <a href="uchilishta.html#domashna"><b>Линк за домашна</b><small>Конкретна тема с един линк</small></a>
          <a href="about.html#uchiteli"><b>Как работи в клас</b><small>Идеи за часа по математика</small></a>
        </div></div>
      <div class="dd"><button class="dd-btn" aria-expanded="false" aria-haspopup="true" data-nav="parents">Родители <span class="chev">▾</span></button>
        <div class="dd-panel">
          <a href="about.html#roditeli"><b>За родители</b><small>Как Сметко помага на детето</small></a>
          <a href="otchet.html"><b>Отчет за родителя</b><small>Напредък, силни и слаби теми</small></a>
          <a href="za-nas.html"><b>За нас</b><small>Кои сме и защо направихме Сметко</small></a>
          <a href="novini.html"><b>Новини</b><small>Какво ново има</small></a>
        </div></div>
      <a href="blog/" data-nav="blog">Блог</a>
      <a href="pricing.html" data-nav="pricing">Цени</a>
    </nav>'''

MOBILE_NAV = '''<nav class="mobile-nav" aria-label="Мобилно меню">
    <a href="game.html">🎮 Мисии и игри</a>
    <div class="m-grades"><a href="class-1.html">1. клас</a><a href="class-2.html">2. клас</a><a href="class-3.html">3. клас</a><a href="class-4.html">4. клас</a></div>
    <a href="liga.html">🏆 Обща класация</a>
    <a href="achievements.html">⭐ Моите постижения</a>
    <a href="kod.html">🔑 Въведи код за достъп</a>
    <a href="novini.html">📰 Новини <b class="m-news" data-news-count hidden></b></a>
    <a href="uchilishta.html">🏫 За учители и училища</a>
    <a href="rabotni-listove.html">🖨️ Работни листове</a>
    <a href="about.html#roditeli">👨‍👩‍👧 За родители</a>
    <a href="otchet.html">📊 Отчет за родителя</a>
    <a href="blog/">✍️ Блог</a>
    <a href="za-nas.html">🦉 За нас</a>
    <a href="pricing.html">💶 Цени</a>
    <div class="m-auth"><a class="btn btn-ghost" href="kod.html" data-code-link>Имам код</a><a class="btn btn-teal" href="pricing.html">Абонамент</a></div>
  </nav>'''


def header(active='', over=False, game=False):
    nav = NAV_HTML.replace(f'data-nav="{active}"', 'aria-current="page"') if active else NAV_HTML
    snd = '<button class="icon-btn" id="sound-btn" aria-label="Звук">🔊</button>' if game else ''
    cls = 'site-header' + (' over' if over else '') + (' game-header' if game else '')
    return f'''<a class="skip" href="#main">Към съдържанието</a>
<header class="{cls}">
  <div class="wrap">
    {LOGO}
    {nav}
    <div class="header-actions">
      {snd}<a class="news-bell" href="novini.html" title="Новини" aria-label="Новини">🔔<b data-news-count hidden></b></a><a class="points-chip" href="achievements.html" data-points title="Моите точки"><span class="star">★</span> 0</a>
      <a class="link-login" href="kod.html" data-code-link>Имам код</a>
      <a class="btn btn-teal btn-sm btn-register" href="pricing.html">Абонамент</a>
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
        <li><a href="class-1.html">Математика 1. клас</a></li>
        <li><a href="class-2.html">Математика 2. клас</a></li>
        <li><a href="class-3.html">Математика 3. клас</a></li>
        <li><a href="class-4.html">Математика 4. клас</a></li>
      </ul></div>
      <div><h4>За възрастните</h4><ul>
        <li><a href="about.html#roditeli">За родители</a></li>
        <li><a href="otchet.html">Отчет за родителя</a></li>
        <li><a href="blog/">Блог</a></li>
        <li><a href="za-nas.html">За нас</a></li>
        <li><a href="uchilishta.html">За учители и училища</a></li>
        <li><a href="rabotni-listove.html">Работни листове</a></li>
        <li><a href="pricing.html">Цени</a></li>
        <li><a href="kod.html">Въведи код</a></li>
        <li><a href="novini.html">Новини</a></li>
      </ul></div>
      <div><h4>Правна информация</h4><ul>
        <li><a href="terms.html">Общи условия</a></li>
        <li><a href="privacy-policy.html">Поверителност</a></li>
        <li><a href="cookies.html">Бисквитки и хранилище</a></li>
        <li><a href="pravna-informacia.html">Всички документи</a></li>
        <li><a href="mailto:''' + EMAIL + '''">''' + EMAIL + '''</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom"><span>© <span data-year>2026</span> Сметко · smetko.com</span><span>Без реклами. Без лични данни на децата.</span></div>
  </div>
</footer>
'''


def scripts(extra=()):
    base = ['js/owl.js', 'js/gamification.js', 'js/audio.js', 'js/access.js', 'js/app.js']
    order = base[:4] + [e for e in extra if e not in ('js/game.js', 'js/achievements.js', 'js/tools.js')] + ['js/app.js'] + \
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
