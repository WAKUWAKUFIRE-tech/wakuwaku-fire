const CACHE_NAME = "wakuwaku-fire-static-v1";

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.indexOf("wakuwaku-fire-static-") === 0 && key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.indexOf("/api/") === 0) {
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match(request);
      })
    );
    return;
  }

  // CSS・JavaScript・画像だけをネットワーク優先で保存します。
  // HTMLや診断・ランキングのデータは古い状態で固定しません。
  if (["style", "script", "image", "font"].indexOf(request.destination) === -1) {
    return;
  }

  event.respondWith(
    fetch(request).then(function (response) {
      if (response.ok) {
        caches.open(CACHE_NAME).then(function (cache) {
          return cache.put(request, response.clone());
        }).catch(function () {
          // キャッシュできない環境でも、取得したアセットはそのまま使います。
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request);
    })
  );
});
