"use strict";

// Navigation belongs only to the Earth scene. Coordinates stay spherical.
window.createExodusNavigation = function (B, scene, camera, canvas, radius, minimumAltitude, maximumRadius) {
    let active = false, drag = null, selection = false;
    let target = B.Vector3.Zero(), up = new B.Vector3(0, 0, 1);
    const floorRadius = radius + minimumAltitude;
    const marker = B.MeshBuilder.CreateSphere("Earth navigation pivot", {diameter: 1, segments: 12}, scene);
    const material = new B.StandardMaterial("Earth pivot colour", scene);
    material.emissiveColor = new B.Color3(1, .65, .15);
    material.disableLighting = true;
    marker.material = material;
    marker.isPickable = false;
    marker.setEnabled(false);

    function refresh() {
        if (selection) {
            const normal = camera.position.normalizeToNew();
            target = normal.scale(radius);
            up = new B.Vector3(0, 0, 1).subtract(normal.scale(normal.z));
            if (up.lengthSquared() < 1e-12) up = new B.Vector3(0, 1, 0);
            up.normalize();
        }
        const height = Math.max(minimumAltitude, camera.position.length() - radius);
        camera.minZ = Math.max(.0001, Math.min(1, height * .05));
        camera.upVector.copyFrom(up);
        camera.rotationQuaternion = B.Quaternion.FromRotationMatrix(
            B.Matrix.LookAtRH(camera.position, target, up).invert());
        marker.scaling.setAll(Math.max(.005, height * .012));
        camera.getViewMatrix(true);
    }
    function surfaceAt(x, y) {
        // Build the ray in double precision. Inverting a float32 view matrix
        // loses accuracy when a kilometre-high camera views a planet-sized mesh.
        const engine = scene.getEngine(), width = engine.getRenderWidth(), height = engine.getRenderHeight();
        const forward = target.subtract(camera.position).normalize();
        const right = B.Vector3.Cross(forward, up).normalize();
        const screenUp = B.Vector3.Cross(right, forward).normalize();
        const half = Math.tan(camera.fov / 2);
        const direction = forward.add(right.scale((2 * x / width - 1) * half * width / height))
            .add(screenUp.scale((1 - 2 * y / height) * half)).normalize();
        const b = B.Vector3.Dot(camera.position, direction);
        const c = camera.position.lengthSquared() - radius * radius;
        const discriminant = b * b - c;
        if (discriminant < 0) return null;
        const distance = -b - Math.sqrt(discriminant);
        return distance >= 0 ? camera.position.add(direction.scale(distance)) : null;
    }
    function point(event) {
        const rect = canvas.getBoundingClientRect();
        return [(event.clientX - rect.left) * scene.getEngine().getRenderWidth() / rect.width,
            (event.clientY - rect.top) * scene.getEngine().getRenderHeight() / rect.height];
    }
    function rotate(vector, axis, angle) {
        const normal = axis.normalizeToNew(), cosine = Math.cos(angle), sine = Math.sin(angle);
        return vector.scale(cosine).add(B.Vector3.Cross(normal, vector).scale(sine))
            .add(normal.scale(B.Vector3.Dot(normal, vector) * (1 - cosine)));
    }
    function zoom(pivot, factor) {
        const offset = camera.position.subtract(pivot);
        let next = pivot.add(offset.scale(factor));
        // Clamp along the same sight line rather than pushing the camera sideways.
        if (next.length() < floorRadius || next.length() > maximumRadius) {
            let valid = 1, invalid = factor;
            for (let i = 0; i < 40; i++) {
                const mid = (valid + invalid) / 2;
                const length = pivot.add(offset.scale(mid)).length();
                if (length >= floorRadius && length <= maximumRadius) valid = mid;
                else invalid = mid;
            }
            next = pivot.add(offset.scale(valid));
        }
        if (!selection) target.addInPlace(next.subtract(camera.position));
        camera.position.copyFrom(next);
        refresh();
    }
    canvas.addEventListener("wheel", event => {
        if (!active) return;
        event.preventDefault();
        const [x, y] = point(event);
        const pivot = selection ? camera.position.normalizeToNew().scale(radius) : surfaceAt(x, y) || B.Vector3.Zero();
        const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? canvas.clientHeight : 1;
        const delta = Math.max(-400, Math.min(400, event.deltaY * unit));
        zoom(pivot, Math.exp(delta * .002));
    }, {passive: false});
    canvas.addEventListener("contextmenu", event => { if (active) event.preventDefault(); });
    canvas.addEventListener("pointerdown", event => {
        if (!active || drag || event.button > 2) return;
        event.preventDefault();
        const [x, y] = point(event);
        const pivot = surfaceAt(x, y);
        if (!pivot) return;
        canvas.setPointerCapture(event.pointerId);
        drag = {id: event.pointerId, button: event.button, x, y, pivot};
        marker.position.copyFrom(pivot.scale(1.00001));
        marker.setEnabled(event.button === 2);
    });
    canvas.addEventListener("pointermove", event => {
        if (!active || !drag || drag.id !== event.pointerId) return;
        event.preventDefault();
        const [x, y] = point(event), dx = x - drag.x, dy = y - drag.y;
        if (selection && (drag.button === 0 || drag.button === 1)) {
            // Left and middle buttons pan the ground under the fixed selection
            // frame. Pixel motion is scaled by altitude, without orbit feedback.
            const normal = camera.position.normalizeToNew();
            const right = B.Vector3.Cross(normal.scale(-1), up).normalize();
            const units = 2 * (camera.position.length()-radius) * Math.tan(camera.fov/2) / scene.getEngine().getRenderHeight();
            const shift = right.scale(-dx*units).add(up.scale(dy*units));
            const distance = shift.length();
            if (distance > 0) {
                const next = normal.scale(Math.cos(distance/radius)).add(shift.scale(Math.sin(distance/radius)/distance));
                camera.position.copyFrom(next.scale(camera.position.length()));
            }
        } else if (drag.button === 0) {
            const hit = surfaceAt(x, y);
            if (hit) {
                // Grab the surface: rotate the camera frame so the grabbed point
                // stays under the cursor, including across the meridian and poles.
                const from = hit.normalizeToNew(), to = drag.pivot.normalizeToNew();
                const axis = B.Vector3.Cross(from, to);
                if (axis.lengthSquared() > 1e-16) {
                    const angle = Math.acos(Math.max(-1, Math.min(1, B.Vector3.Dot(from, to))));
                    camera.position.copyFrom(rotate(camera.position, axis, angle));
                    target = rotate(target, axis, angle);
                    up = rotate(up, axis, angle);
                }
            }
        } else if (selection) {
            zoom(camera.position.normalizeToNew().scale(radius), Math.exp(Math.max(-.8, Math.min(.8, dy * .004))));
        } else {
            const pivot = drag.pivot, normal = pivot.normalizeToNew();
            let offset = camera.position.subtract(pivot);
            let direction = target.subtract(camera.position);
            const yaw = -dx * .0025;
            offset = rotate(offset, normal, yaw);
            direction = rotate(direction, normal, yaw);
            let nextUp = rotate(up, normal, yaw);
            if (drag.button === 1) {
                const right = B.Vector3.Cross(direction.normalizeToNew(), nextUp).normalize();
                const tilted = rotate(offset, right, dy * .002);
                // Keep the eye above the tangent plane, with a usable horizon.
                if (B.Vector3.Dot(tilted.normalizeToNew(), normal) > .08) {
                    offset = tilted;
                    direction = rotate(direction, right, dy * .002);
                    nextUp = rotate(nextUp, right, dy * .002);
                }
            }
            const next = pivot.add(offset);
            if (next.length() >= floorRadius && next.length() <= maximumRadius) {
                camera.position.copyFrom(next);
                target = next.add(direction);
                up = nextUp;
            }
            if (drag.button === 2) zoom(pivot, Math.exp(Math.max(-.8, Math.min(.8, dy * .004))));
        }
        drag.x = x; drag.y = y;
        refresh();
    });
    function release(event) {
        if (!drag || (event && event.pointerId !== undefined && event.pointerId !== drag.id)) return;
        const id = drag.id;
        drag = null;
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        marker.setEnabled(false);
    }
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(event, release);
    window.addEventListener("blur", () => release());
    refresh();
    return {
        keyboard(key, shift) {
            if (!active) return false;
            release();
            if (key === " ") return true;
            const pivot = surfaceAt(scene.getEngine().getRenderWidth()/2, scene.getEngine().getRenderHeight()/2)
                || camera.position.normalizeToNew().scale(radius);
            const normal = pivot.normalizeToNew();
            const forward = target.subtract(camera.position).normalize();
            const right = B.Vector3.Cross(forward, up).normalize();
            const height = Math.max(minimumAltitude, camera.position.length() - radius);
            if (key.startsWith("Arrow")) {
                const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
                const vertical = key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
                if (shift && !selection) {
                    const axis = horizontal ? normal : right;
                    const angle = (horizontal ? -horizontal : -vertical) * .03;
                    const offset = rotate(camera.position.subtract(pivot), axis, angle);
                    const next = pivot.add(offset);
                    if (next.length() >= floorRadius && next.length() <= maximumRadius && B.Vector3.Dot(offset.normalizeToNew(), normal) > .02) {
                        camera.position.copyFrom(next);
                        target = next.add(rotate(forward, axis, angle));
                        up = rotate(up, axis, angle);
                    }
                } else {
                    const direction = right.scale(horizontal).add(B.Vector3.Cross(normal, right).scale(vertical));
                    const axis = B.Vector3.Cross(normal, direction).normalize();
                    const angle = Math.min(.04, height / radius * .035);
                    camera.position.copyFrom(rotate(camera.position, axis, angle));
                    target = rotate(target, axis, angle); up = rotate(up, axis, angle);
                }
            } else if (key === "PageUp" || key === "PageDown") {
                if (shift) {
                    const next = camera.position.normalizeToNew().scale(Math.max(floorRadius, Math.min(maximumRadius,
                        camera.position.length() + (key === "PageUp" ? 1 : -1) * height * .04)));
                    target.addInPlace(next.subtract(camera.position)); camera.position.copyFrom(next);
                } else zoom(pivot, key === "PageUp" ? .92 : 1.08);
            } else if (["n","u","r","o"].includes(key)) {
                let north = new B.Vector3(0,0,1).subtract(normal.scale(normal.z));
                if (north.lengthSquared() < 1e-12) north = new B.Vector3(0,1,0);
                north.normalize();
                const offset = camera.position.subtract(pivot), distance = offset.length();
                let tangent = offset.subtract(normal.scale(B.Vector3.Dot(offset, normal)));
                if (tangent.lengthSquared() < 1e-12) tangent = north.scale(-1);
                tangent.normalize();
                let tilt = Math.acos(Math.max(-1, Math.min(1, B.Vector3.Dot(offset.normalizeToNew(), normal))));
                if (key === "n" || key === "r") tangent = north.scale(-1);
                if (key === "u" || key === "r") tilt = 0;
                if (key === "o") tilt = tilt > .1 ? 0 : Math.PI/4;
                camera.position.copyFrom(pivot.add(normal.scale(distance*Math.cos(tilt))).add(tangent.scale(distance*Math.sin(tilt))));
                target = pivot; up = tilt < .001 ? tangent.scale(-1) : normal;
            } else return false;
            refresh(); return true;
        },
        setActive(value) {active = value; if (!value) release(); refresh();},
        setSelection(value) { selection = value; release(); },
        centre() {
            return surfaceAt(scene.getEngine().getRenderWidth() / 2, scene.getEngine().getRenderHeight() / 2);
        },
        focus(surface, height) {
            release();
            const normal = surface.normalizeToNew();
            camera.position.copyFrom(normal.scale(radius + Math.max(minimumAltitude, height)));
            target = surface.clone();
            up = new B.Vector3(0, 0, 1).subtract(normal.scale(normal.z));
            if (up.lengthSquared() < 1e-12) up = new B.Vector3(0, 1, 0);
            up.normalize();
            refresh();
        }
    };
};
