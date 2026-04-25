const CACHE = 'erse-academy-v1';
const ASSETS = [
  '/erse-academy/',
  '/erse-academy/index.html',
  '/erse-academy/manifest.json'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  if(e.request.url.includes('firebase') ||
     e.request.url.includes('googleapis') ||
     e.request.url.includes('groq') ||
     e.request.url.includes('gstatic')){
    return;
  }
  e.respondWith(
    fetch(e.request).catch(()=>
      caches.match(e.request).then(r=>r||caches.match('/erse-academy/'))
    )
  );
});
