"use strict";

/* Calcul local du trajet Marcheur et affichage sur le relief Huerta.
 * Les coordonnées calculées sont projetées sur un canvas d'interface.
 */
HuertaRuntime.register("huerta_marcheur", function(exports, require) {

var m_camera = require("camera");
var m_main = require("main");
var m_geometry = require("geometry");
var m_material = require("material");
var m_objects = require("objects");
var m_scenes = require("scenes");
var m_huerta = require("huerta_webgl_main");
var m_calques = require("huerta_calques");

var UTM_OFFSET_X = 559563.0;
var UTM_OFFSET_Y = 4519538.0;
var TERRAIN_LINE_CLEARANCE_M = 3.0;
var canvas = null;
var context = null;
var terrainCanvas = null;
var pickButton = null;
var repeatRouteButton = null;
var calculateButtons = {};
var redAngleInput = null;
var redAngleValue = null;
var redMaxAngleInput = null;
var redMaxAngleValue = null;
var selectedRedAngle = 12;
var selectedRedMaxAngle = 40;
var pickStatus = null;
var messageButton = null;
var messagePanel = null;
var messageContent = null;
var timeLimitInput = null;
var timeLimitValue = null;
var elapsedPanel = null;
var elapsedLabel = null;
var routeSummary = null;
var routeDistanceLabel = null;
var routeWalkingTimeLabel = null;
var routeSlopeWalkingTimeLabel = null;
var walkingSpeedFactorInput = null;
var walkingSpeedFactorValue = null;
var elapsedTimer = null;
var calculationStartedAt = 0;
var calculationTimeLimitMs = 0;
var routeLayers = {};
var magnetismInput = null;
var magnetismValue = null;
var splineInput = null;
var splineValue = null;
var flightEnterButton = null;
var flightStartButton = null;
var flightPauseButton = null;
var flightStopButton = null;
var flightAltitudeInput = null;
var flightAltitudeValue = null;
var flightSpeedInput = null;
var flightSpeedValue = null;
var flightInclinationInput = null;
var flightInclinationValue = null;
var flightPanelElement = null;
var flightTitleLabel = null;
var flightStatusLabel = null;
var marcheurPanelElement = null;
var flightUiTimer = null;
var flightUiWasActive = false;
var picking = false;
var multiPointPicking = false;
var multiPointRoute = false;
var pickingBusy = false;
var pickPointerStart = null;
var ignoreNextTerrainClick = false;
var pickedPoints = [];
var calculatedRoutes = {};
var partialRouteFlags = {};
var routeAngleRanges = {10:{reference:12, maximum:40}};
var routeWorker = null;
var routeCalculationId = 0;
var routeCalculationActive = false;
var terrainOcclusionLine = null;
var terrainOcclusionFailed = false;
var progressiveDisplayQueue = [];
var progressiveDisplayTimer = null;
var routingData = null;

function get_local_routing_data() {
    var context = window.ExodusLocalContext;
    var grid = context && context.routing && context.routing.grid;
    if (!grid || !grid.elevations || !grid.bounds)
        return null;
    return {localGrid: {
        width: grid.width, height: grid.height,
        cellSizeX: grid.cellSizeX, cellSizeY: grid.cellSizeY,
        xMin: grid.xMin, yMax: grid.yMax,
        bounds: grid.bounds,
        elevations: new Float32Array(grid.elevations)
    }};
}

function is_local_routing() {
    return !!get_local_routing_data();
}

function position_flight_panel() {
    var marcheurPanel = document.getElementById("huerta_marcheur");
    var flightPanel = document.getElementById("huerta_marcheur_flight");
    if (!marcheurPanel || !flightPanel)
        return;

    var rect = marcheurPanel.getBoundingClientRect();
    var top = rect.bottom + 8;
    var maxTop = Math.max(12, window.innerHeight - 220);
    top = Math.min(top, maxTop);
    flightPanel.style.left = Math.round(rect.left) + "px";
    flightPanel.style.top = Math.round(top) + "px";
    flightPanel.style.width = Math.round(rect.width) + "px";
    flightPanel.style.maxHeight = Math.max(120, window.innerHeight - top - 12) + "px";
}

function create_interface() {
    if (document.getElementById("huerta_marcheur"))
        return;

    var panel = document.createElement("div");
    marcheurPanelElement = panel;
    panel.id = "huerta_marcheur";
    panel.style.cssText = "position:fixed;top:56px;left:15px;z-index:10002;box-sizing:border-box;width:220px;max-width:calc(100vw - 30px);max-height:calc(100vh - 68px);overflow-y:auto;min-width:0;font:13px Arial,sans-serif;color:#fff;background:rgba(25,35,45,.92);padding:8px;border:1px solid rgba(255,255,255,.55);border-radius:4px;";

    var sectionTitle = document.createElement("div");
    sectionTitle.textContent = "Marcheur";
    sectionTitle.style.cssText = "font-weight:bold;margin:0 0 6px;";

    pickButton = document.createElement("button");
    pickButton.type = "button";
    pickButton.textContent = "Choisir plusieurs points";
    pickButton.style.cssText = "box-sizing:border-box;cursor:pointer;padding:6px 5px;width:100%;margin:0 0 5px;white-space:normal;";
    pickButton.addEventListener("click", toggle_multi_point_selection, false);

    repeatRouteButton = document.createElement("button");
    repeatRouteButton.type = "button";
    repeatRouteButton.textContent = "Refaire le calcul";
    repeatRouteButton.disabled = true;
    repeatRouteButton.style.cssText = "box-sizing:border-box;cursor:pointer;padding:6px 5px;width:100%;margin:0 0 6px;white-space:normal;";
    repeatRouteButton.addEventListener("click", function() {
        if (pickedPoints.length >= 2 && !routeCalculationActive && !picking)
            calculate_route(selectedRedAngle, selectedRedMaxAngle);
    }, false);

    calculateButtons[10] = document.createElement("button");
    calculateButtons[10].type = "button";
    calculateButtons[10].textContent = "Calculer le trajet";
    calculateButtons[10].disabled = true;
    calculateButtons[10].style.cssText = "box-sizing:border-box;cursor:pointer;padding:6px 5px;width:100%;margin:0 0 5px;white-space:normal;";
    calculateButtons[10].addEventListener("click", function() {
        calculate_route(selectedRedAngle, selectedRedMaxAngle);
    }, false);

    elapsedPanel = document.createElement("div");
    elapsedPanel.id = "huerta_marcheur_route_summary_panel";
    elapsedPanel.style.cssText = "display:block;margin:1px 0 7px;padding:5px 6px;background:rgba(0,0,0,.22);border-radius:3px;";
    elapsedLabel = document.createElement("div");
    elapsedLabel.id = "huerta_marcheur_elapsed";
    elapsedLabel.textContent = "Temps écoulé : —";
    elapsedLabel.style.cssText = "display:block;box-sizing:border-box;margin:0 0 5px;padding:5px 6px;background:rgba(0,0,0,.22);border-radius:3px;font-size:11px;text-align:center;font-variant-numeric:tabular-nums;";
   routeSummary = document.createElement("div");
    routeSummary.id = "huerta_marcheur_route_summary";
    routeSummary.style.cssText = "display:block;margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.2);font-size:11px;line-height:1.45;text-align:left;";
    routeDistanceLabel = document.createElement("div");
    routeWalkingTimeLabel = document.createElement("div");
    routeSlopeWalkingTimeLabel = document.createElement("div");
    routeDistanceLabel.textContent = "Distance : —";
    routeWalkingTimeLabel.textContent = "Marche estimée à 4–5 km/h : —";
    routeSlopeWalkingTimeLabel.textContent = "Marche selon la pente : —";
    routeSummary.appendChild(routeDistanceLabel);
    routeSummary.appendChild(routeWalkingTimeLabel);
    routeSummary.appendChild(routeSlopeWalkingTimeLabel);
    elapsedPanel.appendChild(routeSummary);

    var redAngleLabel = document.createElement("label");
    redAngleLabel.textContent = "Pente de référence";
    redAngleLabel.style.cssText = "display:block;margin:4px 0 1px;font-size:11px;";
    redAngleInput = document.createElement("input");
    redAngleInput.type = "range";
    redAngleInput.min = "5";
    redAngleInput.max = "12";
    redAngleInput.step = "1";
    redAngleInput.value = String(selectedRedAngle);
    redAngleInput.setAttribute("aria-label", "Pente de référence du trajet, de 5 à 12 degrés");
    redAngleInput.disabled = true;
    redAngleInput.style.cssText = "display:block;box-sizing:border-box;width:100%;margin:0;";
    redAngleValue = document.createElement("div");
    redAngleValue.textContent = selectedRedAngle + "°";
    redAngleValue.style.cssText = "text-align:center;font-size:10px;margin:0 0 3px;";
    redAngleInput.addEventListener("input", function() {
        selectedRedAngle = Number(redAngleInput.value);
        if (selectedRedMaxAngle < selectedRedAngle) {
            selectedRedMaxAngle = selectedRedAngle;
            redMaxAngleInput.value = String(selectedRedMaxAngle);
        }
        redAngleValue.textContent = selectedRedAngle + "°";
        redMaxAngleValue.textContent = selectedRedMaxAngle + "°";
    }, false);

    var redMaxAngleLabel = document.createElement("label");
    redMaxAngleLabel.textContent = "Pente maximale acceptée";
    redMaxAngleLabel.style.cssText = "display:block;margin:4px 0 1px;font-size:11px;";
    redMaxAngleInput = document.createElement("input");
    redMaxAngleInput.type = "range";
    redMaxAngleInput.min = "5";
    redMaxAngleInput.max = "70";
    redMaxAngleInput.step = "1";
    redMaxAngleInput.value = String(selectedRedMaxAngle);
    redMaxAngleInput.setAttribute("aria-label", "Plafond de pente accepté du trajet, de 5 à 70 degrés");
    redMaxAngleInput.disabled = true;
    redMaxAngleInput.style.cssText = "display:block;box-sizing:border-box;width:100%;margin:0;";
    redMaxAngleValue = document.createElement("div");
    redMaxAngleValue.textContent = selectedRedMaxAngle + "°";
    redMaxAngleValue.style.cssText = "text-align:center;font-size:10px;margin:0 0 3px;";
    redMaxAngleInput.addEventListener("input", function() {
        selectedRedMaxAngle = Number(redMaxAngleInput.value);
        if (selectedRedMaxAngle < selectedRedAngle) {
            selectedRedAngle = selectedRedMaxAngle;
            redAngleInput.value = String(selectedRedAngle);
            redAngleValue.textContent = selectedRedAngle + "°";
        }
        redMaxAngleValue.textContent = selectedRedMaxAngle + "°";
    }, false);

    var timeLabel = document.createElement("label");
    timeLabel.className = "huerta-marcheur-test-control";
    timeLabel.id = "huerta_marcheur_time_label";
    timeLabel.textContent = "Temps par option";
    timeLabel.style.cssText = "display:block;margin:3px 0 2px;font-size:11px;";
    timeLimitInput = document.createElement("input");
    timeLimitInput.className = "huerta-marcheur-test-control";
    timeLimitInput.id = "huerta_marcheur_time_input";
    timeLimitInput.type = "range";
    timeLimitInput.min = "30";
    timeLimitInput.max = "300";
    timeLimitInput.step = "30";
    timeLimitInput.value = "300";
    timeLimitInput.setAttribute("aria-label", "Temps maximal de calcul par option, en secondes");
    timeLimitInput.style.cssText = "display:block;box-sizing:border-box;width:100%;margin:0;";
    timeLimitValue = document.createElement("div");
    timeLimitValue.className = "huerta-marcheur-test-control";
    timeLimitValue.id = "huerta_marcheur_time_value";
    timeLimitValue.textContent = "5 min par option";
    timeLimitValue.style.cssText = "text-align:center;font-size:10px;margin:0 0 6px;";
    timeLimitInput.addEventListener("input", function() {
        var seconds = Number(timeLimitInput.value);
        timeLimitValue.textContent = seconds % 60 === 0
            ? (seconds / 60) + " min par option" : seconds + " s par option";
    }, false);
    messageButton = document.createElement("button");
    messageButton.className = "huerta-marcheur-test-control";
    messageButton.type = "button";
    messageButton.textContent = "Messages du calcul";
    messageButton.style.cssText = "box-sizing:border-box;cursor:pointer;padding:5px;width:100%;margin:0 0 5px;white-space:normal;";
    messageButton.addEventListener("click", toggle_message_panel, false);

    pickStatus = document.createElement("div");
    pickStatus.style.cssText = "margin:0 0 7px;font-size:11px;line-height:1.35;max-width:100%;overflow-wrap:anywhere;";
    pickStatus.textContent = "Prêt. Choisis deux points sur la carte.";

    messagePanel = document.createElement("div");
    messagePanel.id = "huerta_marcheur_messages";
    messagePanel.style.cssText = "display:none;position:fixed;top:112px;left:245px;z-index:10003;box-sizing:border-box;width:min(440px,calc(100vw - 260px));max-height:calc(100vh - 130px);overflow:hidden;color:#fff;background:rgba(20,29,38,.96);border:1px solid rgba(255,255,255,.55);border-radius:5px;box-shadow:0 4px 18px rgba(0,0,0,.5);font:12px Arial,sans-serif;";
    var messageHeader = document.createElement("div");
    messageHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.25);font-weight:bold;";
    var messageTitle = document.createElement("span");
    messageTitle.textContent = "Messages du calcul Marcheur";
    var closeMessages = document.createElement("button");
    closeMessages.type = "button";
    closeMessages.textContent = "Fermer";
    closeMessages.style.cssText = "cursor:pointer;padding:3px 7px;";
    closeMessages.addEventListener("click", function() { messagePanel.style.display = "none"; }, false);
    messageHeader.appendChild(messageTitle);
    messageHeader.appendChild(closeMessages);
    messageContent = document.createElement("div");
    messageContent.style.cssText = "box-sizing:border-box;max-height:calc(100vh - 175px);overflow:auto;padding:8px 10px;font:11px/1.45 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;";
    messagePanel.appendChild(messageHeader);
    messagePanel.appendChild(messageContent);

    var routeTitle = document.createElement("div");
    routeTitle.id = "huerta_marcheur_route_title";
    routeTitle.textContent = "Calques des trajets";
    routeTitle.style.cssText = "font-weight:bold;margin:8px 0 3px;";
    var routeLayerPanel = document.createElement("div");
    routeLayerPanel.id = "huerta_marcheur_layers";
    routeLayerPanel.style.cssText = "border-top:1px solid rgba(255,255,255,.25);padding-top:4px;";
    routeLayers[10] = create_route_layer_row(routeLayerPanel, "Marcheur", "#bd473b", 10);
    routeLayers[10].checkbox.style.display = "inline-block";
    routeLayers[10].checkbox.checked = false;
    routeLayers[11] = create_route_layer_row(routeLayerPanel, "Marcheur lisse", "#c77dff", 11);
    routeLayers[11].checkbox.checked = false;
    routeLayers[12] = create_route_layer_row(routeLayerPanel, "Marcheur aimanté", "#f2c14e", 12);
    routeLayers[12].checkbox.checked = false;

    var magnetismLabel = document.createElement("label");
    magnetismLabel.className = "huerta-marcheur-test-control";
    magnetismLabel.textContent = "Aimantation des points proches";
    magnetismLabel.style.cssText = "display:block;font-size:11px;margin-top:6px;";
    magnetismInput = document.createElement("input");
    magnetismInput.className = "huerta-marcheur-test-control";
    magnetismInput.type = "range";
    magnetismInput.min = "1";
    magnetismInput.max = "20";
    magnetismInput.step = "1";
    magnetismInput.value = "3";
    magnetismInput.disabled = true;
    magnetismInput.style.cssText = "display:block;width:100%;margin:0;";
    magnetismValue = document.createElement("div");
    magnetismValue.className = "huerta-marcheur-test-control";
    magnetismValue.textContent = "3 m";
    magnetismValue.style.cssText = "text-align:center;font-size:10px;";
    magnetismInput.addEventListener("input", function() {
        magnetismValue.textContent = magnetismInput.value + " m";
        calculatedRoutes[12] = build_final_route();
        update_route_layer_controls();
        draw_route();
    }, false);

    var splineLabel = document.createElement("label");
    splineLabel.className = "huerta-marcheur-test-control";
    splineLabel.textContent = "Lissage spline final";
    splineLabel.style.cssText = "display:block;font-size:11px;margin-top:6px;";
    splineInput = document.createElement("input");
    splineInput.className = "huerta-marcheur-test-control";
    splineInput.type = "range";
    splineInput.min = "1";
    splineInput.max = "20";
    splineInput.step = "1";
    splineInput.value = "1";
    splineInput.disabled = true;
    splineInput.style.cssText = "display:block;width:100%;margin:0;";
    splineValue = document.createElement("div");
    splineValue.className = "huerta-marcheur-test-control";
    splineValue.textContent = "1 m";
    splineValue.style.cssText = "text-align:center;font-size:10px;";
    splineInput.addEventListener("input", function() {
        splineValue.textContent = splineInput.value + " m";
        calculatedRoutes[12] = build_final_route();
        update_route_layer_controls();
        draw_route();
    }, false);

    var flightPanel = document.createElement("section");
    flightPanelElement = flightPanel;
    flightPanel.id = "huerta_marcheur_flight";
    flightPanel.style.cssText = "position:fixed;left:15px;top:420px;z-index:10002;box-sizing:border-box;width:220px;max-width:calc(100vw - 30px);overflow-y:auto;min-width:0;font:13px Arial,sans-serif;color:#fff;background:rgba(25,35,45,.92);padding:8px;border:1px solid rgba(255,255,255,.55);border-radius:4px;";
    var flightTitle = document.createElement("div");
    flightTitleLabel = flightTitle;
    flightTitle.textContent = "Calcule un trajet pour lancer le survol.";
    flightTitle.style.cssText = "font-weight:bold;margin-bottom:5px;text-align:center;";

    var altitudeLabel = document.createElement("label");
    altitudeLabel.textContent = "Hauteur au-dessus du trajet";
    altitudeLabel.style.cssText = "display:block;font-size:11px;margin-top:4px;";
    flightAltitudeInput = document.createElement("input");
    flightAltitudeInput.type = "range";
    flightAltitudeInput.min = "5";
    flightAltitudeInput.max = "300";
    flightAltitudeInput.step = "5";
    flightAltitudeInput.value = "5";
    flightAltitudeInput.setAttribute("aria-label", "Hauteur de caméra au-dessus du trajet, en mètres");
    flightAltitudeInput.style.cssText = "display:block;width:100%;margin:0;";
    flightAltitudeValue = document.createElement("div");
    flightAltitudeValue.textContent = "5 m";
    flightAltitudeValue.style.cssText = "text-align:center;font-size:10px;";
    flightAltitudeInput.addEventListener("input", function() {
        flightAltitudeValue.textContent = flightAltitudeInput.value + " m";
        m_huerta.set_route_flight_altitude(Number(flightAltitudeInput.value));
    }, false);

    var speedLabel = document.createElement("label");
    speedLabel.textContent = "Vitesse de survol";
    speedLabel.style.cssText = "display:block;font-size:11px;margin-top:4px;";
    flightSpeedInput = document.createElement("input");
    flightSpeedInput.type = "range";
    flightSpeedInput.min = "1";
    flightSpeedInput.max = "80";
    flightSpeedInput.step = "1";
    flightSpeedInput.value = "14";
    flightSpeedInput.setAttribute("aria-label", "Vitesse de caméra, en mètres par seconde");
    flightSpeedInput.style.cssText = "display:block;width:100%;margin:0;";
    flightSpeedValue = document.createElement("div");
    flightSpeedValue.textContent = "14 m/s";
    flightSpeedValue.style.cssText = "text-align:center;font-size:10px;";
    flightSpeedInput.addEventListener("input", function() {
        flightSpeedValue.textContent = flightSpeedInput.value + " m/s";
        m_huerta.set_route_flight_speed(Number(flightSpeedInput.value));
    }, false);

    var inclinationLabel = document.createElement("label");
    inclinationLabel.textContent = "Inclinaison vers le sol";
    inclinationLabel.style.cssText = "display:block;font-size:11px;margin-top:4px;";
    flightInclinationInput = document.createElement("input");
    flightInclinationInput.type = "range";
    flightInclinationInput.min = "0";
    flightInclinationInput.max = "80";
    flightInclinationInput.step = "5";
    flightInclinationInput.value = "0";
    flightInclinationInput.setAttribute("aria-label", "Inclinaison de la caméra vers le sol, en degrés depuis l'horizontale");
    flightInclinationInput.style.cssText = "display:block;width:100%;margin:0;";
    flightInclinationValue = document.createElement("div");
    flightInclinationValue.textContent = "0°";
    flightInclinationValue.style.cssText = "text-align:center;font-size:10px;";
    flightInclinationInput.addEventListener("input", function() {
        flightInclinationValue.textContent = flightInclinationInput.value + "°";
        m_huerta.set_route_flight_inclination(Number(flightInclinationInput.value));
    }, false);
    flightAltitudeInput.disabled = true;
    flightSpeedInput.disabled = true;
    flightInclinationInput.disabled = true;

    var flightButtons = document.createElement("div");
    flightButtons.style.cssText = "display:flex;gap:4px;margin-top:5px;";
    flightEnterButton = document.createElement("button");
    flightEnterButton.type = "button";
    flightEnterButton.textContent = "Entrer dans le simulateur de marche";
    flightEnterButton.disabled = true;
    flightEnterButton.style.cssText = "display:block;width:100%;margin-top:5px;cursor:pointer;padding:5px 2px;";
    flightEnterButton.addEventListener("click", function() {
        var flightState = m_huerta.get_route_flight_status();
        if (flightState.active)
            stop_route_flight_ui();
        else
            enter_route_flight_ui();
    }, false);
    flightStartButton = document.createElement("button");
    flightStartButton.type = "button";
    flightStartButton.textContent = "Démarrer le marcheur";
    flightStartButton.disabled = true;
    flightStartButton.style.cssText = "flex:1;cursor:pointer;padding:5px 2px;";
    flightStartButton.addEventListener("click", start_route_flight_ui, false);
    flightPauseButton = document.createElement("button");
    flightPauseButton.type = "button";
    flightPauseButton.textContent = "Pause";
    flightPauseButton.disabled = true;
    flightPauseButton.style.cssText = "flex:1;cursor:pointer;padding:5px 2px;";
    flightPauseButton.addEventListener("click", toggle_route_flight_pause, false);
    flightStopButton = document.createElement("button");
    flightStopButton.type = "button";
    flightStopButton.textContent = "Quitter";
    flightStopButton.disabled = true;
    flightStopButton.style.cssText = "display:none;";
    flightStopButton.addEventListener("click", stop_route_flight_ui, false);
    flightButtons.appendChild(flightStartButton);
    flightButtons.appendChild(flightPauseButton);
    flightPanel.appendChild(flightTitle);
    flightPanel.appendChild(flightEnterButton);
    flightPanel.appendChild(flightButtons);
    flightPanel.appendChild(altitudeLabel);
    flightPanel.appendChild(flightAltitudeInput);
    flightPanel.appendChild(flightAltitudeValue);
    flightPanel.appendChild(speedLabel);
    flightPanel.appendChild(flightSpeedInput);
    flightPanel.appendChild(flightSpeedValue);
    flightStatusLabel = document.createElement("div");
    flightStatusLabel.style.cssText = "min-height:14px;margin-top:4px;font-size:10px;line-height:1.3;text-align:center;";
    flightStatusLabel.textContent = "Calcule un trajet pour lancer le survol.";
    flightPanel.appendChild(flightStatusLabel);

    canvas = document.createElement("canvas");
    canvas.id = "huerta_marcheur_overlay";
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:9997;pointer-events:none;";
    context = canvas.getContext("2d");

    panel.appendChild(sectionTitle);
    panel.appendChild(pickButton);
    panel.appendChild(elapsedLabel);
    panel.appendChild(repeatRouteButton);
    panel.appendChild(redAngleLabel);
    panel.appendChild(redAngleInput);
    panel.appendChild(redAngleValue);
    panel.appendChild(redMaxAngleLabel);
    panel.appendChild(redMaxAngleInput);
    panel.appendChild(redMaxAngleValue);
    panel.appendChild(elapsedPanel);
    panel.appendChild(timeLabel);
    panel.appendChild(timeLimitInput);
    panel.appendChild(timeLimitValue);
    panel.appendChild(messageButton);
    panel.appendChild(pickStatus);
    panel.appendChild(routeTitle);
    panel.appendChild(routeLayerPanel);
    panel.appendChild(magnetismLabel);
    panel.appendChild(magnetismInput);
    panel.appendChild(magnetismValue);
    panel.appendChild(splineLabel);
    panel.appendChild(splineInput);
    panel.appendChild(splineValue);
    var walkingSpeedFactorLabel = document.createElement("label");
    walkingSpeedFactorLabel.className = "huerta-marcheur-test-control";
    walkingSpeedFactorLabel.textContent = "Correction globale de vitesse";
    walkingSpeedFactorLabel.style.cssText = "display:block;font-size:11px;margin-top:6px;";
    walkingSpeedFactorInput = document.createElement("input");
    walkingSpeedFactorInput.className = "huerta-marcheur-test-control";
    walkingSpeedFactorInput.type = "range";
    walkingSpeedFactorInput.min = "50";
    walkingSpeedFactorInput.max = "120";
    walkingSpeedFactorInput.step = "5";
    walkingSpeedFactorInput.value = "80";
    walkingSpeedFactorInput.style.cssText = "display:block;width:100%;margin:0;";
    walkingSpeedFactorValue = document.createElement("div");
    walkingSpeedFactorValue.className = "huerta-marcheur-test-control";
    walkingSpeedFactorValue.textContent = "80 %";
    walkingSpeedFactorValue.style.cssText = "text-align:center;font-size:10px;";
    walkingSpeedFactorInput.addEventListener("input", function() {
        walkingSpeedFactorValue.textContent = walkingSpeedFactorInput.value + " %";
        var currentDistance = measure_route_distance(calculatedRoutes[12]);
        update_route_summary(currentDistance);
    }, false);
    panel.appendChild(walkingSpeedFactorLabel);
    panel.appendChild(walkingSpeedFactorInput);
    panel.appendChild(walkingSpeedFactorValue);
    document.body.appendChild(panel);
    document.body.appendChild(flightPanel);
    document.body.appendChild(messagePanel);
    document.body.appendChild(canvas);
    update_point_control_availability();
    position_flight_panel();
    window.addEventListener("resize", position_flight_panel, false);
    if (typeof ResizeObserver !== "undefined") {
        var flightPanelResizeObserver = new ResizeObserver(position_flight_panel);
        flightPanelResizeObserver.observe(panel);
    }
    if (typeof MutationObserver !== "undefined") {
        var testModeObserver = new MutationObserver(position_flight_panel);
        testModeObserver.observe(document.body, {attributes:true, attributeFilter:["class"]});
    }
    ensure_canvas_listener();
    window.addEventListener("resize", draw_route, false);
}

function enter_route_flight_ui() {
    var points = route_points_for_key(12);
    if (!points || points.length < 2 || routeWorker)
        return;
    var started = m_huerta.start_route_flight(
        points,
        Number(flightAltitudeInput.value),
        Number(flightSpeedInput.value),
        0
    );
    if (!started) {
        flightStatusLabel.textContent = "Impossible d’entrer dans le simulateur.";
        return;
    }
    flightUiWasActive = true;
    set_marcheur_panel_enabled(false);
    flightEnterButton.disabled = false;
    flightEnterButton.textContent = "Quitter";
    flightAltitudeInput.disabled = false;
    flightSpeedInput.disabled = false;
    flightInclinationInput.disabled = false;
    flightStartButton.disabled = false;
    flightPauseButton.disabled = true;
    flightStopButton.disabled = false;
    flightPauseButton.textContent = "Pause";
    if (routeLayers[10]) {
        routeLayers[10].checkbox.checked = false;
        routeLayers[10].checkbox.dispatchEvent(new Event("change"));
    }
    flightStatusLabel.textContent = "Simulateur en marche.";
    refresh_route_flight_ui();
    // L’entrée dans le simulateur lance immédiatement le déplacement.
    // Les curseurs restent actifs et Pause permet de reprendre la main.
    start_route_flight_ui();
}

function start_route_flight_ui() {
    var state = m_huerta.get_route_flight_status();
    if (!state.active || !state.prepared || state.started)
        return;
    if (!m_huerta.resume_route_flight())
        return;
    if (m_calques && m_calques.set_simulator_hidden)
        m_calques.set_simulator_hidden(true);
    flightStartButton.disabled = true;
    flightPauseButton.disabled = false;
    flightStopButton.disabled = false;
    flightPauseButton.textContent = "Pause";
    if (flightUiTimer !== null)
        window.clearInterval(flightUiTimer);
    flightUiTimer = window.setInterval(refresh_route_flight_ui, 200);
    refresh_route_flight_ui();
}

function toggle_route_flight_pause() {
    var state = m_huerta.get_route_flight_status();
    if (!state.active)
        return;
    if (state.playing) {
        m_huerta.pause_route_flight();
        flightPauseButton.textContent = "Reprendre";
    } else {
        m_huerta.resume_route_flight();
        flightPauseButton.textContent = "Pause";
    }
    refresh_route_flight_ui();
}

function stop_route_flight_ui() {
    m_huerta.stop_route_flight();
    if (m_calques && m_calques.set_simulator_hidden)
        m_calques.set_simulator_hidden(false);
    flightUiWasActive = false;
    set_marcheur_panel_enabled(true);
    flightAltitudeInput.disabled = true;
    flightSpeedInput.disabled = true;
    flightInclinationInput.disabled = true;
    if (flightUiTimer !== null) {
        window.clearInterval(flightUiTimer);
        flightUiTimer = null;
    }
    flightEnterButton.disabled = !(route_points_for_key(12) || []).length;
    flightEnterButton.textContent = "Entrer dans le simulateur de marche";
    flightStartButton.disabled = true;
    flightPauseButton.disabled = true;
    flightStopButton.disabled = true;
    flightPauseButton.textContent = "Pause";
    flightStatusLabel.textContent = "Simulateur quitté. La vue précédente est restaurée.";
}

function set_marcheur_panel_enabled(enabled) {
    if (!marcheurPanelElement) return;
    marcheurPanelElement.style.opacity = enabled ? "1" : "0.48";
    marcheurPanelElement.style.filter = enabled ? "none" : "grayscale(1)";
    marcheurPanelElement.style.pointerEvents = enabled ? "auto" : "none";
}

function refresh_route_flight_ui() {
    if (!flightStatusLabel)
        return;
    var state = m_huerta.get_route_flight_status();
    if (state.active) {
        flightEnterButton.disabled = false;
        flightEnterButton.textContent = "Quitter";
        flightStartButton.disabled = state.started || state.playing;
        flightPauseButton.disabled = !state.started || state.completed;
        flightStopButton.disabled = false;
        flightPauseButton.textContent = state.playing ? "Pause" : "Reprendre";
        if (state.completed) {
            flightStatusLabel.textContent = "Arrivée. Tu peux encore orienter la caméra, ou quitter le simulateur.";
        } else if (!state.started) {
            flightStatusLabel.textContent = "Simulateur prêt au départ. Règle les curseurs, puis démarre.";
        } else {
            var stateLabel = state.playing ? "Survol" : "En pause";
            flightStatusLabel.textContent = stateLabel + " : " +
                (state.distance / 1000).toFixed(2) + " / " +
                (state.total / 1000).toFixed(2) + " km";
        }
        return;
    }
    if (flightUiWasActive) {
        flightUiWasActive = false;
        set_marcheur_panel_enabled(true);
        if (flightUiTimer !== null) {
            window.clearInterval(flightUiTimer);
            flightUiTimer = null;
        }
        flightEnterButton.disabled = !(route_points_for_key(12) || []).length;
        flightStartButton.disabled = true;
        flightPauseButton.disabled = true;
        flightStopButton.disabled = true;
        flightPauseButton.textContent = "Pause";
        flightStatusLabel.textContent = "Survol terminé. La navigation est rétablie.";
        if (m_calques && m_calques.set_simulator_hidden)
            m_calques.set_simulator_hidden(false);
    }
}

function toggle_message_panel() {
    if (!messagePanel) return;
    messagePanel.style.display = messagePanel.style.display === "none" ? "block" : "none";
}

function log_message(message, level) {
    var stamp = new Date().toLocaleTimeString();
    var line = "[" + stamp + "] " + message;
    if (messageContent) {
        var entry = document.createElement("div");
        entry.textContent = line;
        messageContent.appendChild(entry);
        while (messageContent.childNodes.length > 3000)
            messageContent.removeChild(messageContent.firstChild);
        messageContent.scrollTop = messageContent.scrollHeight;
    }
    if (level === "error") console.error("HUERTA MARCHEUR:", message);
    else if (level === "warn") console.warn("HUERTA MARCHEUR:", message);
    else console.info("HUERTA MARCHEUR:", message);
}

function create_route_layer_row(parent, labelText, color, key) {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:5px;margin:3px 0;";
    var label = document.createElement("label");
    label.style.cssText = "display:flex;align-items:center;gap:5px;flex:1;cursor:pointer;";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.disabled = true;
    checkbox.addEventListener("change", function() {
        routeLayers[key].visible = checkbox.checked;
        if (key === 12)
            set_terrain_occlusion_visibility(checkbox.checked);
        else
            draw_route();
    }, false);
    var swatch = document.createElement("span");
    swatch.style.cssText = "display:inline-block;width:9px;height:9px;border-radius:50%;background:" + color + ";";
    var name = document.createElement("span");
    name.textContent = labelText;
    label.appendChild(checkbox);
    label.appendChild(swatch);
    label.appendChild(name);
    row.appendChild(label);
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Voir";
    button.disabled = true;
    button.style.cssText = "box-sizing:border-box;cursor:pointer;padding:2px 5px;white-space:normal;";
    button.addEventListener("click", function() {
        var points = route_points_for_key(key);
        if (!points || !points.length) return;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));
        var bounds = points_bounds(points);
        m_huerta.go_to_world(bounds.x, bounds.y, bounds.extent);
    }, false);
    row.appendChild(button);
    parent.appendChild(row);
    return {checkbox:checkbox, button:button, name:name, visible:true, available:false, key:key};
}

