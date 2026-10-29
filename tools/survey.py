# -*- coding: utf-8 -*-
"""Анкета за участниците в затворения тест (родители и учители).
Въпросите са само тук: от тях се правят anketa.html и public_html/api/survey_q.json
(сървърът проверява отговорите по него, а админ панелът → Анкета показва резултатите).
Стартира се от tools/build.py."""
import json, os, html as H
from common import head, header, FOOTER, scripts, write, OUT

ALL, PAR, TEA = 'all', 'parent', 'teacher'
# id, вид, въпрос, отговори, за кого, задължителен
# вид: one (един отговор), many (няколко), scale (1–5), nps (0–10), text, email
Q = [
    ('role', 'one', 'Вие сте…', ['Родител', 'Учител в начален етап', 'Ресурсен учител или друг специалист', 'Директор или заместник-директор', 'Друго'], ALL, True),

    ('p_grade', 'many', 'В кой клас е детето (децата)?', ['1. клас', '2. клас', '3. клас', '4. клас'], PAR, True),
    ('p_freq', 'one', 'Колко често детето играе Сметко?', ['Почти всеки ден', '2–3 пъти седмично', 'Веднъж седмично', 'По-рядко', 'Още не е играло'], PAR, True),
    ('p_like', 'many', 'Какво харесва детето най-много?', ['Мисиите по учебника', '„Бързо сметни“', 'Точките, нивата и значките', 'Класациите', 'Совата Сметко', 'Седмичното предизвикателство', 'Онлайн тестовете и работните листове'], PAR, False),
    ('p_help', 'scale', 'Сметко помага на детето ми да смята по-уверено.', ['Изобщо не съм съгласен', 'Напълно съм съгласен'], PAR, True),
    ('p_report', 'one', 'Полезен ли ви е отчетът за родителя?', ['Много полезен', 'Донякъде', 'Не особено', 'Не съм го гледал(а)'], PAR, False),
    ('p_sop', 'one', 'Детето има ли специални образователни потребности (СОП)?', ['Да', 'Не', 'Предпочитам да не отговарям'], PAR, False),
    ('p_now', 'many', 'Какво друго ползвате за упражнения по математика?', ['Учебни тетрадки и помагала', 'Частни уроци или школа', 'Други приложения или сайтове', 'Нищо допълнително'], PAR, False),
    ('p_pay', 'one', 'Бихте ли платили за пълен достъп до Сметко?', ['Да', 'Може би', 'Не'], PAR, True),
    ('p_price', 'one', 'Каква цена за година за ЕДНО дете ви се струва справедлива?', ['До 10 €', '10–20 €', '20–30 €', '30–50 €', 'Над 50 €'], PAR, False),
    ('p_family', 'one', 'А за семейство (до 4 деца) за година?', ['До 20 €', '20–35 €', '35–50 €', 'Над 50 €', 'Имам само едно дете'], PAR, False),
    ('p_period', 'one', 'Как предпочитате да плащате?', ['Всеки месец', 'За 6 месеца', 'За цяла година'], PAR, False),
    ('p_method', 'many', 'Удобен начин на плащане:', ['С карта онлайн', 'Apple Pay / Google Pay', 'Банков превод', 'Чрез училището или класа'], PAR, False),

    ('t_grade', 'many', 'Кой клас преподавате тази година?', ['1. клас', '2. клас', '3. клас', '4. клас', 'Слят клас'], TEA, True),
    ('t_students', 'one', 'Колко ученици имате в класа?', ['До 15', '16–22', '23–28', 'Над 28'], TEA, False),
    ('t_book', 'one', 'По кой учебник по математика работите?', ['Просвета', 'Просвета Плюс', 'Бит и Техника', 'Архимед', 'Анубис / Булвест', 'Клет', 'Друг'], TEA, False),
    ('t_use', 'many', 'Как ползвате Сметко?', ['В час – на дъската или с таблети', 'За домашни', 'За допълнителна работа с отделни ученици', 'С ученици със СОП', 'Още не съм започнал(а)'], TEA, True),
    ('t_useful', 'many', 'Кое ви е най-полезно?', ['Мисиите по учебника', 'Отчетите по теми в „Табло“', 'Домашните', 'Класацията на класа', 'Работните листове', 'Помощните настройки за СОП', 'Грамотите'], TEA, False),
    ('t_help', 'scale', 'Сметко ми спестява време и помага на учениците.', ['Изобщо не съм съгласен', 'Напълно съм съгласен'], TEA, True),
    ('t_payer', 'one', 'Кой е най-вероятно да плати абонамент за клас?', ['Училището', 'Родителите (събрани за класа)', 'Аз лично', 'По проект или програма (МОН, общината)', 'Никой – трябва да е безплатно'], TEA, True),
    ('t_price', 'one', 'Справедлива цена за клас (до 30 ученици) за година:', ['До 50 €', '50–100 €', '100–150 €', '150–250 €', 'Над 250 €'], TEA, False),
    ('t_school', 'one', 'Би ли се заинтересувало училището от абонамент за целия начален етап?', ['Да', 'Може би', 'Не', 'Не знам'], TEA, False),
    ('t_docs', 'many', 'Какво е нужно, за да плати училището?', ['Фактура', 'Договор', 'Одобрение от директора', 'Включване в бюджета или в проект', 'Не знам'], TEA, False),

    ('nps', 'nps', 'Колко вероятно е да препоръчате Сметко на друг родител или учител?', ['Никак', 'Със сигурност'], ALL, True),
    ('best', 'text', 'Кое ви харесва най-много?', [], ALL, False),
    ('missing', 'text', 'Какво липсва или какво да подобрим?', [], ALL, False),
    ('email', 'email', 'Имейл, ако искате да ви пишем (по желание)', [], ALL, False),
]
ROLE_GROUP = {0: PAR, 1: TEA, 2: TEA, 3: TEA, 4: ALL}  # индекс на отговора за „Вие сте…“ → кои въпроси се показват


