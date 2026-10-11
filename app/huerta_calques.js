"use strict";

/* Calque des repères importés depuis assets/parideras.kmz.
 * Coordonnées KML WGS84 -> UTM 30N -> coordonnées monde Huerta.
 */
HuertaRuntime.register("huerta_calques", function(exports, require) {

var m_camera = require("camera");
var m_main = require("main");
var m_physics = require("physics");
var m_scenes = require("scenes");
var m_navigation = require("huerta_webgl_main");
var m_hud = require("huerta_hud");
var m_hd_tiles = require("huerta_hd_tiles");

var COLLISION_ID = "TERRAIN_NAV_MASQUE";
var DEFAULT_MARKERS = [{"name":"1","lat":40.82547253561693,"lon":-2.276442771410129},{"name":"2","lat":40.82554327011844,"lon":-2.27491308384792},{"name":"3","lat":40.82497039906625,"lon":-2.275158066357219},{"name":"4","lat":40.82415375751414,"lon":-2.275474052788999},{"name":"5","lat":40.82920517037446,"lon":-2.26947005656245},{"name":"6","lat":40.82979701833891,"lon":-2.26913239567561},{"name":"7","lat":40.82980268842497,"lon":-2.268749669749508},{"name":"9","lat":40.82172500060552,"lon":-2.285921747684331},{"name":"10","lat":40.82187157554447,"lon":-2.285865521925822},{"name":"12","lat":40.82587799526034,"lon":-2.289726676686122},{"name":"13","lat":40.83471859940575,"lon":-2.285793441260625},{"name":"14","lat":40.83526316412291,"lon":-2.285756309206224},{"name":"15","lat":40.83618996237082,"lon":-2.277617680462876},{"name":"16","lat":40.82558503401129,"lon":-2.286981072026986},{"name":"17","lat":40.82538989475173,"lon":-2.286930715914826},{"name":"18","lat":40.8243212466709,"lon":-2.286496647410435},{"name":"19","lat":40.82434016105794,"lon":-2.286051359141078},{"name":"20","lat":40.83847380907647,"lon":-2.304799085339464},{"name":"21","lat":40.83826134567458,"lon":-2.30495881845358},{"name":"22","lat":40.83515825429146,"lon":-2.306282795125716},{"name":"23","lat":40.83518867037769,"lon":-2.306705172050561},{"name":"24","lat":40.80479512124891,"lon":-2.335208137237095},{"name":"25","lat":40.81197454117685,"lon":-2.280894369082032},{"name":"26","lat":40.81433957315362,"lon":-2.283654677357134},{"name":"27","lat":40.80984290047978,"lon":-2.295558130939822},{"name":"28","lat":40.8083858997424,"lon":-2.296710718102214},{"name":"29","lat":40.80757685936502,"lon":-2.298414770567848},{"name":"30","lat":40.8040522455373,"lon":-2.305282138509818},{"name":"31-bassine","lat":40.83331887016036,"lon":-2.247501685116132},{"name":"32","lat":40.80299470899129,"lon":-2.296558859033924},{"name":"33","lat":40.80249530672541,"lon":-2.308752296409789},{"name":"34","lat":40.80280320305766,"lon":-2.308465274603857},{"name":"35","lat":40.81677626877516,"lon":-2.256049806625815},{"name":"36","lat":40.81389550871762,"lon":-2.254860110628418},{"name":"37","lat":40.81355222207051,"lon":-2.254364000328437},{"name":"38","lat":40.81366244825872,"lon":-2.255514296716559},{"name":"39","lat":40.81333012466575,"lon":-2.255783770990234},{"name":"40","lat":40.83183759385361,"lon":-2.2618879912443},{"name":"41","lat":40.82977265650601,"lon":-2.265338188069749},{"name":"42","lat":40.80565449935895,"lon":-2.310917657942719},{"name":"43","lat":40.82010298028122,"lon":-2.254068898661105},{"name":"44","lat":40.81883035202092,"lon":-2.308033157120311},{"name":"45","lat":40.82081897054446,"lon":-2.309295136966825},{"name":"46","lat":40.82030463902331,"lon":-2.311916571620803},{"name":"47","lat":40.82325809898403,"lon":-2.303526504398858},{"name":"48","lat":40.82593543979322,"lon":-2.29857217250846},{"name":"49","lat":40.80175910697755,"lon":-2.32127709364079},{"name":"50","lat":40.80456466501342,"lon":-2.317904073856849},{"name":"51","lat":40.80113494768926,"lon":-2.315595788213093},{"name":"52","lat":40.81435766862555,"lon":-2.319629331685499},{"name":"53","lat":40.81476162194194,"lon":-2.319862323403258},{"name":"54","lat":40.85351042834904,"lon":-2.272966523704318},{"name":"55","lat":40.85362207679909,"lon":-2.273807837825367},{"name":"56","lat":40.85401093606047,"lon":-2.268706746280799},{"name":"57","lat":40.81911700883703,"lon":-2.295497079380924},{"name":"58","lat":40.81942766268551,"lon":-2.297301885828546},{"name":"59","lat":40.81806823734764,"lon":-2.295098729389771},{"name":"60","lat":40.82068975431925,"lon":-2.294222722106438},{"name":"61","lat":40.8211244363984,"lon":-2.29914070711816},{"name":"62","lat":40.81926737939922,"lon":-2.302852328540819},{"name":"63","lat":40.8179247721144,"lon":-2.304623672497522},{"name":"64","lat":40.81438939399042,"lon":-2.307043235599706},{"name":"65","lat":40.81110177227175,"lon":-2.300033467438131},{"name":"66","lat":40.81143116717616,"lon":-2.300680819965344},{"name":"67","lat":40.81111957258436,"lon":-2.300752962371353},{"name":"68","lat":40.81145344744149,"lon":-2.301287060793622},{"name":"69","lat":40.81093644274983,"lon":-2.300760563036341},{"name":"70","lat":40.81112358688059,"lon":-2.302041521215359},{"name":"71","lat":40.81079278274041,"lon":-2.301452175048411},{"name":"72","lat":40.81006872769633,"lon":-2.302470461482624},{"name":"73","lat":40.80960353557199,"lon":-2.302954017646555},{"name":"74","lat":40.81041711264602,"lon":-2.302880175832571}];
var MARKERS = DEFAULT_MARKERS.slice();
var entries = [];
var enabled = false;
var simulatorHidden = false;
var generation = 0;
var rayQueue = [];
var occlusionGeneration = 0;
var occlusionQueue = [];
var panel = null;
var editorList = null;
var editorStatus = null;
var editorSaveButton = null;
var editorAction = null;
var editorMoveIndex = -1;
var editorFocusIndex = -1;
var localSaveAvailable = false;
var visibilityCheckbox = null;

// Projection WGS84 vers UTM zone 30N (EPSG:32630).
function gps_to_utm(latDeg, lonDeg) {
    var a = 6378137;
    var ecc2 = 0.0066943799901413165;
    var k0 = 0.9996;
    var lat = latDeg * Math.PI / 180;
    var lon = lonDeg * Math.PI / 180;
    var lon0 = -3 * Math.PI / 180;
    var ep2 = ecc2 / (1 - ecc2);
    var sinLat = Math.sin(lat);
    var cosLat = Math.cos(lat);
    var tanLat = Math.tan(lat);
    var n = a / Math.sqrt(1 - ecc2 * sinLat * sinLat);
    var t = tanLat * tanLat;
    var c = ep2 * cosLat * cosLat;
    var aa = cosLat * (lon - lon0);
    var e4 = ecc2 * ecc2;
    var e6 = e4 * ecc2;
    var m = a * ((1 - ecc2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * lat
        - (3 * ecc2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * lat)
        + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * lat)
        - (35 * e6 / 3072) * Math.sin(6 * lat));
    var x = k0 * n * (aa + (1 - t + c) * Math.pow(aa, 3) / 6
        + (5 - 18 * t + t * t + 72 * c - 58 * ep2) * Math.pow(aa, 5) / 120) + 500000;
    var y = k0 * (m + n * tanLat * (aa * aa / 2
        + (5 - t + 9 * c + 4 * c * c) * Math.pow(aa, 4) / 24
        + (61 - 58 * t + t * t + 600 * c - 330 * ep2) * Math.pow(aa, 6) / 720));
    return [x, y];
}

// Inverse du calage terrain : la scène est centrée sur l'emprise QGIS.
function gps_to_world(lat, lon) {
    var utm = gps_to_utm(lat, lon);
    return [utm[0] - 559563.0, utm[1] - 4519538.0];
}

function marker_bounds() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < MARKERS.length; i++) {
        var p = gps_to_world(MARKERS[i].lat, MARKERS[i].lon);
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    return {x:(minX + maxX) * 0.5, y:(minY + maxY) * 0.5,
        extent:Math.max(maxX - minX, maxY - minY)};
}

function create_panel() {
    if (panel || !document.body) return;
    panel = document.createElement("div");
    panel.id = "huerta_calques";
    panel.style.cssText = "position:fixed;top:78px;right:15px;z-index:10001;font:14px Arial,sans-serif;color:#fff;background:rgba(25,35,45,.9);padding:9px 12px;border:1px solid rgba(255,255,255,.55);border-radius:4px;";
    var header = document.createElement("button");
    header.type = "button";
    header.textContent = "Calques ▼";
    header.setAttribute("aria-expanded", "false");
    header.style.cssText = "display:block;width:100%;margin:0 0 6px;padding:3px 5px;text-align:left;cursor:pointer;border:0;border-bottom:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font:bold 13px Arial,sans-serif;";
    var content = document.createElement("div");
    content.style.display = "none";
    header.addEventListener("click", function() {
        var collapsed = content.style.display === "none";
        content.style.display = collapsed ? "block" : "none";
        header.textContent = collapsed ? "Calques ▲" : "Calques ▼";
        header.setAttribute("aria-expanded", collapsed ? "true" : "false");
    }, false);
    var row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:7px;";
    var label = document.createElement("label");
    label.style.cssText = "display:flex;align-items:center;gap:7px;cursor:pointer;flex:1;";
    var checkbox = document.createElement("input");
    visibilityCheckbox = checkbox;
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", function() { set_enabled(checkbox.checked); }, false);
    var text = document.createElement("span");
    text.textContent = "Parideras";
    label.appendChild(checkbox);
    label.appendChild(text);
    row.appendChild(label);
    var go = document.createElement("button");
    go.type = "button";
    go.textContent = "Voir";
    go.title = "Centrer la caméra sur les repères Parideras";
    go.style.cssText = "cursor:pointer;padding:2px 7px;";
    go.addEventListener("click", function() {
        if (!checkbox.checked) {
            checkbox.checked = true;
            set_enabled(true);
        }
        var bounds = marker_bounds();
        m_navigation.go_to_world(bounds.x, bounds.y, bounds.extent);
    }, false);
    row.appendChild(go);
    content.appendChild(row);
    var imageryLabel = document.createElement("label");
    imageryLabel.style.cssText = "display:flex;align-items:center;gap:7px;cursor:pointer;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.3);white-space:nowrap;";
    var imagerySwitch = document.createElement("input");
    imagerySwitch.type = "checkbox";
    imagerySwitch.setAttribute("role", "switch");
    var imageryText = document.createElement("span");
    function updateImageryText() {
        var caption = imagerySwitch.checked ? "Image satellite : précédente" : "Image satellite : PNOA 2021";
        imageryText.textContent = window.HuertaI18n ? window.HuertaI18n.t(caption) : caption;
    }
    imagerySwitch.addEventListener("change", function() {
        imagerySwitch.disabled = true;
        m_hd_tiles.set_imagery(imagerySwitch.checked ? "previous" : "pnoa2021", function(success) {
            imagerySwitch.checked = m_hd_tiles.get_imagery() === "previous";
            imagerySwitch.disabled = false;
            updateImageryText();
        });
    }, false);
    imageryLabel.appendChild(imagerySwitch);
    window.addEventListener("exodus-imagery", function(event) {
        imagerySwitch.checked = event.detail.mode === "previous";
        imagerySwitch.disabled = event.detail.loading;
        updateImageryText();
    });
    imageryLabel.appendChild(imageryText);
    updateImageryText();
    content.appendChild(imageryLabel);
    var editor = document.createElement("div");
    editor.id = "huerta_parideras_editor";
    editor.style.cssText = "margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.3);";
    var editorTitle = document.createElement("div");
    editorTitle.textContent = "Modifier Parideras";
    editorTitle.style.cssText = "font-weight:bold;font-size:12px;margin-bottom:4px;";
    editor.appendChild(editorTitle);
    var addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Ajouter sur la carte";
    addButton.style.cssText = "cursor:pointer;padding:3px 6px;margin-right:4px;";
    addButton.addEventListener("click", function() {
        if (visibilityCheckbox && !visibilityCheckbox.checked) {
            visibilityCheckbox.checked = true;
            set_enabled(true);
        }
        editorAction = "add";
        editorMoveIndex = -1;
        editorStatus.textContent = "Clique un emplacement sur le terrain.";
    }, false);
    editor.appendChild(addButton);
    editorSaveButton = document.createElement("button");
    editorSaveButton.type = "button";
    editorSaveButton.textContent = "Enregistrer";
    editorSaveButton.disabled = true;
    editorSaveButton.style.cssText = "cursor:pointer;padding:3px 6px;";
    editorSaveButton.addEventListener("click", save_markers_file, false);
    editor.appendChild(editorSaveButton);
    editorStatus = document.createElement("div");
    editorStatus.style.cssText = "font-size:11px;margin:4px 0;";
    editorStatus.textContent = "Sélectionne Modifier pour gérer les repères.";
    editor.appendChild(editorStatus);
    editorList = document.createElement("div");
    editorList.style.cssText = "max-height:180px;overflow:auto;";
    editor.appendChild(editorList);
    content.appendChild(editor);
    refresh_editor_list();
    panel.appendChild(header);
    panel.appendChild(content);
    document.body.appendChild(panel);
}

function center_editor_marker(index) {
    var marker = MARKERS[index];
    if (!marker) return;
    var point = gps_to_world(marker.lat, marker.lon);
    m_navigation.go_to_world(point[0], point[1], 120);
    focus_editor_marker(index);
}

function focus_editor_marker(index) {
    editorFocusIndex = index;
    if (panel && panel.children.length > 1) {
        var content = panel.children[1];
        content.style.display = "block";
        var header = panel.children[0];
        if (header) {
            header.textContent = "Calques ▲";
            header.setAttribute("aria-expanded", "true");
        }
    }
    refresh_editor_list();
}

function refresh_editor_list() {
    if (!editorList) return;
    editorList.textContent = "";
    for (var i = 0; i < MARKERS.length; i++) {
        (function(index) {
            var row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:3px;margin:2px 0;";
            if (index === editorFocusIndex) {
                row.style.background = "rgba(216,189,131,.35)";
                row.style.borderRadius = "3px";
                row.style.outline = "1px solid rgba(216,189,131,.8)";
                setTimeout(function() { row.scrollIntoView({block:"nearest"}); }, 0);
            }
            var label = document.createElement("span");
            label.textContent = MARKERS[index].name;
            label.style.flex = "1";
            label.style.cursor = "pointer";
            label.title = "Centrer la caméra sur ce repère";
            label.addEventListener("click", function() {
                center_editor_marker(index);
            }, false);
            var move = document.createElement("button");
            move.type = "button"; move.textContent = "Déplacer";
            move.style.cssText = "cursor:pointer;padding:2px 4px;font-size:11px;";
            move.addEventListener("click", function() {
                editorAction = "move"; editorMoveIndex = index;
                editorStatus.textContent = "Clique la nouvelle position du repère " + MARKERS[index].name + ".";
            }, false);
            var rename = document.createElement("button");
            rename.type = "button"; rename.textContent = "Renommer";
            rename.style.cssText = "cursor:pointer;padding:2px 4px;font-size:11px;";
            rename.addEventListener("click", function() {
                var input = document.createElement("input");
                input.type = "text";
                input.value = MARKERS[index].name;
                input.style.cssText = "width:90px;padding:2px;font-size:11px;";
                row.replaceChild(input, label);
                input.focus(); input.select();
                function commit_name() {
                    var next = input.value.trim();
                    if (!next) return;
                    MARKERS[index].name = next;
                    refresh_editor_list();
                    rebuild_markers();
                    editorStatus.textContent = "Nom modifié. Enregistre pour le conserver.";
                }
                input.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") commit_name();
                    if (event.key === "Escape") refresh_editor_list();
                }, false);
            }, false);
            var remove = document.createElement("button");
            remove.type = "button"; remove.textContent = "Supprimer";
            remove.style.cssText = "cursor:pointer;padding:2px 4px;font-size:11px;";
            remove.addEventListener("click", function() {
                MARKERS.splice(index, 1); rebuild_markers(); refresh_editor_list();
                editorStatus.textContent = "Repère supprimé. Enregistre pour conserver la modification.";
            }, false);
            row.appendChild(label); row.appendChild(move); row.appendChild(rename); row.appendChild(remove); editorList.appendChild(row);
        }(i));
    }
}

