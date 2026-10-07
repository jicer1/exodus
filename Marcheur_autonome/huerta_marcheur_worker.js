"use strict";
importScripts("marcheur_core.js?v=valley-floor-test-20261001");

var tileCache = new Map();
var fetchedTiles = new Set();

function progress(message) {
    self.postMessage({phase: "progress", message: message});
}

function inside(point, grid) {
    return point[0] >= grid.xMin && point[0] < grid.xMin + grid.width * grid.cellSizeX &&
        point[1] <= grid.yMax && point[1] > grid.yMax - grid.height * grid.cellSizeY;
}

function throwIfTimeExpired(deadlineAt) {
    if (performance.now() >= deadlineAt) {
        var error = new Error("Temps maximal de recherche écoulé ; augmente le curseur pour poursuivre plus longtemps.");
        error.code = "TIME_BUDGET";
        throw error;
    }
}

function calculateGuide(data, start, end, guideStrategy, deadlineAt) {
    var guide = data.guide;
    if (guide.elevations.length !== guide.width * guide.height)
        throw new Error("Le MNT-guide global est incomplet.");
    if (!inside(start, guide) || !inside(end, guide))
        throw new Error("Un point est hors de l’emprise MNT de Huerta.");
    progress("Calcul du guide global à 16 m…");
    var request = {startX: start[0], startY: start[1], endX: end[0], endY: end[1],
        maxCells: 1000000, deadlineAt: deadlineAt,
        onProgress: function(state) {
            if ((state.visited & 65535) === 0)
                progress("Guide 16 m : " + state.visited.toLocaleString() + " cellules explorées.");
        }};
    if (guideStrategy.maxDirectSlopeDeg != null)
        request.options = {maxDirectSlopeDeg: guideStrategy.maxDirectSlopeDeg};
    else if (guideStrategy.thresholdDeg != null)
        request.options = {
            steepSlopeThresholdDeg: guideStrategy.thresholdDeg,
            steepSlopeMultiplier: guideStrategy.multiplier
        };
    var result = self.HuertaMarcheurCore.findPath(guide, request);
    return result.coordinates;
}

function calculateGuideVia(data, start, end, waypointFraction, lateralOffset, deadlineAt) {
    var guide = data.guide;
    var dx = end[0] - start[0], dy = end[1] - start[1];
    var length = Math.hypot(dx, dy);
    if (!length) throw new Error("Les points de départ et d’arrivée sont confondus.");
    var waypoint = [
        start[0] + dx * waypointFraction - (dy / length) * lateralOffset,
        start[1] + dy * waypointFraction + (dx / length) * lateralOffset
    ];
    if (!inside(waypoint, guide))
        throw new Error("Le détour demandé sort de l’emprise du terrain.");
    progress("Calcul d’un guide global par un détour latéral de " +
        Math.abs(lateralOffset) + " m…");
    var first = self.HuertaMarcheurCore.findPath(guide, {
        startX: start[0], startY: start[1], endX: waypoint[0], endY: waypoint[1],
        maxCells: 1000000, deadlineAt: deadlineAt
    });
    throwIfTimeExpired(deadlineAt);
    var second = self.HuertaMarcheurCore.findPath(guide, {
        startX: waypoint[0], startY: waypoint[1], endX: end[0], endY: end[1],
        maxCells: 1000000, deadlineAt: deadlineAt
    });
    return first.coordinates.concat(second.coordinates.slice(1));
}

