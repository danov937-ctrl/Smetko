# -*- coding: utf-8 -*-
"""Мисии по учебници: по една мисия за всеки урок от годишното тематично разпределение (ГТР).

Списъците с уроци са в tools/gtr/<id>.txt (първият ред е коментар с издателство и източник).
Този скрипт свързва всеки урок с подходящите задачи от js/math-engine.js и генерира js/textbooks.js.

Стартиране:  python3 tools/build_books.py
Добавяне на учебник: създайте tools/gtr/<id>.txt (по един урок на ред), добавете го в BOOKS долу и пуснете скрипта.
"""
import json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
GTR = os.path.join(ROOT, 'gtr')
OUT = os.path.join(ROOT, '..', 'public_html', 'js', 'textbooks.js')

# id, клас, издателство, заглавие
BOOKS = [
    ('pro1', 1, 'Просвета', 'Математика за 1. клас'),
    ('pp1', 1, 'Просвета Плюс', 'Математика за 1. клас'),
    ('bit1', 1, 'Бит и Техника', 'Математика за 1. клас'),
    ('arh1', 1, 'Архимед', 'Математика за 1. клас'),
    ('bit2', 2, 'Бит и Техника', 'Математика за 2. клас'),
    ('pro3', 3, 'Просвета', 'Математика за 3. клас'),
    ('bit3', 3, 'Бит и Техника', 'Математика за 3. клас'),
    ('bit4', 4, 'Бит и Техника', 'Математика за 4. клас'),
]

NUMW = {'нула': 0, 'едно': 1, 'две': 2, 'три': 3, 'четири': 4, 'пет': 5, 'шест': 6, 'седем': 7, 'осем': 8, 'девет': 9, 'десет': 10}

REVIEW_WORDS = r'упражнение|обобщение|обобщителен|преговор|самопроверка|знам и мога|блицтурнир|уча и играя|проект|олимпийци|светът на математиката|какво научих|завърших|какво знам|вече знам|затвърдяване|смятам'
DIAG_IN = r'входно ниво|ученик съм вече|нови приятели|спомени от лятото|начален преговор'
DIAG_MID = r'междинно ниво'
DIAG_END = r'изходно ниво|какво научих|завърших|годишен преговор(?!\.)|какво знам|щастливо лято'

# начален преговор: умения от предходния клас
PREV = {1: [('count5', 2), ('cmp5', 1), ('shapes', 1)],
        2: [('add20x', 2), ('sub20x', 2), ('add20no', 1), ('tens100', 1)],
        3: [('add100x', 2), ('sub100x', 2), ('mulTable', 2), ('divTable', 2)],
        4: [('add1000x', 2), ('sub1000x', 2), ('mul1d', 2), ('div1d', 2), ('word3', 1)]}


def carry_add(a, b):
    c = 0
    while a or b:
        if a % 10 + b % 10 + c >= 10:
            return True
        c = 1 if a % 10 + b % 10 + c >= 10 else 0
        a //= 10; b //= 10
    return False


def borrow_sub(a, b):
    while b:
        if a % 10 < b % 10:
            return True
        a //= 10; b //= 10
    return False