function route_points_for_key(key) {
    return calculatedRoutes[key];
}

function magnetize_route(points, threshold) {
    if (!points || points.length < 2)
        return [];
    threshold = Math.max(1, Math.min(20, Number(threshold) || 5));
    var result = [points[0].slice()];
    for (var i = 1; i < points.length; i++) {
        var previous = result[result.length - 1];
        var point = points[i];
        var dx = point[0] - previous[0];
        var dy = point[1] - previous[1];
        var dz = point[2] - previous[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= threshold) {
            previous[0] = (previous[0] + point[0]) * 0.5;
            previous[1] = (previous[1] + point[1]) * 0.5;
            previous[2] = (previous[2] + point[2]) * 0.5;
        } else {
            result.push(point.slice());
        }
    }
    return result;
}

function lightly_smooth_route(points) {
    if (!points || points.length < 3)
        return (points || []).map(function(point) { return point.slice(); });
    var result = [points[0].slice()];
    for (var i = 1; i < points.length - 1; i++) {
        result.push([
            (points[i - 1][0] + 2 * points[i][0] + points[i + 1][0]) / 4,
            (points[i - 1][1] + 2 * points[i][1] + points[i + 1][1]) / 4,
            (points[i - 1][2] + 2 * points[i][2] + points[i + 1][2]) / 4
        ]);
    }
    result.push(points[points.length - 1].slice());
    return result;
}