function distanceAndPoints(line) {
    var cumulative = [0];
    for (var i = 1; i < line.length; i++)
        cumulative.push(cumulative[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    return {cumulative: cumulative, length: cumulative[cumulative.length - 1]};
}

function pointAt(line, cumulative, distance) {
    for (var i = 1; i < cumulative.length; i++) {
        if (cumulative[i] >= distance) {
            var span = cumulative[i] - cumulative[i - 1];
            var t = span ? (distance - cumulative[i - 1]) / span : 0;
            return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t,
                line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
        }
    }
    return line[line.length - 1].slice(0, 2);
}

function guideSegments(line, segmentLength) {
    var measured = distanceAndPoints(line), segments = [];
    if (measured.length <= 0) return segments;
    for (var begin = 0; begin < measured.length; begin += segmentLength) {
        var finish = Math.min(measured.length, begin + segmentLength);
        var points = [pointAt(line, measured.cumulative, begin)];
        for (var i = 1; i < line.length - 1; i++)
            if (measured.cumulative[i] > begin && measured.cumulative[i] < finish)
                points.push(line[i].slice(0, 2));
        points.push(pointAt(line, measured.cumulative, finish));
        segments.push({start: points[0], end: points[points.length - 1], guide: points});
    }
    return segments;
}

function findSelfIntersection(points, maximumSlopeDeg) {
    var buckets = new Map();
    var bucketSize = 64;
    for (var later = 0; later < points.length - 1; later++) {
        var a = points[later], b = points[later + 1];
        var minBx = Math.floor((Math.min(a[0], b[0]) - 0.01) / bucketSize);
        var maxBx = Math.floor((Math.max(a[0], b[0]) + 0.01) / bucketSize);
        var minBy = Math.floor((Math.min(a[1], b[1]) - 0.01) / bucketSize);
        var maxBy = Math.floor((Math.max(a[1], b[1]) + 0.01) / bucketSize);
        var checked = new Set();
        for (var by = minBy; by <= maxBy; by++) {
            for (var bx = minBx; bx <= maxBx; bx++) {
                var key = bx + ":" + by;
                var candidates = buckets.get(key) || [];
                for (var c = 0; c < candidates.length; c++) {
                    var earlier = candidates[c];
                    if (later - earlier < 2 || checked.has(earlier)) continue;
                    checked.add(earlier);
                    var p = points[earlier], q = points[earlier + 1];
                    var rx = q[0] - p[0], ry = q[1] - p[1];
                    var sx = b[0] - a[0], sy = b[1] - a[1];
                    var denominator = rx * sy - ry * sx;
                    if (Math.abs(denominator) < 1e-9) continue;
                    var qpx = a[0] - p[0], qpy = a[1] - p[1];
                    var t = (qpx * sy - qpy * sx) / denominator;
                    var u = (qpx * ry - qpy * rx) / denominator;
                    var endpointTolerance = 1e-7;
                    if (t < -endpointTolerance || t > 1 + endpointTolerance ||
                            u < -endpointTolerance || u > 1 + endpointTolerance) continue;
                    t = Math.max(0, Math.min(1, t));
                    u = Math.max(0, Math.min(1, u));
                    var firstZ = p[2] + t * (q[2] - p[2]);
                    var secondZ = a[2] + u * (b[2] - a[2]);
                    var z = (firstZ + secondZ) * 0.5;
                    var intersection = [p[0] + t * rx, p[1] + t * ry, z];
                    var beforeLength = Math.hypot(intersection[0] - p[0], intersection[1] - p[1]);
                    var afterLength = Math.hypot(b[0] - intersection[0], b[1] - intersection[1]);
                    var beforeSlope = Math.atan(Math.abs(z - p[2]) / beforeLength) * 180 / Math.PI;
                    var afterSlope = Math.atan(Math.abs(b[2] - z) / afterLength) * 180 / Math.PI;
                    if (beforeSlope > maximumSlopeDeg || afterSlope > maximumSlopeDeg) continue;
                    return {earlier: earlier, later: later, t: t, u: u, point: intersection};
                }
            }
        }
        for (var addY = minBy; addY <= maxBy; addY++) {
            for (var addX = minBx; addX <= maxBx; addX++) {
                var addKey = addX + ":" + addY;
                if (!buckets.has(addKey)) buckets.set(addKey, []);
                buckets.get(addKey).push(later);
            }
        }
    }
    return null;
}

// Repère un retour sur un sommet déjà parcouru, notamment une impasse
// empruntée à l'aller puis au retour.
function findRepeatedRoutePoint(points) {
    var visited = new Map();
    for (var current = 0; current < points.length; current++) {
        var point = points[current];
        var key = Math.round(point[0] * 1000) + ":" + Math.round(point[1] * 1000);
        var previous = visited.get(key);
        if (previous !== undefined && current - previous > 1)
            return {earlier: previous, later: current};
        visited.set(key, current);
    }
    return null;
}

// Première étape : retirer les boucles qui se croisent. Refaire une passe
// après chaque coupe permet de trouver les croisements révélés par celle-ci.
function removeCrossingLoops(coordinates, maximumSlopeDeg) {
    var cleaned = coordinates, removed = 0;
    while (true) {
        var crossing = findSelfIntersection(cleaned, maximumSlopeDeg);
        if (!crossing) break;
        var prefix = cleaned.slice(0, crossing.earlier + 1);
        if (crossing.t >= 1 - 1e-7)
            prefix.push(cleaned[crossing.earlier + 1]);
        else if (crossing.t > 1e-7)
            prefix.push(crossing.point);
        var suffixStart = crossing.later + (crossing.u >= 1 - 1e-7 ? 2 : 1);
        cleaned = prefix.concat(cleaned.slice(suffixStart));
        removed++;
    }
    return {coordinates: cleaned, removed: removed};
}

// Deuxième étape : supprimer les impasses parcourues à l'aller puis au retour.
// Répéter jusqu'à ne plus trouver de sommet déjà visité.
function removeDeadEnds(coordinates) {
    var cleaned = coordinates, removed = 0, repeated;
    while ((repeated = findRepeatedRoutePoint(cleaned))) {
        cleaned = cleaned.slice(0, repeated.earlier + 1)
            .concat(cleaned.slice(repeated.later + 1));
        removed++;
    }
    return {coordinates: cleaned, removed: removed};
}

function fineWindow(manifest, guidePart, margin) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    guidePart.forEach(function(point) {
        minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
    });
    var col0 = Math.max(0, Math.floor((minX - margin - manifest.xMin) / manifest.cellSizeX));
    var col1 = Math.min(manifest.width, Math.ceil((maxX + margin - manifest.xMin) / manifest.cellSizeX));
    var row0 = Math.max(0, Math.floor((manifest.yMax - (maxY + margin)) / manifest.cellSizeY));
    var row1 = Math.min(manifest.height, Math.ceil((manifest.yMax - (minY - margin)) / manifest.cellSizeY));
    var width = col1 - col0, height = row1 - row0, cells = width * height;
    if (cells > 4000000)
        throw new Error("Cette portion dépasse le budget de quatre millions de cellules.");
    if (width < 2 || height < 2) throw new Error("Zone de calcul fine trop petite.");
    return {col0: col0, col1: col1, row0: row0, row1: row1, width: width, height: height, cells: cells};
}

function marginsWithinBudget(manifest, guidePart, minimumMargin) {
    minimumMargin = minimumMargin == null ? 64 : minimumMargin;
    var low = 0, high = 8192;
    while (high - low > 32) {
        var mid = Math.floor(((low + high) * 0.5) / 32) * 32;
        try { fineWindow(manifest, guidePart, mid); low = mid; }
        catch (error) { high = mid; }
    }
    var margins = [minimumMargin, 8, 16, 32, 64, 128, 256, 512, 1024, 1536, low];
    return margins.filter(function(margin, index, all) {
        return margin >= minimumMargin && margin <= low && all.indexOf(margin) === index;
    }).sort(function(a, b) { return a - b; });
}

// Masque les cellules hors d'une bande autour du chemin de référence.
// Le calcul reste dans un couloir autour du guide, sauf pour les détours nécessaires.
function buildGuideCorridorMask(grid, line, radius) {
    var mask = new Uint8Array(grid.width * grid.height);
    var sx = grid.cellSizeX, sy = grid.cellSizeY;
    function markSegment(a, b) {
        var minCol = Math.max(0, Math.floor((Math.min(a[0], b[0]) - radius - grid.xMin) / sx));
        var maxCol = Math.min(grid.width - 1,
            Math.ceil((Math.max(a[0], b[0]) + radius - grid.xMin) / sx));
        var minRow = Math.max(0, Math.floor((grid.yMax - (Math.max(a[1], b[1]) + radius)) / sy));
        var maxRow = Math.min(grid.height - 1,
            Math.ceil((grid.yMax - (Math.min(a[1], b[1]) - radius)) / sy));
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var lengthSquared = dx * dx + dy * dy;
        for (var row = minRow; row <= maxRow; row++) {
            var y = grid.yMax - (row + 0.5) * sy;
            for (var col = minCol; col <= maxCol; col++) {
                var x = grid.xMin + (col + 0.5) * sx;
                var t = lengthSquared
                    ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared))
                    : 0;
                var ex = x - (a[0] + t * dx), ey = y - (a[1] + t * dy);
                if (ex * ex + ey * ey <= radius * radius)
                    mask[row * grid.width + col] = 1;
            }
        }
    }
    if (line.length === 1) markSegment(line[0], line[0]);
    else for (var i = 1; i < line.length; i++) markSegment(line[i - 1], line[i]);
    return mask;
}

