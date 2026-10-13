const CACHE_NAME = "tree-id-trainer-v24";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/app.js",
  "./js/key.js",
  "./js/flashcards.js",
  "./js/compare.js",
  "./js/progress.js",
  "./js/quiz.js",
  "./js/quizGenerator.js",
  "./js/quizHistory.js",
  "./js/imageUtils.js",
  "./js/customPhotos.js",
  "./data/species.json",
  "./data/keyTree.json",
  "./icons/icon.svg",
  "./icons/placeholder.svg",
  "./UPDATEDGYMNOTREE.jpg",
  "./Angiosperms.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Network-first: always try to get the latest version when online, and
  // only fall back to the cached copy when offline. The previous
  // cache-first strategy could keep serving an old cached JS/HTML file
  // indefinitely even after a new version was deployed.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
