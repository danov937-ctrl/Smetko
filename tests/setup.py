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
h = s.get(B + '/admin/').text
csrf = re.search(r'name="csrf" value="([a-f0-9]+)"', h).group(1)
r = s.post(B + '/admin/', data={'csrf': csrf, 'action': 'setup', 'key': KEY,
                                'password': 'testtest123', 'password2': 'testtest123'})
s.get(B + '/api/news.php')               # пуска началните новини, за да не изскачат после
d = sqlite3.connect(DB); d.execute('update news set popup=0'); d.commit(); d.close()
print('настройка:', r.status_code)
