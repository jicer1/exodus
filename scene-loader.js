"use strict";
// Reads existing exported geometry without opening or changing the Blender file.
// Export coordinates stay east/north/up, in metres, in a right-handed scene.
window.HuertaSceneLoader = async function(scene, url, progress) {
    const B = BABYLON;
    async function response(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status + " — " + url);
        return r;
    }
    const data = await (await response(url)).json();
    const base = new URL(".", new URL(url, location.href));
    const binary = data.binaries[0];
    const buffer = await (await response(new URL(binary.binfile, base))).arrayBuffer();
    const view = new DataView(buffer);
    // The first 12 bytes contain the Blend4Web binary signature and version.
    function array(part, type) {
        const sizes = {int:4, float:4, short:2};
        const offset = 12 + binary[type] + part[0] * sizes[type];
        if (offset + part[1] * sizes[type] > buffer.byteLength)
            throw new Error("Invalid geometry buffer range");
        if (type === "int") return new Uint32Array(buffer, offset, part[1]);
        if (type === "float") return new Float32Array(buffer, offset, part[1]);
        return Float32Array.from({length:part[1]}, (_, i) => view.getInt16(offset + i*2, true)/32767);
    }
    const lookup = key => new Map(data[key].map(x => [x.uuid, x]));
    const meshes = lookup("meshes"), materials = lookup("materials");
    const textures = lookup("textures"), images = lookup("images");
    const textureCache = new Map(), objects = new Map();
    const warnings = [];
    class LinearLambert extends B.MaterialPluginBase {
        constructor(material) {super(material, "HuertaLinearLambert", 200, {}); this._enable(true);}
        getClassName() {return "HuertaLinearLambert";}
        getCustomCode(shaderType) {
            if(shaderType !== "fragment") return null;
            // Blend4Web's SRGB_SIMPLE mode shades a gamma-decoded satellite
            // image, then converts the resulting linear light back to sRGB.
            return {
                CUSTOM_FRAGMENT_BEFORE_LIGHTS: "baseColor.rgb = pow(max(baseColor.rgb, vec3(0.0)), vec3(2.2));",
                CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: "color.rgb = pow(max(color.rgb, vec3(0.0)), vec3(1.0 / 2.2));"
            };
        }
    }
    function makeMaterial(source) {
        if (source.use_nodes) warnings.push("Node material: " + source.name);
        const m = new B.StandardMaterial(source.name, scene);
        new LinearLambert(m);
        m.diffuseColor = B.Color3.FromArray(source.diffuse_color).scale(source.diffuse_intensity);
        m.specularColor = B.Color3.FromArray(source.specular_color).scale(source.specular_intensity);
        m.specularPower = source.specular_hardness;
        m.alpha = source.alpha;
        m.backFaceCulling = source.game_settings.use_backface_culling;
        m.sideOrientation = B.Material.CounterClockWiseSideOrientation;
        m.disableLighting = source.use_shadeless;
        for (const slot of source.texture_slots || []) {
            if (!slot.use_map_color_diffuse) continue;
            const tex = textures.get(slot.texture.uuid), img = images.get(tex.image?.uuid);
            if (!img) { warnings.push("Unsupported texture: " + tex.name); continue; }
            const path = new URL(img.filepath.replace(/\\/g,"/"), base).href;
            if (!textureCache.has(path)) {
                let texture;
                const ready = new Promise((resolve,reject) => {
                    texture = new B.Texture(path,scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE,
                        resolve, (message,exception) => reject(new Error("Texture: " + path + " — " + (exception?.message || message))));
                });
                // Attach a handler immediately, while geometry continues loading;
                // the original promise remains rejected for the awaited loader.
                ready.catch(() => {});
                textureCache.set(path,{texture,ready});
            }
            m.diffuseTexture = textureCache.get(path).texture;
        }
        return m;
    }
    const convertedMaterials = new Map();
    const sourceObjects = data.objects.filter(x => x.type === "MESH");
    for (let n = 0; n < sourceObjects.length; n++) {
        const object = sourceObjects[n], source = meshes.get(object.data.uuid);
        if (source.submeshes.length !== 1) throw new Error("Multiple submeshes: " + object.name);
        if (object.parent || object.animation_data || object.modifiers.length)
            throw new Error("Unsupported object transform/animation: " + object.name);
        const sub = source.submeshes[0];
        const mesh = new B.Mesh(object.name, scene), geometry = new B.VertexData();
        geometry.positions = array(sub.position, "float");
        geometry.indices = array(sub.indices, "int");
        geometry.normals = array(sub.normal, "short");
        if (sub.texcoord[1]) geometry.uvs = array(sub.texcoord, "float").subarray(0, sub.base_length*2);
        geometry.applyToMesh(mesh);
        mesh.position.copyFromFloats(...object.location);
        mesh.scaling.copyFromFloats(...object.scale);
        const q = object.rotation_quaternion;
        mesh.rotationQuaternion = new B.Quaternion(q[1], q[2], q[3], q[0]);
        const id = source.materials[0].uuid;
        if (!convertedMaterials.has(id)) convertedMaterials.set(id, makeMaterial(materials.get(id)));
        mesh.material = convertedMaterials.get(id);
        mesh.isVisible = !object.b4w_do_not_render && !object.b4w_hidden_on_load;
        mesh.isPickable = object.name === HuertaConfig.collision;
        if (mesh.isPickable) {
            mesh.isVisible = false;
            // Keep every triangle, but accelerate altitude queries for marker
            // layers with spatially bounded strips and a picking octree.
            mesh.subdivide(128);
            mesh.createOrUpdateSubmeshesOctree(16,4);
            mesh.useOctreeForPicking = true;
        }
        mesh.computeWorldMatrix(true);
        objects.set(object.name, mesh);
        progress?.(10 + Math.floor(70*(n+1)/sourceObjects.length));
        if (n % 40 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    for (const object of data.objects.filter(x => x.type === "LAMP")) {
        const source = lookup("lamps").get(object.data.uuid);
        const q = object.rotation_quaternion;
        const direction = new B.Vector3(0,0,-1).applyRotationQuaternion(new B.Quaternion(q[1],q[2],q[3],q[0]));
        const light = new B.DirectionalLight(object.name, direction, scene);
        light.intensity = source.energy;
        light.diffuse = B.Color3.FromArray(source.color);
        light.specular = source.use_specular ? light.diffuse : B.Color3.Black();
    }
    const cameraSource = data.cameras[0];
    const cameraObject = data.objects.find(object => object.type === "CAMERA" && object.data.uuid === cameraSource.uuid);
    const camera = new B.FreeCamera(cameraSource.name, B.Vector3.FromArray(cameraObject.location), scene);
    camera.minZ = cameraSource.clip_start; camera.maxZ = cameraSource.clip_end;
    camera.fovMode = B.Camera.FOVMODE_HORIZONTAL_FIXED;
    camera.fov = cameraSource.angle;
    // AUTO fits the larger viewport dimension in the original engine.
    if(cameraSource.sensor_fit === "AUTO") {
        const fit = () => {camera.fovMode = scene.getEngine().getAspectRatio(camera)>1
            ? B.Camera.FOVMODE_HORIZONTAL_FIXED : B.Camera.FOVMODE_VERTICAL_FIXED;};
        fit(); scene.getEngine().onResizeObservable.add(fit);
    }
    const cameraQ = cameraObject.rotation_quaternion;
    camera.rotationQuaternion = new B.Quaternion(cameraQ[1],cameraQ[2],cameraQ[3],cameraQ[0]).normalize();
    // The quaternion maps local screen-up (+Y) to world space. World vertical
    // (+Z) is used by the application to correct roll, not as camera-local up.
    camera.updateUpVectorFromRotation = true;
    camera.upVector = new B.Vector3(0,1,0);
    scene.activeCamera = camera;
    await Promise.all([...textureCache.values()].map(entry => entry.ready));
    progress?.(100);
    return {objects, camera, warnings, source:data};
};
