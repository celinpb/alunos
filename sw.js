/* =============================================================================
   Portal do Aluno — CELINPB · service worker
   Guarda SÓ os arquivos do app (para abrir rápido e funcionar sem internet).
   Nunca guarda a resposta da consulta: os dados do aluno ficam apenas no
   armazenamento que ele escolheu (sessão ou aparelho).

   A CADA PUBLICAÇÃO, mude VERSAO abaixo (e a versão em config.js): é assim
   que os celulares descobrem que há uma versão nova.
   ============================================================================= */
var VERSAO = 'portal-v1.0.0';
var ARQUIVOS = [
  './',
  'index.html',
  'estilo.css',
  'app.js',
  'config.js',
  'boletim.html',
  'boletim.js',
  'impressao.css',
  'manifest.webmanifest',
  'icones/logo.png',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/apple-touch-icon.png',
  'icones/favicon.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.tipo === 'ATUALIZAR') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  // Só arquivos do próprio portal. A consulta (outro domínio, POST) passa direto.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Páginas: tenta a rede primeiro; sem internet, usa a cópia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }

  // Demais arquivos: cópia guardada da versão atual; se faltar, rede.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (r) { return r || fetch(req); })
  );
});
