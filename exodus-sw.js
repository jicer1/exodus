"use strict";

// Cache local des images de terrain : une tuile déjà vue reste disponible
// pour les prochains chargements, sans télécharger toute la carte à l'avance.
var EXODUS_VERSION = "2.0.3";
var EXODUS_TILE_CACHE = "exodus-terrain-tiles-" + EXODUS_VERSION;

self.addEventListener("install", function(event) {
    self.skipWaiting();
});

self.addEventListener("activate", function(event) {
    event.waitUntil(caches.keys().then(function(names) {
        return Promise.all(names.filter(function(name) {
            return name.indexOf("exodus-") === 0 && name !== EXODUS_TILE_CACHE;
        }).map(function(name) { return caches.delete(name); }));
    }).then(function() { return self.clients.claim(); }));
});

function isTerrainImage(url) {
    if (/\/assets\/igme_(?:magna|geode)50\/(?:base|tiles\/.+)\.jpg$/i.test(url.pathname)) return true;
    if (/\/assets\/Huerta_Carte_topographique\.jpg$/i.test(url.pathname) ||
            /\/assets\/hd_tiles_topographique\/.+\.jpg$/i.test(url.pathname)) return true;
    return /\/assets\/Huerta_Satellite_MNT_100m_8000\.jpg$/i.test(url.pathname) ||
        /\/assets\/Huerta_Satellite_previous\.jpg$/i.test(url.pathname) ||
        /\/assets\/hd_tiles(?:_pnoa2024_original)?\/.+\.jpg$/i.test(url.pathname);
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
