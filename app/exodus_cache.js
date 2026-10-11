"use strict";

// Le service worker ne s'active que sur une page servie par HTTP(S).
// Il mémorise uniquement les images de terrain demandées par l'application.
(function() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("exodus-sw.js", {scope: "./"})
        .catch(function(error) { console.warn("Cache des tuiles indisponible", error); });
}());