def topic_skills(g, t, ctx):
    """Умения за урок по заглавието му (без прегледните думи). Връща списък [(умение, тегло)] или []."""
    s = t.lower().replace('ё', 'е')
    S = []
    add = lambda name, w=2: S.append((name, w))
    has = lambda p: re.search(p, s) is not None

    # --- изрази в заглавието (напр. „234 + 123“, „26 . 2“, „625 : 5“) ---
    ex = re.findall(r'(\d[\d ]*)\s*([+–\-.:])\s*(\d+)', t)
    ex = [(int(a.replace(' ', '')), op, int(b)) for a, op, b in ex if op in '+–-.:']

    if g == 1:
        n = ctx.get('n', 5)
        m = re.search(r'(?:число(?:то)?|цифра(?:та)?)\s+(\d+|' + '|'.join(NUMW) + r')\b', s)
        if has(r'числата едно, две, три, четири и пет') or has(r'числата от 1 до 5'):
            ctx['n'] = 5; add('countTo:5', 3); add('cmp5', 1)
        elif m and not has(r'10, 20') and not has(r'^(събиране|изваждане)'):
            k = int(m.group(1)) if m.group(1).isdigit() else NUMW[m.group(1)]
            if k == 0:
                add('zero', 3); add('countTo:5', 1)
            elif k <= 10:
                ctx['n'] = max(ctx.get('n', 0), k, 3 if k < 3 else k)
                add('countTo:%d' % max(k, 3), 3)
                if k >= 3: add('addTo:%d' % k, 1); add('subTo:%d' % k, 1)
                else: add('cmp5', 1)
        rng = re.search(r'до (\d+)', s) or re.search(r'от 1 до (\d+)', s) or re.search(r'от 0 до (\d+)', s)
        lim = int(rng.group(1)) if rng else None
        if has(r'10, 20|10, 20, 30|кръгли десетици'):
            add('tens100', 3)
        elif has(r'\bс 0\b|с числото 0|прибавяне на 0|равни числа|нула') and not m:
            add('zero', 3)
        if has(r'ориентиране|групиране|подреждане|количества|местоположение|позиция'):
            add('count5', 2); add('cmp5', 1)
        if has(r'килограм'): add('kg10', 3); add('addTo:10', 1)
        if has(r'лев|стотинк|пари|монети|банкноти|именувани|магазин|пазар'): add('coins10', 3); add('word10', 1)
        if has(r'\bчас\b|часовник|времето лети'): add('clockHour', 3)
        if has(r'отсечка|сантиметър|измерване|чертане|дължина'): add('cm20', 3)
        if has(r'триъгълник|квадрат|кръг(?!ли)|правоъгълник|фигури'): add('shapes', 2)
        mx = re.search(r'изваждане от числото ([2-9]|10)\b', s)
        if mx: add('subTo:' + mx.group(1), 3)
        if has(r'поредно броене'): add('nextPrev10', 3)
        if has(r'три (и повече )?числа'): add('threeTo:%d' % max(5, n), 3)
        # числа до 20
        if has(r'десетица|единица') and not has('преминаване'): add('place20', 3); add('nextPrev20', 1)
        if has(r'от 11 до (15|20)|от 16 до 20|^числата до 20|едноцифрени и двуцифрени|редно значение|сбор от десетица|от 0 до 20') and not has(r'^(събиране|изваждане)'):
            add('place20', 2); add('nextPrev20', 1); add('cmp20', 1)
        if has(r'сравняване на числата (от 11 )?до 20|сравняване на числата от 11'): add('cmp20', 3)
        # събиране/изваждане до 10
        if lim and lim <= 10 and has(r'събиране|изваждане|смятам') and not has('10, 20'):
            ctx['n'] = max(ctx.get('n', 0), lim)
            if has('събиране'): add('addTo:%d' % lim, 3)
            if has('изваждане'): add('subTo:%d' % lim, 3)
            if has('сравняване'): add('cmpExprTo:%d' % lim, 2)
        elif has(r'^смятам|^числата до 10|числата от 0 до 10') and not S:
            add('addTo:10', 2); add('subTo:10', 2); add('cmp10', 1)
        if has(r'сравняване на сбор|сравняване на разлика|сбор и разлика с число|сбор със сбор|разлика с разлика'):
            add('cmpExprTo:%d' % max(5, ctx.get('n', 5)), 3)
        elif has(r'сравняване') and lim and lim <= 10:
            add('cmpExprTo:%d' % lim, 1); add('cmp10' if lim > 5 else 'cmp5', 2)
        elif has(r'по-голямо, равно|сравняване на числа$|числата 1 и 2'):
            add('cmp5', 3)
        if has(r'действие събиране|^събиране и изваждане$') and not S:
            if ctx.get('n', 3) > 10: add('add20x' if ctx.get('x') else 'add20no', 2); add('sub20x' if ctx.get('x') else 'sub20no', 2)
            else: add('addTo:3', 2); add('subTo:3', 1)
        if has(r'събиране на числата (0, )?1, 2') : add('addTo:5', 3)
        if has(r'изваждане на числ(ото|ата) [0-5](?!\d)'): add('subTo:5', 3)
        if has(r'действие изваждане'): add('subTo:3', 3)
        if has(r'разместително|вертикален запис'): add('addTo:%d' % max(5, ctx.get('n', 5)), 2)
        if has(r'проверка на изваждането'): add('subTo:%d' % max(7, ctx.get('n', 7)) if ctx.get('n', 5) <= 10 else 'sub20x', 3)
        # до 20 без преминаване (по примерите)
        pats = {'add10plus': r'10 \+ \d|10 с числата|събиране на числото 10', 'sub10minus': r'1(\d) – (10|\1)\b|изваждане на числото 10',
                'add20no': r'1[0-7] \+ [1-7]\b|двуцифрено число с едноцифрено число|двуцифрено с едноцифрено', 'sub2d2d20': r'1\d – 1[1-9]|двуцифрено от двуцифрено|изваждане на двуцифрени числа',
                'make20': r'сбор 20|от 20|20 – \d|18 \+ 2|16 \+ 4'}
        for k, p in pats.items():
            if has(p) and not has(r'с преминаване|по-голям'): add(k, 3)
        nb = [(int(x), int(y)) for x, y in re.findall(r'\b1(\d) – (\d)\b', s)]
        if nb and all(x > y for x, y in nb) and not has(r'с преминаване'): add('sub20no', 3)
        if has(r'сбор(?:ът)? (\d+)') and not has('сбор 20'):
            vals = [int(x) for x in re.findall(r'\d+', s.split('сбор', 1)[1])[:2] if 11 <= int(x) <= 18]
            if vals: add('sumN:' + ','.join(map(str, vals)), 3)
        mm = re.findall(r'\((\d) \+ (\d)', t)
        if mm and has('преминаване') and not has('без'):
            sums = sorted(set(int(a) + int(b) for a, b in re.findall(r'(\d) \+ (\d)', t) if int(a) + int(b) > 10))
            if sums: add('sumN:' + ','.join(map(str, sums)), 3)
        subs = sorted(set(int(x) for x in re.findall(r'(1[1-8]) – \d\b', t)))
        if subs and has('преминаване') and not has('без'): add('subFromN:' + ','.join(map(str, subs)), 3)
        mfrom = re.search(r'изваждане (?:на едноцифрен\w* числ\w* )?от ((?:1[1-8])(?:,? (?:и )?1[1-8])*)', s)
        if mfrom and not has('без') and not any(x[0].startswith('subFromN') for x in S):
            add('subFromN:' + ','.join(re.findall(r'1[1-8]', mfrom.group(1))), 3)
        mnine = re.search(r'събиране на ([6-9]) с едноцифрено', s)
        if mnine: add('fillTo10:%d' % (10 - int(mnine.group(1))), 3)
        mfill = re.search(r'допълване с ([\d, и]+)', s)
        if mfill: add('fillTo10:' + ','.join(re.findall(r'\d', mfill.group(1))), 3)
        if has(r'с преминаване|по-голям от 10|втори начин') and not any(x[0].startswith(('sumN', 'subFromN', 'fillTo10')) for x in S):
            if not has('изваждане') or has('събиране'): add('add20x', 2)
            if has('изваждане') or not has('събиране'): add('sub20x', 2)
        if has(r'без преминаване|изучени случаи') and not any(x[0] in ('add10plus', 'sub10minus', 'add20no', 'sub20no', 'sub2d2d20', 'make20') for x in S):
            add('add20no', 2); add('sub20no', 2); add('cmpExpr20', 1)
        if has(r'събираемо\. сбор|събираемо, сбор'): add('add20no', 2)
        if has(r'умаляемо|умалител'): add('sub20x' if ctx.get('x') else 'sub20no', 3)
        if has(r'разликата им е едноцифрено'): add('sub20x', 3)
        if has(r'едноцифрено (число )?от двуцифрено') and not has(r'с преминаване|разликата'): add('sub20no', 3)
        if has(r'текстов|задачи$|в магазина'): add('word20' if ctx.get('n', 5) > 10 else 'word10', 3)
        if has(r'до 20') and has(r'събиране|изваждане') and not S:
            add('add20x' if ctx.get('x') else 'add20no', 2); add('sub20x' if ctx.get('x') else 'sub20no', 2)
        if has('преминаване') and not has('без'): ctx['x'] = True
        if has(r'1[1-9]|20') or has('десетица'): ctx['n'] = max(ctx.get('n', 5), 20)

    elif g == 2:
        if has(r'числата до 20') and has(r'10, 20'): add('add20x', 1); add('tens100', 2)
        elif has(r'до 20 без'): add('add20no', 2); add('sub20no', 2)
        elif has(r'до 20 с'): add('add20x', 2); add('sub20x', 2)
        elif has(r'с числата 10, 20'): add('tens100', 3)
        if has(r'от 21 до 100|числата до 100(?! без| с)'): add('place100', 3); add('nextPrev100', 1)
        if has(r'сравняване'): add('cmp100', 3)
        if has(r'дециметър|метър|сантиметър'): add('units2', 3)
        if has(r'без преминаване|кръгли десетици') and not has('до 20'): add('add100no', 3); add('sub100no', 3)
        if has(r'числов израз|сбор на три|три и повече числа'): add('three100', 3)
        if has(r'разместително|съдружително') and has('събирането'): add('three100', 2); add('add100no', 2)
        if has(r'скоби') and not has('без скоби'): add('brackets', 3)
        if has(r'без скоби'): add('orderNoBr', 3)
        if has(r'неизвестно събираемо'): add('unkAddend', 3)
        if has(r'текстов'): add('word2steps', 3)
        if has(r'обиколка'): add('perim2', 3)
        if has(r'триъгълни|чертане на правоъгълник|пентамино|фигурите'): add('triSides', 2); add('perim2', 1)
        if has(r'двуцифрени числа с едноцифрени с преминаване|събиране на двуцифрени числа с едноцифрени'): add('add2d1dX', 3)
        if has(r'едноцифрени числа от двуцифрени'): add('sub2d1dX', 3)
        if has(r'двуцифрени числа с едноцифрени$'): add('add2d1dX', 2); add('sub2d1dX', 2)
        if has(r'събиране на двуцифрени числа с преминаване'): add('add100x', 3)
        if has(r'изваждане на двуцифрени числа с преминаване'): add('sub100x', 3)
        if has(r'с преминаване') and has(r'събиране и изваждане') and not has('до 20'): add('add100x', 2); add('sub100x', 2)
        if has(r'сбор(?:а)? на три и повече числа до 100'): add('three100', 3)
        if has(r'сбор 100|от 100'): add('make100', 3)
        if has(r'до 100') and has(r'видове триъгълници'): add('add100x', 1)
        if has(r'магазин|книжарницата|библиотеката'): add('notes100', 2); add('word2steps', 2)
        mul = re.findall(r'(?:умножение|деление)[^,.]*?\b(?:с|със)\s+((?:\d+(?:,\s*|\s+и\s+(?:с\s+)?)?)+)', s)
        dl = sorted(set(int(x) for grp in mul for x in re.findall(r'\d+', grp)))
        if has(r'до 6$'): dl = [2, 3, 4, 5, 6]
        if dl and not has(r'\bс 0\b'): add('mulDivBy:' + ','.join(map(str, dl)), 4)
        elif has(r'^умножение$|^умножение и деление$'): add('repAdd', 2); add('mulDivBy:2,3', 2)
        elif has(r'^деление$'): add('mulDivBy:2', 2); add('divTable', 1)
        if has(r'разместително свойство на умножението|съдружително свойство на умножението'): add('mulTable', 3)
        if has(r'пъти'): add('timesWord', 3)
        if has(r'връзка между|проверка на делението'): add('mulTable', 2); add('divTable', 2)
        if has(r'четни'): add('evenOdd', 3)
        if has(r'равни числа'): add('mulEqual', 3)
        if has(r'\bс 0\b|нулата'): add('zeroMul', 3)
        if has(r'неизвестен множител'): add('unkFactor', 3)
        if has(r'таблично'): add('mulTable', 3); add('divTable', 3)
        if has(r'минута|денонощие|седмица|месец|година|час'): add('time2', 3); add('clockHM', 1)
        if has(r'зоопарка|животните'): add('mulTable', 2); add('timesWord', 1)

    elif g == 3:
        if has(r'100, 200'): add('place1000', 3)
        if has(r'от 101 до 1000|стот\.|сбор на стотици|редицата|числата до 1000(?! с| без)') and not has(r'събиране|изваждане|умножение|деление'): add('place1000', 3); add('nextPrev1000', 2)
        if has(r'сравняване'): add('cmp1000', 3)
        if has(r'\bправа\b|\bкрива\b|\bлъч|\bлини'): add('lines', 3)
        if has(r'километър|милиметър|за време и (за )?дължина|мерни единици$'): add('units3a', 3)
        if has(r'грам|тон\b|секунда'): add('units3b', 3)
        if has(r'\bвек\b|миналото|имало едно време'): add('century', 3)
        if has(r'неизвестно умаляемо'): add('unkMinuend', 3)
        if has(r'неизвестно делимо'): add('unkDividend', 3)
        if has(r'неизвестно число'): add('unkMinuend', 2); add('unkDividend', 2)
        if has(r'триъгълници според ъглите'): add('triAngles', 3)
        elif has(r'\bъгъл|\bъгли'): add('angles', 3)
        if has(r'геометрични(те)? фигури|именуване на геометрични'): add('angles', 2); add('lines', 1); add('triAngles', 1)
        if has(r'чертане на триъгълник'): add('triAngles', 2)
        if has(r'до 100\b') and has('без преминаване'): add('add100no', 2); add('sub100no', 2)
        elif has(r'до 100\b') and has('с преминаване'): add('add100x', 2); add('sub100x', 2)
        elif has(r'без преминаване|кръгли стотици|с цифра на единиците 0') and not has(r'умножение|деление'):
            if has('събиране') or not has('изваждане'): add('add1000no', 3)
            if has('изваждане') or not has('събиране'): add('sub1000no', 3)
        elif has(r'преминаване') and not has(r'умножение|деление'):
            if has('събиране') or not has('изваждане'): add('add1000x', 3)
            if has('изваждане') or not has('събиране'): add('sub1000x', 3)
        if has(r'сбор 1000|от 1000'): add('make1000', 3)
        for a, op, b in ex:
            if op == '+' and b < 1000: add('add1000x' if carry_add(a, b) else 'add1000no', 3)
            elif op in '–-' and b < 1000: add('make1000' if a == 1000 else ('sub1000x' if borrow_sub(a, b) else 'sub1000no'), 3)
            elif op == '.': add('mul1d', 3)
            elif op == ':': add('div0q' if a == 324 else 'div1d', 3)
        if has(r'косвена'): add('wordIndirect', 3)
        elif has(r'текстов'):
            add('word3' if ctx.get('mul') else 'wordAddSub1000', 3)
        if has(r'таблично'): add('mulTable', 3); add('divTable', 3)
        if has(r'умножение на сбор|разпределително'): add('distrib', 3)
        elif has(r'умножение') and not has('таблично'): add('mul1d', 3); ctx['mul'] = True
        if has(r'деление на сбор'): add('divSum', 3)
        elif has(r'получава 0|0 в реда'): add('div0q', 3)
        elif has(r'деление') and not has('таблично'): add('div1d', 3); ctx['mul'] = True
        for k, p in ((2, 'половинка'), (3, 'третинка'), (4, 'четвъртинка'), (10, 'десетинка')):
            if has(p): add('partsN:%d' % k, 3)
        if has(r'устно смятане'): add('mul1d', 2); add('div1d', 2); add('add1000no', 1)
        if has(r'^събиране и изваждане( на числата до 1000)?$') and not S: add('add1000x' if ctx.get('x') else 'add1000no', 2); add('sub1000x' if ctx.get('x') else 'sub1000no', 2)
        if has(r'^умножение$') : pass
        if has(r'преминаване') or any(op in '+–-' and (carry_add(a, b) if op == '+' else borrow_sub(a, b)) for a, op, b in ex): ctx['x'] = True

    elif g == 4:
        if has(r'до 1000\. преговор') and has('събиране'): add('add1000x', 2); add('sub1000x', 2)
        if has(r'1001|10 000|100 000|милион|естествени|клас, ред|бройна система|редове') and not has(r'събиране|изваждане|умножение|деление'): add('placeBig', 3); add('nextPrevBig', 1)
        if has(r'сравняване'): add('cmpBig', 3)
        if has(r'римски'): add('romanRead', 3); add('romanWrite', 2)
        if has(r'без преминаване') and not has(r'умножение|деление'): add('addBigNo', 3); add('subBigNo', 3)
        if has(r'(едно|две|повече от две) преминава') and not has(r'умножение|деление'):
            if has('събиране') or not has('изваждане'): add('addBigX', 3)
            if has('изваждане') or not has('събиране'): add('subBigX', 3)
        if has(r'кръгли хиляди'): add('makeThousand', 3)
        if has(r'^събиране и изваждане на многоцифрени числа$'): add('addBigX', 2); add('subBigX', 2)
        if has(r'неизвестен умалител'): add('unkSubtrahend', 3)
        if has(r'неизвестен делител'): add('unkDivisor', 3)
        if has(r'неизвестно число'): add('unkSubtrahend', 2); add('unkDivisor', 1)
        if has(r'градус|транспортир|\bъгъл'): add('degrees', 3)
        if has(r'тела|куб|паралелепипед|пирамида|конус|цилиндър|кълбо'): add('solidsName', 3); add('solidsCount', 2)
        if has(r'страна на правоъгълник'): add('sideFromArea', 3)
        elif has(r'лице'): add('area', 3); add('areaUnits', 2); add('wordArea', 1)
        if has(r'мерни единици$'): add('areaUnits', 2); add('units3a', 1); add('units3b', 1)
        mulw = has(r'умножение'); divw = has(r'деление')
        if has(r'10, 100, 1000|20, 30'):
            if mulw: add('mulRound10', 3)
            if divw: add('divRound10', 3)
        elif has(r'двуцифрено'):
            if mulw: add('mul2d', 3)
            if divw: add('div2d', 3)
        elif has(r'едноцифрено') or has(r'^деление') or has(r'^умножение'):
            if mulw: add('mul2d' if ctx.get('d2') else 'mulBig1d', 3)
            if divw: add('div2d' if ctx.get('d2') else 'divBig1d', 3)
        if has('двуцифрено') and (mulw or divw): ctx['d2'] = True
        if has(r'до 1000\. преговор|до 1000 с едноцифрено'):
            S[:] = [x for x in S if x[0] not in ('mulBig1d', 'divBig1d')]
            if mulw: add('mul1d', 3)
            if divw: add('div1d', 3)
        if has(r'калкулатор'): add('calcWord', 3); add('mul2d', 1)
        if has(r'текстов|проблемна ситуация|оферти|резултатите от решена'): add('wordBig', 3); add('calcWord', 1)
        if has(r'неизвестно число|намиране на неизвестно'): add('unkSubtrahend', 1)
    # обединяване на повторенията
    out = {}
    for k, w in S:
        if k is None: continue
        out[k] = max(out.get(k, 0), w)
    return [[k, w] for k, w in out.items()]