function rebuild_markers() {
    var old = document.getElementById("huerta_parideras_markers");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    entries = [];
    create_markers();
    set_enabled(enabled);
}

function save_markers_file() {
    if (!localSaveAvailable) return;
    fetch("/__huerta_save_markers__", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(MARKERS)})
        .then(function(response) { if (!response.ok) throw new Error("écriture impossible"); return response.json(); })
        .then(function() { editorStatus.textContent = "Marqueurs enregistrés dans parideras_edit.json."; })
        .catch(function() { editorStatus.textContent = "Enregistrement impossible sur ce serveur."; });
}

// Les autres calques partagent le même menu repliable. Cela évite que leur
// panneau indépendant se superpose au menu, notamment en mode « on test ».
function attach_other_layers() {
    var content = panel && panel.lastElementChild;
    var other = document.getElementById("huerta_campos_layer");
    if (!content || !other || other.parentNode === content) return !!other;
    var title = document.createElement("div");
    title.className = "huerta-calques-other-title";
    title.textContent = "Autres calques";
    title.style.cssText = "margin:8px 0 3px;padding-top:6px;border-top:1px solid rgba(255,255,255,.3);font-weight:bold;font-size:12px;";
    content.appendChild(title);
    other.style.position = "static";
    other.style.top = "auto";
    other.style.right = "auto";
    other.style.zIndex = "auto";
    other.style.margin = "0";
    other.style.padding = "0";
    other.style.border = "0";
    other.style.background = "transparent";
    other.style.minWidth = "0";
    content.appendChild(other);
    return true;
}

