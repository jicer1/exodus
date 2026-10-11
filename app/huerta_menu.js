"use strict";

(function() {

    function create_menu() {

        if (document.getElementById("huerta_menu"))
            return;

        var menu = document.createElement("div");
        menu.id = "huerta_menu";
        menu.style.position = "fixed";
        menu.style.top = "15px";
        menu.style.right = "15px";
        menu.style.zIndex = "10000";
        menu.style.fontFamily = "Arial, sans-serif";

        var button = document.createElement("button");
        button.type = "button";
        button.textContent = "Google Earth — pivot";
        button.title = "Ouvrir Google Earth à la position du dernier pivot";
        button.style.padding = "9px 12px";
        button.style.border = "1px solid rgba(255,255,255,0.55)";
        button.style.borderRadius = "4px";
        button.style.background = "rgba(25, 35, 45, 0.9)";
        button.style.color = "#fff";
        button.style.fontSize = "14px";
        button.style.cursor = "pointer";

        var status = document.createElement("div");
        status.style.marginTop = "5px";
        status.style.padding = "4px 6px";
        status.style.background = "rgba(0, 0, 0, 0.65)";
        status.style.color = "#fff";
        status.style.fontSize = "11px";
        status.style.textAlign = "right";
        status.textContent = "Définis un pivot avec le clic milieu ou droit";

        button.addEventListener("click", function() {

            var navigation = HuertaRuntime.require("huerta_webgl_main");
            var geodesy = HuertaRuntime.require("huerta_hud");
            var pivot = navigation.get_pivot();

            if (!pivot) {
                status.textContent = "Aucun pivot : clique sur le terrain d'abord";
                return;
            }

            // Même conversion que les coordonnées GPS affichées dans le HUD.
            var gps = geodesy.world_to_gps(pivot[0], pivot[1]);
            var lat = gps.lat.toFixed(6);
            var lon = gps.lon.toFixed(6);
            var url = "https://earth.google.com/web/search/" + lat + "," + lon;

            status.textContent = "Ouverture du pivot : " + lat + ", " + lon;
            window.open(url, "_blank", "noopener,noreferrer");
        }, false);

        var exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = "Google Earth + tracé KML";
        exportButton.title = "Ouvrir Google Earth au départ et télécharger le tracé";
        exportButton.style.display = "block";
        exportButton.style.marginTop = "5px";
        exportButton.style.width = "100%";
        exportButton.style.padding = "7px 10px";
        exportButton.style.border = "1px solid rgba(255,255,255,0.55)";
        exportButton.style.borderRadius = "4px";
        exportButton.style.background = "rgba(25, 35, 45, 0.9)";
        exportButton.style.color = "#fff";
        exportButton.style.fontSize = "12px";
        exportButton.style.cursor = "pointer";

        function escape_xml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&apos;");
        }

        exportButton.addEventListener("click", function() {
            var marcheur;
            try {
                marcheur = HuertaRuntime.require("huerta_marcheur");
            } catch (error) {
                status.textContent = "Module du marcheur indisponible";
                return;
            }
            var geodesy = HuertaRuntime.require("huerta_hud");

            var route = marcheur.get_export_route();
            if (!route || route.length < 2) {
                status.textContent = "Calcule un trajet avant l’export";
                return;
            }

            var coordinates = [];
            for (var i = 0; i < route.length; i++) {
                var gpsPoint = geodesy.world_to_gps(route[i][0], route[i][1]);
                // The terrain elevation in Huerta is local. Let Google Earth
                // drape the line on its own terrain model instead of treating
                // local scene Z values as absolute sea-level altitude.
                coordinates.push(gpsPoint.lon.toFixed(7) + "," + gpsPoint.lat.toFixed(7) + ",0");
            }

            var startGps = geodesy.world_to_gps(route[0][0], route[0][1]);
            var earthUrl = "https://earth.google.com/web/search/" +
                startGps.lat.toFixed(6) + "," + startGps.lon.toFixed(6);
            window.open(earthUrl, "_blank", "noopener,noreferrer");

            var kml = '<?xml version="1.0" encoding="UTF-8"?>' +
                '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>' +
                '<name>Huerta Babylone — tracé du marcheur</name>' +
                '<Placemark><name>Départ du marcheur</name>' +
                '<Point><altitudeMode>clampToGround</altitudeMode><coordinates>' +
                coordinates[0] + '</coordinates></Point></Placemark>' +
                '<Placemark><name>Trajet du marcheur</name>' +
                '<Style><LineStyle><color>ff473bbd</color><width>5</width></LineStyle></Style>' +
                '<LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>' +
                '<coordinates>' + coordinates.join(" ") + '</coordinates></LineString>' +
                '</Placemark></Document></kml>';
            var blob = new Blob([kml], {type: "application/vnd.google-earth.kml+xml;charset=utf-8"});
            var url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = url;
            link.download = "huerta-babylone-trace.kml";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
            status.textContent = "Google Earth ouvert au départ — KML dans Téléchargements : huerta-babylone-trace.kml";
        }, false);

        menu.appendChild(button);
        menu.appendChild(exportButton);
        menu.appendChild(status);
        document.body.appendChild(menu);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", create_menu, false);
    } else {
        create_menu();
    }

})();
