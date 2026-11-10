// Renderiza cada <section class="slide"> de um HTML em JPEG 1080x1350.
// Uso: node ferramentas/render_carrossel.js <carrossel.html> <pasta_saida>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [html, out] = process.argv.slice(2);
  if (!html || !out) {
    console.error('Uso: node render_carrossel.js <carrossel.html> <pasta_saida>');
    process.exit(1);
  }
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  const slides = await page.$$('section.slide');
  for (let i = 0; i < slides.length; i++) {
    const f = path.join(out, `slide_${String(i + 1).padStart(2, '0')}.jpg`);
    await slides[i].screenshot({ path: f, type: 'jpeg', quality: 95 });
    console.log(f);
  }
  await browser.close();
})();