function build_final_route() {
    var magnetized = magnetize_route(
        calculatedRoutes[10],
        Number(magnetismInput ? magnetismInput.value : 3)
    );
    return m_huerta.get_smoothed_route_flight_path(
        magnetized,
        Number(splineInput ? splineInput.value : 1)
    );
}

function hide_legacy_route_layers() {
    if (terrainOcclusionFailed) return;
    [10, 11].forEach(function(key) {
        var layer = routeLayers[key];
        if (!layer || !layer.available || !layer.checkbox.checked) return;
        layer.checkbox.checked = false;
        layer.checkbox.dispatchEvent(new Event("change"));
    });
}

function show_progressive_route_layer() {
    // During calculation, show only the raw route as the terrain-aware 3D
    // line. The legacy 2D route layers remain hidden until the final route
    // replaces this temporary line.
    [10, 11].forEach(function(key) {
        var layer = routeLayers[key];
        if (!layer || !layer.available) return;
        layer.checkbox.checked = false;
        layer.checkbox.dispatchEvent(new Event("change"));
    });
    queue_progressive_route(calculatedRoutes[10]);
}

function clear_progressive_display_queue() {
    progressiveDisplayQueue = [];
    if (progressiveDisplayTimer !== null) {
        window.clearInterval(progressiveDisplayTimer);
        progressiveDisplayTimer = null;
    }
}

