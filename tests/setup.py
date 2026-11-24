# -*- coding: utf-8 -*-
"""Нулира базата и я подготвя за тестовете: администратор и изгасени изскачащи новини."""
import glob, os, re, sqlite3, sys
import requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import B, ROOT

DB = os.path.join(ROOT, 'api', 'data', 'smetko.sqlite')
KEY = '9FE4C-8R8MN-73MKE-Q47EE'          # ключът за първоначална настройка (в хранилището е само отпечатъкът му)

for f in glob.glob(DB + '*'):
    os.remove(f)

s = requests.Session()
s.post(B + '/api/config.php', json={})
# към index.php, не към папката: вграденият сървър на php пренасочва /admin/ и губи данните от формата
h = s.get(B + '/admin/index.php').text
csrf = re.search(r'name="csrf" value="([a-f0-9]+)"', h).group(1)
r = s.post(B + '/admin/index.php', data={'csrf': csrf, 'action': 'setup', 'key': KEY,
                                         'password': 'testtest123', 'password2': 'testtest123'})
import sqlite3 as _s
_d = _s.connect(DB); _ok = _d.execute("select count(*) from settings where k='admin_hash'").fetchone()[0]; _d.close()
assert _ok, 'администраторът не се създаде'
s.get(B + '/api/news.php')               # пуска началните новини, за да не изскачат после
d = sqlite3.connect(DB); d.execute('update news set popup=0'); d.commit(); d.close()
print('настройка:', r.status_code)