def level_of(t, prev_same):
    s = t.lower()
    if re.search(r'обобщение|обобщителен|самопроверка|преговор|знам и мога|блицтурнир|ниво|какво научих|завърших|какво знам|вече знам|олимпийци|диагностика', s):
        return 3
    if re.search(r'упражнение|затвърдяване|уча и играя|проект', s) or prev_same:
        return 2
    return 1


def display(t, last_topic):
    """По-ясно заглавие за картата (оригиналното заглавие се пази)."""
    s = t.strip()
    if re.fullmatch(r'[\d\s+–\-.:,=]+', s):
        ops = set(re.findall(r'[+–\-.:]', s.replace(', ', ' ')))
        name = 'Събиране и изваждане' if {'+', '–'} <= ops or {'+', '-'} <= ops else 'Събиране' if '+' in ops else 'Изваждане' if ops & {'–', '-'} else 'Умножение' if '.' in ops else 'Деление'
        return name + ': ' + s.replace(' . ', ' × ').replace(' : ', ' : ')
    if re.fullmatch(r'(упражнение|обобщение)( (№ )?\d+)?', s, re.I) and last_topic:
        base = re.split(r'[.(]', last_topic)[0].strip()
        return base + ' · ' + s
    return s.replace(' . ', ' × ')


def build_book(bid, grade):
    path = os.path.join(GTR, bid + '.txt')
    lines = [l.strip() for l in open(path, encoding='utf-8')]
    source = ''
    if lines and lines[0].startswith('#'):
        m = re.search(r'https?://\S+', lines[0]); source = m.group(0) if m else ''
    lessons = [l for l in lines if l and not l.startswith('#')]
    ctx = {'n': 3 if grade == 1 else 0}
    history = []  # умения от последните уроци с нови знания
    allsk = []
    missions = []
    last_topic = ''
    prev_title = None; rep = 0
    for i, t in enumerate(lessons):
        low = t.lower()
        same = (t == prev_title)
        rep = rep + 1 if same else 0
        prev_title = t
        sk = topic_skills(grade, re.sub(r'^годишен преговор[:.]?\s*', '', t, flags=re.I), ctx)
        lvl = level_of(t, same)
        kind = 'new'
        if re.search(DIAG_IN, low) and i < 8:
            sk = sk or [[k, w] for k, w in PREV[grade]]; lvl = 2; kind = 'diag'
        elif re.search(DIAG_MID, low) or (re.search(DIAG_END, low) and not sk):
            # равномерно от цялата година: най-честото умение от всяка шестина (без най-лесните)
            easy = ('countTo', 'count5', 'cmp5', 'shapes', 'zero', 'nextPrev10')
            cand = [k for k, w in allsk if not k.startswith(easy)] or [k for k, w in allsk]
            seen, pick, n6 = set(), [], max(1, len(cand) // 6)
            for c in range(0, len(cand), n6):
                chunk = cand[c:c + n6]; best = max(set(chunk), key=chunk.count) if chunk else None
                if best and best not in seen: seen.add(best); pick.append([best, 2])
            sk = pick or [[k, w] for k, w in PREV[grade]]; lvl = 3; kind = 'diag'
        elif not sk:
            # преглед/игра/проект: уменията от последните уроци
            win, seen = [], set()
            for h in reversed(history):
                for k, w in h:
                    if k not in seen: seen.add(k); win.append([k, 2])
                if len(win) >= 5: break
            sk = win or [[k, w] for k, w in PREV[grade]]
            lvl = max(lvl, 2); kind = 'review'
        if kind == 'new':
            history.append(sk); last_topic = t if not re.fullmatch(r'(упражнение|обобщение)( (№ )?\d+)?', t, re.I) else last_topic
            allsk.extend((k, w) for k, w in sk)
            if re.search(REVIEW_WORDS, low): lvl = max(lvl, 2)
        if same: lvl = min(3, level_of(t, False) + rep)
        title = display(t, last_topic)
        if same: title += ' · ' + ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][min(rep, 7)]
        missions.append([title, sk, lvl])
    return source, missions


