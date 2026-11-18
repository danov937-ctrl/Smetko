/* Прави PDF за печат от tools/sbornik/index.html → tools/sbornik/Sbornik-NVO-4-klas.pdf
   Стартиране: node tools/sbornik.js && node tools/sbornik_pdf.js */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

const ASSETS = path.join('..', '..', 'public_html', 'assets');
const JOBS = [
  /* целият сборник е безплатен – слага се направо в сайта */
  ['index.html', path.join(ASSETS, 'Smetko-NVO-4-klas-sbornik.pdf')],
  ['sample.html', path.join(ASSETS, 'Smetko-NVO-4-klas-izvadka.pdf')],
];
(async () => {
  const dir = path.join(__dirname, 'sbornik');
  if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error('Първо пуснете: node tools/sbornik.js'); process.exit(1); }
  const b = await chromium.launch();
  for (const [file, target] of JOBS) {
  const src = path.join(dir, file);
  const p = await b.newPage();
  await p.goto('file://' + src, { waitUntil: 'networkidle' });
  const out = path.resolve(dir, target);
  await p.pdf({
    path: out, format: 'A4', printBackground: true,
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font-size:8pt;color:#8A96AC;
      font-family:'DejaVu Sans',Arial,sans-serif;padding:0 14mm;display:flex;justify-content:space-between">
      <span>Подготовка за НВО по математика · 4. клас</span>
      <span>smetko.com · <span class="pageNumber"></span></span></div>`,
  });
  await p.close();
  console.log(`PDF: ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  }
  await b.close();
})();
