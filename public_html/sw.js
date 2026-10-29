/* Сметко — Service Worker: офлайн игра и бързо зареждане.
   При всяка промяна на файловете увеличете VERSION, за да се обнови кешът. */
const VERSION = 'smetko-v27';
const CORE = [
  '/', '/game.html', '/achievements.html', '/pricing.html', '/about.html', '/uchilishta.html', '/rabotni-listove.html',
  '/kod.html', '/klasaciya.html', '/liga.html', '/otchet.html', '/za-nas.html', '/novini.html', '/vhod.html', '/registracia.html', '/profil.html', '/tablo.html', '/matematika-1-klas.html', '/matematika-2-klas.html', '/matematika-3-klas.html', '/matematika-4-klas.html', '/404.html',
  '/css/style.css?v=27', '/css/animations.css?v=27',
  '/js/owl.js?v=27', '/js/gamification.js?v=27', '/js/audio.js?v=27', '/js/math-engine.js?v=27', '/js/lesson-map.js?v=27', '/js/textbooks.js?v=27',
  '/js/access.js?v=27', '/js/account.js?v=27', '/js/app.js?v=27', '/js/a11y.js?v=27', '/js/wardrobe.js?v=27', '/js/game.js?v=27', '/js/achievements.js?v=27', '/js/tools.js?v=27', '/js/league.js?v=27', '/js/report.js?v=27', '/js/homework.js?v=27', '/js/tablo.js?v=27', '/js/challenge.js?v=27', '/js/quiz.js?v=27', '/tablica-za-umnozhenie.html', '/testove-po-matematika.html',
  '/assets/images/landscape.svg', '/assets/fonts/nunito.woff', '/assets/icons/favicon.svg', '/assets/icons/icon-192.png', '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Шрифтове от Google: кеширай при първо зареждане
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/admin') === 0) return; // никога не кеширай сървърните части

  // HTML: първо мрежата (свежо съдържание), при липса на интернет — кеша
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Останалото (CSS, JS, изображения): първо кеша, после мрежата
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