# ---------- „По учебната програма“ (общ ред) ----------
SKILL_TITLES = {
    'count5': 'Броим до 5', 'add5': 'Събиране до 5', 'sub5': 'Изваждане до 5', 'cmp5': 'Сравняване до 5', 'shapes': 'Геометрични фигури',
    'add10': 'Събиране до 10', 'sub10': 'Изваждане до 10', 'decomp10': 'Разлагане на числата до 10', 'three10': 'Три числа до 10', 'missing10': 'Липсващото число',
    'cmp10': 'Сравняване до 10', 'coins10': 'Пари: евро и центове', 'kg10': 'Килограм', 'word10': 'Текстови задачи до 10',
    'place20': 'Десетици и единици до 20', 'nextPrev20': 'Преди и след до 20', 'cmp20': 'Сравняване до 20', 'cm20': 'Сантиметър и отсечки',
    'add20no': 'Събиране до 20 без преминаване', 'sub20no': 'Изваждане до 20 без преминаване', 'cmpExpr20': 'Сравняване на изрази до 20', 'word20': 'Текстови задачи до 20',
    'add20x': 'Събиране с преминаване до 20', 'sub20x': 'Изваждане с преминаване до 20', 'clockHour': 'Час', 'tens100': 'Кръгли десетици до 100', 'notes100': 'Банкноти и монети',
    'place100': 'Числата до 100', 'cmp100': 'Сравняване до 100', 'nextPrev100': 'Преди и след до 100', 'units2': 'См, дм, м',
    'add100no': 'Събиране до 100 без преминаване', 'sub100no': 'Изваждане до 100 без преминаване', 'brackets': 'Скоби и ред на действията', 'unkAddend': 'Неизвестно събираемо',
    'add100x': 'Събиране до 100 с преминаване', 'sub100x': 'Изваждане до 100 с преминаване', 'perim2': 'Обиколка', 'triSides': 'Видове триъгълници', 'word2steps': 'Задачи с две пресмятания',
    'mulTable': 'Таблица за умножение', 'divTable': 'Таблично деление', 'unkFactor': 'Неизвестен множител', 'evenOdd': 'Четни и нечетни', 'timesWord': 'Пъти повече, пъти по-малко',
    'time2': 'Минута, час, денонощие', 'clockHM': 'Часовник: часове и минути',
    'place1000': 'Числата до 1000', 'cmp1000': 'Сравняване до 1000', 'nextPrev1000': 'Преди и след до 1000', 'lines': 'Права, крива, лъч',
    'add1000no': 'Събиране до 1000 без преминаване', 'sub1000no': 'Изваждане до 1000 без преминаване', 'unkMinuend': 'Неизвестно умаляемо', 'angles': 'Видове ъгли', 'units3a': 'Мм, см, м, км',
    'add1000x': 'Събиране до 1000 с преминаване', 'sub1000x': 'Изваждане до 1000 с преминаване', 'triAngles': 'Триъгълници според ъглите', 'century': 'Век', 'word3': 'Текстови задачи',
    'mul1d': 'Умножение с едноцифрено число', 'distrib': 'Умножение на сбор с число', 'parts': 'Половинка, третинка, четвъртинка', 'div1d': 'Деление с едноцифрено число',
    'unkDividend': 'Неизвестно делимо', 'units3b': 'Грам, тон, секунда',
    'placeBig': 'Многоцифрени числа', 'cmpBig': 'Сравняване на многоцифрени числа', 'nextPrevBig': 'Преди и след', 'romanRead': 'Римски цифри', 'romanWrite': 'Пишем с римски цифри',
    'addBigNo': 'Събиране без преминаване', 'subBigNo': 'Изваждане без преминаване', 'unkSubtrahend': 'Неизвестен умалител', 'degrees': 'Градус и ъгли',
    'addBigX': 'Събиране с преминаване', 'subBigX': 'Изваждане с преминаване', 'solidsName': 'Геометрични тела', 'solidsCount': 'Стени, ръбове, върхове', 'wordBig': 'Текстови задачи',
    'mulBig1d': 'Умножение с едноцифрено число', 'area': 'Лице на правоъгълник', 'areaUnits': 'Мерни единици за лице', 'wordArea': 'Задачи за лице',
    'divBig1d': 'Деление с едноцифрено число', 'unkDivisor': 'Неизвестен делител', 'sideFromArea': 'Страна по дадено лице', 'mul2d': 'Умножение с двуцифрено число',
    'calcWord': 'Задачи с умножение', 'div2d': 'Деление с двуцифрено число',
}


