# -*- coding: utf-8 -*-
"""Общото за тестовете: адреси, брояч на проверките и подготовка на браузъра."""
import os, sys

B = 'http://127.0.0.1:8093'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public_html')
TOOLS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools')

# съгласие за бисквитките и „видяни новини“, за да не изскача нищо върху страницата
INIT = ("try{localStorage.setItem('smetko.consent',JSON.stringify({v:1,stats:false,t:Date.now()}));"
        "localStorage.setItem('smetko.newsSeen',JSON.stringify(Array.from({length:400},(_,i)=>i+1)))}catch(e){}")

_bad = [0]


def ok(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        _bad[0] += 1
    return bool(cond)


def done(errs=()):
    if errs:
        print('JS грешки: ' + str(list(errs)[:3]))
    n = _bad[0] + (1 if errs else 0)
    print('FAILS %d' % n)
    sys.exit(1 if n else 0)


def page(ctx, errs=None):
    """Нова страница, която събира грешките от JS."""
    p = ctx.new_page()
    if errs is not None:
        p.on('pageerror', lambda e: errs.append(str(e)))
    return p
