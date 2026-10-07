/*
 * Marcheur autonome — premier moteur de calcul sur grille.
 *
 * Entrées : grille d'altitudes métrique, friction facultative et coordonnées
 * de départ/arrivée dans le même système projeté que la grille.
 * Sortie : itinéraire de moindre coût avec altitudes, utilisable ensuite pour
 * l'affichage Huerta et l'export KML.
 *
 * Le calcul est inspiré du modèle documenté de GRASS r.walk, mais cette
 * première version n'est pas encore déclarée équivalente à r.walk. Les
 * conventions de coût et les résultats devront être comparés à GRASS.
 */
(function (root, factory) {
    "use strict";
    var api = factory();
    if (typeof module === "object" && module.exports)
        module.exports = api;
    else
        root.HuertaMarcheurCore = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var DEFAULTS = {
        walkCoefficients: [0.72, 6.0, 1.9998, -1.9998],
        slopeFactor: -0.2125,
        lambda: 1.0,
        maxCells: 2000000,
        maxDirectSlopeDeg: null,
        maxTerrainSlopeDeg: null,
        steepSlopeThresholdDeg: null,
        steepSlopeMultiplier: 1,
        valleyFloorPenalty: 1,
        valleyFloorThresholdM: 1.5,
        valleySampleDistanceM: 32,
        valleyFloorDepthForMaxPenaltyM: 8
    };

    function MinHeap() {
        this.ids = [];
        this.values = [];
    }

    MinHeap.prototype.push = function (id, value) {
        var i = this.ids.length;
        this.ids.push(id);
        this.values.push(value);
        while (i > 0) {
            var parent = (i - 1) >> 1;
            if (this.values[parent] <= value)
                break;
            this.ids[i] = this.ids[parent];
            this.values[i] = this.values[parent];
            i = parent;
        }
        this.ids[i] = id;
        this.values[i] = value;
    };

    MinHeap.prototype.pop = function () {
        if (!this.ids.length)
            return null;
        var result = {id: this.ids[0], value: this.values[0]};
        var lastId = this.ids.pop();
        var lastValue = this.values.pop();
        if (this.ids.length) {
            var i = 0;
            while (true) {
                var left = i * 2 + 1;
                var right = left + 1;
                if (left >= this.ids.length)
                    break;
                var child = right < this.ids.length && this.values[right] < this.values[left]
                    ? right : left;
                if (this.values[child] >= lastValue)
                    break;
                this.ids[i] = this.ids[child];
                this.values[i] = this.values[child];
                i = child;
            }
            this.ids[i] = lastId;
            this.values[i] = lastValue;
        }
        return result;
    };

    function requireFinite(value, label) {
        if (!Number.isFinite(value))
            throw new Error(label + " doit être un nombre fini.");
    }

    function cellIndex(x, y, grid) {
        var col = Math.round((x - grid.xMin) / grid.cellSizeX - 0.5);
        var row = Math.round((grid.yMax - y) / grid.cellSizeY - 0.5);
        col = Math.max(0, Math.min(grid.width - 1, col));
        row = Math.max(0, Math.min(grid.height - 1, row));
        return row * grid.width + col;
    }

    function sampleNearestElevation(grid, x, y, elevations) {
        var col = Math.round((x - grid.xMin) / grid.cellSizeX - 0.5);
        var row = Math.round((grid.yMax - y) / grid.cellSizeY - 0.5);
        if (col < 0 || row < 0 || col >= grid.width || row >= grid.height)
            return NaN;
        return elevations[row * grid.width + col];
    }

    function edgeCost(from, to, distance, elevations, frictions, options, grid) {
        var dz = elevations[to] - elevations[from];
        var slope = dz / distance;
        var coeff = options.walkCoefficients;
        var cost = coeff[0] * distance;

        if (dz > 0) {
            cost += coeff[1] * dz;
        } else if (slope < options.slopeFactor) {
            cost += coeff[3] * dz;
        } else {
            cost += coeff[2] * dz;
        }

        if (frictions)
            cost += options.lambda * ((frictions[from] + frictions[to]) * 0.5) * distance;

        if (options.steepSlopeThresholdDeg != null && options.steepSlopeMultiplier > 1 &&
                Math.atan(Math.abs(slope)) * 180 / Math.PI > options.steepSlopeThresholdDeg)
            cost *= options.steepSlopeMultiplier;

        // Une vallée est détectée par ses deux versants : si le terrain monte
        // de chaque côté du déplacement, on pénalise le fait d'en suivre le fond.
        // En traversée, les échantillons latéraux longent plutôt le fond et le
        // coût reste donc faible. La montée demeure autorisée par ailleurs.
        if (options.valleyFloorPenalty > 1) {
            var fromRow = Math.floor(from / grid.width), fromCol = from - fromRow * grid.width;
            var toRow = Math.floor(to / grid.width), toCol = to - toRow * grid.width;
            var dx = (toCol - fromCol) * grid.cellSizeX;
            var dy = -(toRow - fromRow) * grid.cellSizeY;
            var nx = -dy / distance, ny = dx / distance;
            var midX = grid.xMin + ((fromCol + toCol) * 0.5 + 0.5) * grid.cellSizeX;
            var midY = grid.yMax - ((fromRow + toRow) * 0.5 + 0.5) * grid.cellSizeY;
            var offset = options.valleySampleDistanceM;
            var sideA = sampleNearestElevation(grid, midX + nx * offset, midY + ny * offset, elevations);
            var sideB = sampleNearestElevation(grid, midX - nx * offset, midY - ny * offset, elevations);
            if (Number.isFinite(sideA) && Number.isFinite(sideB)) {
                var valleyDepth = Math.min(sideA, sideB) - (elevations[from] + elevations[to]) * 0.5 -
                    options.valleyFloorThresholdM;
                if (valleyDepth > 0) {
                    var intensity = Math.min(1, valleyDepth / options.valleyFloorDepthForMaxPenaltyM);
                    cost *= 1 + (options.valleyFloorPenalty - 1) * intensity;
                }
            }
        }

        return cost;
    }

    function terrainSlopeMask(grid, elevations, maximumDegrees) {
        if (maximumDegrees == null)
            return null;
        var blocked = new Uint8Array(elevations.length);
        var width = grid.width;
        var height = grid.height;
        var sx = grid.cellSizeX;
        var sy = grid.cellSizeY;
        var blockedCount = 0;

        function value(row, col) {
            if (row < 0 || col < 0 || row >= height || col >= width)
                return NaN;
            return elevations[row * width + col];
        }

        for (var row = 0; row < height; row++) {
            for (var col = 0; col < width; col++) {
                var index = row * width + col;
                if (!Number.isFinite(elevations[index])) {
                    blocked[index] = 1;
                    blockedCount++;
                    continue;
                }
                var nw = value(row - 1, col - 1), n = value(row - 1, col), ne = value(row - 1, col + 1);
                var w = value(row, col - 1), e = value(row, col + 1);
                var sw = value(row + 1, col - 1), s = value(row + 1, col), se = value(row + 1, col + 1);
                if (![nw, n, ne, w, e, sw, s, se].every(Number.isFinite))
                    continue;
                var dzdx = ((ne + 2 * e + se) - (nw + 2 * w + sw)) / (8 * sx);
                var dzdy = ((sw + 2 * s + se) - (nw + 2 * n + ne)) / (8 * sy);
                var slopeDegrees = Math.atan(Math.hypot(dzdx, dzdy)) * 180 / Math.PI;
                if (slopeDegrees > maximumDegrees) {
                    blocked[index] = 1;
                    blockedCount++;
                }
            }
        }
        return {cells: blocked, blockedCount: blockedCount};
    }

    function findPath(grid, request) {
        if (!grid || !request)
            throw new Error("La grille et la demande de calcul sont nécessaires.");
        if (!Number.isInteger(grid.width) || !Number.isInteger(grid.height) ||
                grid.width < 2 || grid.height < 2)
            throw new Error("La grille doit avoir au moins 2 colonnes et 2 lignes.");
        var count = grid.width * grid.height;
        if (count > (request.maxCells || DEFAULTS.maxCells))
            throw new Error("Grille trop grande pour ce calcul. Réduisez sa résolution ou son emprise.");
        if (!grid.elevations || grid.elevations.length !== count)
            throw new Error("La grille d'altitudes ne correspond pas à ses dimensions.");
        if (grid.friction && grid.friction.length !== count)
            throw new Error("La grille de friction ne correspond pas aux altitudes.");
        [grid.xMin, grid.yMax, grid.cellSizeX, grid.cellSizeY,
            request.startX, request.startY, request.endX, request.endY].forEach(function (v, i) {
            requireFinite(v, "Coordonnée ou résolution " + (i + 1));
        });
        if (grid.cellSizeX <= 0 || grid.cellSizeY <= 0)
            throw new Error("Les résolutions X et Y doivent être positives.");

        function checkTimeLimit() {
            if (request.deadlineAt == null) return;
            var now = typeof performance !== "undefined" && performance.now
                ? performance.now() : Date.now();
            if (now >= request.deadlineAt) {
                var error = new Error("Temps maximal de recherche écoulé ; le calcul s’arrête sans conclure qu’il n’existe pas de trajet.");
                error.code = "TIME_BUDGET";
                throw error;
            }
        }
        checkTimeLimit();

        var options = Object.assign({}, DEFAULTS, request.options || {});
        if (!Array.isArray(options.walkCoefficients) || options.walkCoefficients.length !== 4)
            throw new Error("walkCoefficients doit contenir les quatre coefficients du modèle.");
        [options.maxDirectSlopeDeg, options.maxTerrainSlopeDeg].forEach(function (value, index) {
            if (value != null && (!Number.isFinite(value) || value < 0 || value > 89))
                throw new Error("Le seuil de pente " + (index + 1) + " doit être compris entre 0 et 89 degrés.");
        });
        if (options.steepSlopeThresholdDeg != null &&
                (!Number.isFinite(options.steepSlopeThresholdDeg) || options.steepSlopeThresholdDeg < 0 || options.steepSlopeThresholdDeg > 89))
            throw new Error("Le seuil de pénalité doit être compris entre 0 et 89 degrés.");
        if (!Number.isFinite(options.steepSlopeMultiplier) || options.steepSlopeMultiplier < 1)
            throw new Error("Le multiplicateur de pente raide doit être supérieur ou égal à 1.");
        if (!Number.isFinite(options.valleyFloorPenalty) || options.valleyFloorPenalty < 1 ||
                !Number.isFinite(options.valleyFloorThresholdM) || options.valleyFloorThresholdM < 0 ||
                !Number.isFinite(options.valleySampleDistanceM) || options.valleySampleDistanceM <= 0 ||
                !Number.isFinite(options.valleyFloorDepthForMaxPenaltyM) || options.valleyFloorDepthForMaxPenaltyM <= 0)
            throw new Error("Les paramètres expérimentaux d’évitement du fond de vallée sont invalides.");
        if (options.maxDirectSlopeDeg != null && options.maxTerrainSlopeDeg != null &&
                options.maxTerrainSlopeDeg < options.maxDirectSlopeDeg)
            throw new Error("La pente maximale praticable doit être supérieure ou égale à la pente maximale directe.");

        var elevations = grid.elevations;
        var frictions = grid.friction || null;
        var allowedCells = request.allowedCells || null;
        if (allowedCells && allowedCells.length !== count)
            throw new Error("Le corridor de référence ne correspond pas à la grille.");
        var terrainMask = terrainSlopeMask(grid, elevations, options.maxTerrainSlopeDeg);
        var start = cellIndex(request.startX, request.startY, grid);
        var goal = cellIndex(request.endX, request.endY, grid);
        if (!Number.isFinite(elevations[start]) || !Number.isFinite(elevations[goal]))
            throw new Error("Le départ ou l'arrivée tombe sur une cellule sans altitude.");
        if (allowedCells && (!allowedCells[start] || !allowedCells[goal]))
            throw new Error("Une extrémité est hors du corridor du trajet de référence.");
        if (terrainMask && (terrainMask.cells[start] || terrainMask.cells[goal]))
            throw new Error("Le départ ou l'arrivée dépasse la pente maximale praticable.");
        if (frictions && (!Number.isFinite(frictions[start]) || !Number.isFinite(frictions[goal])))
            throw new Error("Le départ ou l'arrivée tombe sur une cellule sans valeur de friction.");

        var costs = new Float64Array(count);
        costs.fill(Infinity);
        var previous = new Int32Array(count);
        previous.fill(-1);
        var closed = new Uint8Array(count);
        var heap = new MinHeap();
        costs[start] = 0;
        heap.push(start, 0);

        var directions = [
            [-1, -1, Math.hypot(grid.cellSizeX, grid.cellSizeY)],
            [0, -1, grid.cellSizeY],
            [1, -1, Math.hypot(grid.cellSizeX, grid.cellSizeY)],
            [-1, 0, grid.cellSizeX], [1, 0, grid.cellSizeX],
            [-1, 1, Math.hypot(grid.cellSizeX, grid.cellSizeY)],
            [0, 1, grid.cellSizeY],
            [1, 1, Math.hypot(grid.cellSizeX, grid.cellSizeY)]
        ];

        var visited = 0;
        var current;
        while ((current = heap.pop()) !== null) {
            var from = current.id;
            if (closed[from] || current.value !== costs[from])
                continue;
            closed[from] = 1;
            visited++;
            if (from === goal)
                break;

            var row = Math.floor(from / grid.width);
            var col = from - row * grid.width;
            for (var d = 0; d < directions.length; d++) {
                var nc = col + directions[d][0];
                var nr = row + directions[d][1];
                if (nc < 0 || nr < 0 || nc >= grid.width || nr >= grid.height)
                    continue;
                var to = nr * grid.width + nc;
                if (closed[to] || !Number.isFinite(elevations[to]) ||
                        (allowedCells && !allowedCells[to]) ||
                        (terrainMask && terrainMask.cells[to]) ||
                        (frictions && !Number.isFinite(frictions[to])))
                    continue;
                if (options.maxDirectSlopeDeg != null &&
                        Math.atan(Math.abs(elevations[to] - elevations[from]) / directions[d][2]) * 180 / Math.PI >
                            options.maxDirectSlopeDeg)
                    continue;
                var candidate = costs[from] + edgeCost(from, to, directions[d][2], elevations, frictions, options, grid);
                if (candidate < costs[to]) {
                    costs[to] = candidate;
                    previous[to] = from;
                    heap.push(to, candidate);
                }
            }
            if ((visited & 4095) === 0) {
                checkTimeLimit();
                if (request.onProgress)
                    request.onProgress({visited: visited, frontier: heap.ids.length});
            }
        }

        if (!closed[goal])
            throw new Error("Aucun itinéraire ne relie ces deux points dans la grille.");

        var indices = [];
        for (var at = goal; at !== -1; at = previous[at]) {
            indices.push(at);
            if (at === start)
                break;
        }
        if (indices[indices.length - 1] !== start)
            throw new Error("La reconstruction de l'itinéraire a échoué.");
        indices.reverse();

        var coordinates = indices.map(function (index) {
            var r = Math.floor(index / grid.width);
            var c = index - r * grid.width;
            return [
                grid.xMin + (c + 0.5) * grid.cellSizeX,
                grid.yMax - (r + 0.5) * grid.cellSizeY,
                elevations[index]
            ];
        });

        return {
            coordinates: coordinates,
            cellIndices: indices,
            estimatedCostSeconds: costs[goal],
            visitedCells: visited,
            blockedTerrainCells: terrainMask ? terrainMask.blockedCount : 0,
            startCell: start,
            endCell: goal
        };
    }

    return {findPath: findPath, defaults: Object.assign({}, DEFAULTS)};
}));
