"use strict";

// Cache local des images de terrain : une tuile déjà vue reste disponible
// pour les prochains chargements, sans télécharger toute la carte à l'avance.
var EXODUS_TILE_CACHE = "exodus-terrain-tiles-v1";

self.addEventListener("install", function(event) {
    self.skipWaiting();
});

self.addEventListener("activate", function(event) {
    event.waitUntil(self.clients.claim());
});

function isTerrainImage(url) {
    return url.pathname === "/assets/Huerta_Satellite_MNT_100m_8000.jpg" ||
        url.pathname === "/assets/Huerta_Satellite_previous.jpg" ||
        /^\/assets\/hd_tiles(?:_pnoa2024_original)?\/.+\.jpg$/i.test(url.pathname);
}

self.addEventListener("fetch", function(event) {
    var request = event.request;
    var url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin ||
            !isTerrainImage(url)) return;

    event.respondWith(caches.open(EXODUS_TILE_CACHE).then(function(cache) {
        return cache.match(request).then(function(cached) {
            if (cached) return cached;
            return fetch(request).then(function(response) {
                if (response.ok) cache.put(request, response.clone());
                return response;
            });
        });
    }));
});