function queue_progressive_route(points) {
    if (!points || points.length < 2) return;
    progressiveDisplayQueue.push(points.slice());
    if (progressiveDisplayTimer !== null) return;
    progressiveDisplayTimer = window.setInterval(function() {
        if (!progressiveDisplayQueue.length) {
            window.clearInterval(progressiveDisplayTimer);
            progressiveDisplayTimer = null;
            return;
        }
        update_terrain_occlusion_line(progressiveDisplayQueue.shift());
    }, 160);
}

function update_terrain_occlusion_line(points) {
    if (!points || points.length < 2) {
        if (terrainOcclusionLine) {
            try {
                // A single vertex produces zero line segments and clears the
                // dynamic geometry, so the old 3D path cannot remain rendered.
                m_geometry.draw_line(terrainOcclusionLine, new Float32Array(3), false);
            } catch (error) {
                terrainOcclusionFailed = true;
            }
        }
        set_terrain_occlusion_visibility(false);
        return;
    }
    try {
        if (!terrainOcclusionLine) {
            terrainOcclusionLine = m_objects.create_line("huerta_marcheur_terrain_line");
            m_material.set_line_params(terrainOcclusionLine, {
                color: [0.12, 0.9, 0.96, 1],
                width: 5
            });
        }
        var positions = new Float32Array(points.length * 3);
        for (var i = 0; i < points.length; i++) {
            positions[i * 3] = points[i][0];
            positions[i * 3 + 1] = points[i][1];
            positions[i * 3 + 2] = points[i][2] + TERRAIN_LINE_CLEARANCE_M;
        }
        m_geometry.draw_line(terrainOcclusionLine, positions, false);
        terrainOcclusionFailed = false;
        set_terrain_occlusion_visibility(true);
    } catch (error) {
        terrainOcclusionFailed = true;
        set_terrain_occlusion_visibility(false);
        log_message("L’affichage masqué par le relief est indisponible ; le tracé classique reste affiché.", "warn");
    }
}

