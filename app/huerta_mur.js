"use strict";

// Tracés Mur de Huertahernando. Chaque clic ajoute un sommet au tracé actif.
// Les lignes 3D sont échantillonnées sur le terrain et respectent sa profondeur.
HuertaRuntime.register("huerta_mur", function(exports, require) {
    var m_geometry = require("geometry");
    var m_hud = require("huerta_hud");
    var m_material = require("material");
    var m_navigation = require("huerta_webgl_main");
    var m_objects = require("objects");
    var m_physics = require("physics");
    var m_scenes = require("scenes");
    var m_calques = require("huerta_calques");

    var COLLISION_ID = "TERRAIN_NAV_MASQUE";
    var walls = [];
    var draft = null;
    var draftIndex = -1;
    var moving = null;
    var visible = false;
    var saveAvailable = false;
    var drawGeneration = 0;
    var lines = [];
    var heightCache = new Map();
    var checkbox, editor, editorBody, editorToggle, status, list, finishButton, undoButton, saveButton;

    function translate(value) {
        return window.HuertaI18n ? HuertaI18n.t(value) : value;
    }

    function setStatus(value) {
        if (status) status.textContent = translate(value);
    }

    function setEditorOpen(open) {
        editorBody.style.display = open ? "block" : "none";
        editorToggle.textContent = translate(open ? "Modifier Mur ▲" : "Modifier Mur ▼");
        editorToggle.setAttribute("aria-expanded", String(open));
    }

    function lineAt(index) {
        if (!lines[index]) {
            var line = m_objects.create_line("huerta_mur_" + index);
            m_material.set_line_params(line, {color:[0.95, 0.56, 0.24, 1], width:4});
            lines[index] = line;
        }
        return lines[index];
    }

    function setLineVisible(line, show) {
        try {m_scenes.change_visibility(line, !show);} catch (error) {}
    }

    function samplesFor(wall) {
        var source = [];
        wall.points.forEach(function(point) {
            var xy = m_calques.gps_to_world(point.lat, point.lon);
            var last = source[source.length - 1];
            if (!last || Math.hypot(xy[0] - last[0], xy[1] - last[1]) > 0.1)
                source.push(xy);
        });
        var total = 0;
        for (var i = 1; i < source.length; i++)
            total += Math.hypot(source[i][0] - source[i-1][0], source[i][1] - source[i-1][1]);
        // Use the same predictable terrain sampling as the layer studio:
        // one intermediate point every ten metres.
        var spacing = 10;
        var samples = source.length ? [source[0]] : [];
        for (var segment = 1; segment < source.length; segment++) {
            var a = source[segment-1], b = source[segment];
            var count = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / spacing));
            for (var step = 1; step <= count; step++) {
                var fraction = step / count;
                samples.push([a[0] + (b[0]-a[0])*fraction, a[1] + (b[1]-a[1])*fraction]);
            }
        }
        return samples;
    }

    function render() {
        var ticket = ++drawGeneration;
        var active = walls.slice();
        if (draft) {
            if (draftIndex < 0) active.push(draft);
            else active[draftIndex] = draft;
        }
        var states = [];
        lines.forEach(function(line) { setLineVisible(line, false); });
        if (!visible) return;
        var jobs = [];
        active.forEach(function(wall, index) {
            if (wall.points.length < 2) return;
            var samples = samplesFor(wall);
            if (samples.length < 2) return;
            var positions = new Float32Array(samples.length * 3);
            var pending = 0;
            samples.forEach(function(point, i) {
                positions[i*3] = point[0];
                positions[i*3+1] = point[1];
                var key = Math.round(point[0]*10) + ":" + Math.round(point[1]*10);
                if (heightCache.has(key)) positions[i*3+2] = heightCache.get(key);
                else {pending++; jobs.push({point:point, key:key, index:i, positions:positions, group:index});}
            });
            states[index] = {positions:positions, pending:pending};
        });
        function drawReady(index) {
            var state = states[index];
            if (!state || state.pending || ticket !== drawGeneration) return;
            try {
                var line = lineAt(index);
                m_geometry.draw_line(line, state.positions, false);
                setLineVisible(line, true);
            } catch (error) {
                setStatus("Affichage du calque Mur indisponible.");
            }
        }
        active.forEach(function(wall, index) { drawReady(index); });
        function next() {
            if (ticket !== drawGeneration || !jobs.length) return;
            var job = jobs.shift();
            var x = job.point[0], y = job.point[1];
            var completed = false;
            function done(z) {
                if (completed) return;
                completed = true;
                if (ticket !== drawGeneration) return;
                heightCache.set(job.key, z);
                job.positions[job.index*3+2] = z;
                states[job.group].pending--;
                drawReady(job.group);
                setTimeout(next, 0);
            }
            var rayId = m_physics.append_ray_test_ext(null, [x,y,10000], [x,y,-10000],
                COLLISION_ID, function(id, fraction, object, time, hit) {
                    done(hit ? hit[2] + 3.0 : 3.0);
                }, true, false, true);
            if (!rayId) done(1.5);
        }
        next();
    }

    function refresh() {
        if (!list) return;
        list.textContent = "";
        walls.forEach(function(wall, index) {
            var row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:4px;margin:3px 0;";
            var name = document.createElement("button");
            name.type = "button"; name.textContent = wall.name;
            name.title = translate("Centrer la caméra sur ce tracé");
            name.style.cssText = "flex:1;min-width:0;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;";
            name.addEventListener("click", function() { focusWall(wall); });
            var continueButton = document.createElement("button");
            continueButton.type = "button"; continueButton.textContent = translate("Continuer");
            continueButton.addEventListener("click", function() {
                m_calques.cancel_editor_action();
                draft = {name:wall.name, points:wall.points.map(function(p) {return {lat:p.lat, lon:p.lon};})};
                draftIndex = index; moving = null;
                checkbox.checked = true; visible = true;
                setStatus("Clique sur le terrain pour ajouter des points au tracé.");
                updateButtons(); render();
            });
            var rename = document.createElement("button");
            rename.type = "button"; rename.textContent = translate("Renommer");
            rename.addEventListener("click", function() {
                var input = document.createElement("input");
                input.type = "text"; input.value = wall.name; input.maxLength = 120;
                input.style.cssText = "flex:1;min-width:60px;";
                row.replaceChild(input, name);
                input.focus(); input.select();
                input.addEventListener("keydown", function(event) {
                    if (event.key === "Escape") refresh();
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (!input.value.trim()) return;
                    wall.name = input.value.trim();
                    refresh(); setStatus("Nom modifié. Enregistre pour le conserver.");
                });
            });
            var remove = document.createElement("button");
            remove.type = "button"; remove.textContent = translate("Supprimer");
            remove.addEventListener("click", function() {
                if (draftIndex === index) {draft = null; draftIndex = -1;}
                else if (draftIndex > index) draftIndex--;
                walls.splice(index, 1);
                refresh(); render(); updateButtons();
                setStatus("Tracé supprimé. Enregistre pour conserver la modification.");
            });
            row.appendChild(name); row.appendChild(continueButton);
            row.appendChild(rename); row.appendChild(remove); list.appendChild(row);
            var points = document.createElement("div");
            points.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;margin:2px 0 8px 8px;";
            wall.points.forEach(function(point, pointIndex) {
                var button = document.createElement("button");
                button.type = "button";
                button.textContent = translate("Déplacer point") + " " + (pointIndex+1);
                button.title = translate("Clique ensuite le nouvel emplacement sur le terrain.");
                button.style.cssText = "font-size:10px;cursor:pointer;";
                button.addEventListener("click", function() {
                    m_calques.cancel_editor_action();
                    moving = {wall:index, point:pointIndex}; draft = null; draftIndex = -1;
                    updateButtons(); setStatus("Clique ensuite le nouvel emplacement sur le terrain.");
                });
                points.appendChild(button);
            });
            list.appendChild(points);
        });
    }

    function focusWall(wall) {
        var minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
        wall.points.forEach(function(point) {
            var xy = m_calques.gps_to_world(point.lat, point.lon);
            minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
            minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
        });
        m_navigation.go_to_world((minX+maxX)/2, (minY+maxY)/2,
            Math.max(120, maxX-minX, maxY-minY));
    }

    function updateButtons() {
        finishButton.disabled = !draft || draft.points.length < 2;
        undoButton.disabled = !draft || !draft.points.length;
        saveButton.disabled = !saveAvailable || !!draft || !!moving;
    }

    function makeButton(parent, label, action) {
        var button = document.createElement("button");
        button.type = "button"; button.textContent = translate(label);
        button.style.cssText = "cursor:pointer;margin:2px 4px 2px 0;padding:3px 6px;";
        button.addEventListener("click", action);
        parent.appendChild(button);
        return button;
    }

    function createPanel() {
        var content = document.querySelector("#huerta_calques > div:last-child");
        if (!content) return false;
        var row = document.createElement("div");
        row.id = "huerta_mur_layer";
        row.style.cssText = "display:flex;align-items:center;gap:7px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.3);";
        var label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:center;gap:7px;cursor:pointer;flex:1;";
        checkbox = document.createElement("input"); checkbox.type = "checkbox";
        checkbox.addEventListener("change", function() {visible = checkbox.checked; render();});
        label.appendChild(checkbox);
        var text = document.createElement("span"); text.textContent = translate("Mur");
        label.appendChild(text); row.appendChild(label);
        makeButton(row, "Voir", function() {
            if (!walls.length) {setStatus("Aucun tracé Mur."); return;}
            checkbox.checked = true; visible = true; render(); focusWall(walls[0]);
        });
        content.insertBefore(row, document.getElementById("huerta_parideras_editor").nextSibling);

        editor = document.createElement("div"); editor.id = "huerta_mur_editor";
        editor.style.cssText = "margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,.3);";
        editorToggle = makeButton(editor, "Modifier Mur ▼", function() {
            setEditorOpen(editorBody.style.display === "none");
        });
        editorToggle.setAttribute("aria-expanded", "false");
        editorToggle.style.cssText = "display:block;width:100%;padding:3px 5px;text-align:left;cursor:pointer;border:0;background:transparent;color:#fff;font:bold 12px Arial,sans-serif;";
        editorBody = document.createElement("div"); editorBody.style.display = "none";
        editor.appendChild(editorBody);
        content.insertBefore(editor, row.nextSibling);

        makeButton(editorBody, "Nouveau tracé", function() {
            m_calques.cancel_editor_action();
            draft = {name:translate("Mur") + " " + (walls.length+1), points:[]};
            draftIndex = -1; moving = null;
            checkbox.checked = true; visible = true;
            updateButtons(); render();
            setStatus("Clique les points du mur dans l’ordre sur le terrain.");
        });
        finishButton = makeButton(editorBody, "Terminer le tracé", function() {
            if (!draft || draft.points.length < 2) return;
            if (draftIndex < 0) walls.push(draft);
            else walls[draftIndex] = draft;
            draft = null; draftIndex = -1;
            refresh(); updateButtons(); render();
            setStatus("Tracé terminé. Enregistre pour le conserver.");
        });
        undoButton = makeButton(editorBody, "Annuler le dernier point", function() {
            if (!draft || !draft.points.length) return;
            draft.points.pop(); updateButtons(); render();
        });
        makeButton(editorBody, "Annuler", function() {
            draft = null; draftIndex = -1; moving = null;
            updateButtons(); render(); setStatus("Modification annulée.");
        });
        saveButton = makeButton(editorBody, "Enregistrer", save);
        saveButton.disabled = true;
        status = document.createElement("div");
        status.style.cssText = "font-size:11px;margin:4px 0;";
        editorBody.appendChild(status);
        list = document.createElement("div");
        list.style.cssText = "max-height:180px;overflow:auto;min-width:280px;";
        editorBody.appendChild(list);
        updateButtons(); refresh(); setStatus("Aucun tracé Mur.");
        return true;
    }

    function save() {
        if (!saveAvailable || draft) return;
        fetch("/__huerta_save_walls__", {method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify(walls)})
            .then(function(response) {if (!response.ok) throw new Error(); return response.json();})
            .then(function() {setStatus("Tracés Mur enregistrés.");})
            .catch(function() {setStatus("Enregistrement impossible sur ce serveur.");});
    }

    function handleCanvasClick(event) {
        if ((!draft && !moving) || document.body.classList.contains("huerta-test-off")) return;
        if (event.target.tagName !== "CANVAS") return;
        event.stopImmediatePropagation();
        event.preventDefault();
        var x = event.offsetX, y = event.offsetY;
        setStatus("Lecture du point…");
        m_navigation.pick_terrain(x, y, function(hit) {
            if (!hit) {setStatus("Point non détecté. Réessaie sur le terrain."); return;}
            var gps = m_hud.world_to_gps(Number(hit[0]), Number(hit[1]));
            var point = {lat:gps.lat, lon:gps.lon};
            if (moving) {
                if (walls[moving.wall] && walls[moving.wall].points[moving.point])
                    walls[moving.wall].points[moving.point] = point;
                moving = null;
                refresh(); render(); setStatus("Point déplacé. Enregistre pour le conserver.");
            } else if (draft) {
                draft.points.push(point);
                updateButtons(); render();
                setStatus("Point ajouté. Clique le suivant ou termine le tracé.");
            }
        });
    }

    function init() {
        if (!createPanel()) return;
        window.addEventListener("huerta-parideras-edit-start", function() {
            if (!draft && !moving) return;
            draft = null; draftIndex = -1; moving = null;
            updateButtons(); render();
            setStatus("Modification annulée.");
        });
        var canvas = document.querySelector("#main_canvas_container canvas");
        if (canvas) canvas.addEventListener("click", handleCanvasClick, true);
        else {
            var timer = setInterval(function() {
                canvas = document.querySelector("#main_canvas_container canvas");
                if (!canvas) return;
                clearInterval(timer); canvas.addEventListener("click", handleCanvasClick, true);
            }, 100);
        }
        fetch("/__huerta_health__", {cache:"no-store"})
            .then(function(response) {return response.ok ? response.json() : null;})
            .then(function(info) {
                saveAvailable = !!(info && info.local_only && info.storage_version >= 2);
                updateButtons();
                if (!saveAvailable) setStatus("Enregistrement désactivé sur ce serveur.");
            })
            .catch(function() {saveButton.disabled = true;});
        fetch("assets/parideras_edit.json?v=mur-layer-20261011", {cache:"no-store"})
            .then(function(response) {return response.ok ? response.json() : [];})
            .then(function(data) {
                data = data && !Array.isArray(data) ? data.murs : [];
                if (!Array.isArray(data)) return;
                walls = data.filter(function(wall) {
                    return wall && typeof wall.name === "string" && Array.isArray(wall.points) &&
                        wall.points.length >= 2 && wall.points.every(function(point) {
                            return point && Number.isFinite(point.lat) && Number.isFinite(point.lon);
                        });
                });
                refresh(); render();
            });
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init, false);
    else init();
});

HuertaRuntime.require("huerta_mur");
