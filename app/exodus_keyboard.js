"use strict";

(function() {
    var help = null;
    var moving = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown"];
    var held = new Map(), lastFrame = 0;
    function editable(target) {
        return target && (target.isContentEditable || target.closest("input,textarea,select,button,[role='textbox']"));
    }
    function navigate(key, shift) {
        if (window.ExodusWorld && ExodusWorld.mode === "earth")
            return ExodusWorld.keyboardNavigate ? ExodusWorld.keyboardNavigate(key, shift) : false;
        if (document.body.classList.contains("exodus-on-local")) return false;
        return HuertaRuntime.require("huerta_webgl_main").keyboard_navigate(key, shift);
    }
    function showHelp() {
        var language = window.HuertaI18n && HuertaI18n.language;
        var labels = {
            fr:["Raccourcis", "Déplacer la vue", "Tourner / incliner", "Zoomer", "Hauteur de caméra", "Nord en haut", "Vue verticale", "Réinitialiser la vue", "Vue 2D / 3D", "Arrêter / pause simulateur", "Changer d’image satellite", "Recherche / commande", "Dans le simulateur : flèches = orientation ; Page ↑ / ↓ = avancer / reculer.", "Fermer"],
            en:["Shortcuts", "Move view", "Rotate / tilt", "Zoom", "Camera height", "North up", "Top-down view", "Reset view", "2D / 3D view", "Stop / pause simulator", "Switch satellite image", "Search / command", "Simulator: arrows = orientation; Page ↑ / ↓ = forward / backward.", "Close"],
            es:["Atajos", "Mover vista", "Girar / inclinar", "Zoom", "Altura de cámara", "Norte arriba", "Vista vertical", "Restablecer vista", "Vista 2D / 3D", "Detener / pausar simulador", "Cambiar imagen satelital", "Buscar / comando", "Simulador: flechas = orientación; Page ↑ / ↓ = avanzar / retroceder.", "Cerrar"],
            ca:["Dreceres", "Moure la vista", "Girar / inclinar", "Zoom", "Alçada de càmera", "Nord amunt", "Vista vertical", "Restableix la vista", "Vista 2D / 3D", "Aturar / pausar simulador", "Canviar imatge satèl·lit", "Cerca / ordre", "Simulador: fletxes = orientació; Page ↑ / ↓ = avançar / retrocedir.", "Tanca"]
        }[language || "fr"];
        if (!labels) return;
        help = document.createElement("dialog");
        help.style.cssText = "background:#19232d;color:white;border:1px solid #aaa;border-radius:6px;padding:18px;max-width:90vw;font:14px Arial";
        var title = document.createElement("h3"); title.textContent = labels[0]; help.appendChild(title);
        var keys = ["↑ ↓ ← →", "Shift + ↑ ↓ ← →", "Page ↑ / ↓", "Shift + Page ↑ / ↓", "N", "U", "R", "O", "Space", "C", "/"];
        var table = document.createElement("table");
        keys.forEach(function(key, i) {
            var row = table.insertRow(); row.insertCell().textContent = key;
            var cell = row.insertCell(); cell.style.padding = "4px 14px"; cell.textContent = labels[i + 1];
        });
        help.appendChild(table);
        var note = document.createElement("p"); note.textContent = labels[12]; help.appendChild(note);
        var close = document.createElement("button"); close.textContent = labels[13];
        close.onclick = function(){help.close();}; help.appendChild(close);
        help.addEventListener("close", function(){help.remove(); help = null;});
        document.body.appendChild(help); help.showModal();
    }
    window.addEventListener("keydown", function(event) {
        if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || editable(event.target) || help) return;
        var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (key === "?") {event.preventDefault(); held.clear(); if (!event.repeat) showHelp(); return;}
        if (key === "/") {
            var fields = document.querySelectorAll("#exodus_place_query, #huerta_command_bar input");
            for (var i = 0; i < fields.length; i++) if (fields[i].getClientRects().length) {
                event.preventDefault(); held.clear(); fields[i].focus(); break;
            }
            return;
        }
        if (key === "c") {
            if (window.ExodusLocalContext || (window.ExodusWorld && ExodusWorld.mode !== "huerta")) return;
            event.preventDefault();
            if (!event.repeat) {
                var tiles = HuertaRuntime.require("huerta_hd_tiles");
                tiles.set_imagery(tiles.get_imagery() === "previous" ? "pnoa2021" : "previous", function(){});
            }
            return;
        }
        if (moving.indexOf(key) !== -1) {
            event.preventDefault();
            if (!held.has(key)) navigate(key, event.shiftKey);
            held.set(key, event.shiftKey); return;
        }
        if (["n", "u", "r", "o", " "].indexOf(key) !== -1) {
            if (key === " ") held.clear();
            event.preventDefault(); if (!event.repeat) navigate(key, event.shiftKey);
        }
    });
    window.addEventListener("keyup", function(event) {
        held.delete(event.key);
        held.forEach(function(value, key){held.set(key, event.shiftKey);});
    });
    window.addEventListener("blur", function(){held.clear();});
    document.addEventListener("visibilitychange", function(){held.clear();});
    document.addEventListener("focusin", function(){held.clear();});
    function frame(now) {
        if (editable(document.activeElement) || help) held.clear();
        if (now - lastFrame >= 40) {
            held.forEach(function(shift, key){navigate(key, shift);});
            lastFrame = now;
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}());
