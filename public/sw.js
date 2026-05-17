const CACHE_NAME = "bbfans-pwa-v1";
const APP_SHELL = [
	"/",
	"/blog/",
	"/changelog/",
	"/about/",
	"/favicon.svg",
	"/manifest.webmanifest",
	"/pwa-icon-192.png",
	"/pwa-icon-512.png",
	"/pwa-maskable-512.png",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
		),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => cached || fetch(request)),
	);
});
