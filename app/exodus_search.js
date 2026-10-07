"use strict";

// Manual place search only; coordinates never leave the browser.
(() => {
    const cache = new Map();
    const t = text => window.HuertaI18n?.t ? window.HuertaI18n.t(text) : text;
    function coordinates(text) {
        const value = text.trim().replace(/^geo:/i, "");
        const number = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
        let match = value.match(new RegExp(`^(${number})\\s*(?:,|;|\\s)\\s*(${number})$`));
        if (!match && value.includes(";")) {
            match = value.replace(/,/g, ".").match(new RegExp(`^(${number})\\s*;\\s*(${number})$`));
        }
        if (!match) return null;
        const latitude = Number(match[1]), longitude = Number(match[2]);
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
        return {latitude, longitude, name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, source: "gps"};
    }
    function places(data) {
        if (!Array.isArray(data?.features)) throw new Error("Invalid place response");
        const unique = new Set();
        return data.features.flatMap(feature => {
            const point = feature.geometry?.coordinates, p = feature.properties;
            if (feature.geometry?.type !== "Point" || !p || !Array.isArray(point)) return [];
            const [longitude, latitude] = point;
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
            const name = [p.name, p.city, p.county, p.state, p.country]
                .filter((s, i, all) => typeof s === "string" && s && all.indexOf(s) === i).join(", ");
            if (!name) return [];
            const key = `${name}/${latitude}/${longitude}`;
            if (unique.has(key)) return [];
            unique.add(key);
            return [{name, latitude, longitude, source: "photon"}];
        }).slice(0, 5);
    }
    function create(onSelect) {
        const panel = document.createElement("section");
        panel.id = "exodus_place_search";
        panel.setAttribute("aria-label", "Choisir un lieu sur Terre");
        const title = document.createElement("h2"); title.textContent = "Terre";
        const form = document.createElement("form");
        const label = document.createElement("label");
        label.htmlFor = "exodus_place_query"; label.textContent = "Commune ou coordonnées GPS";
        const row = document.createElement("div"); row.className = "exodus-search-row";
        const input = document.createElement("input");
        input.id = "exodus_place_query"; input.type = "text"; input.maxLength = 180;
        input.placeholder = "Huertahernando, Espagne ou 40.827897, -2.288334";
        input.autocomplete = "off"; input.spellcheck = false;
        const button = document.createElement("button"); button.type = "submit"; button.textContent = "Rechercher";
        row.append(input, button);
        const help = document.createElement("p"); help.textContent = "GPS : latitude, longitude en degrés décimaux.";
        input.setAttribute("aria-describedby", "exodus_search_help"); help.id = "exodus_search_help";
        const status = document.createElement("p"); status.setAttribute("role", "status");
        const list = document.createElement("ul"); list.id = "exodus_search_results";
        list.setAttribute("aria-label", "Lieux trouvés");
        const selected = document.createElement("p"); selected.id = "exodus_selected_place"; selected.hidden = true;
        form.append(label, row, help);
        panel.append(title, form, status, list, selected);
        document.body.appendChild(panel);
        let controller = null, sequence = 0, active = false, busy = false, lastRequest = -Infinity, configuration = null;
        function choose(place) {
            onSelect(place);
            selected.hidden = false;
            selected.textContent = `${t("Lieu choisi :")} ${place.name}` +
                (place.source === "gps" ? "" : ` · ${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`);
            list.replaceChildren(); status.textContent = t("Le repère indique le lieu choisi sur le globe.");
        }
        function show(results) {
            list.replaceChildren();
            status.textContent = t(results.length ? "Choisissez un lieu dans la liste." : "Aucun lieu trouvé. Précisez la région ou le pays, ou saisissez des coordonnées GPS.");
            for (const place of results) {
                const item = document.createElement("li"), result = document.createElement("button");
                result.type = "button"; result.textContent = place.name;
                result.addEventListener("click", () => choose(place));
                item.appendChild(result); list.appendChild(item);
            }
        }
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (!active || busy) return;
            const query = input.value.trim();
            if (!query) { status.textContent = t("Saisissez une commune ou des coordonnées GPS."); return; }
            const point = coordinates(query);
            if (point) { choose(point); return; }
            if (/^(?:geo:)?[+\d.\-,;\s]+$/i.test(query)) {
                status.textContent = t("Coordonnées invalides : latitude de −90 à 90, longitude de −180 à 180."); return;
            }
            const key = `${window.HuertaI18n?.language || "fr"}/${query.toLocaleLowerCase()}`;
            if (cache.has(key)) { show(cache.get(key)); return; }
            if (performance.now() - lastRequest < (configuration?.intervalMs || 1500)) {
                status.textContent = t("Patientez un instant avant une nouvelle recherche."); return;
            }
            const current = ++sequence;
            controller = new AbortController();
            const requestController = controller;
            busy = true; button.disabled = true; list.replaceChildren();
            status.textContent = t("Recherche du lieu…");
            const timeout = setTimeout(() => requestController.abort(), configuration?.timeoutMs || 12000);
            try {
                if (!configuration) {
                    const configResponse = await fetch("earth-search.json", {signal: requestController.signal, cache: "no-cache"});
                    if (!configResponse.ok) throw new Error("Search configuration unavailable");
                    configuration = await configResponse.json();
                }
                const url = new URL(configuration.endpoint, location.href);
                url.searchParams.set("q", query); url.searchParams.set("limit", "5");
                url.searchParams.append("osm_tag", "place");
                url.searchParams.append("osm_tag", "boundary:administrative");
                const language = window.HuertaI18n?.language;
                if (["fr", "en", "de"].includes(language)) url.searchParams.set("lang", language);
                lastRequest = performance.now();
                const response = await fetch(url, {signal: requestController.signal, credentials: "omit"});
                if (!response.ok) throw new Error(`Place service ${response.status}`);
                const results = places(await response.json());
                if (current !== sequence || !active) return;
                if (cache.size >= 32) cache.delete(cache.keys().next().value);
                cache.set(key, results); show(results);
            } catch (_) {
                if (current === sequence && active) status.textContent = t("La recherche par nom est temporairement indisponible. Réessayez ou saisissez des coordonnées GPS.");
            } finally {
                clearTimeout(timeout);
                if (current === sequence) { busy = false; button.disabled = false; controller = null; }
            }
        });
        return {setActive(value) {
            active = value; panel.inert = !value;
            if (!value) {
                sequence++; controller?.abort(); controller = null;
                if (busy) status.textContent = "";
                busy = false; button.disabled = false;
            }
        }};
    }
    window.ExodusPlaceSearch = {coordinates, places, create};
})();