function clear_route_for_reselection() {
    calculatedRoutes[10] = [];
    calculatedRoutes[11] = [];
    calculatedRoutes[12] = [];
    partialRouteFlags[10] = false;
    update_route_summary(NaN);
    [10, 11, 12].forEach(function(key) {
        var layer = routeLayers[key];
        if (!layer) return;
        layer.checkbox.checked = false;
        layer.visible = false;
        layer.checkbox.dispatchEvent(new Event("change"));
    });
    set_terrain_occlusion_visibility(false);
    update_terrain_occlusion_line([]);
    draw_route();
}

function set_terrain_occlusion_visibility(visible) {
    if (!terrainOcclusionLine) return;
    try {
        m_scenes.change_visibility(terrainOcclusionLine, !visible);
    } catch (error) {
        terrainOcclusionFailed = true;
    }
}

function update_point_control_availability() {
    var calculating = routeCalculationActive;
    var slopeControlsEnabled = pickedPoints.length === 2 && !calculating;
    if (repeatRouteButton) {
        var flightActive = m_huerta.get_route_flight_status().active;
        repeatRouteButton.disabled = calculating || picking || pickedPoints.length < 2 || flightActive;
    }
    if (redAngleInput)
        redAngleInput.disabled = !slopeControlsEnabled;
    if (redMaxAngleInput)
        redMaxAngleInput.disabled = !slopeControlsEnabled;
}

function format_picked_point(point, label) {
    return label + " — EPSG:25830 X=" + (point[0] + UTM_OFFSET_X).toFixed(2) +
        " m, Y=" + (point[1] + UTM_OFFSET_Y).toFixed(2) +
        " m, altitude=" + point[2].toFixed(2) + " m";
}

function log_picked_points(contextLabel) {
    if (pickedPoints.length < 2) return;
    log_message(contextLabel + " — points de calcul :");
    pickedPoints.forEach(function(point, index) {
        var label = index === 0 ? "Départ" :
            (index === pickedPoints.length - 1 ? "Arrivée" : "Étape " + (index + 1));
        log_message(format_picked_point(point, label));
    });
}

function points_bounds(points) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(function(point) {
        minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
    });
    return {x:(minX + maxX) * 0.5, y:(minY + maxY) * 0.5,
        extent:Math.max(maxX - minX, maxY - minY, 80)};
}

function update_route_layer_controls() {
    [10, 11, 12].forEach(function(key) {
        var layer = routeLayers[key];
        if (!layer) return;
        var points = route_points_for_key(key);
        var available = !!(points && points.length > 1);
        layer.checkbox.disabled = !available;
        layer.button.disabled = !available;
        if (available && !layer.available) layer.checkbox.checked = key === 12;
        if (!available) layer.checkbox.checked = false;
        layer.available = available;
        layer.visible = available && layer.checkbox.checked;
        if (key === 10) {
            layer.name.textContent = "Marcheur";
        } else if (key === 11) {
            layer.name.textContent = "Marcheur lisse";
        } else {
            layer.name.textContent = "Marcheur aimanté";
        }
    });
    if (magnetismInput) {
        var magnetizedAvailable = !!(route_points_for_key(12) && route_points_for_key(12).length > 1);
        magnetismInput.disabled = !magnetizedAvailable;
    }
    if (splineInput)
        splineInput.disabled = !(route_points_for_key(12) && route_points_for_key(12).length > 1);
    update_terrain_occlusion_line(route_points_for_key(12));
    if (flightEnterButton) {
        var flightState = m_huerta.get_route_flight_status();
        var hasRoute = !!(
            route_points_for_key(12) && route_points_for_key(12).length > 1
        );
        var simulatorEntered = !!flightState.active || flightUiWasActive;
        flightAltitudeInput.disabled = !hasRoute || !simulatorEntered;
        flightSpeedInput.disabled = !hasRoute || !simulatorEntered;
        flightInclinationInput.disabled = !hasRoute || !simulatorEntered;
        flightPanelElement.style.opacity = hasRoute ? "1" : "0.55";
        flightPanelElement.style.filter = hasRoute ? "none" : "grayscale(1)";
        flightTitleLabel.textContent = hasRoute
            ? "Survol caméra"
            : "Calcule un trajet pour lancer le survol.";
        flightStatusLabel.textContent = hasRoute
            ? "Trajet disponible pour le survol."
            : "En attente d’un trajet.";
        // Une fois entré, ce même bouton devient « Quitter » et reste actif.
        flightEnterButton.disabled = !hasRoute || !!routeWorker;
        flightStartButton.disabled = !flightState.active || flightState.started || flightState.playing;
        flightPauseButton.disabled = !flightState.active || !flightState.started || !!flightState.completed;
        flightStopButton.disabled = !flightState.active;
    }
    update_point_control_availability();
    draw_route();
}

function ensure_canvas_listener() {
    var current = document.querySelector("#main_canvas_container canvas");
    if (current && current !== terrainCanvas) {
        terrainCanvas = current;
        terrainCanvas.addEventListener("click", on_terrain_click, true);
        terrainCanvas.addEventListener("mousedown", track_pick_pointer_down, true);
        terrainCanvas.addEventListener("mousemove", track_pick_pointer_move, true);
        window.addEventListener("mouseup", track_pick_pointer_up, true);
    }
}

function track_pick_pointer_down(event) {
    if (picking && event.button === 0)
        pickPointerStart = {x: event.clientX, y: event.clientY, dragged: false};
}

function track_pick_pointer_move(event) {
    if (!pickPointerStart) return;
    if (Math.hypot(event.clientX - pickPointerStart.x, event.clientY - pickPointerStart.y) > 3)
        pickPointerStart.dragged = true;
}

function track_pick_pointer_up() {
    if (!pickPointerStart) return;
    if (pickPointerStart.dragged) {
        ignoreNextTerrainClick = true;
        window.setTimeout(function() { ignoreNextTerrainClick = false; }, 0);
    }
    pickPointerStart = null;
}

function toggle_multi_point_selection() {
    if (m_huerta.get_route_flight_status().active) {
        pickStatus.textContent = "Arrête le survol avant de choisir d’autres points.";
        return;
    }
    if (routeCalculationActive) {
        cancel_route_calculation();
        pickButton.textContent = "Rechoisir plusieurs points";
        pickStatus.textContent = "Calcul annulé. Les points choisis restent sur la carte.";
        draw_route();
        return;
    }
    if (multiPointPicking) {
        if (pickedPoints.length === 0) {
            multiPointPicking = false;
            picking = false;
            m_huerta.set_terrain_pick_mode(false);
            pickButton.textContent = "Choisir plusieurs points";
            pickStatus.textContent = "Prêt. Choisis les points du trajet dans l’ordre.";
            draw_route();
            return;
        }
        if (pickedPoints.length < 2) {
            pickStatus.textContent = "En attente du point suivant. Ajoute un second point pour lancer le calcul.";
            return;
        }
        multiPointPicking = false;
        picking = false;
        m_huerta.set_terrain_pick_mode(false);
        multiPointRoute = true;
        pickButton.textContent = "Rechoisir plusieurs points";
        pickStatus.textContent = "Calcul du trajet en passant par les " + pickedPoints.length + " points, dans l’ordre…";
        update_point_control_availability();
        set_calculate_buttons_disabled(false);
        log_message("──────────────── Nouveaux points successifs choisis ────────────────");
        log_picked_points("Sélection multi-points");
        draw_route();
        calculate_route(selectedRedAngle, selectedRedMaxAngle);
        if (routeCalculationActive)
            pickButton.textContent = "Calcul en cours — annuler";
        return;
    }
    if (picking && !multiPointPicking) {
        picking = false;
        m_huerta.set_terrain_pick_mode(false);
    }
    if (routeCalculationActive) return;
    pickedPoints = [];
    multiPointRoute = true;
    clear_route_for_reselection();
    update_route_layer_controls();
    update_point_control_availability();
    picking = true;
    multiPointPicking = true;
    m_huerta.set_terrain_pick_mode(true);
    update_point_control_availability();
    pickingBusy = false;
    set_calculate_buttons_disabled(true);
    pickButton.textContent = "Terminer les points (0)";
    pickStatus.textContent = "Clique les points successifs du trajet, puis relance ce bouton pour calculer.";
    draw_route();
}

