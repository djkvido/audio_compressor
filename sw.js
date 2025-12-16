const CACHE_NAME = 'audio-studio-v9';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/audio-processor.js',
    './js/audio-worker.js',
    './js/ui.js',
    './js/waveform.js',
    './js/translations.js',
    'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Outfit:wght@300;500;700&display=swap',
    './assets/icon.svg'
];

self.addEventListener('install', (e) => {
    // Force new SW to enter the waiting phase immediately
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            // Claim clients immediately to control them without reload
            self.clients.claim(),
            // Clean up old caches
            caches.keys().then((keys) => Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            ))
        ])
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