def e(s):
    return H.escape(str(s))


def field(n, q):
    qid, kind, text, opts, who, req = q
    star = ' <span class="sv-req" aria-hidden="true">*</span>' if req else ' <span class="sv-opt">по желание</span>' if kind not in ('email',) else ''
    head_ = f'<legend><span class="sv-n">{n}</span>{e(text)}{star}</legend>'
    if kind in ('one', 'many'):
        t = 'radio' if kind == 'one' else 'checkbox'
        body = '<div class="sv-opts">' + ''.join(f'<label class="sv-o"><input type="{t}" name="{qid}" value="{i}"><span>{e(o)}</span></label>' for i, o in enumerate(opts)) + '</div>'
        if kind == 'many':
            head_ = head_.replace('</legend>', (' · ' if not req else ' ') + '<small class="sv-hint">може няколко</small></legend>')
    elif kind in ('scale', 'nps'):
        lo, hi = (1, 5) if kind == 'scale' else (0, 10)
        body = f'<div class="sv-scale{" nps" if kind == "nps" else ""}">' + ''.join(f'<label><input type="radio" name="{qid}" value="{v}"><span>{v}</span></label>' for v in range(lo, hi + 1)) + \
               f'</div><div class="sv-ends"><span>{e(opts[0])}</span><span>{e(opts[1])}</span></div>'
    elif kind == 'text':
        body = f'<textarea class="input" name="{qid}" rows="3" maxlength="1500"></textarea>'
    else:
        body = f'<input class="input" type="email" name="{qid}" maxlength="120" autocomplete="email" placeholder="ime@primer.bg"><p class="hint">Само за въпроси по вашите отговори. Не изпращаме реклами.</p>'
    return f'<fieldset class="sv-q" data-q="{qid}" data-for="{who}" data-kind="{kind}"{" data-req" if req else ""}{" hidden" if who != ALL else ""}>{head_}{body}<p class="sv-err" role="alert"></p></fieldset>'


def build():
    form = ''.join(field(i + 1, q) for i, q in enumerate(Q))  # номерата се пренареждат в js/survey.js според ролята
    page = head('Анкета за затворения тест | Сметко', 'Кратка анкета за родителите и учителите в затворения тест на Сметко.', 'anketa.html', [], 'survey-page', noindex=True) + header() + f'''
<main id="main">
<section class="section sv-main"><div class="wrap sv-wrap">
  <div class="sv-intro panel">
    <div class="owl" data-owl="happy"></div>
    <div><h1>Анкета за затворения тест</h1>
    <p>Благодарим ви, че тествате Сметко! Отговорите ще ни помогнат да решим какво да подобрим и какви да са абонаментите. Отнема около <b>3 минути</b>.</p>
    <p class="hint">Анкетата е анонимна – не питаме за имена на деца. Полетата със <span class="sv-req">*</span> са задължителни.</p></div>
  </div>
  <form class="sv-form" id="sv-form" novalidate>
    <div class="sv-bar" aria-hidden="true"><i id="sv-bar"></i></div>
    {form}
    <div class="sv-send"><button class="btn btn-lg btn-green" type="submit">Изпрати отговорите</button><p class="sv-err" id="sv-err" role="alert"></p></div>
  </form>
  <div class="sv-done panel" id="sv-done" hidden>
    <div class="owl" data-owl="cheer"></div>
    <h2>Благодарим ви! 🎉</h2>
    <p>Отговорите са изпратени. Всяко мнение ни помага да направим Сметко по-добър за децата.</p>
    <p class="hint">Ако се сетите за още нещо, пишете ни на <a href="mailto:info@smetko.com">info@smetko.com</a>.</p>
    <div class="hero-cta" style="justify-content:center"><a class="btn btn-lg" href="game.html">🎮 Към играта</a><button class="btn btn-white" type="button" id="sv-again">Промени отговорите</button></div>
  </div>
</div></section>
</main>
''' + FOOTER + scripts(['js/survey.js'])
    write('anketa.html', page)
    # за сървъра и админ панела
    spec = {'questions': [{'id': q[0], 'kind': q[1], 'q': q[2], 'opts': q[3], 'who': q[4], 'req': q[5]} for q in Q], 'roleGroup': {str(k): v for k, v in ROLE_GROUP.items()}}
    with open(os.path.join(OUT, 'api', 'survey_q.json'), 'w', encoding='utf-8') as f:
        json.dump(spec, f, ensure_ascii=False, indent=1)


build()
