"use strict";

(function() {
    var help = null;
    var moving = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown"];
    var held = new Map(), lastFrame = 0;
    function editable(target) {
        // Buttons and visibility controls may keep focus after a layer change.
        // Only real text-entry controls should suspend keyboard navigation.
        if (!target) return false;
        if (target.isContentEditable) return true;
        var field = target.closest("input,textarea,select,[role='textbox']");
        if (!field) return false;
        if (field.tagName === "INPUT" && ["checkbox", "radio", "range"].indexOf(field.type) !== -1)
            return false;
        return true;
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
        if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || editable(event.target) || help || document.querySelector("#exodus_reader[open]")) return;
        var walk = HuertaRuntime.require("huerta_webgl_main");
        if (walk.get_free_walk_status().active) {
            var alias={z:"ArrowUp",s:"ArrowDown",q:"ArrowLeft",d:"ArrowRight"};
            var wk=alias[event.key.toLowerCase()] || event.key;
            if (wk==="Escape") {event.preventDefault(); walk.stop_free_walk(); held.clear(); return;}
            if (wk===" ") {event.preventDefault();walk.clear_free_walk_keys();return;}
            if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(wk)!==-1) {
                event.preventDefault();walk.free_walk_key(wk,true);return;
            }
        }
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
                var mode = tiles.get_imagery();
                var modes = tiles.available_imagery();
                var next = modes[(modes.indexOf(mode) + 1) % modes.length];
                tiles.set_imagery(next, function(){});
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
        var walk=HuertaRuntime.require("huerta_webgl_main");
        var alias={z:"ArrowUp",s:"ArrowDown",q:"ArrowLeft",d:"ArrowRight"};
        walk.free_walk_key(alias[event.key.toLowerCase()] || event.key,false);
        held.delete(event.key);
        held.forEach(function(value, key){held.set(key, event.shiftKey);});
    });
    window.addEventListener("blur", function(){held.clear();});
    document.addEventListener("visibilitychange", function(){held.clear();});
    document.addEventListener("focusin", function(){held.clear();});
    function clearWalk(){HuertaRuntime.require("huerta_webgl_main").clear_free_walk_keys();}
    window.addEventListener("blur",clearWalk);
    document.addEventListener("visibilitychange",clearWalk);
    document.addEventListener("focusin",clearWalk);
    function frame(now) {
        if (editable(document.activeElement) || help || document.querySelector("#exodus_reader[open]")) {held.clear();clearWalk();}
        if (now - lastFrame >= 40) {
            held.forEach(function(shift, key){navigate(key, shift);});
            lastFrame = now;
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    var walkButton=document.createElement("button");
    walkButton.type="button";walkButton.id="exodus_free_walk";
    walkButton.style.cssText="box-sizing:border-box;width:100%;padding:6px 5px;cursor:pointer;margin:0 0 5px;white-space:normal";
    walkButton.textContent="Marcheur libre";
    walkButton.title="Z / ↑ : avancer · S / ↓ : reculer · Q/D ou ←/→ : tourner · Bouton central maintenu : regarder · Échap : quitter";
    walkButton.onclick=function(){
        var api=HuertaRuntime.require("huerta_webgl_main"), state=api.get_free_walk_status();
        held.clear();
        if(state.active || state.pending) api.stop_free_walk(); else api.start_free_walk();
        walkButton.blur();
    };
    var walkSection=document.createElement("section");
    walkSection.id="exodus_free_walk_panel";
    walkSection.style.cssText="box-sizing:border-box;width:220px;font:13px Arial,sans-serif;color:#fff;background:rgba(25,35,45,.92);padding:8px;border:1px solid rgba(255,255,255,.55);border-radius:4px";
    var walkTitle=document.createElement("div");
    walkTitle.textContent="Marcheur libre";
    walkTitle.style.cssText="font-weight:bold;margin-bottom:6px";
    walkSection.appendChild(walkTitle);
    walkSection.appendChild(walkButton);
    var walkHelp=document.createElement("div");
    walkHelp.style.cssText="font-size:10px;line-height:1.4;opacity:.85";
    walkHelp.textContent="Sans trajet · Z/S ou ↑/↓ : avancer/reculer · Q/D ou ←/→ : tourner · Bouton central glissé : regard · Molette : vitesse · Échap : quitter.";
    walkSection.appendChild(walkHelp);
    var walkSpeedLabel=document.createElement("label");
    walkSpeedLabel.htmlFor="exodus_free_walk_speed";
    walkSpeedLabel.style.cssText="display:block;margin-top:7px;font-size:11px";
    walkSpeedLabel.textContent="Vitesse de déplacement";
    var walkSpeed=document.createElement("input");
    walkSpeed.id="exodus_free_walk_speed";walkSpeed.type="range";
    walkSpeed.min="0.5";walkSpeed.max="80";walkSpeed.step="0.5";walkSpeed.value="50";
    walkSpeed.style.cssText="display:block;width:100%;margin:3px 0";
    var walkSpeedValue=document.createElement("output");
    walkSpeedValue.htmlFor=walkSpeed.id;
    walkSpeedValue.style.cssText="display:block;text-align:center;font-size:11px";
    function updateWalkSpeed() {
        var speed=HuertaRuntime.require("huerta_webgl_main").set_free_walk_speed(walkSpeed.value);
        walkSpeedValue.textContent=speed.toLocaleString("fr-FR")+" km/h";
        walkSpeed.setAttribute("aria-valuetext",walkSpeedValue.textContent);
    }
    walkSpeed.addEventListener("input",updateWalkSpeed);
    walkSpeed.addEventListener("wheel",function(event) {
        event.preventDefault();
        if(!event.deltaY) return;
        var api=HuertaRuntime.require("huerta_webgl_main");
        walkSpeed.value=api.set_free_walk_speed(api.get_free_walk_status().speed+(event.deltaY<0?.5:-.5));
        updateWalkSpeed();
    },{passive:false});
    updateWalkSpeed();
    walkSection.appendChild(walkSpeedLabel);
    walkSection.appendChild(walkSpeed);
    walkSection.appendChild(walkSpeedValue);
    setInterval(function(){
        if(document.body && !walkSection.isConnected) document.body.appendChild(walkSection);
        var api=HuertaRuntime.require("huerta_webgl_main"), state=api.get_free_walk_status();
        if(Number(walkSpeed.value)!==state.speed) {
            walkSpeed.value=state.speed;
            walkSpeedValue.textContent=state.speed.toLocaleString("fr-FR")+" km/h";
            walkSpeed.setAttribute("aria-valuetext",walkSpeedValue.textContent);
        }
        var elsewhere=(window.ExodusWorld && ExodusWorld.mode!=="huerta") || document.body.classList.contains("exodus-on-local");
        if(elsewhere && (state.active || state.pending)) api.stop_free_walk();
        walkSection.hidden=!!elsewhere;
        walkButton.textContent=state.active?"Quitter la marche · Échap":state.pending?"Placement…":"Marcheur libre";
        walkButton.setAttribute("aria-pressed",String(state.active));
    },200);
}());