function create_markers() {
    if (entries.length) return;
    var overlay = document.createElement("div");
    overlay.id = "huerta_parideras_markers";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9998;pointer-events:none;display:none;overflow:hidden;";
    document.body.appendChild(overlay);
    for (var i = 0; i < MARKERS.length; i++) {
        var data = MARKERS[i];
        var world = gps_to_world(data.lat, data.lon);
        var el = document.createElement("div");
        el.textContent = data.name;
        el.setAttribute("data-marker-index", String(i));
        el.title = "Repère " + data.name + " — " + data.lat.toFixed(6) + ", " + data.lon.toFixed(6);
        // Les repères restent visibles mais ne capturent aucun clic sur la carte.
        // La sélection, le centrage et le renommage se font depuis la liste.
        el.style.cssText = "position:absolute;transform:translate(-50%,-100%);min-width:17px;height:20px;padding:0 3px;border-radius:10px 10px 10px 2px;background:#e83d2e;border:2px solid #fff;color:#fff;font:bold 11px/20px Arial,sans-serif;text-align:center;box-shadow:0 1px 4px #000;white-space:nowrap;pointer-events:none;cursor:default;";
        overlay.appendChild(el);
        entries.push({el:el, point:new Float32Array([world[0], world[1], 0]), ready:false});
    }
    request_next_height();
}

