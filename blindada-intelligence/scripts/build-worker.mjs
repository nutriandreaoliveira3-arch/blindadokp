// Gera dist/_worker.js: um único arquivo com a API e a interface embutida.
// Usado para publicar no Cloudflare Pages pelo modo avançado (sem upload de assets).
import { build } from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const arquivos = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/mensagens.js': ['mensagens.js', 'text/javascript; charset=utf-8'],
};
const estaticos = Object.fromEntries(Object.entries(arquivos).map(([rota, [f, tipo]]) => [rota, { tipo, corpo: readFileSync(`public/${f}`, 'utf8') }]));

mkdirSync('dist', { recursive: true });
writeFileSync('dist/entry.js', `
import { onRequest } from '../functions/api/[[path]].js';
const ESTATICOS = ${JSON.stringify(estaticos)};
const SEG = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY' };
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname.slice(5).split('/').filter(Boolean).map(decodeURIComponent);
      return onRequest({ request, env, params: { path } });
    }
    const f = ESTATICOS[url.pathname] || ESTATICOS['/'];
    return new Response(f.corpo, { headers: { 'content-type': f.tipo, 'cache-control': 'no-cache', ...SEG } });
  },
};
`);
await build({ entryPoints: ['dist/entry.js'], bundle: true, format: 'esm', platform: 'neutral', outfile: 'dist/_worker.js', minify: false, logLevel: 'warning' });
console.log('ok dist/_worker.js');