function on_terrain_click(event) {
    if (ignoreNextTerrainClick) {
        ignoreNextTerrainClick = false;
        return;
    }
    if (!picking || event.button !== 0 || pickingBusy)
        return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    pickingBusy = true;
    pickStatus.textContent = "Lecture du point…";
    m_huerta.pick_terrain(event.offsetX, event.offsetY, function(hit) {
        pickingBusy = false;
        if (!picking)
            return;
        if (!hit) {
            pickStatus.textContent = "Point non détecté. Réessaie sur le terrain.";
            return;
        }
        pickedPoints.push([Number(hit[0]), Number(hit[1]), Number(hit[2])]);
        update_point_control_availability();
        if (multiPointPicking) {
            if (pickedPoints.length === 1) {
                pickButton.textContent = "En attente du point suivant";
                pickStatus.textContent = "Point 1 choisi. Clique le point suivant.";
            } else {
                pickButton.textContent = "Terminer les points (" + pickedPoints.length + ")";
                pickStatus.textContent = "Point " + pickedPoints.length + " choisi. Continue dans l’ordre, puis relance ce bouton pour calculer.";
            }
            draw_route();
            return;
        }
        if (pickedPoints.length === 1) {
            pickStatus.textContent = "Ajoute au moins un second point.";
        } else {
            picking = false;
            m_huerta.set_terrain_pick_mode(false);
            pickStatus.textContent = "Points choisis. Relance le bouton pour calculer.";
            set_calculate_buttons_disabled(false);
            log_message("──────────────── Nouveaux points choisis ────────────────");
            log_picked_points("Sélection");
        }
        draw_route();
    });
}

function load_routing_data(callback) {
    var local = get_local_routing_data();
    if (local) {
        callback(null, local);
        return;
    }
    if (routingData) {
        callback(null, routingData);
        return;
    }
    var base = HuertaConfig.assets + "marcheur_tiles/";
    fetch(base + "manifest.json").then(function(response) {
        if (!response.ok) throw new Error("Le paquet de tuiles MNT n’est pas installé. Prépare le paquet de terrain avant le calcul.");
        return response.json();
    }).then(function(manifest) {
        return fetch(base + manifest.guide.file).then(function(response) {
            if (!response.ok) throw new Error("MNT-guide à 16 m inaccessible.");
            return response.arrayBuffer();
        }).then(function(buffer) {
            var guide = Object.assign({}, manifest.guide, {elevations: new Float32Array(buffer)});
            if (guide.elevations.length !== guide.width * guide.height)
                throw new Error("Les dimensions du MNT-guide sont incohérentes.");
            routingData = {manifest: manifest, guide: guide};
            callback(null, routingData);
        });
    }).catch(function(error) { callback(error); });
}

function set_calculate_buttons_disabled(disabled) {
    [10].forEach(function(angle) {
        if (calculateButtons[angle]) calculateButtons[angle].disabled = disabled;
    });
}

function format_elapsed_time(milliseconds) {
    var seconds = Math.max(0, Math.floor(milliseconds / 1000));
    var minutes = Math.floor(seconds / 60);
    var remainder = seconds % 60;
    if (!minutes) return seconds + " s";
    return minutes + " min" + (remainder ? " " + remainder + " s" : "");
}

function format_walking_duration(distanceKm, speedKmh) {
    var minutes = Math.round(distanceKm / speedKmh * 60);
    if (minutes < 1) return "moins d’une minute";
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    if (!hours) return minutes + " min";
    return hours + " h" + (remainder ? " " + remainder + " min" : "");
}

function measure_route_distance(points) {
    if (!points || points.length < 2)
        return NaN;
    var distance = 0;
    for (var i = 1; i < points.length; i++) {
        var dx = points[i][0] - points[i - 1][0];
        var dy = points[i][1] - points[i - 1][1];
        var dz = points[i][2] - points[i - 1][2];
        distance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return distance;
}

/* Estimation indépendante, portion par portion, basée sur une table symétrique
 * validée pour Huerta : la montée et la descente utilisent la même vitesse
 * selon l'angle absolu. Les valeurs intermédiaires sont interpolées.
 */
function slope_speed_kmh(angleDegrees) {
    var table = [
        [0, 5], [3, 5], [6, 4], [12, 3],
        [20, 0.7], [30, 0.3], [40, 0.3]
    ];
    var angle = Math.min(40, Math.abs(angleDegrees));
    for (var i = 1; i < table.length; i++) {
        if (angle <= table[i][0]) {
            var lower = table[i - 1];
            var upper = table[i];
            var ratio = (angle - lower[0]) / (upper[0] - lower[0]);
            return lower[1] + ratio * (upper[1] - lower[1]);
        }
    }
    return table[table.length - 1][1];
}

function estimate_slope_walking_seconds(points) {
    if (!points || points.length < 2)
        return NaN;
    var totalSeconds = 0;
    for (var i = 1; i < points.length; i++) {
        var dx = points[i][0] - points[i - 1][0];
        var dy = points[i][1] - points[i - 1][1];
        var dz = points[i][2] - points[i - 1][2];
        var horizontal = Math.sqrt(dx * dx + dy * dy);
        var distance = Math.sqrt(horizontal * horizontal + dz * dz);
        if (!Number.isFinite(distance) || distance <= 0)
            continue;
        var angleDegrees = Math.atan2(Math.abs(dz), horizontal) * 180 / Math.PI;
        var speedKmh = slope_speed_kmh(angleDegrees);
        var speedFactor = walkingSpeedFactorInput ? Number(walkingSpeedFactorInput.value) / 100 : 1;
        if (!Number.isFinite(speedFactor) || speedFactor <= 0) speedFactor = 1;
        speedKmh *= speedFactor;
        speedKmh = Math.max(0.25, Math.min(6, speedKmh));
        totalSeconds += distance / (speedKmh / 3.6);
    }
    return totalSeconds;
}

function update_route_summary(distanceMeters) {
    if (!routeSummary) return;
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
        routeDistanceLabel.textContent = "Distance : —";
        routeWalkingTimeLabel.textContent = "Marche estimée à 4–5 km/h : —";
        routeSlopeWalkingTimeLabel.textContent = "Marche selon la pente : —";
        routeSummary.style.display = "block";
        return;
    }
    var distanceKm = distanceMeters / 1000;
    routeDistanceLabel.textContent = "Distance : " + distanceKm.toFixed(2) + " km";
    routeWalkingTimeLabel.textContent = "Marche estimée à 4–5 km/h : " +
        format_walking_duration(distanceKm, 5) + " à " +
        format_walking_duration(distanceKm, 4);
    var slopeSeconds = estimate_slope_walking_seconds(calculatedRoutes[12]);
    routeSlopeWalkingTimeLabel.textContent = "Marche selon la pente : " +
        (Number.isFinite(slopeSeconds) ? format_walking_duration(distanceKm, distanceKm / (slopeSeconds / 3600)) : "—");
    routeSummary.style.display = "block";
}

function refresh_elapsed_indicator() {
    if (!elapsedLabel || !calculationStartedAt) return;
    var elapsed = Date.now() - calculationStartedAt;
    elapsedLabel.textContent = "Temps écoulé : " + format_elapsed_time(elapsed) +
        " / " + format_elapsed_time(calculationTimeLimitMs);
}

function start_elapsed_indicator(limitMs) {
    stop_elapsed_indicator(false);
    calculationStartedAt = Date.now();
    calculationTimeLimitMs = limitMs;
    elapsedPanel.style.display = "block";
    refresh_elapsed_indicator();
    elapsedTimer = window.setInterval(refresh_elapsed_indicator, 1000);
}

function stop_elapsed_indicator(showResult) {
    if (elapsedTimer !== null) {
        window.clearInterval(elapsedTimer);
        elapsedTimer = null;
    }
    if (calculationStartedAt && elapsedLabel) {
        refresh_elapsed_indicator();
    }
    calculationStartedAt = 0;
}