def mon_book(grade, topics):
    """Общ ред по темите на МОН: за всяка тема – нови знания по умения, упражнения, обобщение и проверка."""
    ms = [['Входно ниво', [[k, w] for k, w in PREV[grade]], 2]]
    allk = []
    for t in topics:
        sk = t['skills']  # [име, тегло, ниво]
        main = [x for x in sk if x[1] >= 2] or sk
        T = lambda name: SKILL_TITLES.get(name, t['short'])
        for name, w, lv in sk:                                   # нови знания
            ms.append([T(name), [[name, 1]], 1])
        for a, b in zip(sk, sk[1:]):                             # двойки съседни умения
            ms.append([T(a[0]) + ' и ' + T(b[0]).lower(), [[a[0], 1], [b[0], 1]], 2])
        for name, w, lv in sk:                                   # упражнение
            ms.append([T(name) + ' · упражнение', [[name, 3]] + [[x[0], 1] for x in main if x[0] != name][:2], 2])
        ms.append([t['short'] + ' · Упражнение', [[x[0], x[1]] for x in sk], 2])
        for name, w, lv in sk:                                   # трудни задачи
            ms.append([T(name) + ' · трудни задачи', [[name, 1]], 3])
        ms.append([t['short'] + ' · Обобщение', [[x[0], x[1]] for x in sk], 3])
        ms.append([t['short'] + ' · Блицтурнир', [[x[0], 1] for x in main], 3])
        ms.append([t['short'] + ' · Самопроверка', [[x[0], 1] for x in sk], 3])
        allk.extend(x[0] for x in main)
    pick = allk[::max(1, len(allk) // 6)][:6]
    ms.append(['Годишен преговор · I', [[k, 1] for k in pick], 2])
    ms.append(['Годишен преговор · II', [[k, 1] for k in allk[1::max(1, len(allk) // 6)][:6]], 3])
    ms.append(['Годишен преговор · III', [[k, 1] for k in allk[2::max(1, len(allk) // 6)][:6]], 3])
    ms.append(['Изходно ниво', [[k, 1] for k in pick], 3])
    return ms


def main():
    # темите на МОН се четат от math-engine.js (за да не се дублират)
    eng = open(os.path.join(ROOT, '..', 'public_html', 'js', 'math-engine.js'), encoding='utf-8').read()
    grades = {}
    for g in range(1, 5):
        block = eng.split("%d: { name: '%d. клас'" % (g, g))[1].split('\n    ] }')[0]
        topics = []
        for m in re.finditer(r"\{ id: '(\w+)', name: '([^']+)', short: '([^']+)', skills: \[(.*?)\] \}", block):
            sk = [[a, int(b), int(c)] for a, b, c in re.findall(r"\['(\w+)', (\d+), (\d+)\]", m.group(4))]
            topics.append({'id': m.group(1), 'short': m.group(3), 'skills': sk})
        grades[g] = topics
    data = {g: [] for g in range(1, 5)}
    report = []
    for bid, g, pub, title in BOOKS:
        source, missions = build_book(bid, g)
        data[g].append({'id': bid, 'publisher': pub, 'title': title, 'source': source, 'missions': missions})
        report.append('%s: %d мисии' % (bid, len(missions)))
    mon = {g: mon_book(g, grades[g]) for g in range(1, 5)}
    for g in range(1, 5): report.append('mon%d: %d мисии' % (g, len(mon[g])))
    js = '''/* Сметко — мисии по учебници. ГЕНЕРИРАН ФАЙЛ – не редактирайте ръчно.
   Източник: tools/gtr/*.txt (уроците от годишните тематични разпределения) → python3 tools/build_books.py
   По една мисия за всеки урок. Формат: [заглавие, [[умение, тегло], ...], ниво 1–3]
   ⚠ Парите са в евро (от 1.1.2026 г.), дори когато разпределението е с „лев, стотинка“. */
(function () {
  'use strict';
  var BOOKS = ''' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ''';
  var MON = ''' + json.dumps(mon, ensure_ascii=False, separators=(',', ':')) + ''';
  function programBook(grade) { return { id: 'mon', publisher: 'Учебна програма на МОН', title: 'Общ ред, подходящ за всички учебници', missions: MON[grade] || [] }; }
  function list(grade) { return [programBook(grade)].concat(BOOKS[grade] || []); }
  function get(grade, id) { var l = list(grade); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }
  window.Smetko = window.Smetko || {};
  window.Smetko.Books = { list: list, get: get, BOOKS: BOOKS };
})();
'''
    open(OUT, 'w', encoding='utf-8').write(js)
    print('\n'.join(report))


if __name__ == '__main__':
    main()
