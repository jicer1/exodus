"use strict";
// Small Babylon-backed application API. No Blend4Web engine is loaded.
(() => {
    const B = BABYLON, factories = new Map(), modules = new Map(), loops = [];
    const state = window.HuertaMigration = {ready:false, errors:[], warnings:[], frames:0};
    let engine, scene, canvas, loaded, rayId = 0;
    const rayQueue = [];
    let rayQueueScheduled = false;
    function scheduleRay(task) {
        rayQueue.push(task);
        if (rayQueueScheduled) return;
        rayQueueScheduled = true;
        const flush = () => {
            const deadline=performance.now()+8;
            while(rayQueue.length && performance.now()<deadline) rayQueue.shift()();
            if(rayQueue.length) setTimeout(flush,0);
            else rayQueueScheduled=false;
        };
        setTimeout(flush,0);
    }
    const v = p => B.Vector3.FromArray(p);
    const q = p => B.Quaternion.FromArray(p);
    const copy = (a,d) => {d = d || new Float32Array(a.length); d.set(a); return d;};
    function require(name) {
        if (!modules.has(name)) {
            const factory = factories.get(name);
            if (!factory) throw new Error("Unknown application module: " + name);
            const exports = {}; modules.set(name, exports); factory(exports, require);
        }
        return modules.get(name);
    }
    window.HuertaRuntime = {register:(name,factory) => factories.set(name,factory), require};
    const loaderLabel = () => document.getElementById("migration_loading");
    const reportError = error => {
        state.errors.push(error.stack || String(error));
        loaderLabel().hidden = false;
        loaderLabel().textContent = "Erreur : " + error.message;
        console.error(error);
    };
    window.addEventListener("error", e => state.errors.push(e.message));
    window.addEventListener("unhandledrejection", e => reportError(e.reason));
    modules.set("app", {
        init(options) {
            // Existing modules are parsed in the head; initialize after the body exists.
            const start = () => {
                canvas = document.createElement("canvas"); canvas.id = "huerta_babylon_canvas";
                canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
                document.getElementById(options.canvas_container_id).appendChild(canvas);
                engine = new B.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});
                engine.setHardwareScalingLevel(1);
                scene = new B.Scene(engine); scene.useRightHandedSystem = true;
                // Preserve compatibility mouse events for the original navigation handlers.
                // Babylon's default pointerdown cancellation suppresses native mousedown.
                scene.preventDefaultOnPointerDown = false;
                scene.preventDefaultOnPointerUp = false;
                scene.clearColor = B.Color4.FromArray(HuertaConfig.background);
                scene.imageProcessingConfiguration.isEnabled = false;
                // Ciel procédural léger, orienté selon le Z vertical du paysage.
                B.Effect.ShadersStore.exodusSkyVertexShader = `
                    precision highp float;
                    attribute vec3 position;
                    uniform mat4 worldViewProjection;
                    varying vec3 skyDirection;
                    void main() {
                        skyDirection=position;
                        gl_Position=worldViewProjection*vec4(position,1.0);
                        gl_Position.z=gl_Position.w*0.999999;
                    }`;
                B.Effect.ShadersStore.exodusSkyFragmentShader = `
                    precision highp float;
                    varying vec3 skyDirection;
                    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
                    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
                        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                            mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
                    float cloud(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.07)+.05*noise(p*8.1);}
                    void main(){
                        vec3 d=normalize(skyDirection);
                        float height=max(d.z,0.0);
                        vec3 horizon=vec3(.83,.89,.91), zenith=vec3(.19,.43,.70);
                        vec3 color=mix(horizon,zenith,pow(height,.48));
                        vec3 sun=normalize(vec3(-.45,.65,.43));
                        float alignment=max(dot(d,sun),0.0);
                        color+=vec3(1.0,.79,.48)*pow(alignment,18.0)*.13;
                        color=mix(color,vec3(1.0,.96,.83),smoothstep(.99945,.9998,alignment)*.8);
                        vec2 uv=d.xy/max(d.z+.12,.08)*1.8;
                        float cover=smoothstep(.49,.69,cloud(uv));
                        float veil=smoothstep(.025,.18,d.z)*(1.0-smoothstep(.7,1.0,d.z));
                        color=mix(color,vec3(.97,.97,.95),cover*veil*.82);
                        color=mix(vec3(.81,.85,.85),color,smoothstep(-.22,.02,d.z));
                        gl_FragColor=vec4(color,1.0);
                    }`;
                const sky=B.MeshBuilder.CreateSphere("exodus-sky",{diameter:2000,segments:24},scene);
                sky.isPickable=false;sky.infiniteDistance=true;sky.alwaysSelectAsActiveMesh=true;
                const skyMaterial=new B.ShaderMaterial("exodus-sky-material",scene,
                    {vertex:"exodusSky",fragment:"exodusSky"},
                    {attributes:["position"],uniforms:["worldViewProjection"]});
                skyMaterial.backFaceCulling=false;skyMaterial.disableDepthWrite=true;
                sky.material=skyMaterial;

                state.engine = engine; state.scene = scene; state.canvas = canvas;
                window.addEventListener("resize", () => engine.resize());
                engine.runRenderLoop(() => {
                    if (!loaded) return;
                    for (const callback of loops) callback(performance.now()/1000, engine.getDeltaTime()/1000);
                    scene.render(); state.frames++;
                });
                options.callback(canvas,true);
            };
            if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
            else start();
        },
        disable_camera_controls() {}
    });
    modules.set("config", {get_assets_path:() => HuertaConfig.assets, set() {}});
    modules.set("version", {type:() => "RELEASE"});
    modules.set("preloader", {
        create_preloader() {loaderLabel().hidden = false;},
        update_preloader(n) {loaderLabel().textContent = "Chargement du terrain… " + n + "%"; if(n===100) loaderLabel().hidden=true;}
    });
    modules.set("main", {append_loop_cb:cb => loops.push(cb)});
    modules.set("data", {load(url,callback,progress) {
        HuertaSceneLoader(scene,url,progress).then(result => {
            loaded = result; state.loaded = loaded; state.warnings.push(...result.warnings);
            callback(1,true); state.ready = true;
        }).catch(reportError);
    }});
    modules.set("scenes", {
        get_active_camera:() => loaded?.camera || null,
        get_object_by_name:name => loaded?.objects.get(name) || null,
        get_object_name:obj => obj.name,
        hide_object:obj => {obj.isVisible = false;},
        show_object:obj => {obj.isVisible = true;},
        change_visibility:(obj,hide) => {obj.isVisible=!hide; if(obj.mesh) obj.mesh.isVisible=!hide;}
    });
    modules.set("camera", {
        get_translation:(cam,dest) => copy(cam.position.asArray(),dest),
        set_translation:(cam,pos) => cam.position.copyFrom(v(pos)),
        static_get_rotation:(cam,dest) => copy(cam.rotationQuaternion.asArray(),dest),
        static_set_rotation:(cam,rotation) => {cam.rotationQuaternion.copyFrom(q(rotation));},
        static_setup(cam,options) {
            cam.position.copyFrom(v(options.pos));
            const dir = v(options.look_at).subtract(cam.position).normalize();
            const from = new B.Vector3(0,0,-1);
            B.Quaternion.FromUnitVectorsToRef(from,dir,cam.rotationQuaternion);
        },
        set_vertical_axis(cam,axis) {cam.huertaVerticalAxis = v(axis);},
        correct_up(cam,axis,strict) {
            // Preserve the original roll correction, including the vertical-view case.
            let rotation = cam.rotationQuaternion;
            const up = v(axis), z = new B.Vector3(0,0,1).applyRotationQuaternion(rotation).normalize();
            if (Math.abs(B.Vector3.Dot(up,z)) <= 0.999999) {
                let xNew = B.Vector3.Cross(up,z).normalize();
                const minusY = new B.Vector3(0,-1,0).applyRotationQuaternion(rotation);
                if(B.Vector3.Dot(minusY,up)>0) xNew.negateInPlace();
                const x = new B.Vector3(1,0,0).applyRotationQuaternion(rotation).normalize();
                let correction = B.Quaternion.Identity();
                if(B.Vector3.Dot(x,xNew)<=-0.999999) correction=B.Quaternion.RotationAxis(z,Math.PI);
                else B.Quaternion.FromUnitVectorsToRef(x,xNew,correction);
                rotation = correction.multiply(rotation).normalize();
            }
            if (strict && B.Vector3.Dot(new B.Vector3(0,1,0).applyRotationQuaternion(rotation),up)<0)
                rotation = rotation.multiply(B.Quaternion.RotationAxis(new B.Vector3(0,0,1),Math.PI));
            cam.rotationQuaternion.copyFrom(rotation);
        },
        get_view_vector:(cam,dest) => copy(new B.Vector3(0,0,-1).applyRotationQuaternion(cam.rotationQuaternion).asArray(),dest),
        calc_ray(cam,x,y) {
            cam.getViewMatrix(); cam.getProjectionMatrix();
            const ray = scene.createPickingRay(x,y,B.Matrix.Identity(),cam,false);
            // Application rays start at the camera, not the near clipping plane.
            return new Float32Array([...cam.position.asArray(),...ray.direction.asArray()]);
        },
        project_point(cam,point,dest) {
            const transform = cam.getViewMatrix().multiply(cam.getProjectionMatrix());
            const viewport = cam.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
            const p = B.Vector3.Project(v(point),B.Matrix.Identity(),transform,viewport);
            const forward = new B.Vector3(0,0,-1).applyRotationQuaternion(cam.rotationQuaternion);
            if(B.Vector3.Dot(v(point).subtract(cam.position),forward)<=0) p.z=-1;
            return copy(p.asArray(),dest);
        }
    });
    modules.set("mouse", {get_coords_x:e => e.offsetX, get_coords_y:e => e.offsetY});
    modules.set("physics", {append_ray_test_ext(obj,from,to,id,callback) {
        const serial = ++rayId;
        // Asynchronous callbacks preserve the application's watchdog/queue semantics.
        scheduleRay(() => {
            const origin=v(from), delta=v(to).subtract(origin), length=delta.length();
            const ray=new B.Ray(origin,delta.normalize(),length);
            const terrain = id===HuertaConfig.collisionId ? loaded?.objects.get(HuertaConfig.collision) : null;
            const hit=terrain ? ray.intersectsMesh(terrain,false) : null;
            callback(serial,hit?.hit ? hit.distance/length : -1,hit?.hit ? terrain : null,performance.now()/1000,
                hit?.hit ? hit.pickedPoint.asArray() : null, hit?.hit ? hit.getNormal(true)?.asArray() : null);
        });
        return serial;
    }});
    modules.set("textures", {change_image(obj,name,path,callback) {
        // Each HD mesh owns its material; only the shared base texture is cached.
        const serial=(obj._huertaTextureSerial || 0) + 1;
        obj._huertaTextureSerial=serial;
        if (path.endsWith("Huerta_Satellite_MNT_100m_8000.jpg") ||
            path.endsWith("Huerta_Satellite_previous.jpg")) {
            const old=obj.material.diffuseTexture;
            obj.material.diffuseTexture=loaded.objects.get(HuertaConfig.terrain).material.diffuseTexture;
            if(old && old!==obj.material.diffuseTexture) old.dispose();
            queueMicrotask(() => callback(true)); return;
        }
        const texture=new B.Texture(path,scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE,() => {
            if(serial!==obj._huertaTextureSerial) {
                texture.dispose(); callback(false); return;
            }
            const old=obj.material.diffuseTexture;
            obj.material.diffuseTexture=texture;
            const base=loaded.objects.get(HuertaConfig.terrain).material.diffuseTexture;
            if(old && old!==base && old!==texture) old.dispose();
            callback(true);
        },() => {texture.dispose(); callback(false);});
    }, change_base_image(path,callback) {
        if(!loaded || !scene) {callback(false); return;}
        const texture=new B.Texture(path,scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE,() => {
            const terrain=loaded.objects.get(HuertaConfig.terrain);
            if(!terrain || !terrain.material) {texture.dispose(); callback(false); return;}
            const oldBase=terrain.material.diffuseTexture;
            terrain.material.diffuseTexture=texture;
            for(const [name,obj] of loaded.objects) {
                if(obj===terrain || !obj.material ||
                   (obj.material.diffuseTexture!==oldBase && !/^terrain_hd_r\d\d_c\d\d$/.test(name))) continue;
                obj._huertaTextureSerial=(obj._huertaTextureSerial || 0) + 1;
                const old=obj.material.diffuseTexture;
                obj.material.diffuseTexture=texture;
                if(old && old!==oldBase && old!==texture) old.dispose();
            }
            if(oldBase && oldBase!==texture) oldBase.dispose();
            callback(true);
        },() => {texture.dispose(); callback(false);});
    }});
    modules.set("objects", {create_line:name => ({name,mesh:null,color:[.12,.9,.96,1],width:5,isVisible:true})});
    modules.set("material", {set_line_params:(obj,params) => Object.assign(obj,params)});
    modules.set("geometry", {draw_line(obj,positions) {
        obj.mesh?.dispose(); obj.mesh=null;
        if(positions.length<6) return;
        // A camera-facing ribbon keeps the original width in screen pixels and
        // participates in depth testing against the terrain (native WebGL lines do not).
        const points=Array.from({length:positions.length/3},(_,i) => v(positions.subarray(i*3,i*3+3)));
        const mesh=new B.Mesh(obj.name,scene), material=new B.StandardMaterial(obj.name+"_material",scene);
        material.disableLighting=true; material.emissiveColor=B.Color3.FromArray(obj.color);
        material.backFaceCulling=false; material.alpha=obj.color[3]; mesh.material=material;
        mesh.isPickable=false; mesh.isVisible=obj.isVisible;
        const indices=[]; for(let i=0;i<points.length-1;i++) {const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
        const vertices=new Float32Array(points.length*6), normals=new Float32Array(points.length*6);
        function update() {
            const cam=loaded.camera;
            const horizontal=cam.fovMode===B.Camera.FOVMODE_HORIZONTAL_FIXED;
            const size=horizontal ? engine.getRenderWidth() : engine.getRenderHeight();
            for(let i=0;i<points.length;i++) {
                const tangent=points[Math.min(i+1,points.length-1)].subtract(points[Math.max(0,i-1)]).normalize();
                const toward=cam.position.subtract(points[i]);
                const halfWidth=toward.length()*Math.tan(cam.fov/2)*(obj.width||1)/size;
                const side=B.Vector3.Cross(tangent,toward).normalize().scale(halfWidth);
                vertices.set(points[i].add(side).asArray(),i*6); vertices.set(points[i].subtract(side).asArray(),i*6+3);
            }
            if(mesh.isVerticesDataPresent(B.VertexBuffer.PositionKind)) mesh.updateVerticesData(B.VertexBuffer.PositionKind,vertices,true);
            else {mesh.setVerticesData(B.VertexBuffer.PositionKind,vertices,true);mesh.setVerticesData(B.VertexBuffer.NormalKind,normals);mesh.setIndices(indices);}
        }
        update(); const observer=scene.onBeforeRenderObservable.add(update);
        mesh.onDisposeObservable.addOnce(() => {scene.onBeforeRenderObservable.remove(observer);material.dispose();});
        obj.mesh=mesh;
    }});
})();