function calculate_route(angle, maxAngle) {
    if (m_huerta.get_route_flight_status().active)
        return;
    if (pickedPoints.length < 2 || routeCalculationActive || picking)
        return;
    // Refaire le calcul commence par effacer tous les anciens tracés,
    // notamment le résultat aimanté/lissé encore visible.
    clear_route_for_reselection();
    if (multiPointRoute && pickedPoints.length > 2) {
        calculate_multi_point_route(angle, maxAngle);
        return;
    }
    routeCalculationActive = true;
    clear_progressive_display_queue();
    pickButton.textContent = "Calcul en cours — annuler";
    var calculationId = ++routeCalculationId;
    var routeKey = 10;
    maxAngle = Number.isFinite(maxAngle) ? Math.max(angle, maxAngle) : angle;
    routeAngleRanges[routeKey] = {reference:angle, maximum:maxAngle};
    calculatedRoutes[10] = [];
    calculatedRoutes[11] = [];
    partialRouteFlags[10] = false;
    update_route_layer_controls();
    if (messagePanel) messagePanel.style.display = "block";
    var routeLabel = "rouge progressif";
    var timeLimitMs = Number(timeLimitInput.value) * 1000;
    update_route_summary(NaN);
    log_message("──────────────── Calcul " + routeLabel + " " + angle + "→" + maxAngle + "° ────────────────");
    log_message("Calcul autonome demandé. Pente de référence : " + angle + "° ; plafond accepté : " + maxAngle + "°. Temps maximal : " +
        timeLimitValue.textContent + ".");
    log_picked_points("Calcul autonome " + angle + "°");
    set_calculate_buttons_disabled(true);
    pickButton.disabled = false;
    timeLimitInput.disabled = true;
    redAngleInput.disabled = true;
    redMaxAngleInput.disabled = true;
    pickStatus.textContent = "Préparation du calcul…";
    start_elapsed_indicator(timeLimitMs);
    load_routing_data(function(loadError, data) {
        if (calculationId !== routeCalculationId || !routeCalculationActive)
            return;
        if (loadError) {
            routeCalculationActive = false;
            pickButton.textContent = "Rechoisir plusieurs points";
            stop_elapsed_indicator(false);
            log_message(loadError.message, "error");
            set_calculate_buttons_disabled(false);
            pickButton.disabled = false;
            timeLimitInput.disabled = false;
            redAngleInput.disabled = false;
            redMaxAngleInput.disabled = false;
            pickStatus.textContent = "Préparation impossible. Voir Messages.";
            return;
        }
        routeWorker = new Worker(HuertaConfig.worker);
        routeWorker.onmessage = function(event) {
            if (calculationId !== routeCalculationId || !routeCalculationActive)
                return;
            if (event.data.phase === "progress") {
                log_message(event.data.message);
                pickStatus.textContent = "Calcul en cours…";
                return;
            }
            if (event.data.phase === "route_reset") {
                calculatedRoutes[routeKey] = [];
                calculatedRoutes[11] = [];
                partialRouteFlags[routeKey] = false;
                log_message(event.data.angle + "° — nouvel essai : " + event.data.strategy + ".");
                update_route_layer_controls();
                return;
            }
            if (event.data.phase === "partial") {
                calculatedRoutes[routeKey] = event.data.coordinates.map(function(point) {
                    return is_local_routing() ? point.slice() :
                        [point[0] - UTM_OFFSET_X, point[1] - UTM_OFFSET_Y, point[2]];
                });
                calculatedRoutes[11] = [];
                partialRouteFlags[routeKey] = true;
                update_route_layer_controls();
                show_progressive_route_layer();
                draw_route();
                var partialText = event.data.angle + "° — tronçons validés : " +
                    event.data.completedSegments + "/" + event.data.segmentCount + ".";
                log_message(partialText);
                pickStatus.textContent = "Calcul en cours… " + event.data.angle + "° " +
                    event.data.completedSegments + "/" + event.data.segmentCount;
                return;
            }
            if (event.data.phase === "error") {
                log_message("Erreur du calculateur : " + event.data.error, "error");
                routeCalculationActive = false;
                stop_elapsed_indicator(false);
                routeWorker.terminate();
                routeWorker = null;
                set_calculate_buttons_disabled(false);
                pickButton.disabled = false;
                pickButton.textContent = "Rechoisir plusieurs points";
                timeLimitInput.disabled = false;
                redAngleInput.disabled = false;
                redMaxAngleInput.disabled = false;
                pickStatus.textContent = "Calcul interrompu. Voir Messages.";
                return;
            }
            var successfulDistance = null;
            event.data.results.forEach(function(item) {
                log_message(item.ok
                    ? item.angle + "° terminé : " + (item.length / 1000).toFixed(2) + " km, " +
                        item.coordinates.length + " points." +
                        (item.removedCrossings ? " " + item.removedCrossings +
                            " boucle(s) croisée(s) supprimée(s)." : "") +
                        (item.removedDeadEnds ? " " + item.removedDeadEnds +
                            " impasse(s) supprimée(s)." : "") +
                        (item.maxMargin ? " Marge de recherche max : " + item.maxMargin + " m." : "") +
                        (item.guideStrategy ? " Guide : " + item.guideStrategy + "." : "")
                    : item.angle + "° : " + item.error, item.ok ? "info" : "warn");
                if (item.ok && item.slopeRanges && item.slopeRanges.length) {
                    item.slopeRanges.forEach(function(range) {
                        log_message("Pente utilisée sur les tronçons-guide " + range.from +
                            (range.to !== range.from ? "–" + range.to : "") + " : " + range.angle + "°.");
                    });
                }
                if (item.ok) {
                    successfulDistance = item.length;
                    calculatedRoutes[routeKey] = item.coordinates.map(function(point) {
                        return is_local_routing() ? point.slice() :
                            [point[0] - UTM_OFFSET_X, point[1] - UTM_OFFSET_Y, point[2]];
                    });
                    partialRouteFlags[routeKey] = false;
                }
            });
            calculatedRoutes[11] = successfulDistance !== null
                ? m_huerta.get_smoothed_route_flight_path(calculatedRoutes[10]) : [];
            calculatedRoutes[12] = successfulDistance !== null ? build_final_route() : [];
            update_route_summary(measure_route_distance(calculatedRoutes[12]));
            stop_elapsed_indicator(true);
            routeWorker.terminate();
            routeWorker = null;
            routeCalculationActive = false;
            clear_progressive_display_queue();
            update_route_layer_controls();
            hide_legacy_route_layers();
            set_calculate_buttons_disabled(false);
            pickButton.disabled = false;
            pickButton.textContent = "Rechoisir plusieurs points";
            timeLimitInput.disabled = false;
            redAngleInput.disabled = false;
            redMaxAngleInput.disabled = false;
            log_message("Bilan : " + event.data.guideSegments + " tronçons-guide, " +
                event.data.loadedTiles + " tuiles lues, " +
                (event.data.loadedBytes / 1048576).toFixed(1) + " Mo, durée réelle " +
                (event.data.elapsedMs / 1000).toFixed(1) + " s sur " +
                timeLimitValue.textContent + " maximum.");
            var successCount = event.data.results.filter(function(item) { return item.ok; }).length;
            pickStatus.textContent = successCount
                ? ""
                : "Calcul incomplet. Détails dans Messages.";
            draw_route();
        };
        routeWorker.onerror = function(error) {
            if (calculationId !== routeCalculationId || !routeCalculationActive)
                return;
            log_message("Erreur du calculateur : " + error.message, "error");
            stop_elapsed_indicator(false);
            routeWorker.terminate();
            routeWorker = null;
            routeCalculationActive = false;
            set_calculate_buttons_disabled(false);
            pickButton.disabled = false;
            pickButton.textContent = "Rechoisir plusieurs points";
            timeLimitInput.disabled = false;
            redAngleInput.disabled = false;
            redMaxAngleInput.disabled = false;
            pickStatus.textContent = "Calcul interrompu. Voir Messages.";
        };
        routeWorker.postMessage(Object.assign({}, data, {
            angles: [angle],
            maximumAngle: maxAngle,
            start: pickedPoints[0], end: pickedPoints[1], offset: [UTM_OFFSET_X, UTM_OFFSET_Y],
            timeLimitMs: timeLimitMs}));
    });
}

