"use strict";


HuertaRuntime.register("huerta_webgl_main", function(exports, require) {


/* =========================================================
 * MODULES
 * ========================================================= */

var m_app       = require("app");
var m_cfg       = require("config");
var m_data      = require("data");
var m_preloader = require("preloader");
var m_ver       = require("version");

var m_camera    = require("camera");
var m_main      = require("main");
var m_physics   = require("physics");
var m_scenes    = require("scenes");
var m_hd_tiles  = require("huerta_hd_tiles");


var DEBUG =
    (m_ver.type() == "DEBUG");


var APP_ASSETS_PATH =
    m_cfg.get_assets_path("huerta_webgl");


/* =========================================================
 * REPERE MONDE
 * ========================================================= */

var WORLD_UP =
    new Float32Array([0, 0, 1]);

var EARTH_AXIS =
    new Float32Array([0, 0, 1]);

var EAST_WEST_AXIS =
    new Float32Array([1, 0, 0]);


/* =========================================================
 * VITESSES NAVIGATION
 * ========================================================= */

var ROTATION_SPEED =
    0.0025;

var TILT_SPEED =
    0.0020;

var RIGHT_DRAG_ZOOM_SPEED =
    0.004;

var WHEEL_ZOOM_FACTOR =
    0.94;


/* =========================================================
 * LIMITES NAVIGATION
 * ========================================================= */

var MIN_DISTANCE =
    1.0;

var MAX_DISTANCE =
    20000;

var MIN_CAMERA_HEIGHT =
    1.0;

var RAY_LENGTH =
    30000;

var RAYCAST_TIMEOUT =
    800;


/* =========================================================
 * OBJET DE COLLISION UTILISE POUR LES TESTS
 *
 * IMPORTANT :
 * L'ID unique du matériau permet de viser le maillage terrain.
 * Pour un maillage statique, Blend4Web peut retourner obj_hit=null.
 * ========================================================= */

var COLLISION_TEST_OBJECT_NAME =
    "terrain_nav_masque";

var COLLISION_TEST_ID =
    "TERRAIN_NAV_MASQUE";


/* =========================================================
 * MODES SOURIS
 * ========================================================= */

var MODE_NONE   = 0;
var MODE_PAN    = 1;
var MODE_MIDDLE = 2;
var MODE_RIGHT  = 3;

// Le mode de sélection Marcheur réserve le clic gauche au choix des points.
// Le déplacement caméra reste disponible en suspendant la sélection ; la
// molette et les boutons milieu/droit restent toujours actifs.
var _terrain_pick_mode = false;


/* =========================================================
 * ETAT SOURIS
 * ========================================================= */

var _mode =
    MODE_NONE;

var _mouse_x =
    0;

var _mouse_y =
    0;

var _move_pending =
    false;

var _middle_start_x =
    0;

var _middle_start_y =
    0;


/* =========================================================
 * CANVAS
 * ========================================================= */

var _canvas =
    null;


/* =========================================================
 * MARQUEUR DU PIVOT
 * ========================================================= */

var _pivot_marker =
    null;

var _pivot_marker_parent =
    null;


function create_pivot_marker() {

    remove_pivot_marker();

    if (!_canvas)
        return;

    _pivot_marker_parent =
        _canvas.parentElement;

    if (!_pivot_marker_parent)
        return;

    var parent_style =
        window.getComputedStyle(
            _pivot_marker_parent
        );

    if (
        parent_style.position ==
        "static"
    ) {

        _pivot_marker_parent.style.position =
            "relative";
    }


    var marker =
        document.createElement(
            "div"
        );

    marker.id =
        "huerta_pivot_marker";

    marker.style.position =
        "absolute";

    marker.style.width =
        "18px";

    marker.style.height =
        "18px";

    marker.style.margin =
        "0";

    marker.style.padding =
        "0";

    marker.style.pointerEvents =
        "none";

    marker.style.zIndex =
        "99999";

    marker.style.boxSizing =
        "border-box";

    marker.style.border =
        "1px solid rgba(255,255,255,0.95)";

    marker.style.borderRadius =
        "50%";

    marker.style.background =
        "rgba(255,0,0,0.15)";


    var center =
        document.createElement(
            "div"
        );

    center.style.position =
        "absolute";

    center.style.left =
        "50%";

    center.style.top =
        "50%";

    center.style.width =
        "4px";

    center.style.height =
        "4px";

    center.style.marginLeft =
        "-2px";

    center.style.marginTop =
        "-2px";

    center.style.borderRadius =
        "50%";

    center.style.background =
        "rgba(255,255,255,1)";

    center.style.boxShadow =
        "0 0 2px rgba(0,0,0,1)";

    marker.appendChild(
        center
    );


    var horizontal =
        document.createElement(
            "div"
        );

    horizontal.style.position =
        "absolute";

    horizontal.style.left =
        "2px";

    horizontal.style.right =
        "2px";

    horizontal.style.top =
        "8px";

    horizontal.style.height =
        "2px";

    horizontal.style.background =
        "rgba(255,255,255,0.95)";

    marker.appendChild(
        horizontal
    );


    var vertical =
        document.createElement(
            "div"
        );

    vertical.style.position =
        "absolute";

    vertical.style.top =
        "2px";

    vertical.style.bottom =
        "2px";

    vertical.style.left =
        "8px";

    vertical.style.width =
        "2px";

    vertical.style.background =
        "rgba(255,255,255,0.95)";

    marker.appendChild(
        vertical
    );


    _pivot_marker_parent.appendChild(
        marker
    );

    _pivot_marker =
        marker;
}


/* =========================================================
 * SUPPRESSION MARQUEUR
 * ========================================================= */

function remove_pivot_marker() {

    if (
        _pivot_marker &&
        _pivot_marker.parentNode
    ) {

        _pivot_marker.parentNode.removeChild(
            _pivot_marker
        );
    }

    _pivot_marker =
        null;

    _pivot_marker_parent =
        null;
}


/* =========================================================
 * POSITION MARQUEUR
 * ========================================================= */

function update_pivot_marker(
    cam
) {

    if (
        !_pivot_marker ||
        !_pivot_marker_parent ||
        !_has_pivot
    )

        return;


    var projected =
        new Float32Array(3);


    var result =
        m_camera.project_point(
            cam,
            _pivot,
            projected
        );


    if (!result) {

        _pivot_marker.style.display =
            "none";

        return;
    }


    var px =
        result[0];

    var py =
        result[1];


    var canvas_rect =
        _canvas.getBoundingClientRect();

    var parent_rect =
        _pivot_marker_parent.getBoundingClientRect();


    var left =
        canvas_rect.left -
        parent_rect.left +
        px -
        9;


    var top =
        canvas_rect.top -
        parent_rect.top +
        py -
        9;


    if (
        result.length >= 3 &&
        result[2] < 0
    ) {

        _pivot_marker.style.display =
            "none";

        return;
    }


    _pivot_marker.style.display =
        "block";

    _pivot_marker.style.left =
        left + "px";

    _pivot_marker.style.top =
        top + "px";
}


/* =========================================================
 * CAMERA
 * ========================================================= */

var _camera_pos =
    new Float32Array(3);

var _camera_start =
    new Float32Array(3);

// Marche libre : même caméra que le survol, position contrainte au terrain.
var _free_walk = {active:false, pending:false, generation:0, keys:{}, last:0, speed:50,
    yaw:0, pitch:0, savedPosition:new Float32Array(3), savedRotation:new Float32Array(4)};
function free_walk_pose(cam, pos) {
    var w = _free_walk, c = Math.cos(w.pitch);
    m_camera.static_setup(cam, {pos:pos, look_at:[pos[0]+Math.cos(w.yaw)*c,
        pos[1]+Math.sin(w.yaw)*c, pos[2]+Math.sin(w.pitch)]});
    m_camera.set_vertical_axis(cam, WORLD_UP);
    m_camera.correct_up(cam, WORLD_UP, true);
    _camera_pos.set(pos);
}
function free_walk_ground(x, y, callback) {
    m_physics.append_ray_test_ext(null,[x,y,10000],[x,y,-10000],COLLISION_TEST_ID,
        function(id,fraction,obj,time,hit) {callback(hit);},true,false,true);
}
function stop_free_walk() {
    var w=_free_walk;
    if (!w.active && !w.pending) return;
    w.generation++; w.active=false; w.pending=false; w.keys={};
    _mode=MODE_NONE; _move_pending=false;
    var cam=m_scenes.get_active_camera();
    if(cam) {m_camera.set_translation(cam,w.savedPosition);
        m_camera.static_set_rotation(cam,w.savedRotation); _camera_pos.set(w.savedPosition);
        update_pivot_marker(cam);}
}
function update_free_walk() {
    var w=_free_walk, now=performance.now(), dt=Math.min(.05,Math.max(0,(now-w.last)/1000));
    w.last=now;
    if(!w.active) return;
    var cam=m_scenes.get_active_camera(); if(!cam) return;
    var turn=(w.keys.ArrowLeft?1:0)-(w.keys.ArrowRight?1:0);
    w.yaw+=turn*1.4*dt;
    var pos=m_camera.get_translation(cam,new Float32Array(3));
    free_walk_pose(cam,pos);
    var forward=(w.keys.ArrowUp?1:0)-(w.keys.ArrowDown?1:0);
    if(!forward || w.pending) return;
    var step=forward*(w.speed/3.6)*dt, x=pos[0]+Math.cos(w.yaw)*step, y=pos[1]+Math.sin(w.yaw)*step;
    var ticket=w.generation; w.pending=true;
    free_walk_ground(x,y,function(hit) {
        if(ticket!==w.generation) return;
        w.pending=false;
        // Une limite ou une pente infranchissable arrête le pas.
        if(!w.active || !hit || Math.abs(hit[2]+1.7-pos[2])>Math.abs(step)*1.8+.03) return;
        free_walk_pose(cam,new Float32Array([x,y,hit[2]+1.7]));
    });
}
exports.start_free_walk=function() {
    var w=_free_walk, cam=m_scenes.get_active_camera();
    if(!cam || w.active || w.pending) return false;
    stop_route_flight(true);
    m_camera.get_translation(cam,w.savedPosition); m_camera.static_get_rotation(cam,w.savedRotation);
    var point=_has_pivot?Array.from(_pivot):Array.from(w.savedPosition);
    var view=m_camera.get_view_vector(cam,new Float32Array(3));
    w.yaw=Math.hypot(view[0],view[1])>.01?Math.atan2(view[1],view[0]):Math.PI/2;
    w.pitch=0; w.keys={}; w.pending=true; var ticket=++w.generation;
    free_walk_ground(point[0],point[1],function(hit) {
        if(ticket!==w.generation) return;
        w.pending=false; if(!hit) return;
        w.active=true; w.last=performance.now(); _navigation_generation++;
        _mode=MODE_NONE; _move_pending=false; _pan_ready=false; _drag_ready=false;
        remove_pivot_marker(); free_walk_pose(cam,new Float32Array([hit[0],hit[1],hit[2]+1.7]));
    });
    return true;
};
exports.set_free_walk_speed=function(kmh) {
    var value=Number(kmh);
    if(Number.isFinite(value)) _free_walk.speed=Math.max(.5,Math.min(80,value));
    return _free_walk.speed;
};
exports.stop_free_walk=stop_free_walk;
exports.get_free_walk_status=function(){return {active:_free_walk.active,pending:_free_walk.pending,speed:_free_walk.speed};};
exports.free_walk_key=function(key,down){_free_walk.keys[key]=down;};
exports.clear_free_walk_keys=function(){_free_walk.keys={};};

// Lecture caméra le long d'une ligne calculée par le Marcheur.
var _route_flight = {
    active: false,
    playing: false,
    prepared: false,
    started: false,
    points: [],
    cumulative: [],
    total: 0,
    distance: 0,
    speed: 15,
    altitude: 60,
    inclination: 35,
    lastTime: 0,
    manualControl: false,
    manualViewLocked: false,
    manualResumeAt: 0,
    manualBlending: false,
    manualBlendStart: 0,
    manualBlendDuration: 800,
    manualBlendPosition: new Float32Array(3),
    manualBlendRotation: new Float32Array(4),
    completed: false,
    segment: 0,
    savedPosition: new Float32Array(3),
    savedRotation: new Float32Array(4)
};


/* =========================================================
 * PIVOT
 * ========================================================= */

var _pivot =
    new Float32Array(3);

var _has_pivot =
    false;


/* =========================================================
 * ETAT DRAG MILIEU
 * ========================================================= */

var _drag_ready =
    false;

var _drag_camera_pos =
    new Float32Array(3);

var _drag_camera_quat =
    new Float32Array(4);

var _drag_vector =
    new Float32Array(3);

var _drag_distance =
    0;

var _drag_pivot =
    new Float32Array(3);


/* =========================================================
 * AXES NAVIGATION
 * ========================================================= */

var _pivot_axis =
    new Float32Array([0, 0, 1]);

var _tilt_axis =
    new Float32Array([1, 0, 0]);


/* =========================================================
 * VECTEURS TEMPORAIRES
 * ========================================================= */

var _orbit_after_yaw =
    new Float32Array(3);

var _orbit_after_tilt =
    new Float32Array(3);

var _screen_right_local =
    new Float32Array([1, 0, 0]);


/* =========================================================
 * QUATERNIONS
 * ========================================================= */

var _quat_yaw =
    new Float32Array(4);

var _quat_tilt =
    new Float32Array(4);

var _quat_delta =
    new Float32Array(4);

var _quat_final =
    new Float32Array(4);


/* =========================================================
 * PAN
 * ========================================================= */

var _pan_point =
    new Float32Array(3);

var _pan_current =
    new Float32Array(3);

var _pan_camera_start =
    new Float32Array(3);

var _pan_plane_z =
    0;

var _pan_ready =
    false;

var _pan_last_x =
    0;

var _pan_last_y =
    0;


/* =========================================================
 * RAYCAST
 * ========================================================= */

var _ray_serial =
    0;

var _ray_watchdog =
    null;


/* =========================================================
 * COMPTEUR DIAGNOSTIC
 * ========================================================= */

var _diagnostic_ray_count =
    0;


/* =========================================================
 * OUTILS
 * ========================================================= */

function distance3(a, b) {

    var dx =
        a[0] - b[0];

    var dy =
        a[1] - b[1];

    var dz =
        a[2] - b[2];

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );
}


// Crée une piste dédiée au simulateur : léger lissage spatial puis spline
// Catmull-Rom échantillonnée. Le trajet Marcheur source reste inchangé.
function smooth_route_flight_points(points, requestedRadius) {

    if (!points || points.length < 3)
        return (points || []).map(function(point) {
            return [Number(point[0]), Number(point[1]), Number(point[2])];
        });

    var source = [];
    points.forEach(function(point) {
        var value = [Number(point[0]), Number(point[1]), Number(point[2])];
        if (value.every(Number.isFinite) &&
                (!source.length || distance3(source[source.length - 1], value) > 0.01))
            source.push(value);
    });
    if (source.length < 3)
        return source;

    var sourceDistance = [0];
    for (var i = 1; i < source.length; i++)
        sourceDistance.push(sourceDistance[i - 1] + distance3(source[i - 1], source[i]));

    var softened = [];
    var smoothingRadius = Number(requestedRadius);
    if (!Number.isFinite(smoothingRadius))
        smoothingRadius = 18;
    smoothingRadius = Math.max(1, Math.min(20, smoothingRadius));
    for (var p = 0; p < source.length; p++) {
        if (p === 0 || p === source.length - 1) {
            softened.push(source[p].slice());
            continue;
        }
        var sumX = 0, sumY = 0, sumZ = 0, sumWeight = 0;
        for (var q = p; q >= 0 && sourceDistance[p] - sourceDistance[q] <= smoothingRadius; q--) {
            var weightBefore = 1 - (sourceDistance[p] - sourceDistance[q]) / smoothingRadius;
            sumX += source[q][0] * weightBefore;
            sumY += source[q][1] * weightBefore;
            sumZ += source[q][2] * weightBefore;
            sumWeight += weightBefore;
        }
        for (var q2 = p + 1; q2 < source.length && sourceDistance[q2] - sourceDistance[p] <= smoothingRadius; q2++) {
            var weightAfter = 1 - (sourceDistance[q2] - sourceDistance[p]) / smoothingRadius;
            sumX += source[q2][0] * weightAfter;
            sumY += source[q2][1] * weightAfter;
            sumZ += source[q2][2] * weightAfter;
            sumWeight += weightAfter;
        }
        softened.push([
            sumX / sumWeight,
            sumY / sumWeight,
            sumZ / sumWeight
        ]);
    }

    var smoothed = [softened[0].slice()];
    var subdivisions = 6;
    for (var segment = 0; segment < softened.length - 1; segment++) {
        var p0 = softened[Math.max(0, segment - 1)];
        var p1 = softened[segment];
        var p2 = softened[segment + 1];
        var p3 = softened[Math.min(softened.length - 1, segment + 2)];
        for (var step = 1; step <= subdivisions; step++) {
            var t = step / subdivisions;
            var t2 = t * t;
            var t3 = t2 * t;
            var sample = [];
            for (var axis = 0; axis < 3; axis++) {
                sample[axis] = 0.5 * (
                    2 * p1[axis] +
                    (-p0[axis] + p2[axis]) * t +
                    (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2 +
                    (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3
                );
            }
            smoothed.push(sample);
        }
    }
    return smoothed;
}


function route_flight_point_at(distance) {

    var state = _route_flight;
    var low = 0;
    var high = state.cumulative.length - 1;

    distance = Math.max(0, distance);
    while (low + 1 < high) {
        var middle = (low + high) >> 1;
        if (state.cumulative[middle] <= distance)
            low = middle;
        else
            high = middle;
    }

    if (distance >= state.total) {
        var last = state.points[state.points.length - 1];
        if (distance === state.total || state.points.length < 2)
            return last.slice();
        var previous = state.points[state.points.length - 2];
        var finalLength = state.cumulative[state.cumulative.length - 1] -
            state.cumulative[state.cumulative.length - 2];
        var extension = finalLength > 0 ? (distance - state.total) / finalLength : 0;
        return [
            last[0] + (last[0] - previous[0]) * extension,
            last[1] + (last[1] - previous[1]) * extension,
            last[2] + (last[2] - previous[2]) * extension
        ];
    }

    var segmentLength = state.cumulative[low + 1] - state.cumulative[low];
    var t = segmentLength > 0
        ? (distance - state.cumulative[low]) / segmentLength : 0;
    var a = state.points[low];
    var b = state.points[low + 1];
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
    ];
}


function update_route_flight() {

    var state = _route_flight;
    if (!state.active || !state.playing)
        return;

    var cam = m_scenes.get_active_camera();
    if (!cam)
        return;

    var now = performance.now();
    var manualRotation = null;
    if (state.manualControl) {
        manualRotation = new Float32Array(4);
        m_camera.static_get_rotation(cam, manualRotation);
    } else if (state.manualViewLocked) {
        manualRotation = state.manualBlendRotation;
    }
    var blend = 1;
    if (state.manualBlending) {
        blend = Math.max(0, Math.min(1,
            (now - state.manualBlendStart) / state.manualBlendDuration));
    }
    var delta = Math.max(0, Math.min(0.1, (now - state.lastTime) / 1000));
    state.lastTime = now;
    state.distance = Math.min(state.total, state.distance + delta * state.speed);

    apply_route_flight_camera(cam, blend, manualRotation);
    if (_has_pivot && (state.manualControl || state.manualViewLocked)) {
        var movingView = new Float32Array(3);
        var movingPosition = new Float32Array(3);
        m_camera.get_translation(cam, movingPosition);
        m_camera.get_view_vector(cam, movingView);
        _pivot[0] = movingPosition[0] + movingView[0] * 40;
        _pivot[1] = movingPosition[1] + movingView[1] * 40;
        _pivot[2] = movingPosition[2] + movingView[2] * 40;
    }
    if (_has_pivot)
        update_pivot_marker(cam);
    if (state.manualBlending && blend >= 1)
        state.manualBlending = false;

    if (state.distance >= state.total) {
        state.playing = false;
        state.prepared = true;
        state.started = true;
        state.completed = true;
        _mode = MODE_NONE;
        _pan_ready = false;
        _drag_ready = false;
        update_pivot_marker(cam);
    }
}


function apply_route_flight_camera(cam, blend, manualRotation) {

    var state = _route_flight;
    if (!cam || !state.points.length)
        return;

    var point = route_flight_point_at(state.distance);
    var lookAhead = Math.max(30, Math.min(120, state.speed * 4));
    var target = route_flight_point_at(Math.min(state.total, state.distance + lookAhead));
    var cameraPosition = new Float32Array([
        point[0],
        point[1],
        point[2] + state.altitude
    ]);
    var dx = target[0] - point[0];
    var dy = target[1] - point[1];
    var horizontalLength = Math.sqrt(dx * dx + dy * dy);
    if (horizontalLength < 0.001 && state.points.length > 1) {
        var fallbackIndex = state.distance >= state.total
            ? state.points.length - 1 : 1;
        var fallbackPoint = state.points[fallbackIndex];
        var fallbackOrigin = state.points[fallbackIndex - 1];
        dx = fallbackPoint[0] - fallbackOrigin[0];
        dy = fallbackPoint[1] - fallbackOrigin[1];
        horizontalLength = Math.sqrt(dx * dx + dy * dy);
    }
    if (horizontalLength < 0.001) {
        dx = 1;
        dy = 0;
        horizontalLength = 1;
    }
    var horizontalLook = lookAhead;
    var inclinationRadians = state.inclination * Math.PI / 180;
    var targetPosition = new Float32Array([
        cameraPosition[0] + dx / horizontalLength * horizontalLook,
        cameraPosition[1] + dy / horizontalLength * horizontalLook,
        cameraPosition[2] - Math.tan(inclinationRadians) * horizontalLook
    ]);

    // L'inclinaison est mesurée vers le bas depuis l'horizontale.
    m_camera.static_setup(cam, {pos:cameraPosition, look_at:targetPosition});
    m_camera.set_vertical_axis(cam, WORLD_UP);
    m_camera.correct_up(cam, WORLD_UP, true);
    if (manualRotation || (blend !== undefined && blend < 1)) {
        var automaticRotation = new Float32Array(4);
        m_camera.static_get_rotation(cam, automaticRotation);
        var blendedRotation = new Float32Array(4);
        var sourceRotation = manualRotation || state.manualBlendRotation;
        var rotationBlend = manualRotation ? 0 : blend;
        var dot = 0;
        for (var q = 0; q < 4; q++)
            dot += sourceRotation[q] * automaticRotation[q];
        if (dot < 0) {
            for (var q2 = 0; q2 < 4; q2++)
                automaticRotation[q2] = -automaticRotation[q2];
        }
        var length = 0;
        for (var q3 = 0; q3 < 4; q3++) {
            blendedRotation[q3] = sourceRotation[q3] * (1 - rotationBlend) +
                automaticRotation[q3] * rotationBlend;
            length += blendedRotation[q3] * blendedRotation[q3];
        }
        length = Math.sqrt(length) || 1;
        for (var q4 = 0; q4 < 4; q4++)
            blendedRotation[q4] /= length;
        m_camera.static_set_rotation(cam, blendedRotation);
    }
    m_camera.get_translation(cam, _camera_pos);
}


function start_route_flight(points, altitude, speed, inclination) {

    if (!points || points.length < 2)
        return false;

    stop_free_walk();
    stop_route_flight(true);

    var cam = m_scenes.get_active_camera();
    if (!cam)
        return false;

    var state = _route_flight;
    // Le trajet reçu est déjà le résultat final aimantation + spline.
    // Le simulateur le suit tel quel, sans appliquer un second lissage.
    state.points = points.map(function(point) {
        return [Number(point[0]), Number(point[1]), Number(point[2])];
    });
    state.cumulative = [0];
    state.total = 0;
    for (var i = 1; i < state.points.length; i++) {
        state.total += distance3(state.points[i - 1], state.points[i]);
        state.cumulative.push(state.total);
    }
    if (!(state.total > 0)) {
        state.points = [];
        state.cumulative = [];
        return false;
    }

    m_camera.get_translation(cam, state.savedPosition);
    m_camera.static_get_rotation(cam, state.savedRotation);
    state.altitude = Math.max(5, Number(altitude) || 60);
    state.speed = Math.max(1, Number(speed) || 15);
    state.inclination = 0;
    state.distance = 0;
    state.lastTime = performance.now();
    state.manualControl = false;
    state.manualViewLocked = false;
    state.manualResumeAt = 0;
    state.manualBlending = false;
    state.completed = false;
    state.active = true;
    state.playing = false;
    state.prepared = true;
    state.started = false;
    state.manualControl = false;
    state.manualViewLocked = false;
    state.manualResumeAt = 0;
    state.manualBlending = false;
    state.completed = false;
    _navigation_generation++;
    _mode = MODE_NONE;
    _move_pending = false;
    _pan_ready = false;
    _drag_ready = false;
    remove_pivot_marker();
    apply_route_flight_camera(cam);
    return true;
}


function stop_route_flight(restoreView) {

    var state = _route_flight;
    if (!state.active)
        return;

    var cam = m_scenes.get_active_camera();
    state.active = false;
    state.playing = false;
    state.prepared = false;
    state.started = false;
    state.points = [];
    state.cumulative = [];
    state.manualControl = false;
    state.manualViewLocked = false;
    state.manualResumeAt = 0;
    state.manualBlending = false;
    state.completed = false;
    _mode = MODE_NONE;
    _move_pending = false;
    _pan_ready = false;
    _drag_ready = false;

    if (cam && restoreView) {
        m_camera.set_translation(cam, state.savedPosition);
        m_camera.static_set_rotation(cam, state.savedRotation);
        m_camera.get_translation(cam, _camera_pos);
        update_pivot_marker(cam);
    }
}


function rotate_vector_axis(
    vector,
    axis,
    angle,
    out
) {

    var ax =
        axis[0];

    var ay =
        axis[1];

    var az =
        axis[2];

    var vx =
        vector[0];

    var vy =
        vector[1];

    var vz =
        vector[2];

    var c =
        Math.cos(angle);

    var s =
        Math.sin(angle);

    var d =
        ax * vx +
        ay * vy +
        az * vz;

    var cx =
        ay * vz -
        az * vy;

    var cy =
        az * vx -
        ax * vz;

    var cz =
        ax * vy -
        ay * vx;

    out[0] =
        vx * c +
        cx * s +
        ax * d * (1 - c);

    out[1] =
        vy * c +
        cy * s +
        ay * d * (1 - c);

    out[2] =
        vz * c +
        cz * s +
        az * d * (1 - c);
}


/* =========================================================
 * QUATERNIONS
 * ========================================================= */

function quat_axis_angle(
    axis,
    angle,
    out
) {

    var h =
        angle * 0.5;

    var s =
        Math.sin(h);

    out[0] =
        axis[0] * s;

    out[1] =
        axis[1] * s;

    out[2] =
        axis[2] * s;

    out[3] =
        Math.cos(h);
}


function quat_multiply(
    a,
    b,
    out
) {

    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    var aw = a[3];

    var bx = b[0];
    var by = b[1];
    var bz = b[2];
    var bw = b[3];

    out[0] =
        aw * bx +
        ax * bw +
        ay * bz -
        az * by;

    out[1] =
        aw * by -
        ax * bz +
        ay * bw +
        az * bx;

    out[2] =
        aw * bz +
        ax * by -
        ay * bx +
        az * bw;

    out[3] =
        aw * bw -
        ax * bx -
        ay * by -
        az * bz;
}


function rotate_vector_quat(
    vector,
    quat,
    out
) {

    var tx = 2 * (quat[1] * vector[2] - quat[2] * vector[1]);
    var ty = 2 * (quat[2] * vector[0] - quat[0] * vector[2]);
    var tz = 2 * (quat[0] * vector[1] - quat[1] * vector[0]);

    out[0] = vector[0] + quat[3] * tx + quat[1] * tz - quat[2] * ty;
    out[1] = vector[1] + quat[3] * ty + quat[2] * tx - quat[0] * tz;
    out[2] = vector[2] + quat[3] * tz + quat[0] * ty - quat[1] * tx;
}


/* =========================================================
 * RAYCAST PHYSIQUE
 *
 * COLLISION_ID = ANY
 *
 * Le moteur peut donc toucher n'importe quel objet
 * possédant une collision.
 *
 * Nous n'acceptons ensuite QUE :
 *
 * terrain_nav_masque
 * ========================================================= */

function raycast_terrain(
    cam,
    x,
    y,
    callback
) {

    var ray =
        m_camera.calc_ray(
            cam,
            x,
            y
        );


    if (!ray) {

        console.log(
            "RAY TERRAIN : calc_ray = NULL"
        );

        callback(null);

        return;
    }


    var from = [
        ray[0],
        ray[1],
        ray[2]
    ];


    var to = [
        ray[0] +
            ray[3] * RAY_LENGTH,

        ray[1] +
            ray[4] * RAY_LENGTH,

        ray[2] +
            ray[5] * RAY_LENGTH
    ];


    console.log(
        "RAY TERRAIN :",
        "mouse=",
        x,
        y,
        "from=",
        from[0],
        from[1],
        from[2],
        "to=",
        to[0],
        to[1],
        to[2]
    );


    var serial =
        ++_ray_serial;


    if (_ray_watchdog) {

        clearTimeout(
            _ray_watchdog
        );

        _ray_watchdog =
            null;
    }


    var finished =
        false;


    function finish(hit) {

        if (finished)
            return;

        if (serial != _ray_serial)
            return;

        finished =
            true;


        if (_ray_watchdog) {

            clearTimeout(
                _ray_watchdog
            );

            _ray_watchdog =
                null;
        }


        callback(hit);
    }


    _ray_watchdog =
        setTimeout(
            function() {

                console.log(
                    "RAY TERRAIN : TIMEOUT"
                );

                finish(null);

            },
            RAYCAST_TIMEOUT
        );


    m_physics.append_ray_test_ext(

        null,

        from,

        to,

        COLLISION_TEST_ID,

        function(
            id,
            hit_fract,
            obj_hit,
            hit_time,
            hit_pos,
            hit_norm
        ) {

            _diagnostic_ray_count++;


            console.log(
                "================================================"
            );

            console.log(
                "RAY DIAGNOSTIC #",
                _diagnostic_ray_count
            );

            console.log(
                "RAY CALLBACK FRACTION =",
                hit_fract
            );


            var object_name =
                null;


            if (obj_hit) {

                object_name =
                    m_scenes.get_object_name(
                        obj_hit
                    );

                console.log(
                    "RAY OBJET TOUCHE =",
                    object_name
                );
            }


            if (hit_norm) {

                console.log(
                    "RAY NORMALE =",
                    hit_norm[0],
                    hit_norm[1],
                    hit_norm[2]
                );
            }


            if (hit_pos) {

                console.log(
                    "RAY HIT XYZ =",
                    hit_pos[0],
                    hit_pos[1],
                    hit_pos[2]
                );

                console.log(
                    "RAY HIT Z =",
                    hit_pos[2]
                );

                console.log(
                    "RAY DISTANCE =",
                    hit_fract *
                    RAY_LENGTH
                );

                /*
                 * Contrôle de cohérence : reprojette le point touché
                 * sur l'écran et compare sa position au pixel du clic.
                 */
                var hit_projected =
                    new Float32Array(3);

                var projection_result =
                    m_camera.project_point(
                        cam,
                        hit_pos,
                        hit_projected
                    );

                if (projection_result) {

                    var projected_x =
                        projection_result[0];

                    var projected_y =
                        projection_result[1];

                    var delta_x =
                        projected_x - x;

                    var delta_y =
                        projected_y - y;

                    var pixel_error =
                        Math.sqrt(
                            delta_x * delta_x +
                            delta_y * delta_y
                        );

                    console.log(
                        "RAY HIT REPROJECTION :",
                        "clic=",
                        x,
                        y,
                        "projection=",
                        projected_x,
                        projected_y,
                        "ecart_px=",
                        pixel_error
                    );

                } else {

                    console.log(
                        "RAY HIT REPROJECTION : IMPOSSIBLE"
                    );
                }
            }


            if (
                !hit_pos ||
                hit_fract < 0 ||
                hit_fract > 1
            ) {

                console.log(
                    "RAY TERRAIN : AUCUN HIT"
                );

                console.log(
                    "================================================"
                );

                finish(null);

                return;
            }


            /* =================================================
             * VERIFICATION NOM OBJET DE COLLISION
             * ================================================= */

            if (
                object_name &&
                object_name != COLLISION_TEST_OBJECT_NAME
            ) {

                console.log(
                    "RAY TERRAIN : HIT REJETE"
                );

                console.log(
                    "OBJET TOUCHE =",
                    object_name
                );

                console.log(
                    "OBJET ATTENDU =",
                    COLLISION_TEST_OBJECT_NAME
                );

                console.log(
                    "LE HIT NE PEUT PAS SERVIR DE PIVOT"
                );

                console.log(
                    "================================================"
                );

                finish(null);

                return;
            }


            if (!object_name) {

                console.log(
                    "RAY OBJET : nom absent; ID unique confirme =",
                    COLLISION_TEST_ID
                );
            }


            console.log(
                "RAY TERRAIN : OBJET DE TEST CONFIRME"
            );

            console.log(
                "RAY TERRAIN : HIT ACCEPTE",
                hit_pos[0],
                hit_pos[1],
                hit_pos[2]
            );

            console.log(
                "================================================"
            );


            finish([
                hit_pos[0],
                hit_pos[1],
                hit_pos[2]
            ]);
        },

        true,
        false,
        true,
        false
    );
}


/* =========================================================
 * DIAGNOSTIC DES 5 RAYONS
 *
 *                 HAUT
 *                  |
 *           GAUCHE + DROITE
 *                  |
 *                 BAS
 *
 * Le diagnostic sert uniquement à observer
 * la collision.
 * ========================================================= */

function diagnostic_rays_around(
    cam,
    x,
    y
) {

    var d =
        40;


    console.log(
        "************************************************"
    );

    console.log(
        "DIAGNOSTIC COLLISION AUTOUR DU CLIC"
    );

    console.log(
        "CENTRE =",
        x,
        y
    );

    console.log(
        "OBJET DE COLLISION ATTENDU =",
        COLLISION_TEST_OBJECT_NAME,
        "ID =",
        COLLISION_TEST_ID
    );

    console.log(
        "************************************************"
    );


    raycast_terrain(
        cam,
        x,
        y,
        function(hit) {

            if (hit) {

                console.log(
                    "DIAG CENTRE Z =",
                    hit[2]
                );

            } else {

                console.log(
                    "DIAG CENTRE : PAS DE HIT"
                );
            }
        }
    );


    raycast_terrain(
        cam,
        x - d,
        y,
        function(hit) {

            if (hit) {

                console.log(
                    "DIAG GAUCHE Z =",
                    hit[2]
                );

            } else {

                console.log(
                    "DIAG GAUCHE : PAS DE HIT"
                );
            }
        }
    );


    raycast_terrain(
        cam,
        x + d,
        y,
        function(hit) {

            if (hit) {

                console.log(
                    "DIAG DROITE Z =",
                    hit[2]
                );

            } else {

                console.log(
                    "DIAG DROITE : PAS DE HIT"
                );
            }
        }
    );


    raycast_terrain(
        cam,
        x,
        y - d,
        function(hit) {

            if (hit) {

                console.log(
                    "DIAG HAUT Z =",
                    hit[2]
                );

            } else {

                console.log(
                    "DIAG HAUT : PAS DE HIT"
                );
            }
        }
    );


    raycast_terrain(
        cam,
        x,
        y + d,
        function(hit) {

            if (hit) {

                console.log(
                    "DIAG BAS Z =",
                    hit[2]
                );

            } else {

                console.log(
                    "DIAG BAS : PAS DE HIT"
                );
            }
        }
    );
}


/* =========================================================
 * DEFINITION DU PIVOT
 * ========================================================= */

function define_pivot(
    hit_pos
) {

    if (!hit_pos)
        return false;


    _pivot[0] =
        hit_pos[0];

    _pivot[1] =
        hit_pos[1];

    _pivot[2] =
        hit_pos[2];


    _drag_pivot[0] =
        _pivot[0];

    _drag_pivot[1] =
        _pivot[1];

    _drag_pivot[2] =
        _pivot[2];


    _pivot_axis[0] =
        0;

    _pivot_axis[1] =
        0;

    _pivot_axis[2] =
        1;


    _tilt_axis[0] =
        1;

    _tilt_axis[1] =
        0;

    _tilt_axis[2] =
        0;


    _has_pivot =
        true;


    console.log(
        "PIVOT OBJET terrain_nav_masque :",
        _pivot[0],
        _pivot[1],
        _pivot[2]
    );


    return true;
}


// Recentre la caméra sur un point du terrain, appelé par les boutons des calques.
var _navigation_generation = 0;
var INITIAL_VIEW_HEIGHT = 20000;

function focus_camera_on_terrain(x, y, extent, hit_pos, height_factor) {

    var cam = m_scenes.get_active_camera();
    if (!cam)
        return;

    var center = hit_pos || [x, y, 1000];
    var span = Math.max(350, Math.min(13000, extent || 1000));
    var camera_height_factor = (typeof height_factor === "number") ? height_factor : 0.85;
    var camera_pos = new Float32Array([
        center[0],
        center[1] - span * 0.98,
        center[2] + span * camera_height_factor
    ]);

    _drag_ready = false;
    remove_pivot_marker();
    define_pivot(center);
    m_camera.static_setup(cam, {pos:camera_pos, look_at:center});
    m_camera.set_vertical_axis(cam, WORLD_UP);
    m_camera.correct_up(cam, WORLD_UP, true);
    m_camera.get_translation(cam, _camera_pos);
}

function go_to_world(x, y, extent, height_factor) {

    if (_route_flight.active)
        return false;

    var ticket = ++_navigation_generation;
    var cam = m_scenes.get_active_camera();
    if (!cam)
        return false;

    var ray_id = m_physics.append_ray_test_ext(
        null,
        [x, y, 10000],
        [x, y, -10000],
        COLLISION_TEST_ID,
        function(id, fraction, obj, time, hit_pos) {
            if (ticket !== _navigation_generation)
                return;
            focus_camera_on_terrain(x, y, extent, hit_pos, height_factor);
        },
        true,
        false,
        true
    );

    if (!ray_id)
        focus_camera_on_terrain(x, y, extent, null, height_factor);

    return true;
}

// Replace la camera exactement dans la vue verticale de demarrage.
function go_to_initial_view() {

    if (_route_flight.active)
        return false;

    var ticket = ++_navigation_generation;
    var cam = m_scenes.get_active_camera();
    if (!cam)
        return false;

    var apply_initial_view = function(hit_pos) {
        if (ticket !== _navigation_generation)
            return;

        var center = hit_pos || [0, 0, 1000];
        var camera_pos = new Float32Array([0, 0, center[2] + INITIAL_VIEW_HEIGHT]);

        _drag_ready = false;
        remove_pivot_marker();
        define_pivot(center);
        m_camera.static_setup(cam, {pos:camera_pos, look_at:center});
        m_camera.set_vertical_axis(cam, WORLD_UP);
        m_camera.correct_up(cam, WORLD_UP, true);
        m_camera.get_translation(cam, _camera_pos);
    };

    var ray_id = m_physics.append_ray_test_ext(
        null,
        [0, 0, 10000],
        [0, 0, -10000],
        COLLISION_TEST_ID,
        function(id, fraction, obj, time, hit_pos) {
            apply_initial_view(hit_pos);
        },
        true,
        false,
        true
    );

    if (!ray_id)
        apply_initial_view(null);

    return true;
}


/* =========================================================
 * DEBUT ROTATION MILIEU
 * ========================================================= */

function begin_middle(
    cam,
    x,
    y
) {

    _drag_ready =
        false;

    _has_pivot =
        false;

    remove_pivot_marker();


    m_camera.get_translation(
        cam,
        _drag_camera_pos
    );


    m_camera.static_get_rotation(
        cam,
        _drag_camera_quat
    );

    _middle_start_x =
        x;

    _middle_start_y =
        y;


    diagnostic_rays_around(
        cam,
        x,
        y
    );


    raycast_terrain(
        cam,
        x,
        y,
        function(hit_pos) {

            if (_mode != MODE_MIDDLE && _mode != MODE_RIGHT)
                return;

            if (!hit_pos) {

                console.log(
                    "MILIEU : PAS DE PIVOT"
                );

                return;
            }


            if (!define_pivot(hit_pos))
                return;


            _drag_vector[0] =
                _drag_camera_pos[0] -
                _drag_pivot[0];

            _drag_vector[1] =
                _drag_camera_pos[1] -
                _drag_pivot[1];

            _drag_vector[2] =
                _drag_camera_pos[2] -
                _drag_pivot[2];


            _drag_distance =
                distance3(
                    _drag_camera_pos,
                    _drag_pivot
                );


            if (
                _drag_distance <
                MIN_DISTANCE
            )

                _drag_distance =
                    MIN_DISTANCE;


            _drag_ready =
                true;


            create_pivot_marker();

            update_pivot_marker(
                cam
            );


            console.log(
                "PIVOT :",
                _pivot[0],
                _pivot[1],
                _pivot[2]
            );
        }
    );
}


/* =========================================================
 * TURN TABLE + INCLINAISON
 * ========================================================= */

function apply_middle(
    cam,
    dx,
    dy
) {

    if (
        !_drag_ready ||
        !_has_pivot
    )

        return;


    var yaw =
        -dx *
        ROTATION_SPEED;


    quat_axis_angle(
        _pivot_axis,
        yaw,
        _quat_yaw
    );


    rotate_vector_axis(
        _drag_vector,
        _pivot_axis,
        yaw,
        _orbit_after_yaw
    );


    var tilt =
        dy *
        TILT_SPEED;


    // L'inclinaison suit l'axe horizontal de l'écran après le turntable.
    quat_multiply(
        _quat_yaw,
        _drag_camera_quat,
        _quat_delta
    );

    rotate_vector_quat(
        _screen_right_local,
        _quat_delta,
        _tilt_axis
    );


    rotate_vector_axis(
        _orbit_after_yaw,
        _tilt_axis,
        tilt,
        _orbit_after_tilt
    );


    var l =
        Math.sqrt(
            _orbit_after_tilt[0] *
            _orbit_after_tilt[0] +

            _orbit_after_tilt[1] *
            _orbit_after_tilt[1] +

            _orbit_after_tilt[2] *
            _orbit_after_tilt[2]
        );


    if (
        l <
        0.000001
    )

        return;


    var scale =
        _drag_distance /
        l;


    _orbit_after_tilt[0] *=
        scale;

    _orbit_after_tilt[1] *=
        scale;

    _orbit_after_tilt[2] *=
        scale;


    var new_pos =
        new Float32Array(3);


    new_pos[0] =
        _drag_pivot[0] +
        _orbit_after_tilt[0];

    new_pos[1] =
        _drag_pivot[1] +
        _orbit_after_tilt[1];

    new_pos[2] =
        _drag_pivot[2] +
        _orbit_after_tilt[2];


    if (
        new_pos[2] <
        _drag_pivot[2] +
        MIN_CAMERA_HEIGHT
    )

        return;


    quat_axis_angle(
        _tilt_axis,
        tilt,
        _quat_tilt
    );


    quat_multiply(
        _quat_tilt,
        _quat_yaw,
        _quat_delta
    );


    quat_multiply(
        _quat_delta,
        _drag_camera_quat,
        _quat_final
    );


    m_camera.set_translation(
        cam,
        new_pos
    );


    m_camera.static_set_rotation(
        cam,
        _quat_final
    );


    m_camera.get_translation(
        cam,
        _camera_pos
    );


    update_pivot_marker(
        cam
    );
}


function apply_right_zoom(
    cam,
    dy
) {

    if (!_drag_ready || !_has_pivot)
        return;

    var new_distance =
        _drag_distance * Math.exp(dy * RIGHT_DRAG_ZOOM_SPEED);

    if (new_distance < MIN_DISTANCE)
        new_distance = MIN_DISTANCE;

    if (new_distance > MAX_DISTANCE)
        new_distance = MAX_DISTANCE;

    var current_distance =
        distance3(_camera_pos, _drag_pivot);

    if (current_distance < 0.000001)
        return;

    var scale =
        new_distance / current_distance;

    var next_z = _drag_pivot[2] +
        (_camera_pos[2] - _drag_pivot[2]) * scale;

    if (next_z < _drag_pivot[2] + MIN_CAMERA_HEIGHT)
        return;

    _camera_pos[0] = _drag_pivot[0] +
        (_camera_pos[0] - _drag_pivot[0]) * scale;
    _camera_pos[1] = _drag_pivot[1] +
        (_camera_pos[1] - _drag_pivot[1]) * scale;
    _camera_pos[2] = next_z;

    m_camera.set_translation(cam, _camera_pos);
    update_pivot_marker(cam);
}


/* =========================================================
 * PAN
 * ========================================================= */

function begin_pan(
    cam,
    x,
    y
) {

    _pan_ready =
        false;

    _pan_last_x =
        x;

    _pan_last_y =
        y;


    raycast_terrain(
        cam,
        x,
        y,
        function(hit_pos) {

            if (_mode != MODE_PAN)
                return;

            if (!hit_pos)
                return;


            _pan_point[0] =
                hit_pos[0];

            _pan_point[1] =
                hit_pos[1];

            _pan_point[2] =
                hit_pos[2];

            _pan_plane_z =
                hit_pos[2];

            m_camera.get_translation(
                cam,
                _pan_camera_start
            );


            _pan_ready =
                true;

            // Le clic gauche pose aussi un repère persistant sur le terrain.
            // Le glissement continue de piloter le pan autour de ce point.
            if (!_terrain_pick_mode && define_pivot(hit_pos)) {
                create_pivot_marker();
                update_pivot_marker(cam);
            }

            if (_pan_last_x != x || _pan_last_y != y)
                apply_pan(cam, _pan_last_x, _pan_last_y);
        }
    );
}


function apply_pan(
    cam,
    x,
    y
) {

    _pan_last_x =
        x;

    _pan_last_y =
        y;

    if (!_pan_ready)
        return;


    // On projette le curseur sur un plan horizontal fixe, défini au point
    // de départ du glissement. Les raycasts terrain successifs changeaient
    // de hauteur selon les facettes du maillage et faisaient vibrer la caméra.
    var ray = m_camera.calc_ray(cam, x, y);
    if (!ray || Math.abs(ray[5]) < 0.000001)
        return;

    m_camera.get_translation(cam, _camera_pos);

    // calc_ray part de la caméra actuelle. On ramène son origine à la pose
    // du début du pan pour que chaque image calcule le déplacement absolu.
    var origin_x = ray[0] - (_camera_pos[0] - _pan_camera_start[0]);
    var origin_y = ray[1] - (_camera_pos[1] - _pan_camera_start[1]);
    var origin_z = ray[2] - (_camera_pos[2] - _pan_camera_start[2]);
    var t = (_pan_plane_z - origin_z) / ray[5];

    if (t < 0)
        return;

    _pan_current[0] = origin_x + ray[3] * t;
    _pan_current[1] = origin_y + ray[4] * t;

    _camera_pos[0] = _pan_camera_start[0] +
        _pan_point[0] - _pan_current[0];
    _camera_pos[1] = _pan_camera_start[1] +
        _pan_point[1] - _pan_current[1];
    _camera_pos[2] = _pan_camera_start[2];

    m_camera.set_translation(cam, _camera_pos);
    update_pivot_marker(cam);
}


/* =========================================================
 * ZOOM
 * ========================================================= */

function apply_wheel(
    cam,
    x,
    y,
    direction
) {

    var factor;


    if (direction > 0)
        factor =
            1 / WHEEL_ZOOM_FACTOR;
    else
        factor =
            WHEEL_ZOOM_FACTOR;


    raycast_terrain(
        cam,
        x,
        y,
        function(hit_pos) {

            if (!hit_pos)
                return;


            m_camera.get_translation(
                cam,
                _camera_pos
            );


            var vx =
                hit_pos[0] -
                _camera_pos[0];

            var vy =
                hit_pos[1] -
                _camera_pos[1];

            var vz =
                hit_pos[2] -
                _camera_pos[2];


            var d =
                Math.sqrt(
                    vx * vx +
                    vy * vy +
                    vz * vz
                );


            if (
                d <
                MIN_DISTANCE
            )

                return;


            var nd =
                d *
                factor;


            if (
                nd <
                MIN_DISTANCE
            )

                nd =
                    MIN_DISTANCE;


            if (
                nd >
                MAX_DISTANCE
            )

                nd =
                    MAX_DISTANCE;


            var ratio =
                nd /
                d;


            _camera_pos[0] =
                hit_pos[0] -
                vx * ratio;

            _camera_pos[1] =
                hit_pos[1] -
                vy * ratio;

            _camera_pos[2] =
                hit_pos[2] -
                vz * ratio;


            if (
                _camera_pos[2] <
                hit_pos[2] +
                MIN_CAMERA_HEIGHT
            )

                _camera_pos[2] =
                    hit_pos[2] +
                    MIN_CAMERA_HEIGHT;


            m_camera.set_translation(
                cam,
                _camera_pos
            );

            update_pivot_marker(
                cam
            );
        }
    );
}


/* =========================================================
 * MOUSE DOWN
 * ========================================================= */

function mouse_down(event) {
    if (_free_walk.active) {
        if(event.button===1) {_mode=MODE_RIGHT; _middle_start_x=event.offsetX; _middle_start_y=event.offsetY;}
        event.preventDefault(); return;
    }


    var cam =
        m_scenes.get_active_camera();


    if (!cam)
        return;

    _mouse_x =
        event.offsetX;

    _mouse_y =
        event.offsetY;

    _move_pending =
        false;

    // Navigation dédiée au simulateur : seul le clic gauche oriente
    // la caméra, sans pivot terrain et sans déplacer sa position sur le tracé.
    if (_route_flight.active && _route_flight.started) {
        if (event.button == 0) {
            _route_flight.manualControl = true;
            _route_flight.manualResumeAt = 0;
            _route_flight.manualBlending = false;
            _mode = MODE_RIGHT;
            _middle_start_x = _mouse_x;
            _middle_start_y = _mouse_y;
        }
        event.preventDefault();
        return;
    }


    if (
        event.button ==
        0
    ) {

        _mode =
            MODE_PAN;

        begin_pan(
            cam,
            _mouse_x,
            _mouse_y
        );

        event.preventDefault();

        return;
    }


    if (
        event.button ==
        1
    ) {

        _mode =
            MODE_MIDDLE;

        begin_middle(
            cam,
            _mouse_x,
            _mouse_y
        );

        event.preventDefault();

        return;
    }


    if (
        event.button ==
        2
    ) {

        _mode =
            MODE_RIGHT;

        begin_middle(
            cam,
            _mouse_x,
            _mouse_y
        );

        event.preventDefault();

        return;
    }
}


/* =========================================================
 * MOUSE MOVE
 * ========================================================= */

function mouse_move(event) {

    _mouse_x =
        event.offsetX;

    _mouse_y =
        event.offsetY;


    if (
        _mode ==
        MODE_NONE
    )

        return;


    _move_pending =
        true;

    process_mouse_move();
}


/* =========================================================
 * PROCESS MOVE
 * ========================================================= */

function process_mouse_move() {

    if (!_move_pending)
        return;


    _move_pending =
        false;


    var cam =
        m_scenes.get_active_camera();


    if (!cam)
        return;

    if (_free_walk.active) {
        if (_mode===MODE_RIGHT) {
            _free_walk.yaw-=(_mouse_x-_middle_start_x)*ROTATION_SPEED;
            _free_walk.pitch=Math.max(-1.35,Math.min(1.35,_free_walk.pitch-(_mouse_y-_middle_start_y)*TILT_SPEED));
            _middle_start_x=_mouse_x; _middle_start_y=_mouse_y;
            free_walk_pose(cam,m_camera.get_translation(cam,new Float32Array(3)));
        }
        return;
    }
    if (_route_flight.active && _route_flight.started && _mode == MODE_RIGHT) {
        apply_simulator_camera_rotation(
            cam,
            _mouse_x - _middle_start_x,
            _mouse_y - _middle_start_y
        );
        _middle_start_x = _mouse_x;
        _middle_start_y = _mouse_y;
        return;
    }


    if (
        _mode ==
        MODE_PAN
    ) {

        apply_pan(
            cam,
            _mouse_x,
            _mouse_y
        );

        return;
    }


    if (_mode == MODE_MIDDLE || _mode == MODE_RIGHT) {

        if (!_drag_ready)
            return;


        var dx =
            _mouse_x -
            _middle_start_x;

        var dy =
            _mouse_y -
            _middle_start_y;


        if (_mode == MODE_MIDDLE) {
            apply_middle(cam, dx, dy);
        } else {
            apply_middle(cam, dx, 0);
            apply_right_zoom(cam, dy);
        }
    }
}


function apply_simulator_camera_rotation(cam, dx, dy) {

    var currentRotation = new Float32Array(4);
    m_camera.static_get_rotation(cam, currentRotation);

    quat_axis_angle(
        _pivot_axis,
        -dx * ROTATION_SPEED,
        _quat_yaw
    );
    quat_multiply(
        _quat_yaw,
        currentRotation,
        _quat_delta
    );

    var localRight = new Float32Array(3);
    rotate_vector_quat(
        [1, 0, 0],
        _quat_delta,
        localRight
    );
    quat_axis_angle(
        localRight,
        -dy * TILT_SPEED,
        _quat_tilt
    );
    quat_multiply(
        _quat_tilt,
        _quat_delta,
        _quat_final
    );
    m_camera.static_set_rotation(cam, _quat_final);
}


/* =========================================================
 * MOUSE UP
 * ========================================================= */

function mouse_up(event) {

    var released_mode =
        _mode;

    if (released_mode != MODE_NONE)
        remove_pivot_marker();

    _mode =
        MODE_NONE;

    _pan_ready =
        false;

    _drag_ready =
        false;

    _move_pending =
        false;

    if (_route_flight.active && _route_flight.started && released_mode != MODE_NONE) {
        var cam = m_scenes.get_active_camera();
        if (cam) {
            m_camera.get_translation(cam, _route_flight.manualBlendPosition);
            m_camera.static_get_rotation(cam, _route_flight.manualBlendRotation);
            _route_flight.manualViewLocked = true;
            _route_flight.manualBlending = false;
        }
        _route_flight.manualControl = false;
        _route_flight.manualResumeAt = 0;
    }
}


/* =========================================================
 * MOLETTE
 * ========================================================= */

function mouse_wheel(event) {
    if (_free_walk.active) {
        event.preventDefault();
        if(event.deltaY) exports.set_free_walk_speed(_free_walk.speed + (event.deltaY < 0 ? .5 : -.5));
        return;
    }


    if (_route_flight.active && _route_flight.started) {
        var wheelDelta = Number(event.deltaY) || 0;
        if (event.deltaMode === 1)
            wheelDelta *= 40;
        else if (event.deltaMode === 2)
            wheelDelta *= 400;
        var state = _route_flight;
        var step = 0.25;
        state.distance = Math.max(0, Math.min(state.total,
            state.distance - wheelDelta * step));
        state.completed = state.distance >= state.total;
        state.lastTime = performance.now();
        var wheelCam = m_scenes.get_active_camera();
        if (wheelCam) {
            var wheelRotation = state.manualViewLocked
                ? state.manualBlendRotation : null;
            apply_route_flight_camera(wheelCam, 1, wheelRotation);
        }
        event.preventDefault();
        return;
    }

    var cam =
        m_scenes.get_active_camera();


    if (!cam)
        return;


    var x =
        event.offsetX;

    var y =
        event.offsetY;


    var direction;


    if (
        event.deltaY > 0
    )

        direction =
            1;

    else

        direction =
            -1;


    apply_wheel(
        cam,
        x,
        y,
        direction
    );


    event.preventDefault();
}


/* =========================================================
 * SCENE CHARGEE
 * ========================================================= */

function scene_loaded(
    data_id,
    success,
    canvas_elem
) {

    if (!success)
        return;


    m_app.disable_camera_controls();


    canvas_elem.addEventListener(
        "mousedown",
        mouse_down,
        false
    );

    canvas_elem.addEventListener(
        "mousemove",
        mouse_move,
        false
    );

    canvas_elem.addEventListener(
        "mouseup",
        mouse_up,
        false
    );

    canvas_elem.addEventListener(
        "mouseleave",
        mouse_up,
        false
    );

    canvas_elem.addEventListener(
        "wheel",
        mouse_wheel,
        false
    );


    var cam =
        m_scenes.get_active_camera();


    if (!cam)
        return;

    m_main.append_loop_cb(update_route_flight);
    m_main.append_loop_cb(update_free_walk);

    m_hd_tiles.init(cam, APP_ASSETS_PATH);


    var initialize_vertical_view = function(hit_pos) {
        var center = hit_pos || [0, 0, 1000];
        var camera_pos = new Float32Array([
            0,
            0,
            center[2] + INITIAL_VIEW_HEIGHT
        ]);

        remove_pivot_marker();
        define_pivot(center);
        m_camera.static_setup(cam, {pos:camera_pos, look_at:center});
        m_camera.set_vertical_axis(cam, WORLD_UP);
        m_camera.correct_up(cam, WORLD_UP, true);
        m_camera.get_translation(cam, _camera_pos);
    };

    var initial_ray_id = m_physics.append_ray_test_ext(
        null,
        [0, 0, 10000],
        [0, 0, -10000],
        COLLISION_TEST_ID,
        function(id, fraction, obj, time, hit_pos) {
            initialize_vertical_view(hit_pos);
        },
        true,
        false,
        true
    );

    if (!initial_ray_id)
        initialize_vertical_view(null);


    console.log(
        "================================================"
    );

    console.log(
        "HUERTA NAV : INITIALISATION"
    );

    console.log(
        "RAYCAST : ID UNIQUE DU TERRAIN"
    );

    console.log(
        "DIAGNOSTIC : 5 RAYONS AUTOUR DU CLIC MILIEU"
    );

    console.log(
        "OBJET DE COLLISION ATTENDU :",
        COLLISION_TEST_OBJECT_NAME,
        "| ID DE COLLISION :",
        COLLISION_TEST_ID
    );

    console.log(
        "SEUL L'ID TERRAIN_NAV_MASQUE EST ACCEPTE"
    );

    console.log(
        "X = EST / OUEST"
    );

    console.log(
        "Y = NORD / SUD"
    );

    console.log(
        "Z = VERTICAL"
    );

    console.log(
        "AXE DU PIVOT = Z"
    );

    console.log(
        "AXE D'INCLINAISON = HORIZONTAL DE L'ECRAN"
    );

    console.log(
        "GAUCHE = PAN"
    );

    console.log(
        "MILIEU = ROTATION / INCLINAISON"
    );

    console.log(
        "DROITE = TURNTABLE X / ZOOM Y"
    );

    console.log(
        "MOLETTE = ZOOM"
    );

    console.log(
        "CAMERA :",
        _camera_pos[0],
        _camera_pos[1],
        _camera_pos[2]
    );

    console.log(
        "================================================"
    );
}


/* =========================================================
 * PRELOADER
 * ========================================================= */

function preloader_cb(
    percentage
) {

    m_preloader.update_preloader(
        percentage
    );
}


/* =========================================================
 * CHARGEMENT SCENE
 * ========================================================= */

function load_scene(
    canvas_elem
) {

    m_data.load(

        APP_ASSETS_PATH +
        "huerta_webgl.json",

        function(
            data_id,
            success
        ) {

            scene_loaded(
                data_id,
                success,
                canvas_elem
            );
        },

        preloader_cb
    );
}


/* =========================================================
 * INITIALISATION
 * ========================================================= */

function init_cb(
    canvas_elem,
    success
) {

    if (!success)
        return;


    _canvas =
        canvas_elem;


    m_preloader.create_preloader();


    canvas_elem.oncontextmenu =
        function(event) {

            event.preventDefault();

            event.stopPropagation();

            return false;
        };


    load_scene(
        canvas_elem
    );
}


/* =========================================================
 * EXPORT
 * ========================================================= */

// Donne au menu une copie du dernier pivot défini sur le terrain.
exports.get_pivot =
    function() {

        if (!_has_pivot)
            return null;

        return [
            _pivot[0],
            _pivot[1],
            _pivot[2]
        ];
    };

exports.go_to_world = go_to_world;
exports.go_to_initial_view = go_to_initial_view;

// Keyboard navigation reuses the mouse orbit and the current terrain pivot.
exports.keyboard_navigate = function(key, shift) {
    var cam = m_scenes.get_active_camera();
    if (!cam) return false;
    if (_free_walk.active) { if(key === " ") _free_walk.keys={}; return true; }
    if (key === " ") {
        _mode = MODE_NONE;
        _move_pending = false;
        _drag_ready = false;
        _navigation_generation++;
        _route_flight.playing = false;
        return true;
    }
    if (_route_flight.active) {
        // Keep the simulator on its rail; arrows control only its orientation.
        if (key.indexOf("Arrow") === 0) {
            apply_simulator_camera_rotation(cam,
                key === "ArrowLeft" ? -15 : key === "ArrowRight" ? 15 : 0,
                key === "ArrowUp" ? -15 : key === "ArrowDown" ? 15 : 0);
            m_camera.static_get_rotation(cam, _route_flight.manualBlendRotation);
            _route_flight.manualViewLocked = true;
            return true;
        }
        if (key === "PageUp" || key === "PageDown") {
            if (shift) exports.set_route_flight_altitude(Math.max(1,
                _route_flight.altitude + (key === "PageUp" ? 1 : -1)));
            else if (_route_flight.started) mouse_wheel({deltaY:key === "PageUp" ? -40 : 40, deltaMode:0, preventDefault:function(){}});
            return true;
        }
        return false;
    }
    if (!_has_pivot) return false;
    _mode = MODE_NONE;
    _move_pending = false;
    var pos = m_camera.get_translation(cam, new Float32Array(3));
    var rotation = m_camera.static_get_rotation(cam, new Float32Array(4));
    var distance = Math.max(MIN_DISTANCE, distance3(pos, _pivot));
    var step = Math.max(1, distance * 0.025);
    if (key.indexOf("Arrow") === 0 && shift) {
        _drag_camera_pos.set(pos);
        _drag_camera_quat.set(rotation);
        _drag_pivot.set(_pivot);
        for (var i = 0; i < 3; i++) _drag_vector[i] = pos[i] - _pivot[i];
        _drag_distance = distance;
        _drag_ready = true;
        apply_middle(cam, key === "ArrowLeft" ? -15 : key === "ArrowRight" ? 15 : 0,
            key === "ArrowUp" ? -15 : key === "ArrowDown" ? 15 : 0);
        _drag_ready = false;
        return true;
    }
    if (key.indexOf("Arrow") === 0) {
        var right = new Float32Array(3);
        rotate_vector_quat([1, 0, 0], rotation, right);
        var length = Math.hypot(right[0], right[1]) || 1;
        var rx = right[0] / length, ry = right[1] / length;
        var side = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
        var forward = key === "ArrowUp" ? step : key === "ArrowDown" ? -step : 0;
        var dx = rx * side - ry * forward, dy = ry * side + rx * forward;
        pos[0] += dx; pos[1] += dy;
        _pivot[0] += dx; _pivot[1] += dy;
    } else if (key === "PageUp" || key === "PageDown") {
        if (shift) pos[2] = Math.max(_pivot[2] + MIN_CAMERA_HEIGHT,
            pos[2] + (key === "PageUp" ? step : -step));
        else {
            var nextDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE,
                distance * (key === "PageUp" ? 0.92 : 1.08)));
            for (var j = 0; j < 3; j++) pos[j] = _pivot[j] + (pos[j] - _pivot[j]) * nextDistance / distance;
            pos[2] = Math.max(_pivot[2] + MIN_CAMERA_HEIGHT, pos[2]);
        }
    } else if (["n", "u", "r", "o"].indexOf(key) !== -1) {
        var horizontal = Math.hypot(pos[0] - _pivot[0], pos[1] - _pivot[1]);
        var heading = horizontal > 0.01 ? Math.atan2(pos[0] - _pivot[0], -(pos[1] - _pivot[1])) : 0;
        var tilt = Math.acos(Math.max(-1, Math.min(1, (pos[2] - _pivot[2]) / distance)));
        if (key === "n" || key === "r") heading = 0;
        if (key === "u" || key === "r") tilt = 0;
        if (key === "o") tilt = tilt > 0.1 ? 0 : Math.PI / 4;
        pos[0] = _pivot[0] + distance * Math.sin(tilt) * Math.sin(heading);
        pos[1] = _pivot[1] - distance * Math.sin(tilt) * Math.cos(heading);
        pos[2] = _pivot[2] + distance * Math.cos(tilt);
        m_camera.static_setup(cam, {pos:pos, look_at:_pivot});
        m_camera.correct_up(cam, tilt < 0.001 ? [-Math.sin(heading), Math.cos(heading), 0] : WORLD_UP, true);
    } else return false;
    m_camera.set_translation(cam, pos);
    _camera_pos.set(pos);
    update_pivot_marker(cam);
    return true;
};

