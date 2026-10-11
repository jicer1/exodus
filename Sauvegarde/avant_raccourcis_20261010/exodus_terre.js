"use strict";

// First world switch prototype. The globe uses a separate scene and camera;
// Huerta keeps its local coordinates and camera while it is paused.
(() => {
    let engine, scene, camera, canvas, navigation, globeMaterial, tileLayer, tileStatus, imageNotice, onEarth = false;
    let placeSearch, placeMarker, placeLabel;
    let selectionPanel, selectionPolygon, selectionReadout, confirmZone, localView, selectedZoneButton, worldButton, worldStatus;
    const t = value => window.HuertaI18n?.t ? window.HuertaI18n.t(value) : value;

    function switchMode(mode) {
        if (!window.HuertaMigration?.ready) {
            worldStatus.textContent = t("Chargement de Huerta en cours…"); return;
        }
        if (HuertaRuntime.require("huerta_webgl_main").get_route_flight_status().active) {
            worldStatus.textContent = t("Quitte le simulateur de marche avant de passer sur Terre."); return;
        }
        const local=document.getElementById("exodus_local_frame")?.contentWindow;
        if(state.mode === "local" && local?.HuertaRuntime?.require("huerta_webgl_main").get_route_flight_status().active) {
            worldStatus.textContent=t("Quitte le simulateur de marche avant de passer sur Terre.");return;
        }
        if (!scene) createGlobe();
        if (mode === "earth" && !state.selectedLocation)
            initializeSelectionFrame();
        state.mode = mode; onEarth = mode === "earth";
        HuertaMigration.worldMode = mode;
        document.body.classList.toggle("exodus-on-earth", onEarth);
        document.body.classList.toggle("exodus-on-local", mode === "local");
        for (const id of ["huerta_marcheur", "huerta_marcheur_flight"]) {
            const panel = document.getElementById(id); if (panel) panel.inert = mode !== "huerta";
        }
        navigation.setActive(onEarth); tileLayer.setActive(onEarth); placeSearch.setActive(onEarth);
        localView.setActive(mode === "local");
        if (onEarth) engine.resize();
        worldButton.textContent = t(mode === "huerta" ? "Sur Terre" : "Retour à Huertahernando");
        worldButton.setAttribute("aria-pressed", String(mode !== "huerta"));
        selectedZoneButton.hidden = !state.localZone;
        selectedZoneButton.textContent = t(mode === "local" ? "Retour sur Terre" : "Revenir au lieu choisi");
        selectionPanel.hidden = mode !== "earth" || !state.selectedLocation;
        worldStatus.textContent = t(mode === "earth" ?
            (state.selectedLocation ? "Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone." : "Recherchez une commune ou saisissez ses coordonnées GPS.") :
            mode === "local" ? "Gauche : déplacer · Milieu : tourner / incliner · Molette : zoomer." : "Exodus — Huertahernando");
    }

    function updateSelection() {
        if (!state.selectedLocation) return;
        const centre = navigation.centre(), dimensions = ExodusZone.dimensions();
        if (!centre || !dimensions) {confirmZone.disabled = true; selectionPolygon.setAttribute("points", ""); return;}
        const zone = {...ExodusZone.coordinates(centre), ...dimensions,
            name:state.selectedLocation.source === "gps" ? t("Zone choisie") : state.selectedLocation.name};
        state.pendingZone = zone;
        const B = BABYLON, viewport = camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
        const points = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => {
                const geo = ExodusZone.geographic(zone, x*zone.width/2, y*zone.height/2);
                const p = B.Vector3.Project(B.Vector3.FromArray(state.geographicToPosition(geo.latitude,geo.longitude)),
                    B.Matrix.Identity(),scene.getTransformMatrix(),viewport);
                return `${p.x*canvas.clientWidth/engine.getRenderWidth()},${p.y*canvas.clientHeight/engine.getRenderHeight()}`;
            });
        selectionPolygon.setAttribute("points",points.join(" "));
        selectionReadout.textContent = `${(zone.width/1000).toFixed(3)} × ${(zone.height/1000).toFixed(3)} km · ${zone.latitude.toFixed(6)}, ${zone.longitude.toFixed(6)}`;
        confirmZone.disabled = false;
    }

    function initializeSelectionFrame() {
        const centre = navigation?.centre();
        const geographic = centre ? ExodusZone.coordinates(centre) : {latitude:25, longitude:10};
        state.selectedLocation = {
            latitude: geographic.latitude,
            longitude: geographic.longitude,
            name: t("Zone choisie"),
            source: "gps",
            showMarker: false
        };
        const point = BABYLON.Vector3.FromArray(state.geographicToPosition(
            geographic.latitude, geographic.longitude));
        placeMarker.position.copyFrom(point.scale(1.0000001));
        placeMarker.setEnabled(false);
        placeLabel.hidden = true;
        navigation.setSelection(true);
        selectionPanel.hidden = false;
        updateSelection();
    }
    let brightness = 210;
    try {
        const saved = Number(localStorage.getItem("exodus_globe_brightness"));
        if (saved >= 50 && saved <= 300) brightness = saved;
    } catch (_) { /* Navigation still works when browser storage is unavailable. */ }
    const EARTH_RADIUS_M = 6371008.8;
    const DISPLAY_RADIUS = 1000;
    const MIN_ALTITUDE_M = 1000;

    const state = window.ExodusWorld = {
        mode: "huerta", ready: false, radiusMetres: EARTH_RADIUS_M,
        displayRadius: DISPLAY_RADIUS,
        // Z is north, X at longitude 0, Y at longitude 90 east.
        geographicToPosition(latitude, longitude, altitude = 0) {
            const lat = latitude * Math.PI / 180;
            const lon = longitude * Math.PI / 180;
            const r = DISPLAY_RADIUS * (1 + altitude / EARTH_RADIUS_M);
            return [r * Math.cos(lat) * Math.cos(lon),
                r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
        }
    };

    function createGlobe() {
        const B = BABYLON;
        engine = new B.Engine(canvas, true, {preserveDrawingBuffer: true});
        scene = new B.Scene(engine);
        scene.useRightHandedSystem = true;
        scene.clearColor = new B.Color4(.04, .07, .11, 1);
        camera = new B.FreeCamera("Exodus globe camera", B.Vector3.Zero(), scene);
        camera.inputs.clear();
        camera.maxZ = 20000;
        // Explicit geographic UV grid: seam at longitude ±180, north at Z+.
        // This shares the coordinate convention used by geographicToPosition.
        const sphere = new B.Mesh("Exodus Earth", scene);
        const geometry = new B.VertexData();
        const positions = [], normals = [], uvs = [], indices = [];
        const rows = 192, columns = 384, stride = columns + 1;
        for (let row = 0; row <= rows; row++) {
            const latitude = 90 - row * 180 / rows;
            for (let col = 0; col <= columns; col++) {
                const point = state.geographicToPosition(latitude, -180 + col * 360 / columns);
                positions.push(...point);
                normals.push(...point.map(value => value / DISPLAY_RADIUS));
                uvs.push(col / columns, 1 - row / rows);
                if (row < rows && col < columns) {
                    const a = row * stride + col, b = a + stride;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            }
        }
        geometry.positions = positions;
        geometry.normals = normals;
        geometry.uvs = uvs;
        geometry.indices = indices;
        geometry.applyToMesh(sphere);
        // Gamma adjustment lifts the dark oceans without bleaching the land.
        const material = globeMaterial = new B.ShaderMaterial("Exodus Earth surface", scene, {
            vertexSource: `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform mat4 worldViewProjection;
                varying vec2 imageUV;
                void main() {
                    imageUV = uv;
                    gl_Position = worldViewProjection * vec4(position, 1.0);
                }`,
            fragmentSource: `precision highp float;
                varying vec2 imageUV;
                uniform sampler2D earthImage;
                uniform float brightnessGamma;
                void main() {
                    vec3 colour = texture2D(earthImage, imageUV).rgb;
                    gl_FragColor = vec4(pow(max(colour, vec3(0.000001)),
                        vec3(1.0 / brightnessGamma)), 1.0);
                }`
        }, {attributes: ["position", "uv"], uniforms: ["worldViewProjection", "brightnessGamma"],
            samplers: ["earthImage"]});
        material.setFloat("brightnessGamma", brightness / 100);
        material.sideOrientation = B.Material.CounterClockWiseSideOrientation;
        const texture = new B.Texture("assets/earth-tiles/overview.jpg", scene,
            false, true, B.Texture.TRILINEAR_SAMPLINGMODE);
        texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
        texture.wrapV = B.Texture.CLAMP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        material.setTexture("earthImage", texture);
        sphere.material = material;
        // Open over Europe and Africa, north up.
        const initialPosition = state.geographicToPosition(25, 10).map(value => value * 3.4);
        camera.position.copyFrom(B.Vector3.FromArray(initialPosition));
        navigation = createExodusNavigation(B, scene, camera, canvas, DISPLAY_RADIUS,
            MIN_ALTITUDE_M * DISPLAY_RADIUS / EARTH_RADIUS_M, 9000);
        placeMarker = B.MeshBuilder.CreateSphere("Chosen place", {diameter: 1, segments: 12}, scene);
        const placeMaterial = new B.StandardMaterial("Chosen place colour", scene);
        placeMaterial.emissiveColor = new B.Color3(1, .65, .15);
        placeMaterial.disableLighting = true;
        placeMarker.material = placeMaterial;
        placeMarker.renderingGroupId = 2;
        placeMarker.isPickable = false;
        placeMarker.setEnabled(false);
        tileLayer = createExodusTiles(B, scene, camera, state, material, info => {
            imageNotice.hidden = !info.unavailable;
            imageNotice.textContent = window.HuertaI18n?.t
                ? window.HuertaI18n.t("Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.")
                : "Les images détaillées sont temporairement indisponibles. Vous pouvez continuer à explorer avec la vue générale.";
            tileStatus.textContent = `Tuiles : ${info.visible} affichées` +
                (info.remoteLevel >= 0 ? ` · niveau EOX ${info.remoteLevel}/13` : " · vue générale") +
                (info.detailed ? ` · Sentinel : ${info.detailed}` : "") +
                (info.loading ? ` · ${info.loading} en chargement` : "") +
                ` · mémoire ${info.cached}/${info.limit}` +
                (info.errors ? " · image générale conservée sur les zones indisponibles" : "");
        });
        tileLayer.setBrightness(brightness);
        engine.runRenderLoop(() => {
            if (onEarth) {
                camera.getViewMatrix(true);
                scene.updateTransformMatrix(true);
                tileLayer.update();
                updateSelection();
                if (state.selectedLocation && state.selectedLocation.showMarker !== false) {
                    const visible = B.Vector3.Dot(camera.position, placeMarker.position.normalizeToNew()) > DISPLAY_RADIUS;
                    placeMarker.setEnabled(visible);
                    placeMarker.scaling.setAll(Math.max(.003, Math.min(4, (camera.position.length() - DISPLAY_RADIUS) * .018)));
                    const projected = B.Vector3.Project(placeMarker.position, B.Matrix.Identity(),
                        scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
                    placeLabel.hidden = !visible || projected.z < 0 || projected.z > 1 ||
                        projected.x < 0 || projected.y < 0 || projected.x > engine.getRenderWidth() || projected.y > engine.getRenderHeight();
                    placeLabel.style.left = projected.x * canvas.clientWidth / engine.getRenderWidth() + "px";
                    placeLabel.style.top = projected.y * canvas.clientHeight / engine.getRenderHeight() - 12 + "px";
                }
                scene.render();
            }
        });
        window.addEventListener("resize", () => { if (onEarth) engine.resize(); });
        state.ready = true;
    }

    function init() {
        canvas = document.createElement("canvas");
        canvas.id = "exodus_earth_canvas";
        canvas.setAttribute("aria-label", "Globe Exodus : clic gauche déplacement, milieu rotation et inclinaison, clic droit rotation et zoom, molette vers le pointeur");
        document.body.appendChild(canvas);
        placeLabel = document.createElement("div");
        placeLabel.id = "exodus_place_label"; placeLabel.hidden = true;
        document.body.appendChild(placeLabel);
        localView = ExodusZone.createLocal(state);
        const selection = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        selection.id="exodus_selection_frame"; selection.setAttribute("aria-hidden","true");
        selectionPolygon=document.createElementNS(selection.namespaceURI,"polygon");
        selection.appendChild(selectionPolygon); document.body.appendChild(selection);
        selectionPanel=document.createElement("section"); selectionPanel.id="exodus_selection_panel"; selectionPanel.hidden=true;
        const selectionHelp=document.createElement("p");
        selectionHelp.textContent=t("Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone.");
        selectionReadout=document.createElement("p");
        confirmZone=document.createElement("button"); confirmZone.type="button"; confirmZone.id="exodus_confirm_zone";
        confirmZone.textContent=t("Valider cette zone"); confirmZone.disabled=true;
        confirmZone.addEventListener("click",()=>{
            updateSelection(); if(!state.pendingZone || confirmZone.disabled)return;
            state.localZone={...state.pendingZone};
            localView.open(state.localZone,globeMaterial);
            switchMode("local");
        });
        selectionPanel.append(selectionHelp,confirmZone); document.body.appendChild(selectionPanel);
        placeSearch = ExodusPlaceSearch.create(place => {
            if (!onEarth || !navigation) return;
            state.selectedLocation = {...place};
            const point = BABYLON.Vector3.FromArray(state.geographicToPosition(place.latitude, place.longitude));
            placeMarker.position.copyFrom(point.scale(1.0000001));
            placeMarker.setEnabled(true);
            placeLabel.textContent = place.name;
            navigation.setSelection(true);
            navigation.focus(point, 25000 * DISPLAY_RADIUS / EARTH_RADIUS_M);
            selectionPanel.hidden=false;
            worldStatus.textContent=t("Zoomez fortement, puis déplacez le terrain sous le cadre, ou faites une recherche de lieu, puis validez cette zone.");
            tileLayer.refresh();
        });
        // Keep all place-selection actions in the Terre panel, following the
        // single-column layout used by Huertahernando.
        document.getElementById("exodus_place_search")?.appendChild(selectionPanel);
        const controls = document.createElement("div");
        controls.id = "exodus_world_controls";
        const button = worldButton = document.createElement("button");
        button.type = "button";
        button.textContent = t("Sur Terre");
        button.setAttribute("aria-pressed", "false");
        const status = worldStatus = document.createElement("div");
        status.id = "exodus_world_status";
        status.setAttribute("role", "status");
        status.textContent = "Exodus — Huerta";
        controls.append(button, status);
        selectedZoneButton=document.createElement("button"); selectedZoneButton.type="button";
        selectedZoneButton.id="exodus_selected_zone_button"; selectedZoneButton.hidden=true;
        selectedZoneButton.addEventListener("click",()=>switchMode(state.mode === "local" ? "earth" : "local"));
        controls.insertBefore(selectedZoneButton,status);
        imageNotice = document.createElement("div");
        imageNotice.id = "exodus_image_notice";
        imageNotice.hidden = true;
        imageNotice.setAttribute("role", "status");
        imageNotice.style.cssText = "max-width:280px;font-size:11px;margin-top:6px;";
        controls.appendChild(imageNotice);
        const adjustment = document.createElement("div");
        adjustment.id = "exodus_brightness_control";
        const label = document.createElement("label");
        label.htmlFor = "exodus_brightness";
        label.textContent = t("Luminosité du globe");
        const value = document.createElement("output");
        value.htmlFor = "exodus_brightness";
        value.textContent = brightness + " %";
        const slider = document.createElement("input");
        slider.id = "exodus_brightness";
        slider.type = "range";
        slider.min = "50"; slider.max = "300"; slider.step = "5";
        slider.value = String(brightness);
        slider.addEventListener("input", () => {
            brightness = Number(slider.value);
            value.textContent = brightness + " %";
            if (globeMaterial) globeMaterial.setFloat("brightnessGamma", brightness / 100);
            if (tileLayer) tileLayer.setBrightness(brightness);
            try { localStorage.setItem("exodus_globe_brightness", String(brightness)); } catch (_) {}
        });
        adjustment.append(label, value, slider);
        tileStatus = document.createElement("div");
        tileStatus.id = "exodus_tile_status";
        tileStatus.textContent = "Tuiles : image générale";
        adjustment.appendChild(tileStatus);
        const visit = document.createElement("button");
        visit.type = "button";
        visit.id = "exodus_visit_detail";
        visit.textContent = t("Voir la zone détaillée");
        visit.addEventListener("click", () => {
            if (!onEarth || !navigation) return;
            navigation.focus(BABYLON.Vector3.FromArray(state.geographicToPosition(40.827897, -2.288334)),
                6000 * DISPLAY_RADIUS / EARTH_RADIUS_M);
            tileLayer.refresh();
        });
        adjustment.appendChild(visit);
        controls.appendChild(adjustment);
        document.body.appendChild(controls);
        button.addEventListener("click", () => {
            switchMode(state.mode === "huerta" ? "earth" : "huerta");
        });
    }
    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init, {once: true});
    else init();
})();
