
"use strict";

HuertaRuntime.register("huerta_hud", function(exports, require) {

var m_camera  = require("camera");
var m_main    = require("main");
var m_mouse   = require("mouse");
var m_physics = require("physics");
var m_scenes  = require("scenes");


// ============================================================
// HUD
// ============================================================

var _hud = null;
var _hud_latitude = null;
var _hud_longitude = null;
var _hud_altitude = null;
var _canvas = null;
var _compass = null;
var _compass_view = new Float32Array(3);
var _compass_last_heading = null;


// ============================================================
// SOURIS
// ============================================================

var _mouse_x = 0;
var _mouse_y = 0;

var _move_pending = false;
var _mouse_dirty = false;

var _raycast_pending = false;


// ============================================================
// SECURITE RAYCAST
// ============================================================

var _raycast_timeout = null;

var _raycast_timeout_count = 0;

var RAYCAST_LOG_EVERY = 20;

var HUD_RAY_LENGTH = 30000;

var HUD_COLLISION_ID = "TERRAIN_NAV_MASQUE";


// ============================================================
// TRANSFORMATION MONDE -> UTM
// Terrain centré sur (0, 0), aligné sur les axes et de même emprise
// que le raster QGIS EPSG:25830 : (554886, 4515098) à (564240, 4523978).
// On utilise donc la translation du centre de l'emprise, sans recalage affine.
// ============================================================

var UTM_AX = 1.0;
var UTM_BX = 0.0;
var UTM_CX = 559563.0;

var UTM_AY = 0.0;
var UTM_BY = 1.0;
var UTM_CY = 4519538.0;


// ============================================================
// CREATION DU HUD
// ============================================================

function create_hud() {

    _hud = document.createElement("div");

    _hud.id = "huerta_hud";

    _hud.style.position = "fixed";
    _hud.style.left = "15px";
    _hud.style.top = "15px";

    _hud.style.padding = "7px 9px";

    _hud.style.background = "rgba(0,0,0,0.70)";
    _hud.style.color = "#ffffff";

    _hud.style.fontFamily = "Arial,sans-serif";
    _hud.style.fontSize = "clamp(9px, 1vw, 12px)";
    _hud.style.lineHeight = "1.2";
    _hud.style.display = "flex";
    _hud.style.alignItems = "center";
    _hud.style.gap = "10px";
    _hud.style.whiteSpace = "nowrap";
    _hud.style.maxWidth = "calc(100vw - 30px)";

    _hud.style.pointerEvents = "none";

    _hud.style.zIndex = "9999";

    var hudName = document.createElement("strong");
    hudName.textContent = "HUERTA HERNANDO";
    _hud_latitude = document.createElement("span");
    _hud_latitude.textContent = "LAT ---";
    _hud_longitude = document.createElement("span");
    _hud_longitude.textContent = "LON ---";
    _hud_altitude = document.createElement("span");
    _hud_altitude.textContent = "ALT ---";
    _hud.appendChild(hudName);
    _hud.appendChild(_hud_latitude);
    _hud.appendChild(_hud_longitude);
    _hud.appendChild(_hud_altitude);

    document.body.appendChild(_hud);

    _compass = document.createElement("div");
    _compass.id = "huerta_compass";
    _compass.setAttribute("role", "img");
    _compass.setAttribute("aria-label", "Boussole : les directions défilent sous le repère central");
    _compass.innerHTML =
        '<div class="huerta-compass__tape" aria-hidden="true"></div>' +
        '<span class="huerta-compass__cursor" aria-hidden="true"></span>';
    var tape = _compass.querySelector(".huerta-compass__tape");
    var cardinalNames = ["N", "E", "S", "O"];
    for (var degree = -720; degree <= 1080; degree += 30) {
        var tick = document.createElement("span");
        var cardinalIndex = ((degree / 90) % 4 + 4) % 4;
        var isCardinal = degree % 90 === 0;
        tick.className = "huerta-compass__tick" + (isCardinal ? " is-cardinal" : "");
        tick.style.left = (degree * 0.65) + "px";
        if (isCardinal) {
            tick.classList.add("is-direction-" + cardinalNames[cardinalIndex].toLowerCase());
        }
        tape.appendChild(tick);
    }
    document.body.appendChild(_compass);

    console.log("HUERTA HUD : affichage créé");
}


// ============================================================
// RECHERCHE DU CANVAS
// ============================================================

function wait_for_canvas() {

    _canvas = document.querySelector(
        "#main_canvas_container canvas"
    );

    if (!_canvas) {

        setTimeout(
            wait_for_canvas,
            100
        );

        return;
    }

    console.log("HUERTA HUD : canvas trouvé");

    setTimeout(
        start_mouse_listener,
        1000
    );
}


// ============================================================
// ECOUTE SOURIS
// ============================================================

function start_mouse_listener() {

    if (!_canvas)
        return;

    _canvas.addEventListener(
        "mousemove",
        mouse_move,
        false
    );

    m_main.append_loop_cb(update_compass);

    console.log(
        "HUERTA HUD : écoute souris prête"
    );
}


// ============================================================
// MOUVEMENT SOURIS
// ============================================================

function mouse_move(e) {

    update_compass();

    _mouse_x = m_mouse.get_coords_x(e);
    _mouse_y = m_mouse.get_coords_y(e);

    _mouse_dirty = true;

    if (_move_pending)
        return;

    _move_pending = true;

    window.requestAnimationFrame(
        process_mouse_move
    );
}


// La flèche reste orientée vers le nord du terrain lorsque la caméra tourne.
function update_compass() {

    if (!_compass)
        return;

    var cam = m_scenes.get_active_camera();
    if (!cam)
        return;

    var view = m_camera.get_view_vector(cam, _compass_view);
    if (!view)
        return;

    var horizontal = Math.sqrt(view[0] * view[0] + view[1] * view[1]);
    if (horizontal < 0.0001)
        return;

    // L’axe nord du terrain est +Y. La direction de visée donne le nord
    // à afficher par rapport à l’écran, indépendamment du trajet calculé.
    var heading = Math.atan2(view[0], view[1]) * 180 / Math.PI;
    if (_compass_last_heading !== null &&
        Math.abs(heading - _compass_last_heading) < 0.05)
        return;
    _compass_last_heading = heading;
    var tape = _compass.querySelector(".huerta-compass__tape");
    if (tape)
        tape.style.transform = "translateX(" + (-heading * 0.65) + "px)";
}


// ============================================================
// SECURITE RAYCAST
// ============================================================

function raycast_timeout() {

    _raycast_timeout = null;

    if (!_raycast_pending)
        return;

    _raycast_pending = false;

    _raycast_timeout_count++;

    if (
        _raycast_timeout_count %
        RAYCAST_LOG_EVERY === 0
    ) {

        console.log(
            "HUERTA HUD : " +
            _raycast_timeout_count +
            " raycasts timeout"
        );
    }

    schedule_next_mouse_move();
}


// ============================================================
// TRAITEMENT DU MOUVEMENT
// ============================================================

function process_mouse_move() {

    _move_pending = false;

    if (!_mouse_dirty)
        return;

    if (_raycast_pending)
        return;

    var cam = m_scenes.get_active_camera();

    if (!cam) {

        _mouse_dirty = true;

        return;
    }

    _mouse_dirty = false;


    // ========================================================
    // CALCUL DU RAYON BLEND4WEB
    // ========================================================

    var ray = m_camera.calc_ray(
        cam,
        _mouse_x,
        _mouse_y
    );

    if (!ray) {

        _mouse_dirty = true;

        return;
    }


    var from = [
        ray[0],
        ray[1],
        ray[2]
    ];

    var to = [
        ray[0] + ray[3] * HUD_RAY_LENGTH,
        ray[1] + ray[4] * HUD_RAY_LENGTH,
        ray[2] + ray[5] * HUD_RAY_LENGTH
    ];


    // ========================================================
    // RAYCAST
    // ========================================================

    _raycast_pending = true;

    m_physics.append_ray_test_ext(
        null,
        from,
        to,
        HUD_COLLISION_ID,
        hud_ray_cb,
        true,
        false,
        true,
        false
    );


    // ========================================================
    // WATCHDOG
    // ========================================================

    if (_raycast_timeout !== null) {

        clearTimeout(
            _raycast_timeout
        );
    }

    _raycast_timeout = setTimeout(
        raycast_timeout,
        500
    );
}


// ============================================================
// CALLBACK RAYCAST
// ============================================================

function hud_ray_cb(
    id,
    hit_fract,
    obj_hit,
    hit_time,
    hit_pos,
    hit_norm
) {

    _raycast_pending = false;

    if (_raycast_timeout !== null) {

        clearTimeout(
            _raycast_timeout
        );

        _raycast_timeout = null;
    }


    // ========================================================
    // VERIFICATION DU TOUCHER
    // ========================================================

    if (hit_fract < 0 || !hit_pos) {

        schedule_next_mouse_move();

        return;
    }


    // ========================================================
    // COORDONNEES MONDE
    // ========================================================

    var world_x = hit_pos[0];
    var world_y = hit_pos[1];
    var world_z = hit_pos[2];


    // ========================================================
    // MONDE -> UTM
    // ========================================================

    var utm = world_to_utm(
        world_x,
        world_y
    );


    // ========================================================
    // UTM -> GPS
    // ========================================================

    var gps = utm_to_gps(
        utm.x,
        utm.y
    );
    if (window.ExodusLocalContext) gps = exports.world_to_gps(world_x, world_y);


    // ========================================================
    // ALTITUDE
    // ========================================================

    var altitude = world_z;


    // ========================================================
    // AFFICHAGE
    // ========================================================

    if (_hud_latitude)
        _hud_latitude.textContent = "LAT " + gps.lat.toFixed(6);
    if (_hud_longitude)
        _hud_longitude.textContent = "LON " + gps.lon.toFixed(6);
    if (_hud_altitude)
        _hud_altitude.textContent = window.ExodusLocalContext && !window.ExodusLocalContext.terrainReady ? "ALT —" : "ALT " + altitude.toFixed(2) + " m";


    // ========================================================
    // NOUVEAU MOUVEMENT EN ATTENTE
    // ========================================================

    schedule_next_mouse_move();
}


// ============================================================
// PROGRAMMER LE PROCHAIN RAYCAST
// ============================================================

function schedule_next_mouse_move() {

    if (!_mouse_dirty)
        return;

    if (_move_pending)
        return;

    _move_pending = true;

    window.requestAnimationFrame(
        process_mouse_move
    );
}


// ============================================================
// MONDE -> UTM
// ============================================================

function world_to_utm(
    world_x,
    world_y
) {

    var utm_x =
        UTM_AX * world_x +
        UTM_BX * world_y +
        UTM_CX;

    var utm_y =
        UTM_AY * world_x +
        UTM_BY * world_y +
        UTM_CY;

    return {
        x: utm_x,
        y: utm_y
    };
}


// ============================================================
// UTM -> GPS
// EPSG:25830
// ETRS89 / UTM zone 30N
// ============================================================

function utm_to_gps(
    easting,
    northing
) {

    var a = 6378137.0;

    var eccSquared =
        0.00669438002290;

    var k0 = 0.9996;

    var eccPrimeSquared =
        eccSquared /
        (1.0 - eccSquared);

    var e1 =
        (1.0 -
        Math.sqrt(1.0 - eccSquared)) /
        (1.0 +
        Math.sqrt(1.0 - eccSquared));


    var x =
        easting - 500000.0;

    var y =
        northing;


    var M =
        y / k0;


    var mu =
        M /
        (
            a *
            (
                1 -
                eccSquared / 4 -
                3 * eccSquared * eccSquared / 64 -
                5 * eccSquared * eccSquared * eccSquared / 256
            )
        );


    var phi1Rad =
        mu +
        (3 * e1 / 2 -
        27 * e1 * e1 * e1 / 32) *
        Math.sin(2 * mu) +

        (21 * e1 * e1 / 16 -
        55 * e1 * e1 * e1 * e1 / 32) *
        Math.sin(4 * mu) +

        (151 * e1 * e1 * e1 / 96) *
        Math.sin(6 * mu) +

        (1097 * e1 * e1 * e1 * e1 / 512) *
        Math.sin(8 * mu);


    var N1 =
        a /
        Math.sqrt(
            1 -
            eccSquared *
            Math.sin(phi1Rad) *
            Math.sin(phi1Rad)
        );


    var T1 =
        Math.tan(phi1Rad) *
        Math.tan(phi1Rad);


    var C1 =
        eccPrimeSquared *
        Math.cos(phi1Rad) *
        Math.cos(phi1Rad);


    var R1 =
        a *
        (1 - eccSquared) /
        Math.pow(
            1 -
            eccSquared *
            Math.sin(phi1Rad) *
            Math.sin(phi1Rad),
            1.5
        );


    var D =
        x /
        (N1 * k0);


    var lat =
        phi1Rad -
        (
            N1 *
            Math.tan(phi1Rad) /
            R1
        ) *
        (
            D * D / 2 -

            (
                5 +
                3 * T1 +
                10 * C1 -
                4 * C1 * C1 -
                9 * eccPrimeSquared
            ) *
            Math.pow(D, 4) / 24 +

            (
                61 +
                90 * T1 +
                298 * C1 +
                45 * T1 * T1 -
                252 * eccPrimeSquared -
                3 * C1 * C1
            ) *
            Math.pow(D, 6) / 720
        );


    var lon =
        (
            D -
            (
                1 +
                2 * T1 +
                C1
            ) *
            Math.pow(D, 3) / 6 +

            (
                5 -
                2 * C1 +
                28 * T1 -
                3 * C1 * C1 +
                8 * eccPrimeSquared +
                24 * T1 * T1
            ) *
            Math.pow(D, 5) / 120
        ) /
        Math.cos(phi1Rad);


    // ========================================================
    // MERIDIEN CENTRAL UTM ZONE 30
    // ========================================================

    var lonOrigin =
        -3.0 *
        Math.PI /
        180.0;


    lat =
        lat *
        180.0 /
        Math.PI;


    lon =
        lonOrigin +
        lon;


    lon =
        lon *
        180.0 /
        Math.PI;


    return {
        lat: lat,
        lon: lon
    };
}


// Conversion partagée avec le bouton Google Earth.
exports.world_to_gps = function(world_x, world_y) {
    if (window.ExodusLocalContext) {
        var point = ExodusZone.geographic(window.ExodusLocalContext.zone, world_x, world_y);
        return {lat: point.latitude, lon: point.longitude};
    }
    var utm = world_to_utm(world_x, world_y);
    return utm_to_gps(utm.x, utm.y);
};


// ============================================================
// INITIALISATION
// ============================================================

function init_after_dom() {

    create_hud();

    wait_for_canvas();
}


exports.init = function() {

    console.log(
        "HUERTA HUD : initialisation"
    );


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init_after_dom,
            false
        );

    } else {

        init_after_dom();
    }
};


});


HuertaRuntime.require("huerta_hud").init();