exports.start_route_flight = start_route_flight;
exports.get_smoothed_route_flight_path = function(points, radius) {
    return smooth_route_flight_points(points, radius);
};
exports.pause_route_flight = function() {
    if (!_route_flight.active)
        return false;
    _route_flight.playing = false;
    return true;
};
exports.resume_route_flight = function() {
    if (!_route_flight.active || !_route_flight.prepared)
        return false;
    _route_flight.lastTime = performance.now();
    _route_flight.started = true;
    _route_flight.playing = true;
    return true;
};
exports.stop_route_flight = function() {
    stop_route_flight(true);
};
exports.set_route_flight_speed = function(speed) {
    _route_flight.speed = Math.max(1, Math.min(80, Number(speed) || 15));
    if (_route_flight.active && !_route_flight.playing)
        apply_route_flight_camera(m_scenes.get_active_camera());
};
exports.set_route_flight_altitude = function(altitude) {
    _route_flight.altitude = Math.max(5, Math.min(300, Number(altitude) || 60));
    if (_route_flight.active && !_route_flight.playing)
        apply_route_flight_camera(m_scenes.get_active_camera());
};
exports.set_route_flight_inclination = function(inclination) {
    inclination = Number(inclination);
    if (Number.isFinite(inclination)) {
        _route_flight.inclination = Math.max(0, Math.min(80, inclination));
        if (_route_flight.active && !_route_flight.playing)
            apply_route_flight_camera(m_scenes.get_active_camera());
    }
};
exports.get_route_flight_status = function() {
    return {
        active: _route_flight.active,
        playing: _route_flight.playing,
        prepared: _route_flight.prepared,
        started: _route_flight.started,
        completed: _route_flight.completed,
        distance: _route_flight.distance,
        total: _route_flight.total,
        speed: _route_flight.speed,
        altitude: _route_flight.altitude,
        inclination: _route_flight.inclination
    };
};

exports.set_terrain_pick_mode = function(active) {
    _terrain_pick_mode = !!active;
};

// Point terrain asynchrone utilisé par le mode de choix des extrémités
// du Marcheur. Les coordonnées écran sont celles du canvas Blend4Web.
exports.pick_terrain =
    function(x, y, callback) {
        var cam = m_scenes.get_active_camera();
        if (!cam) {
            callback(null);
            return;
        }
        raycast_terrain(cam, x, y, callback);
    };

exports.init =
    function() {

        // Les textures HD temporaires doivent pouvoir être libérées après
        // qu'une tuile a quitté la zone proche de la caméra.
        m_cfg.set("enable_texture_cache", false);
        m_cfg.set("background_color", [0.5294, 0.8078, 0.9216, 1]);

        m_app.init({

            canvas_container_id:
                "main_canvas_container",

            callback:
                init_cb,

            show_fps:
                DEBUG,

            console_verbose:
                DEBUG,

            autoresize:
                true
        });
    };


});


HuertaRuntime.require("huerta_webgl_main").init();
