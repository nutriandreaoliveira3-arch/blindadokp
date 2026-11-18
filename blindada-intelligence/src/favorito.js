// Fonte do favorito "Salvar na Blindada". Lê SÓ a página que a pessoa está vendo e abre o app com o formulário preenchido.
(() => {
  const q = (s) => document.querySelector(s);
  const m = (n) => q('meta[property="' + n + '"],meta[name="' + n + '"]')?.content || '';
  const h = location.hostname;
  const d = { fonte_url: location.href.split('?')[0] };
  if (h.includes('linkedin.com')) {
    d.nome = q('h1')?.innerText; d.cargo = q('.text-body-medium')?.innerText; d.local = q('.text-body-small.inline')?.innerText;
    d.linkedin = d.fonte_url; d.origem = 'manual';
  } else if (h.includes('instagram.com')) {
    const t = m('og:title') || document.title; const x = t.match(/^(.+?)\s*\(@([\w.]+)\)/);
    d.nome = x ? x[1] : ''; d.instagram = x ? '@' + x[2] : '@' + location.pathname.split('/')[1];
    d.bio = m('og:description') || m('description'); d.origem = 'instagram';
  } else if (h.includes('apollo.io')) {
    const tx = document.body.innerText;
    d.nome = (q('h1')?.innerText || document.title.split('|')[0]).trim();
    const em = (tx.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).find((e) => !e.includes('*') && !/apollo\.io$/i.test(e));
    if (em) d.email = em;
    const tel = (tx.match(/\+\d[\d\s().-]{9,18}\d/g) || [])[0]; if (tel) d.whatsapp = tel;
    const li = [...document.querySelectorAll('a[href*="linkedin.com/in/"]')][0]; if (li) d.linkedin = li.href.split('?')[0];
    const ln = tx.split('\n').map((x) => x.trim()).filter(Boolean); const i = ln.indexOf(d.nome);
    if (i >= 0 && ln[i + 1] && ln[i + 1].length < 140) { const t = ln[i + 1].split(' at '); d.cargo = t[0]; if (t[1]) d.empresa = t[1].split('·')[0].trim(); }
    d.fonte_url = location.href.split('?')[0]; d.bio = 'Contato revelado no Apollo por você'; d.origem = 'manual';
  } else { d.nome = ''; d.bio = document.title; d.origem = 'manual'; }
  const p = Object.entries(d).filter(([, v]) => v).map(([k, v]) => k + '=' + encodeURIComponent(String(v).trim().slice(0, 300))).join('&');
  window.open('https://blindada-intelligence.pages.dev/#salvar?' + p, '_blank');
})();
