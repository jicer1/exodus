"use strict";

// Mise à jour silencieuse et cache local des images de terrain.
(function() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

    var VERSION_KEY = "exodus-version";
    var RELOAD_KEY = "exodus-version-reload";

    function parts(value) {
        return String(value || "0").split(".").map(function(part) {
            return parseInt(part, 10) || 0;
        });
    }

    function isNewer(remote, local) {
        var a = parts(remote), b = parts(local);
        for (var i = 0; i < Math.max(a.length, b.length); i++) {
            if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
        }
        return false;
    }

    function cleanOldCaches(version) {
        if (!("caches" in window)) return Promise.resolve();
        var current = "exodus-terrain-tiles-" + version;
        return caches.keys().then(function(names) {
            return Promise.all(names.filter(function(name) {
                return name.indexOf("exodus-") === 0 && name !== current;
            }).map(function(name) { return caches.delete(name); }));
        });
    }

    function reloadOnce(version) {
        if (sessionStorage.getItem(RELOAD_KEY) === version) return;
        sessionStorage.setItem(RELOAD_KEY, version);
        var url = new URL(location.href);
        url.searchParams.set("exodus_version", version);
        location.replace(url.toString());
    }

    navigator.serviceWorker.register("exodus-sw.js", {scope:"./", updateViaCache:"none"})
        .then(function(registration) {
            return fetch("version.json?t=" + Date.now(), {cache:"no-store"})
                .then(function(response) { return response.ok ? response.json() : null; })
                .then(function(info) {
                    var remote = info && String(info.version || "");
                    if (!remote) return;
                    var local = localStorage.getItem(VERSION_KEY);
                    if (!local) {
                        localStorage.setItem(VERSION_KEY, remote);
                        return cleanOldCaches(remote);
                    }
                    if (!isNewer(remote, local)) return cleanOldCaches(remote);
                    localStorage.setItem(VERSION_KEY, remote);
                    return cleanOldCaches(remote).then(function() {
                        return registration.update();
                    }).then(function() { reloadOnce(remote); });
                });
        }).catch(function(error) {
            console.warn("Cache des tuiles indisponible", error);
        });
}());