// Pour les trajets dont l’emprise tient dans le budget, on cherche d’abord
// sur toute la zone entre les clics. Cela évite les raccords imposés par les
// tronçons du guide global. Les trajets plus longs restent traités par tuiles.
function yield_progressive_preview() {
    return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

async function post_progressive_route(angle, coordinates, completedSegments, segmentCount) {
    var stride = Math.max(1, Math.ceil(coordinates.length / 2400));
    var preview = coordinates.filter(function(point, index, all) {
        return index === 0 || index === all.length - 1 || index % stride === 0;
    });
    var chunkSize = Math.max(8, Math.ceil(preview.length / 12));
    for (var end = chunkSize; end < preview.length; end += chunkSize) {
        self.postMessage({phase: "partial", angle: angle,
            coordinates: preview.slice(0, end), completedSegments: completedSegments,
            segmentCount: segmentCount});
        await yield_progressive_preview();
    }
    self.postMessage({phase: "partial", angle: angle, coordinates: preview,
        completedSegments: completedSegments, segmentCount: segmentCount});
}

async function calculateDirectRoute(manifest, start, end, angle, deadlineAt) {
    var margins = marginsWithinBudget(manifest, [start, end]);
    if (!margins.length)
        throw new Error("L’emprise directe entre les deux points dépasse le budget mémoire.");
    var attempts = margins.filter(function(margin, index, all) {
        return index === 0 || index === all.length - 1 ||
            margin === 256 || margin === 512;
    });
    var lastError = null, best = null, usedMargin = 0, maxCells = 0;
    for (var i = 0; i < attempts.length; i++) {
        throwIfTimeExpired(deadlineAt);
        var margin = attempts[i], win = fineWindow(manifest, [start, end], margin);
        maxCells = Math.max(maxCells, win.cells);
        progress("Trajet " + angle + "° — recherche fine directe, marge " + margin + " m…");
        var loaded = await loadFineGrid(manifest, win);
        try {
            validateClickedEndpoint(loaded.grid, start, angle, "Départ");
            validateClickedEndpoint(loaded.grid, end, angle, "Arrivée");
            var result = self.HuertaMarcheurCore.findPath(loaded.grid, {
                startX: start[0], startY: start[1], endX: end[0], endY: end[1],
                maxCells: 4000000, deadlineAt: deadlineAt,
                onProgress: function(state) {
                    if ((state.visited & 65535) === 0)
                        progress(angle + "° : " + state.visited.toLocaleString() + " cellules explorées.");
                },
                options: {maxDirectSlopeDeg: angle}
            });
            var nearBoundary = result.coordinates.some(function(point) {
                var col = (point[0] - loaded.grid.xMin) / loaded.grid.cellSizeX;
                var row = (loaded.grid.yMax - point[1]) / loaded.grid.cellSizeY;
                return col < 8 || row < 8 || col > loaded.grid.width - 8 ||
                    row > loaded.grid.height - 8;
            });
            best = result.coordinates;
            usedMargin = margin;
            if (!nearBoundary) break;
        } catch (error) {
            if (error.code === "INVALID_ENDPOINT" || error.code === "STEEP_ENDPOINT" ||
                    error.code === "TIME_BUDGET") throw error;
            lastError = error;
        }
    }
    if (!best)
        throw new Error(lastError ? lastError.message : "La recherche directe n’a pas abouti.");
    var rawLength = 0;
    for (var p = 1; p < best.length; p++)
        rawLength += Math.hypot(best[p][0] - best[p - 1][0], best[p][1] - best[p - 1][1]);
    var crossingResult = removeCrossingLoops(best, angle);
    var deadEndResult = removeDeadEnds(crossingResult.coordinates);
    best = deadEndResult.coordinates;
    var length = 0;
    for (var cleanIndex = 1; cleanIndex < best.length; cleanIndex++)
        length += Math.hypot(best[cleanIndex][0] - best[cleanIndex - 1][0],
            best[cleanIndex][1] - best[cleanIndex - 1][1]);
    var stride = Math.max(1, Math.ceil(best.length / 2400));
    var displayPoints = best.filter(function(point, index, all) {
        return index === 0 || index === all.length - 1 || index % stride === 0;
    });
    await post_progressive_route(angle, best, 1, 1);
    return {ok: true, angle: angle, maximumAngle: angle,
        slopeRanges: [{from: 1, to: 1, angle: angle}], coordinates: displayPoints, length: length,
        nearBoundary: false, segmentCount: 1, maxMargin: usedMargin,
        maxCells: maxCells, maxSnap: 0,
        removedCrossings: crossingResult.removed, removedDeadEnds: deadEndResult.removed,
        rawLength: rawLength, guideStrategy: "recherche directe à 2 m"};
}

async function readCompressed(file, expectedCells) {
    var url = new URL("../assets/marcheur_tiles/" + file, self.location.href);
    var response;
    try {
        response = await fetch(url.href);
    } catch (error) {
        var fetchReason = error && error.message ? error.message : String(error);
        throw new Error("Échec réseau pour la tuile " + file + " : " + fetchReason +
            " (" + url.href + ")");
    }
    if (!response.ok) throw new Error("Tuile de terrain " + file + " : HTTP " +
        response.status + " " + response.statusText + " (" + url.href + ")");
    if (typeof DecompressionStream === "undefined")
        throw new Error("Ce navigateur ne sait pas décompresser les tuiles du MNT.");
    var compressed;
    try {
        compressed = await response.arrayBuffer();
    } catch (error) {
        var bodyReason = error && error.message ? error.message : String(error);
        throw new Error("Réponse illisible pour la tuile " + file + " : " + bodyReason +
            " (" + url.href + ")");
    }
    var raw;
    // Certains hébergements Apache envoient déjà Content-Encoding: gzip pour
    // les fichiers .gz. Le navigateur décompresse alors la réponse pendant
    // fetch(); éviter de repasser ces octets bruts dans DecompressionStream.
    if (compressed.byteLength === expectedCells * Float32Array.BYTES_PER_ELEMENT) {
        raw = compressed;
    } else {
        try {
            var stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
            raw = await new Response(stream).arrayBuffer();
        } catch (error) {
            var gzipReason = error && error.message ? error.message : String(error);
            throw new Error("Décompression gzip impossible pour la tuile " + file + " : " +
                gzipReason + " (" + url.href + ")");
        }
    }
    var values = new Float32Array(raw);
    if (values.length !== expectedCells) throw new Error("Dimensions incorrectes dans " + file +
        " : " + values.length + " valeurs reçues, " + expectedCells + " attendues (" +
        url.href + ")");
    return values;
}

async function readTile(tile) {
    var key = tile.row + "_" + tile.col;
    var cached = tileCache.get(key);
    if (cached) {
        tileCache.delete(key);
        tileCache.set(key, cached);
        return cached;
    }
    var count = tile.width * tile.height;
    var values = await Promise.all([
        readCompressed(tile.elevationFile, count), readCompressed(tile.frictionFile, count)
    ]);
    cached = {tile: tile, elevation: values[0], friction: values[1]};
    tileCache.set(key, cached);
    fetchedTiles.add(key);
    while (tileCache.size > 64) tileCache.delete(tileCache.keys().next().value);
    return cached;
}

async function loadFineGrid(manifest, win) {
    var selected = manifest.tiles.filter(function(tile) {
        return tile.colOffset < win.col1 && tile.colOffset + tile.width > win.col0 &&
            tile.rowOffset < win.row1 && tile.rowOffset + tile.height > win.row0;
    });
    var elevation = new Float32Array(win.cells), friction = new Float32Array(win.cells);
    elevation.fill(NaN); friction.fill(NaN);
    for (var batchStart = 0; batchStart < selected.length; batchStart += 6) {
        var batch = await Promise.all(selected.slice(batchStart, batchStart + 6).map(readTile));
        batch.forEach(function(data) {
            var tile = data.tile;
            var c0 = Math.max(tile.colOffset, win.col0), c1 = Math.min(tile.colOffset + tile.width, win.col1);
            var r0 = Math.max(tile.rowOffset, win.row0), r1 = Math.min(tile.rowOffset + tile.height, win.row1);
            var span = c1 - c0;
            for (var row = r0; row < r1; row++) {
                var sourceStart = (row - tile.rowOffset) * tile.width + (c0 - tile.colOffset);
                var targetStart = (row - win.row0) * win.width + (c0 - win.col0);
                elevation.set(data.elevation.subarray(sourceStart, sourceStart + span), targetStart);
                friction.set(data.friction.subarray(sourceStart, sourceStart + span), targetStart);
            }
        });
    }
    return {grid: {
        width: win.width, height: win.height,
        xMin: manifest.xMin + win.col0 * manifest.cellSizeX,
        yMax: manifest.yMax - win.row0 * manifest.cellSizeY,
        cellSizeX: manifest.cellSizeX, cellSizeY: manifest.cellSizeY,
        elevations: elevation, friction: friction
    }, tileCount: selected.length, cells: win.cells};
}

// Un point-guide à 16 m peut tomber sur une cellule fine isolée par la limite
// de pente. On raccorde chaque tronçon à la cellule praticable la plus proche;
// la même recherche déterministe donne le même raccord au tronçon suivant.
function nearestAccessibleEndpoint(grid, point, maxAngle, allowedCells) {
    var originCol = Math.max(0, Math.min(grid.width - 1,
        Math.round((point[0] - grid.xMin) / grid.cellSizeX - 0.5)));
    var originRow = Math.max(0, Math.min(grid.height - 1,
        Math.round((grid.yMax - point[1]) / grid.cellSizeY - 0.5)));
    var radius = Math.ceil(24 / Math.min(grid.cellSizeX, grid.cellSizeY));
    var directions = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    var best = null;
    for (var dr = -radius; dr <= radius; dr++) {
        for (var dc = -radius; dc <= radius; dc++) {
            var col = originCol + dc, row = originRow + dr;
            if (col < 0 || row < 0 || col >= grid.width || row >= grid.height) continue;
            var index = row * grid.width + col;
            if (!Number.isFinite(grid.elevations[index]) ||
                    (grid.friction && !Number.isFinite(grid.friction[index])) ||
                    (allowedCells && !allowedCells[index])) continue;
            var x = grid.xMin + (col + 0.5) * grid.cellSizeX;
            var y = grid.yMax - (row + 0.5) * grid.cellSizeY;
            var distance = Math.hypot(x - point[0], y - point[1]);
            if (distance > 24 || (best && distance >= best.distance)) continue;
            var hasPassableNeighbor = directions.some(function(direction) {
                var nc = col + direction[0], nr = row + direction[1];
                if (nc < 0 || nr < 0 || nc >= grid.width || nr >= grid.height) return false;
                var next = nr * grid.width + nc;
                    if (!Number.isFinite(grid.elevations[next]) ||
                            (grid.friction && !Number.isFinite(grid.friction[next])) ||
                            (allowedCells && !allowedCells[next])) return false;
                var step = Math.hypot(direction[0] * grid.cellSizeX, direction[1] * grid.cellSizeY);
                return Math.atan(Math.abs(grid.elevations[next] - grid.elevations[index]) / step) * 180 / Math.PI <= maxAngle;
            });
            if (hasPassableNeighbor) best = {point: [x, y], distance: distance};
        }
    }
    if (!best) throw new Error("Aucun raccord praticable à moins de 24 m du point-guide.");
    return best;
}

function validateClickedEndpoint(grid, point, maxAngle, label) {
    var col = Math.round((point[0] - grid.xMin) / grid.cellSizeX - 0.5);
    var row = Math.round((grid.yMax - point[1]) / grid.cellSizeY - 0.5);
    var endpointError = function(message) {
        var error = new Error(message);
        error.code = "INVALID_ENDPOINT";
        throw error;
    };
    var steepEndpointError = function(message) {
        var error = new Error(message);
        error.code = "STEEP_ENDPOINT";
        throw error;
    };
    if (col < 0 || row < 0 || col >= grid.width || row >= grid.height)
        endpointError(label + " hors de la zone fine chargée. Choisis un autre point sur le terrain.");
    var index = row * grid.width + col;
    if (!Number.isFinite(grid.elevations[index]) ||
            (grid.friction && !Number.isFinite(grid.friction[index])))
        endpointError(label + " sans donnée de terrain praticable. Choisis un autre point.");
    var directions = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    var minSlope = Infinity;
    directions.forEach(function(direction) {
        var nc = col + direction[0], nr = row + direction[1];
        if (nc < 0 || nr < 0 || nc >= grid.width || nr >= grid.height) return;
        var next = nr * grid.width + nc;
        if (!Number.isFinite(grid.elevations[next]) ||
                (grid.friction && !Number.isFinite(grid.friction[next]))) return;
        var step = Math.hypot(direction[0] * grid.cellSizeX, direction[1] * grid.cellSizeY);
        minSlope = Math.min(minSlope,
            Math.atan(Math.abs(grid.elevations[next] - grid.elevations[index]) / step) * 180 / Math.PI);
    });
    if (!Number.isFinite(minSlope))
        endpointError(label + " sans voisin praticable dans le MNT. Choisis un autre point.");
    if (minSlope > maxAngle)
        steepEndpointError(label + " trop raide à " + maxAngle +
            "° par pas (pente locale minimale : " + minSlope.toFixed(1) +
            "°). Déplace le point " + (label === "Départ" ? "de départ" : "d’arrivée") +
            " vers une zone moins pentue ou augmente le plafond accepté.");
    return {point: [point[0], point[1]], distance: 0};
}

async function calculateSegment(manifest, segment, start, end, angle, deadlineAt,
        minimumMargin, constrainToGuide, avoidValleyFloors) {
    var lastError = "Le corridor local n’a pas encore permis de trouver un passage.";
    var best = null, bestNearBoundary = false, usedMargin = 0, maxCells = 0;
    // À 2 m/cellule, une marge de 2048 m seule dépasse déjà le budget de
    // quatre millions de cellules. Garder les marges réellement calculables.
    var margins = marginsWithinBudget(manifest, segment.guide, minimumMargin);
    var lastWindow = null;
    for (var i = 0; i < margins.length; i++) {
        throwIfTimeExpired(deadlineAt);
        var margin = margins[i], win;
        try { win = fineWindow(manifest, segment.guide, margin); }
        catch (error) { lastError = error.message; break; }
        if (lastWindow && win.col0 === lastWindow.col0 && win.col1 === lastWindow.col1 &&
                win.row0 === lastWindow.row0 && win.row1 === lastWindow.row1) break;
        lastWindow = win;
        maxCells = Math.max(maxCells, win.cells);
        var rangeLabel = segment.rangeEnd > segment.index + 1
            ? (segment.index + 1) + "–" + segment.rangeEnd : String(segment.index + 1);
        progress("Trajet " + angle + "° — tronçon-guide " + rangeLabel + "/" + segment.total +
            " — marge " + margin + " m : chargement des tuiles…");
        var loaded;
        try { loaded = await loadFineGrid(manifest, win); }
        catch (error) { lastError = error.message; break; }
        if (!inside(start, loaded.grid) || !inside(end, loaded.grid)) {
            lastError = "Une extrémité du tronçon est hors de la grille chargée.";
            continue;
        }
        try {
            var allowedCells = constrainToGuide
                ? buildGuideCorridorMask(loaded.grid, segment.guide, margin) : null;
            var snappedStart = segment.index === 0
                ? validateClickedEndpoint(loaded.grid, start, angle, "Départ")
                : nearestAccessibleEndpoint(loaded.grid, start, angle, allowedCells);
            var snappedEnd = segment.rangeEnd === segment.total
                ? validateClickedEndpoint(loaded.grid, end, angle, "Arrivée")
                : nearestAccessibleEndpoint(loaded.grid, end, angle, allowedCells);
            var result = self.HuertaMarcheurCore.findPath(loaded.grid, {
                startX: snappedStart.point[0], startY: snappedStart.point[1],
                endX: snappedEnd.point[0], endY: snappedEnd.point[1],
                allowedCells: allowedCells,
                maxCells: 4000000, deadlineAt: deadlineAt,
                onProgress: function(state) {
                    if ((state.visited & 65535) === 0)
                        progress(angle + "° : " + state.visited.toLocaleString() + " cellules explorées.");
                },
                options: {maxDirectSlopeDeg: angle,
                    valleyFloorPenalty: avoidValleyFloors ? 8 : 1}
            });
            var path = result.coordinates;
            var nearBoundary = !constrainToGuide && path.some(function(point) {
                var col = (point[0] - loaded.grid.xMin) / loaded.grid.cellSizeX;
                var row = (loaded.grid.yMax - point[1]) / loaded.grid.cellSizeY;
                return col < 8 || row < 8 || col > loaded.grid.width - 8 || row > loaded.grid.height - 8;
            });
            best = path;
            bestNearBoundary = nearBoundary;
            usedMargin = margin;
            result.snapDistance = Math.max(snappedStart.distance, snappedEnd.distance);
            if (!nearBoundary) break;
            lastError = "Trajet proche du bord du corridor.";
        } catch (error) {
            lastError = error.message;
            if (error.code === "INVALID_ENDPOINT" || error.code === "STEEP_ENDPOINT" ||
                    error.code === "TIME_BUDGET") throw error;
        }
    }
    if (!best) throw new Error("Tronçon-guide " + (segment.index + 1) + "/" + segment.total +
        " : " + lastError);
    return {coordinates: best, margin: usedMargin, cells: maxCells, nearBoundary: bestNearBoundary,
        snapDistance: result.snapDistance || 0};
}

async function calculateSegmentProgressive(manifest, segment, start, end,
        referenceAngle, maximumAngle, deadlineAt, minimumMargin, constrainToGuide,
        avoidValleyFloors) {
    var lastError = null;
    for (var candidateAngle = referenceAngle; candidateAngle <= maximumAngle; candidateAngle++) {
        throwIfTimeExpired(deadlineAt);
        if (candidateAngle > referenceAngle)
            progress("Tronçon-guide " + (segment.index + 1) + "/" + segment.total +
                " bloqué à " + (candidateAngle - 1) + "° ; nouvel essai à " + candidateAngle +
                "° (plafond " + maximumAngle + "°)…");
        try {
            var result = await calculateSegment(manifest, segment, start, end, candidateAngle,
                deadlineAt, minimumMargin, constrainToGuide, avoidValleyFloors);
            result.usedAngle = candidateAngle;
            return result;
        } catch (error) {
            lastError = error;
            if (error && (error.code === "INVALID_ENDPOINT" || error.code === "TIME_BUDGET"))
                throw error;
            if (error && error.code === "STEEP_ENDPOINT" && candidateAngle < maximumAngle)
                continue;
            if (error && error.code === "STEEP_ENDPOINT") throw error;
        }
    }
    throw lastError || new Error("Aucun passage trouvé sous le plafond accepté.");
}

async function calculateFullRoute(manifest, segments, start, end, angle, deadlineAt,
        maximumAngle, minimumMargin, constrainToGuide, continuation, avoidValleyFloors) {
    continuation = continuation || {
        coordinates: [], completedSegments: 0, totalSegments: 0, slopeRanges: [],
        maxMargin: 0, maxCells: 0, nearBoundary: false, maxSnap: 0
    };
    var coordinates = continuation.coordinates.slice();
    var completedBefore = continuation.completedSegments;
    var maxMargin = continuation.maxMargin, maxCells = continuation.maxCells;
    var nearBoundary = continuation.nearBoundary, maxSnap = continuation.maxSnap;
    var slopeRanges = continuation.slopeRanges.slice();
    var segmentTotal = completedBefore + segments.length;
    for (var i = 0; i < segments.length;) {
        var result = null, resultEnd = i, lastError = null;
        // Si le guide à 16 m traverse une zone impraticable à 2 m, le point de
        // raccord est évité : on essaie de relier directement jusqu'à 1 536 m
        // de guide dans une même fenêtre, toujours sous le budget mémoire.
        var maxEnd = Math.min(segments.length - 1, i + 7);
        for (var candidateEnd = i; candidateEnd <= maxEnd; candidateEnd++) {
            var guidePart = [];
            for (var partIndex = i; partIndex <= candidateEnd; partIndex++) {
                var part = segments[partIndex].guide;
                guidePart = guidePart.concat(guidePart.length ? part.slice(1) : part);
            }
            var segment = {
                start: segments[i].start,
                end: segments[candidateEnd].end,
                guide: guidePart,
                index: completedBefore + i,
                rangeEnd: completedBefore + candidateEnd + 1,
                total: segmentTotal
            };
            var from = i === 0 ? start : segment.start;
            var to = candidateEnd === segments.length - 1 ? end : segment.end;
            try {
                result = await calculateSegmentProgressive(manifest, segment, from, to, angle,
                    maximumAngle, deadlineAt, minimumMargin, constrainToGuide, avoidValleyFloors);
                resultEnd = candidateEnd;
                break;
            } catch (error) {
                lastError = error;
                if (error && (error.code === "INVALID_ENDPOINT" || error.code === "STEEP_ENDPOINT" ||
                        error.code === "TIME_BUDGET")) break;
                var message = error && error.message ? error.message : String(error);
                if (message.indexOf("Aucun itinéraire ne relie") < 0 &&
                        message.indexOf("raccord praticable") < 0)
                    break;
            }
        }
        if (!result) {
            var lastMessage = lastError && lastError.message ? lastError.message : String(lastError);
            continuation.coordinates = coordinates;
            continuation.completedSegments = completedBefore + i;
            continuation.totalSegments = segmentTotal;
            continuation.slopeRanges = slopeRanges;
            continuation.maxMargin = maxMargin;
            continuation.maxCells = maxCells;
            continuation.nearBoundary = nearBoundary;
            continuation.maxSnap = maxSnap;
            return {ok: false, continuation: continuation, error: lastMessage,
                terminal: !!(lastError && (lastError.code === "INVALID_ENDPOINT" ||
                    lastError.code === "STEEP_ENDPOINT" || lastError.code === "TIME_BUDGET"))};
        }
        maxMargin = Math.max(maxMargin, result.margin);
        maxCells = Math.max(maxCells, result.cells);
        maxSnap = Math.max(maxSnap, result.snapDistance);
        slopeRanges.push({from: completedBefore + i + 1,
            to: completedBefore + resultEnd + 1, angle: result.usedAngle});
        nearBoundary = nearBoundary || result.nearBoundary;
        coordinates = coordinates.concat(coordinates.length ? result.coordinates.slice(1) : result.coordinates);
        i = resultEnd + 1;
        continuation.coordinates = coordinates;
        continuation.completedSegments = completedBefore + i;
        continuation.totalSegments = segmentTotal;
        continuation.slopeRanges = slopeRanges;
        continuation.maxMargin = maxMargin;
        continuation.maxCells = maxCells;
        continuation.nearBoundary = nearBoundary;
        continuation.maxSnap = maxSnap;
        await post_progressive_route(angle, coordinates, completedBefore + i, segmentTotal);
    }
    var rawLength = 0;
    for (var p = 1; p < coordinates.length; p++)
        rawLength += Math.hypot(coordinates[p][0] - coordinates[p - 1][0], coordinates[p][1] - coordinates[p - 1][1]);
    var crossingResult = removeCrossingLoops(coordinates, maximumAngle);
    var deadEndResult = removeDeadEnds(crossingResult.coordinates);
    coordinates = deadEndResult.coordinates;
    var length = 0;
    for (var cleanIndex = 1; cleanIndex < coordinates.length; cleanIndex++)
        length += Math.hypot(coordinates[cleanIndex][0] - coordinates[cleanIndex - 1][0],
            coordinates[cleanIndex][1] - coordinates[cleanIndex - 1][1]);
    var stride = Math.max(1, Math.ceil(coordinates.length / 2400));
    var displayPoints = coordinates.filter(function(point, index, all) {
        return index === 0 || index === all.length - 1 || index % stride === 0;
    });
    continuation.coordinates = coordinates;
    continuation.slopeRanges = slopeRanges;
    continuation.maxMargin = maxMargin;
    continuation.maxCells = maxCells;
    continuation.nearBoundary = nearBoundary;
    continuation.maxSnap = maxSnap;
    return {ok: true, angle: angle, maximumAngle: maximumAngle, slopeRanges: slopeRanges,
        coordinates: displayPoints, length: length,
        nearBoundary: nearBoundary, segmentCount: segmentTotal, maxMargin: maxMargin,
        maxCells: maxCells, maxSnap: maxSnap,
        removedCrossings: crossingResult.removed, removedDeadEnds: deadEndResult.removed,
        rawLength: rawLength};
}

// Selected areas provide the actual displayed raster, rather than Huerta's
// national DEM package. Keep the shared walking cost and slope constraints.
function calculateLocalRoutes(data, startedAt) {
    var grid=data.localGrid, bounds=grid.bounds, results=[];
    if (!grid.elevations || grid.elevations.length!==grid.width*grid.height)
        throw new Error("Grille de relief locale invalide.");
    [data.start,data.end].forEach(function(point) {
        if (!point || !point.every(Number.isFinite) || point[0]<bounds.west || point[0]>bounds.east ||
                point[1]<bounds.south || point[1]>bounds.north)
            throw new Error("Choisis le départ et l’arrivée à l’intérieur de la zone.");
    });
    progress("Calcul sur le relief du lieu choisi : grille de " + Math.round(grid.cellSizeX) +
        " × " + Math.round(grid.cellSizeY) + " m, mêmes coûts de marche selon la pente.");
    (data.angles || [10]).forEach(function(angle) {
        var maximum=Math.max(angle,Number(data.maximumAngle)||angle);
        var deadline=performance.now()+Math.max(1000,Number(data.timeLimitMs)||120000);
        var result, lastError;
        self.postMessage({phase:"route_reset",angle:angle,strategy:"relief du lieu choisi"});
        for(var threshold=angle;threshold<=maximum;threshold=Math.min(maximum,threshold+1)) {
            try {
                var path=self.HuertaMarcheurCore.findPath(grid,{startX:data.start[0],startY:data.start[1],
                    endX:data.end[0],endY:data.end[1],maxCells:1000000,deadlineAt:deadline,
                    options:{maxDirectSlopeDeg:threshold,maxTerrainSlopeDeg:maximum},
                    onProgress:function(info){progress("Recherche sur le relief local : " + info.visited + " cellules…");}});
                var coordinates=path.coordinates;
                // Keep the user-picked endpoints, not their nearest cell centres.
                if(coordinates.length===1)coordinates=[data.start.slice(),data.end.slice()];
                else {coordinates[0]=data.start.slice();coordinates[coordinates.length-1]=data.end.slice();}
                var length=0;
                for(var i=1;i<coordinates.length;i++)length+=Math.hypot(coordinates[i][0]-coordinates[i-1][0],
                    coordinates[i][1]-coordinates[i-1][1],coordinates[i][2]-coordinates[i-1][2]);
                result={ok:true,angle:angle,coordinates:coordinates,length:length,segmentCount:1,
                    slopeRanges:[{from:1,to:1,angle:threshold}],estimatedCostSeconds:path.estimatedCostSeconds};
                progress("Trajet trouvé sur la grille locale : seuil " + threshold + "°.");
                break;
            }catch(error) {
                lastError=error;
                if(error.code==="TIME_BUDGET" || threshold===maximum)break;
                progress("Recherche avec une limite de pente de " + Math.min(maximum,threshold+1) + "°…");
            }
        }
        results.push(result || {ok:false,angle:angle,error:lastError.message});
    });
    self.postMessage({phase:"done",results:results,loadedTiles:0,loadedBytes:0,
        elapsedMs:performance.now()-startedAt,guideSegments:results.filter(function(r){return r.ok;}).length});
}

self.onmessage = async function(event) {
    var calculationStartedAt = performance.now();
    try {
        tileCache.clear(); fetchedTiles.clear();
        var data = event.data;
        if(data.localGrid) {calculateLocalRoutes(data,calculationStartedAt);return;}
        var start = [data.start[0] + data.offset[0], data.start[1] + data.offset[1]];
        var end = [data.end[0] + data.offset[0], data.end[1] + data.offset[1]];
        var results = [];
        var requestedAngles = Array.isArray(data.angles) && data.angles.length
            ? data.angles : [10, 12];
        for (var angleIndex = 0; angleIndex < requestedAngles.length; angleIndex++) {
            var angle = requestedAngles[angleIndex];
            var maximumAngle = Math.max(angle,
                Number(data.maximumAngle) || angle);
            var deadlineAt = performance.now() + Math.max(30000, Number(data.timeLimitMs) || 120000);
            // Le rouge cherche d'abord à son angle de référence puis peut
            // relever localement la limite jusqu'au plafond accepté.
            var guideStrategies = [
                {label: "guide de base", thresholdDeg: null, multiplier: 1},
                {label: "guide à pente directe maximale de " + angle + "°", maxDirectSlopeDeg: angle},
                {label: "guide exploratoire jusqu’à " + (angle + 5) +
                    "° (trajet fin progressif " + angle + "–" + maximumAngle + "°)",
                    maxDirectSlopeDeg: angle + 5},
                {label: "guide exploratoire jusqu’à " + (angle + 10) +
                    "° (trajet fin progressif " + angle + "–" + maximumAngle + "°)",
                    maxDirectSlopeDeg: angle + 10}
            ];
            var penaltyThresholds = [Math.max(2, angle - 4), Math.max(2, angle - 2),
                angle, Math.min(35, angle + 2)].filter(function(value, index, all) {
                    return all.indexOf(value) === index;
                });
            penaltyThresholds.forEach(function(threshold, index) {
                guideStrategies.push({label: "guide pente >" + threshold +
                    "° pénalisée ×" + (index === 0 ? 100 : 30),
                    thresholdDeg: threshold, multiplier: index === 0 ? 100 : 30});
            });
            // Les guides précédents suivent surtout l’axe départ-arrivée. Si le
            // relief les bloque, forcer des passages latéraux donne au moteur fin
            // de vraies options de contournement à l’échelle du territoire.
            [0.25, 0.75].forEach(function(fraction) {
                [-2400, -1200, 1200, 2400].forEach(function(offset) {
                    guideStrategies.push({
                        label: "détour latéral " + (fraction * 100) + "% / " +
                            (offset > 0 ? "+" : "") + offset + " m",
                        waypointFraction: fraction,
                        lateralOffset: offset
                    });
                });
            });
            var routeResult = null, routeErrors = [];
            var continuation = {
                coordinates: [], completedSegments: 0, totalSegments: 0, slopeRanges: [],
                maxMargin: 0, maxCells: 0, nearBoundary: false, maxSnap: 0
            };
            if (maximumAngle > angle)
                progress("Calcul progressif rouge : référence " + angle + "°, plafond " + maximumAngle +
                    "° ; le seuil ne sera relevé que pour les tronçons bloqués.");
            self.postMessage({phase: "route_reset", angle: angle,
                maximumAngle: maximumAngle,
                strategy: "recherche directe à 2 m"});
            try {
                routeResult = await calculateDirectRoute(data.manifest, start, end, angle, deadlineAt);
                results.push(routeResult);
                continue;
            } catch (error) {
                var directMessage = error && error.message ? error.message : String(error);
                routeErrors.push("recherche directe : " + directMessage);
                if (error && error.code === "INVALID_ENDPOINT") {
                    results.push({ok: false, angle: angle, error: directMessage});
                    continue;
                }
                if (error && error.code === "TIME_BUDGET") {
                    results.push({ok: false, angle: angle, error: directMessage});
                    continue;
                }
            }
            for (var strategy = 0; strategy < guideStrategies.length; strategy++) {
                var guideStrategy = guideStrategies[strategy];
                var label = guideStrategy.label;
                try {
                    throwIfTimeExpired(deadlineAt);
                    var resumePoint = continuation.coordinates.length
                        ? continuation.coordinates[continuation.coordinates.length - 1].slice(0, 2)
                        : start;
                    var hasPrefix = continuation.coordinates.length > 0;
                    progress((hasPrefix
                        ? "Reprise depuis le dernier tronçon validé (" +
                            continuation.completedSegments + " tronçons conservés) — "
                        : "Recherche du trajet " + angle + "° — ") + label + "…");
                    var guide = guideStrategy.waypointFraction != null
                        ? calculateGuideVia(data, resumePoint, end, guideStrategy.waypointFraction,
                            guideStrategy.lateralOffset, deadlineAt)
                        : calculateGuide(data, resumePoint, end, guideStrategy, deadlineAt);
                    var segments = guideSegments(guide, 512);
                    if (!segments.length) throw new Error("Les deux points sont trop proches pour créer un trajet.");
                    progress("Calcul fin à " + angle + "° sur " + segments.length + " tronçons-guide…");
                    routeResult = await calculateFullRoute(data.manifest, segments, resumePoint, end,
                        angle, deadlineAt, maximumAngle, null, false, continuation, false);
                    if (routeResult.ok) {
                        routeResult.guideStrategy = label;
                        break;
                    }
                    routeErrors.push(label + " : " + routeResult.error);
                    if (routeResult.terminal) break;
                } catch (error) {
                    var message = error && error.message ? error.message : String(error);
                    routeErrors.push(label + " : " + message);
                    if (error && (error.code === "INVALID_ENDPOINT" || error.code === "STEEP_ENDPOINT" ||
                            error.code === "TIME_BUDGET")) break;
                }
            }
            if (routeResult && routeResult.ok) {
                results.push(routeResult);
            } else if (continuation.coordinates.length) {
                results.push({ok: false, angle: angle, error: routeErrors.join(" ; "),
                    coordinates: continuation.coordinates, partial: true,
                    completedSegments: continuation.completedSegments,
                    segmentCount: continuation.totalSegments});
            } else {
                routeResult = routeResult || {ok: false, error: routeErrors.join(" ; ")};
                routeResult.angle = angle;
                routeResult.maximumAngle = maximumAngle;
                results.push(routeResult);
            }
        }
        var bytes = 0;
        fetchedTiles.forEach(function(key) {
            var entry = data.manifest.tiles.find(function(tile) { return tile.row + "_" + tile.col === key; });
            if (entry) bytes += entry.bytesGzip;
        });
        self.postMessage({phase: "done", results: results, loadedTiles: fetchedTiles.size,
            loadedBytes: bytes, elapsedMs: performance.now() - calculationStartedAt,
            guideSegments: results.reduce(function(total, item) {
                return total + (item.ok ? item.segmentCount : 0);
            }, 0)});
    } catch (error) {
        self.postMessage({phase: "error", error: error && error.message ? error.message : String(error)});
    }
};
