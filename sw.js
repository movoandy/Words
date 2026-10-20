// 离线缓存：页面本体预先缓存；词典分片查到哪块存哪块，也可以在页面上一次性下载全部
const SHELL = 'shell-v2';
const DICT = 'dict-v2';
const SHELL_FILES = ['./', './index.html', './manifest.json', './top.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== DICT).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isDict = /\/d\d+\.dat$/.test(url.pathname);
  if (isDict) {
    // 词典分片内容固定：先看缓存，没有再下载并存起来
    e.respondWith(caches.open(DICT).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  // 页面本体：联网时取最新的并更新缓存，断网时用缓存
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) caches.open(SHELL).then(c => c.put(e.request, res.clone()));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