function calculate_multi_point_route(angle, maxAngle) {
    if (m_huerta.get_route_flight_status().active || routeCalculationActive || pickedPoints.length < 3)
        return;
    routeCalculationActive = true;
    clear_progressive_display_queue();
    pickButton.textContent = "Calcul en cours — annuler";
    var calculationId = ++routeCalculationId;
    var points = pickedPoints.map(function(point) { return point.slice(); });
    var legCount = points.length - 1;
    maxAngle = Number.isFinite(maxAngle) ? Math.max(angle, maxAngle) : angle;
    routeAngleRanges[10] = {reference:angle, maximum:maxAngle};
    calculatedRoutes[10] = [];
    calculatedRoutes[11] = [];
    partialRouteFlags[10] = true;
    update_route_layer_controls();
    if (messagePanel) messagePanel.style.display = "block";
    var perLegLimitMs = Number(timeLimitInput.value) * 1000;
    var totalStartedAt = Date.now();
    var totalLength = 0;
    var totalGuideSegments = 0;
    var totalLoadedTiles = 0;
    var totalLoadedBytes = 0;
    var completedLegs = 0;
    var combinedCoordinates = [];
    var currentCoordinates = [];
    var failed = false;
    update_route_summary(NaN);
    log_message("──────────────── Calcul multi-points " + angle + "→" + maxAngle + "° ────────────────");
    log_message("Le trajet suivra les " + points.length + " points dans l’ordre du marquage.");
    log_picked_points("Étapes du calcul");
    set_calculate_buttons_disabled(true);
    pickButton.disabled = false;
    // Keep this control available during the calculation: clicking it cancels
    // the current route and starts a fresh ordered multi-point selection.
    pickButton.textContent = "Rechoisir plusieurs points";
    timeLimitInput.disabled = true;
    redAngleInput.disabled = true;
    redMaxAngleInput.disabled = true;
    start_elapsed_indicator(perLegLimitMs * legCount);

    function localize(coordinates) {
        return (coordinates || []).map(function(point) {
            return is_local_routing() ? point.slice() :
                [point[0] - UTM_OFFSET_X, point[1] - UTM_OFFSET_Y, point[2]];
        });
    }

    function appendCoordinates(target, additions) {
        var result = target.slice();
        var start = result.length && additions.length ? 1 : 0;
        return result.concat(additions.slice(start));
    }

    function refreshCombinedRoute() {
        calculatedRoutes[10] = appendCoordinates(combinedCoordinates, currentCoordinates);
        calculatedRoutes[11] = m_huerta.get_smoothed_route_flight_path(calculatedRoutes[10]);
        calculatedRoutes[12] = build_final_route();
        update_route_layer_controls();
        if (routeCalculationActive)
            show_progressive_route_layer();
        draw_route();
    }

    function finishMultiPointRoute(success) {
        if (calculationId !== routeCalculationId) return;
        failed = !success;
        if (routeWorker) {
            routeWorker.terminate();
            routeWorker = null;
        }
        routeCalculationActive = false;
        stop_elapsed_indicator(true);
        clear_progressive_display_queue();
        refreshCombinedRoute();
        var visibleCoordinates = calculatedRoutes[12];
        var measuredLength = measure_route_distance(visibleCoordinates);
        update_route_summary(measuredLength);
        partialRouteFlags[10] = failed;
        update_route_layer_controls();
        hide_legacy_route_layers();
        set_calculate_buttons_disabled(false);
        pickButton.disabled = false;
        pickButton.textContent = "Rechoisir plusieurs points";
        timeLimitInput.disabled = false;
        redAngleInput.disabled = false;
        redMaxAngleInput.disabled = false;
        var elapsedSeconds = ((Date.now() - totalStartedAt) / 1000).toFixed(1);
        log_message("Bilan multi-points : " + completedLegs + "/" + legCount +
            " étapes, " + totalGuideSegments + " tronçons-guide, " + totalLoadedTiles +
            " tuiles lues, " + (totalLoadedBytes / 1048576).toFixed(1) +
            " Mo, durée réelle " + elapsedSeconds + " s.");
        pickStatus.textContent = success
            ? "Trajet terminé en suivant les " + points.length + " points."
            : "Trajet partiel : blocage entre les points " + (completedLegs + 1) +
                " et " + (completedLegs + 2) + ". Voir Messages.";
        draw_route();
    }

    function runLeg(index) {
        if (calculationId !== routeCalculationId || !routeCalculationActive) return;
        if (index >= legCount) {
            finishMultiPointRoute(true);
            return;
        }
        currentCoordinates = [];
        refreshCombinedRoute();
        log_message("Étape " + (index + 1) + "/" + legCount + " : calcul entre les points " +
            (index + 1) + " et " + (index + 2) + ".");
        routeWorker = new Worker(HuertaConfig.worker);
        routeWorker.onmessage = function(event) {
            if (calculationId !== routeCalculationId || !routeCalculationActive) return;
            var message = event.data;
            if (message.phase === "progress") {
                log_message("Étape " + (index + 1) + "/" + legCount + " — " + message.message);
                pickStatus.textContent = "Calcul de l’étape " + (index + 1) + "/" + legCount + "…";
                return;
            }
            if (message.phase === "route_reset") {
                currentCoordinates = [];
                refreshCombinedRoute();
                return;
            }
            if (message.phase === "partial") {
                currentCoordinates = localize(message.coordinates);
                refreshCombinedRoute();
                return;
            }
            if (message.phase === "error") {
                log_message("Étape " + (index + 1) + " : " + message.error, "error");
                finishMultiPointRoute(false);
                return;
            }
            if (message.phase !== "done") return;
            totalLoadedTiles += Number(message.loadedTiles) || 0;
            totalLoadedBytes += Number(message.loadedBytes) || 0;
            totalGuideSegments += Number(message.guideSegments) || 0;
            var result = message.results && message.results[0];
            if (!result || !result.ok) {
                if (result && result.coordinates) currentCoordinates = localize(result.coordinates);
                log_message("Étape " + (index + 1) + " : " +
                    (result && result.error ? result.error : "aucun trajet trouvé."), "warn");
                refreshCombinedRoute();
                finishMultiPointRoute(false);
                return;
            }
            totalLength += Number(result.length) || 0;
            currentCoordinates = localize(result.coordinates);
            combinedCoordinates = appendCoordinates(combinedCoordinates, currentCoordinates);
            currentCoordinates = [];
            completedLegs++;
            log_message("Étape " + (index + 1) + "/" + legCount + " terminée : " +
                (result.length / 1000).toFixed(2) + " km.");
            refreshCombinedRoute();
            routeWorker.terminate();
            routeWorker = null;
            runLeg(index + 1);
        };
        routeWorker.onerror = function(error) {
            if (calculationId !== routeCalculationId || !routeCalculationActive) return;
            log_message("Étape " + (index + 1) + " : erreur du calculateur — " + error.message, "error");
            finishMultiPointRoute(false);
        };
        routeWorker.postMessage(Object.assign({}, routingData, {
            angles:[angle], maximumAngle:maxAngle,
            start:points[index], end:points[index + 1], offset:[UTM_OFFSET_X, UTM_OFFSET_Y],
            timeLimitMs:perLegLimitMs}));
    }

    load_routing_data(function(loadError, data) {
        if (calculationId !== routeCalculationId || !routeCalculationActive) return;
        if (loadError) {
            log_message(loadError.message, "error");
            finishMultiPointRoute(false);
            return;
        }
        routingData = data;
        runLeg(0);
    });
}

function cancel_route_calculation() {
    if (!routeCalculationActive)
        return;
    routeCalculationId++;
    routeCalculationActive = false;
    clear_progressive_display_queue();
    if (routeWorker) {
        routeWorker.terminate();
        routeWorker = null;
    }
    stop_elapsed_indicator(false);
    calculatedRoutes[10] = [];
    calculatedRoutes[11] = [];
    calculatedRoutes[12] = [];
    partialRouteFlags[10] = false;
    update_route_summary(NaN);
    update_route_layer_controls();
    set_calculate_buttons_disabled(true);
    if (pickButton) {
        pickButton.disabled = false;
        pickButton.textContent = "Rechoisir plusieurs points";
    }
    timeLimitInput.disabled = false;
    update_point_control_availability();
    pickStatus.textContent = "Calcul annulé. Choisis le premier point.";
    draw_route();
}

function draw_route() {
    ensure_canvas_listener();
    if (!canvas || !context)
        return;
    var width = window.innerWidth;
    var height = window.innerHeight;
    var ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    var camera = m_scenes.get_active_camera();
    var view = document.querySelector("#main_canvas_container canvas");
    if (!camera || !view)
        return;
    var rect = view.getBoundingClientRect();
    if (routeLayers[10] && routeLayers[10].visible)
        draw_projected_line(calculatedRoutes[10], camera, rect, "#bd473b", 5, true);
    if (routeLayers[11] && routeLayers[11].visible)
        draw_projected_line(calculatedRoutes[11], camera, rect, "#c77dff", 5, true);
    var flightState = m_huerta.get_route_flight_status();
    if (!flightState.active || !flightState.started) {
        pickedPoints.forEach(function(point, index) {
            var label = index === 0 ? "Départ" :
                (index === pickedPoints.length - 1 ? "Arrivée" : "Étape " + (index + 1));
            draw_projected_marker(point, camera, rect, "#e2a52b", label);
        });
    }
}

function draw_projected_line(points, camera, rect, color, width, smoothCorners) {
    if (!points || points.length < 2) return;
    var projected = new Float32Array(3);
    var worldPoint = new Float32Array(3);
    context.beginPath();
    var penDown = false;
    var visibleRun = [];
    for (var i = 0; i < points.length; i++) {
        worldPoint[0] = points[i][0];
        worldPoint[1] = points[i][1];
        worldPoint[2] = points[i][2];
        var screen = m_camera.project_point(camera, worldPoint, projected);
        if (!screen || screen[2] < 0 || screen[2] > 1) {
            if (smoothCorners && visibleRun.length > 1)
                draw_smooth_subpath(visibleRun);
            visibleRun = [];
            penDown = false;
            continue;
        }
        var x = rect.left + screen[0], y = rect.top + screen[1];
        if (smoothCorners) {
            visibleRun.push([x, y]);
        } else if (penDown) {
            context.lineTo(x, y);
        } else {
            context.moveTo(x, y);
            penDown = true;
        }
    }
    if (smoothCorners && visibleRun.length > 1)
        draw_smooth_subpath(visibleRun);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowColor = "rgba(0,0,0,.9)";
    context.shadowBlur = 3;
    context.stroke();
}

function draw_smooth_subpath(points) {
    context.moveTo(points[0][0], points[0][1]);
    if (points.length === 2) {
        context.lineTo(points[1][0], points[1][1]);
        return;
    }
    var cornerRatio = 0.18;
    for (var i = 1; i < points.length - 1; i++) {
        var previous = points[i - 1];
        var corner = points[i];
        var next = points[i + 1];
        var entryX = corner[0] + (previous[0] - corner[0]) * cornerRatio;
        var entryY = corner[1] + (previous[1] - corner[1]) * cornerRatio;
        var exitX = corner[0] + (next[0] - corner[0]) * cornerRatio;
        var exitY = corner[1] + (next[1] - corner[1]) * cornerRatio;
        context.lineTo(entryX, entryY);
        context.quadraticCurveTo(corner[0], corner[1], exitX, exitY);
    }
    context.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
}

function draw_projected_marker(point, camera, rect, color, label) {
    if (!point) return;
    var projected = new Float32Array(3);
    var screen = m_camera.project_point(camera, new Float32Array(point), projected);
    if (!screen || screen[2] < 0 || screen[2] > 1) return;
    var x = rect.left + screen[0], y = rect.top + screen[1];
    context.beginPath(); context.arc(x, y, 7, 0, Math.PI * 2);
    context.fillStyle = color; context.fill();
    context.strokeStyle = "#fff"; context.lineWidth = 2; context.stroke();
    context.font = "bold 13px Arial"; context.fillStyle = "#fff";
    context.strokeStyle = "#17232d"; context.lineWidth = 3;
    context.strokeText(label, x + 10, y - 8); context.fillText(label, x + 10, y - 8);
}

// Expose the final route to interface integrations such as the Google Earth
// KML exporter. Coordinates remain in the local terrain frame; the exporter
// is responsible for converting them to geographic coordinates.
exports.get_export_route = function() {
    var points = route_points_for_key(12);
    if (!points || points.length < 2)
        return [];
    return points.map(function(point) {
        return [Number(point[0]), Number(point[1]), Number(point[2])];
    });
};

function init() {
    create_interface();
    try { window.localStorage.removeItem("huerta_marcheur_reference_path"); }
    catch (error) { /* Le stockage local peut être indisponible. */ }
    update_route_layer_controls();
    m_main.append_loop_cb(draw_route);
}

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, false);
else
    init();

});

HuertaRuntime.require("huerta_marcheur");
