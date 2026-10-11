"use strict";

HuertaRuntime.register("huerta_hd_tiles", function(exports, require) {

var m_camera = require("camera");
var m_main = require("main");
var m_scenes = require("scenes");
var m_textures = require("textures");

var TILE_SIZE = 512;
var LOAD_HEIGHT = 1800;
var LOAD_RADIUS = 390;
var UNLOAD_RADIUS = 620;
var UPDATE_INTERVAL = 0.5;
var PREFIX = "terrain_hd_r";
var _camera = null;
var _assets_path = "";
var _tiles = [];
var _last_update = 0;
var _imagery = "pnoa2021";
var _switching = false;

function base_image() {
    return _assets_path + (_imagery === "previous" ?
        "Huerta_Satellite_previous.jpg" : "Huerta_Satellite_MNT_100m_8000.jpg");
}

function tile_image(tile) {
    return _assets_path + (_imagery === "previous" ?
        "hd_tiles_pnoa2024_original/" : "hd_tiles/") + tile.image;
}

function add_tile(row, col, x, y) {
    var name = PREFIX + row + "_c" + col;
    _tiles.push({
        name: name,
        image: name + ".jpg",
        texture: "TEX_" + name,
        x: x,
        y: y,
        object: null,
        loading: false,
        loaded: false,
        generation: 0
    });
}

function build_tile_index() {
    var min_x = -4677;
    var max_x = 4677;
    var min_y = -4440;
    var max_y = 4440;
    var first_col = Math.floor(min_x / TILE_SIZE);
    var last_col = Math.floor((max_x - 0.000001) / TILE_SIZE);
    var first_row = Math.floor(min_y / TILE_SIZE);
    var last_row = Math.floor((max_y - 0.000001) / TILE_SIZE);
    for (var row = first_row; row <= last_row; row++) {
        for (var col = first_col; col <= last_col; col++) {
            var name_row = row - first_row;
            var name_col = col - first_col;
            add_tile(("0" + name_row).slice(-2), ("0" + name_col).slice(-2),
                     (col + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE);
        }
    }
}

function hide_all() {
    for (var i = 0; i < _tiles.length; i++) {
        var tile = _tiles[i];
        tile.object = m_scenes.get_object_by_name(tile.name);
        if (tile.object)
            m_scenes.hide_object(tile.object);
    }
}

function unload_tile(tile) {
    if (!tile.loaded && !tile.loading)
        return;
    tile.generation++;
    tile.loading = false;
    tile.loaded = false;
    if (tile.object)
        m_scenes.hide_object(tile.object);
    // Replacing with the already loaded base map releases the large HD image
    // when texture caching is disabled, while keeping the object's material valid.
    if (tile.object)
        m_textures.change_image(tile.object, tile.texture,
            base_image(), function() {});
}

function load_tile(tile) {
    if (tile.loaded || tile.loading || !tile.object)
        return;
    tile.loading = true;
    var generation = ++tile.generation;
    m_textures.change_image(tile.object, tile.texture,
        tile_image(tile), function(success) {
            if (generation !== tile.generation) return;
            tile.loading = false;
            if (success) {
                tile.loaded = true;
                m_scenes.show_object(tile.object);
            }
        });
}

// Mesure la distance entre la camera et le carre de la tuile, pas son centre.
// Ainsi une tuile voisine se charge des qu'une partie de sa surface approche
// la zone utile, meme si son centre est encore a plus de LOAD_RADIUS.
function distance_to_tile(x, y, tile) {
    var half = TILE_SIZE * 0.5;
    var dx = Math.max(Math.abs(x - tile.x) - half, 0);
    var dy = Math.max(Math.abs(y - tile.y) - half, 0);
    return Math.sqrt(dx * dx + dy * dy);
}

function update() {
    if (_switching || !_camera) return;
    var now = Date.now();
    if (now - _last_update < UPDATE_INTERVAL * 1000)
        return;
    _last_update = now;

    var pos = m_camera.get_translation(_camera, _camera_pos);
    var camera_x = pos[0];
    var camera_y = pos[1];
    var camera_z = pos[2] - 810;
    for (var i = 0; i < _tiles.length; i++) {
        var tile = _tiles[i];
        var distance = distance_to_tile(camera_x, camera_y, tile);
        if (camera_z <= LOAD_HEIGHT && distance <= LOAD_RADIUS)
            load_tile(tile);
        else if (tile.loaded &&
                 (camera_z > LOAD_HEIGHT + 250 || distance > UNLOAD_RADIUS))
            unload_tile(tile);
    }
}

var _camera_pos = new Float32Array(3);

exports.init = function(camera, assets_path) {
    _camera = camera;
    _assets_path = assets_path;
    build_tile_index();
    hide_all();
    m_main.append_loop_cb(update);
    console.log("HUERTA HD : chargeur prêt | tuiles locales :", _tiles.length);
};

exports.set_imagery = function(mode, callback) {
    if (!_camera || _switching || (mode !== "pnoa2021" && mode !== "previous")) {
        callback(false); return;
    }
    if (mode === _imagery) {callback(true); return;}
    _switching = true;
    for (var i = 0; i < _tiles.length; i++) {
        var tile = _tiles[i];
        tile.generation++;
        tile.loading = false;
        tile.loaded = false;
        if (tile.object) m_scenes.hide_object(tile.object);
    }
    var image = _assets_path + (mode === "previous" ?
        "Huerta_Satellite_previous.jpg" : "Huerta_Satellite_MNT_100m_8000.jpg");
    m_textures.change_base_image(image, function(success) {
        if (success) _imagery = mode;
        _switching = false;
        _last_update = 0;
        update();
        callback(success);
    });
};

exports.get_imagery = function() {return _imagery;};

});
