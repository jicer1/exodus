"use strict";

// Geographic quadtree: two roots, west/east; y increases from north to south.
window.createExodusTiles = function (B, scene, camera, world, overviewMaterial, report) {
    const R = world.displayRadius, MAX_LEVEL = 3, CACHE_LIMIT = 96, MAX_REQUESTS = 4;
    const tiles = new Map(), cache = new Map();
    let active = false, inflight = 0, generation = 0, lastUpdate = -Infinity;
    let wanted = new Set(), needed = new Set(), queue = [], gamma = 2.1;
    let remoteRetryAt = 0;
    // Continuous EOX pyramid: continental views through to the existing detail.
    // Levels below 3 only locate patches; the local NASA imagery covers the globe.
    const remote = {id: "eox-global", remote: true, west: -180, north: 90,
        span: 180, minLevel: 3, maxLevel: 13, tileSize: 256, border: 0};
    const radians = Math.PI / 180;
    // Draw coarse imagery first and fine imagery last. Polygon depth bias
    // depends on triangle slope and can pull a coarse patch in front at close zoom.
    scene.setRenderingOrder(1, (a, b) =>
        a.getMesh().metadata.exodusImageOrder - b.getMesh().metadata.exodusImageOrder);

    function tile(z, x, y, source = null) {
        const coordinates = `${z}/${x}/${y}`;
        const key = source ? `${source.id}/${coordinates}` : coordinates;
        if (tiles.has(key)) return tiles.get(key);
        const columns = 2 ** (z + 1), rows = 2 ** z;
        const span = source ? source.span / 2 ** z : 180 / rows;
        const west = source ? source.west + x * span : -180 + x * 360 / columns;
        const north = source ? source.north - y * span : 90 - y * 180 / rows;
        const centre = B.Vector3.FromArray(world.geographicToPosition(north - span / 2, west + span / 2));
        // Conservative angular cap enclosing every point in the lat/lon patch.
        const cap = Math.min(Math.PI, span * radians);
        const descriptor = {key, z, x, y, west, north, span, centre, cap, source,
            path: source?.remote
                ? `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless/default/WGS84/${z}/${y}/${x}.jpg`
                : `${source ? source.path : "assets/earth-tiles"}/${coordinates}.jpg`,
            bound: 2 * R * Math.sin(cap / 2)};
        tiles.set(key, descriptor);
        return descriptor;
    }
    function children(t) {
        return [tile(t.z + 1, t.x * 2, t.y * 2, t.source), tile(t.z + 1, t.x * 2 + 1, t.y * 2, t.source),
            tile(t.z + 1, t.x * 2, t.y * 2 + 1, t.source), tile(t.z + 1, t.x * 2 + 1, t.y * 2 + 1, t.source)];
    }
    const roots = [tile(0, 0, 0), tile(0, 1, 0)];
    roots.push(tile(0, 0, 0, remote), tile(0, 1, 0, remote));

    function select(detailThreshold = 384) {
        const eye = camera.position, eyeRadius = eye.length();
        const horizon = Math.acos(Math.min(1, R / eyeRadius));
        const planes = B.Frustum.GetPlanes(camera.getTransformationMatrix());
        const screenScale = scene.getEngine().getRenderHeight() / (2 * Math.tan(camera.fov / 2));
        // When the viewport is entirely over the surface, clip against its
        // geographic footprint too. Large bounding spheres alone include many
        // off-screen country tiles and waste the detail budget near the ground.
        const referenceLon = Math.atan2(eye.y, eye.x) / radians;
        const unwrap = lon => referenceLon + ((lon - referenceLon + 540) % 360) - 180;
        const latitudes = [], longitudes = [];
        let footprint = true;
        const width = scene.getEngine().getRenderWidth(), height = scene.getEngine().getRenderHeight();
        const forward = camera.getForwardRay().direction.normalize();
        const right = B.Vector3.Cross(forward, camera.upVector).normalize();
        const screenUp = B.Vector3.Cross(right, forward).normalize();
        const half = Math.tan(camera.fov / 2);
        for (const x of [0, .5, 1]) for (const y of [0, .5, 1]) {
            // Direction arithmetic stays in double precision, like navigation.
            const direction = forward.add(right.scale((2 * x - 1) * half * width / height))
                .add(screenUp.scale((1 - 2 * y) * half)).normalize();
            const b = B.Vector3.Dot(eye, direction);
            const discriminant = b * b - (eyeRadius * eyeRadius - R * R);
            const distance = discriminant >= 0 ? -b - Math.sqrt(discriminant) : -1;
            if (distance < 0) { footprint = false; continue; }
            const point = eye.add(direction.scale(distance));
            latitudes.push(Math.asin(Math.max(-1, Math.min(1, point.z / R))) / radians);
            longitudes.push(unwrap(Math.atan2(point.y, point.x) / radians));
        }
        const latMin = Math.min(...latitudes) - .01, latMax = Math.max(...latitudes) + .01;
        const lonMin = Math.min(...longitudes) - .01, lonMax = Math.max(...longitudes) + .01;
        const selected = new Set();
        function visit(t) {
            if (footprint && t.source?.remote && t.z >= remote.minLevel) {
                const lonCentre = unwrap(t.west + t.span / 2);
                if (t.north < latMin || t.north - t.span > latMax ||
                    lonCentre + t.span / 2 < lonMin || lonCentre - t.span / 2 > lonMax) return;
            }
            const separation = Math.acos(Math.max(-1, Math.min(1,
                B.Vector3.Dot(eye, t.centre) / (eyeRadius * R))));
            if (separation > horizon + t.cap) return;
            if (planes.some(p => B.Vector3.Dot(p.normal, t.centre) + p.d < -t.bound)) return;
            selected.add(t.key);
            const distance = Math.max(eyeRadius - R, B.Vector3.Distance(eye, t.centre) - t.bound, .001);
            const pixels = R * t.span * radians * screenScale / distance;
            if (t.source?.remote && t.z < remote.minLevel) {
                if (pixels / 2 ** (remote.minLevel - t.z) < detailThreshold / 4) {
                    selected.delete(t.key); return;
                }
                children(t).forEach(visit);
                return;
            }
            // Keep parents available while finer children arrive.
            if (t.source && pixels < detailThreshold / 4) { selected.delete(t.key); return; }
            const threshold = t.source ? detailThreshold : 720;
            if (t.z < (t.source?.maxLevel ?? MAX_LEVEL) && pixels > threshold) children(t).forEach(visit);
        }
        roots.forEach(visit);
        return selected;
    }

    function buildMesh(t) {
        const mesh = new B.Mesh(`Earth tile ${t.key}`, scene), geometry = new B.VertexData();
        // Match the overview grid exactly so parent/child surfaces coincide.
        const steps = t.source ? Math.max(2, 32 / 2 ** (t.z - (t.source.minLevel || 0))) : 192 / 2 ** t.z, stride = steps + 1;
        const positions = [], uvs = [], indices = [];
        const size = t.source ? t.source.tileSize : 512;
        const padding = t.source ? t.source.border : 2;
        const border = padding / (size + padding * 2), extent = size / (size + padding * 2);
        for (let row = 0; row <= steps; row++) {
            for (let col = 0; col <= steps; col++) {
                positions.push(...world.geographicToPosition(t.north - row * t.span / steps,
                    t.west + col * t.span / steps));
                uvs.push(border + extent * col / steps, border + extent * (1 - row / steps));
                if (row < steps && col < steps) {
                    const a = row * stride + col, b = a + stride;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            }
        }
        geometry.positions = positions; geometry.uvs = uvs; geometry.indices = indices;
        geometry.applyToMesh(mesh);
        mesh.isPickable = false;
        mesh.renderingGroupId = 1;
        mesh.metadata = {exodusImageOrder: (t.source ? 100 : 0) + t.z};
        mesh.setEnabled(false);
        return mesh;
    }
    function dispose(entry) {
        entry.mesh.dispose(); entry.material.dispose(); entry.texture.dispose();
        cache.delete(entry.tile.key);
    }
    function makeRoom() {
        if (cache.size < CACHE_LIMIT) return true;
        const unused = [...cache.values()].filter(e => !needed.has(e.tile.key) && e.status !== "loading")
            .sort((a, b) => a.used - b.used);
        if (!unused.length) return false;
        dispose(unused[0]);
        return true;
    }
    function pump() {
        if (!active) return;
        while (inflight < MAX_REQUESTS && queue.length) {
            const t = queue.shift();
            if (!needed.has(t.key) || cache.has(t.key)) continue;
            if (t.source?.remote && performance.now() < remoteRetryAt) continue;
            if (!makeRoom()) { queue.unshift(t); break; }
            const mesh = buildMesh(t), material = overviewMaterial.clone(`Earth image ${t.key}`);
            material.setFloat("brightnessGamma", gamma);
            // Group 1 starts with a clear depth buffer. Imagery paints over the
            // overview in level order without depth writes between parent/child.
            material.zOffset = 0;
            material.disableDepthWrite = true;
            mesh.material = material;
            const entry = {tile: t, mesh, material, texture: null, status: "loading", used: generation};
            cache.set(t.key, entry);
            inflight++;
            let finished = false;
            let timeout;
            const done = ok => {
                if (finished) return;
                finished = true; inflight--;
                clearTimeout(timeout);
                entry.status = ok ? "ready" : "error";
                if (!ok && t.source?.remote) remoteRetryAt = performance.now() + 30000;
                if (!ok) entry.texture?.dispose();
                if (active) { display(); pump(); }
            };
            timeout = setTimeout(() => done(false), 15000);
            const texture = new B.Texture(t.path, scene,
                false, true, B.Texture.TRILINEAR_SAMPLINGMODE, () => done(true), () => done(false));
            entry.texture = texture;
            texture.wrapU = texture.wrapV = B.Texture.CLAMP_ADDRESSMODE;
            texture.anisotropicFilteringLevel = 8;
            material.setTexture("earthImage", texture);
        }
        publish();
    }
    function display() {
        for (const e of cache.values()) e.mesh.setEnabled(false);
        function visit(t) {
            if (!wanted.has(t.key)) return;
            const entry = cache.get(t.key);
            if (entry?.status === "ready") entry.mesh.setEnabled(active);
            if (t.z < (t.source?.maxLevel ?? MAX_LEVEL)) {
                const next = children(t).filter(c => wanted.has(c.key));
                next.forEach(visit);
                // The parent remains until the complete child patch is ready.
                if (entry && next.length === 4 && next.every(c => cache.get(c.key)?.status === "ready"))
                    entry.mesh.setEnabled(false);
            }
        }
        roots.forEach(visit);
        publish();
    }
    function publish() {
        const entries = [...cache.values()];
        const visible = entries.filter(e => e.mesh.isEnabled());
        const info = {active, visible: visible.length, loading: inflight, cached: cache.size,
            detailed: visible.filter(e => e.tile.source).length,
            remoteLevel: visible.filter(e => e.tile.source?.remote).reduce((n, e) => Math.max(n, e.tile.z), -1),
            limit: CACHE_LIMIT, level: visible.reduce((n, e) => Math.max(n, e.tile.z - (e.tile.source?.minLevel || 0)), 0),
            unavailable: performance.now() < remoteRetryAt && [...wanted].some(k => tiles.get(k)?.source?.remote),
            errors: entries.filter(e => wanted.has(e.tile.key) && e.status === "error").length,
            requested: wanted.size};
        world.tiles = info;
        if (report) report(info);
    }
    function update(now = performance.now()) {
        if (!active || now - lastUpdate < 150) return;
        lastUpdate = now; generation++;
        // Fit all selected parents and children in the cache; leave room for
        // outstanding requests from the previous view while the camera moves.
        let detailThreshold = 384;
        do {
            wanted = select(detailThreshold);
            needed = new Set();
            for (const key of wanted) {
                const t = tiles.get(key);
                if (t.source?.remote && t.z < remote.minLevel) continue;
                const hasChildren = t.z < (t.source?.maxLevel ?? MAX_LEVEL) &&
                    children(t).some(child => wanted.has(child.key));
                if (hasChildren) continue;
                needed.add(key);
                // Fetch the leaf and its immediate parent, rather than every
                // ancestor in the pyramid. Cached older levels stay as fallback.
                if (t.z > (t.source?.minLevel || 0)) {
                    needed.add(tile(t.z - 1, Math.floor(t.x / 2), Math.floor(t.y / 2), t.source).key);
                }
            }
            detailThreshold *= 1.25;
        } while (needed.size > CACHE_LIMIT - MAX_REQUESTS * 2);
        // Drop failed textures before a delayed retry; descriptors also stay bounded.
        if (now >= remoteRetryAt) {
            for (const entry of [...cache.values()]) if (entry.status === "error") dispose(entry);
        }
        for (const key of tiles.keys()) {
            if (!wanted.has(key) && !cache.has(key) && !roots.some(t => t.key === key)) tiles.delete(key);
        }
        for (const key of wanted) { const e = cache.get(key); if (e) e.used = generation; }
        queue = [...needed].filter(key => !cache.has(key)).map(key => tiles.get(key))
            .filter(t => !t.source?.remote || t.z >= remote.minLevel)
            .sort((a, b) => a.z - b.z || B.Vector3.DistanceSquared(a.centre, camera.position)
                - B.Vector3.DistanceSquared(b.centre, camera.position));
        display(); pump();
    }
    return {
        update,
        refresh() { lastUpdate = -Infinity; update(); },
        setActive(value) {
            active = value; lastUpdate = -Infinity;
            if (active) update();
            else { queue = []; for (const e of cache.values()) e.mesh.setEnabled(false); publish(); }
        },
        setBrightness(value) {
            gamma = value / 100;
            for (const e of cache.values()) e.material.setFloat("brightnessGamma", gamma);
        }
    };
};