function load_markers_file(done) {
    fetch("assets/parideras_edit.json?v=marker-data-20261009", {cache:"no-store"})
        .then(function(response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .then(function(data) {
            if (!Array.isArray(data)) throw new Error("format invalide");
            MARKERS = data.filter(function(item) {
                return item && typeof item.name === "string" &&
                    Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
            }).map(function(item) {
                return {name:item.name, lat:Number(item.lat), lon:Number(item.lon)};
            });
            refresh_editor_list();
            done();
        })
        .catch(function() {
            MARKERS = DEFAULT_MARKERS.slice();
            done();
        });
}

function request_next_height() {
    if (!enabled || !rayQueue.length) return;
    var item = rayQueue.shift();
    var ticket = generation;
    var x = item.point[0], y = item.point[1];
    var rayId = m_physics.append_ray_test_ext(null, [x,y,10000], [x,y,-10000], COLLISION_ID,
        function(id, hit_fract, obj_hit, hit_time, hit_pos) {
            if (ticket !== generation) return;
            if (hit_pos) {
                item.point[2] = hit_pos[2] + 2;
                item.ready = true;
            } else {
                // En cas de point hors masque, on garde un repère visible à faible hauteur.
                item.point[2] = 5;
                item.ready = true;
            }
            request_next_height();
        }, true, false, true);
    if (!rayId) {
        item.point[2] = 5;
        item.ready = true;
        request_next_height();
    }
}

function set_enabled(value) {
    enabled = value;
    generation++;
    occlusionGeneration++;
    occlusionQueue = [];
    for (var i = 0; i < entries.length; i++) {
        entries[i].occlusionPending = false;
        entries[i].nextOcclusionAt = 0;
        entries[i].occluded = false;
    }
    create_markers();
    var overlay = document.getElementById("huerta_parideras_markers");
    if (!overlay) return;
    overlay.style.display = enabled && !simulatorHidden ? "block" : "none";
    if (enabled) {
        rayQueue = entries.filter(function(item) { return !item.ready; });
        request_next_height();
    }
}

function request_marker_occlusion(item, cam, cameraPosition, ticket) {
    item.occlusionPending = true;
    var target = [item.point[0], item.point[1], item.point[2]];
    var rayId = m_physics.append_ray_test_ext(null,
        [cameraPosition[0], cameraPosition[1], cameraPosition[2]], target,
        COLLISION_ID, function(id, hit_fract, obj_hit, hit_time, hit_pos) {
            if (ticket !== occlusionGeneration) return;
            item.occlusionPending = false;
            item.occluded = false;
            // The marker floats slightly above the ground. Ignore the terrain
            // immediately below it; hide only a relief obstacle in front of it.
            if (hit_pos) {
                var dx = hit_pos[0] - target[0];
                var dy = hit_pos[1] - target[1];
                var dz = hit_pos[2] - target[2];
                item.occluded = Math.sqrt(dx * dx + dy * dy + dz * dz) > 8;
            }
            item.nextOcclusionAt = performance.now() + 180;
        }, true, false, true);
    if (!rayId) {
        item.occlusionPending = false;
        item.occluded = false;
        item.nextOcclusionAt = performance.now() + 180;
    }
}

// Le marcheur est rendu dans la scène ; pendant son fonctionnement les
// repères d'interface doivent disparaître complètement pour ne pas flotter
// au-dessus du relief.
exports.set_simulator_hidden = function(value) {
    simulatorHidden = !!value;
    var overlay = document.getElementById("huerta_parideras_markers");
    if (overlay)
        overlay.style.display = enabled && !simulatorHidden ? "block" : "none";
};

function update_markers() {
    if (!enabled || !entries.length) return;
    var cam = m_scenes.get_active_camera();
    var canvas = document.getElementById("main_canvas");
    if (!canvas) canvas = document.querySelector("#main_canvas_container canvas");
    if (!cam || !canvas) return;
    var rect = canvas.getBoundingClientRect();
    var cameraPosition = m_camera.get_translation(cam, new Float32Array(3));
    var now = performance.now();
    var occlusionBudget = 2;
    var ticket = occlusionGeneration;
    for (var i = 0; i < entries.length; i++) {
        var item = entries[i];
        if (!item.ready) { item.el.style.display = "none"; continue; }
        var projected = m_camera.project_point(cam, item.point, new Float32Array(3));
        if (!projected || projected[2] < 0 || projected[2] > 1
                || projected[0] < 0 || projected[1] < 0
                || projected[0] > rect.width || projected[1] > rect.height) {
            item.el.style.display = "none";
            continue;
        }
        if (!item.occlusionPending && (!item.nextOcclusionAt || now >= item.nextOcclusionAt) &&
                occlusionBudget > 0) {
            occlusionBudget--;
            request_marker_occlusion(item, cam, cameraPosition, ticket);
        }
        if (item.occluded) {
            item.el.style.display = "none";
            continue;
        }
        item.el.style.display = "block";
        item.el.style.left = (rect.left + projected[0]) + "px";
        item.el.style.top = (rect.top + projected[1]) + "px";
    }
}

function handle_editor_click(event) {
    if (!editorAction || document.body.classList.contains("huerta-test-off")) return;
    var canvas = event.target;
    if (!canvas || canvas.tagName !== "CANVAS") return;
    editorStatus.textContent = "Lecture de la position…";
    m_navigation.pick_terrain(event.offsetX, event.offsetY, function(hit) {
        if (!hit) { editorStatus.textContent = "Position non détectée."; return; }
        var gps = m_hud.world_to_gps(Number(hit[0]), Number(hit[1]));
        if (editorAction === "add") {
            MARKERS.push({name:"Nouveau " + (MARKERS.length + 1), lat:gps.lat, lon:gps.lon});
            editorFocusIndex = MARKERS.length - 1;
        } else if (editorAction === "move" && MARKERS[editorMoveIndex]) {
            MARKERS[editorMoveIndex].lat = gps.lat;
            MARKERS[editorMoveIndex].lon = gps.lon;
        }
        editorAction = null; editorMoveIndex = -1;
        rebuild_markers(); refresh_editor_list();
        editorStatus.textContent = "Modification effectuée. Enregistre pour la conserver.";
    });
}

function init() {
    create_panel();
    (function attach_editor_canvas(tries) {
        var canvas = document.querySelector("#main_canvas_container canvas");
        if (canvas) canvas.addEventListener("click", handle_editor_click, true);
        else if (tries > 0) setTimeout(function() { attach_editor_canvas(tries - 1); }, 100);
    }(30));
    fetch("/__huerta_health__", {cache:"no-store"}).then(function(response) {
        return response.ok ? response.json() : null;
    }).then(function(info) {
        localSaveAvailable = !!(info && info.local_only);
        if (editorSaveButton) editorSaveButton.disabled = !localSaveAvailable;
        if (editorStatus && !localSaveAvailable)
            editorStatus.textContent = "Enregistrement désactivé sur ce serveur.";
    }).catch(function() {
        localSaveAvailable = false;
        if (editorSaveButton) editorSaveButton.disabled = true;
    });
    // huerta_campos est chargé juste après ce module : quelques passages
    // permettent de l'intégrer dès qu'il a créé son panneau.
    (function wait_for_other_layers(tries) {
        if (attach_other_layers() || tries <= 0) return;
        setTimeout(function() { wait_for_other_layers(tries - 1); }, 50);
    }(20));
    load_markers_file(create_markers);
    m_main.append_loop_cb(update_markers);
}

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, false);
else
    init();

});

HuertaRuntime.require("huerta_calques");




