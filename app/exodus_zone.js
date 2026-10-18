"use strict";

// A separate, georeferenced work area; Huertahernando is never reused.
window.ExodusZone = (() => {
    const R = 6371008.8, rad = Math.PI / 180;
    const t = text => window.HuertaI18n?.t ? window.HuertaI18n.t(text) : text;
    const wrap = lon => ((lon + 180) % 360 + 360) % 360 - 180;
    function frame(latitude, longitude) {
        const lat = latitude * rad, lon = longitude * rad;
        return {
            normal: [Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat)],
            east: [-Math.sin(lon), Math.cos(lon), 0],
            north: [-Math.sin(lat)*Math.cos(lon), -Math.sin(lat)*Math.sin(lon), Math.cos(lat)]
        };
    }
    function geographic(zone, x, y) {
        const basis = frame(zone.latitude, zone.longitude), d = Math.hypot(x, y), a = d/R;
        const point = basis.normal.map((v,i) => v*Math.cos(a) +
            (d ? (basis.east[i]*x + basis.north[i]*y)*Math.sin(a)/d : 0));
        return {latitude: Math.asin(Math.max(-1, Math.min(1, point[2])))/rad,
            longitude: wrap(Math.atan2(point[1], point[0])/rad)};
    }
    function dimensions() {
        const mesh = window.HuertaMigration?.loaded?.objects?.get("terrain");
        if (!mesh) return null;
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getBoundingInfo().boundingBox;
        return {width: bounds.maximumWorld.x - bounds.minimumWorld.x,
            height: bounds.maximumWorld.y - bounds.minimumWorld.y};
    }
    function coordinates(point) {
        const p = point.normalizeToNew();
        return {latitude: Math.asin(Math.max(-1, Math.min(1, p.z)))/rad,
            longitude: wrap(Math.atan2(p.y,p.x)/rad)};
    }
    function createTerrainView(world, externalScene) {
        const B = BABYLON;
        let engine, scene, camera, canvas, texture, current, active = false;
        let heightsLoader, terrainReadyPromise;
        let queue = [], retry = [], busy = 0, generation = 0, pending = new Set(), failures = 0, completed = 0, total = 0;
        const panel = document.createElement("section");
        panel.id = "exodus_local_panel";
        const heading = document.createElement("h2"), details = document.createElement("p");
        const note = document.createElement("p"), loading = document.createElement("p");
        note.setAttribute("role","status");
        note.textContent = t("Chargement du relief…");
        const retryHeights=document.createElement("button");retryHeights.type="button";retryHeights.hidden=true;
        retryHeights.textContent=t("Réessayer le relief");retryHeights.addEventListener("click",()=>heightsLoader?.retry());
        loading.setAttribute("role", "status");
        panel.append(heading, details, note, loading, retryHeights);
        document.body.appendChild(panel);
        function loadNext() {
            while (active && busy < 4 && queue.length) {
                const item = queue.shift(), token = generation, imageTexture = texture;
                const abort = new AbortController(); pending.add(abort); busy++;
                const timeout = setTimeout(() => abort.abort(), 12000);
                fetch(item.url, {signal:abort.signal}).then(response => {
                    if (!response.ok) throw new Error("image unavailable");
                    return response.blob();
                }).then(blob => createImageBitmap(blob)).then(image => {
                    if (token === generation) {
                        imageTexture.getContext().drawImage(image, item.x, item.y, item.size, item.size);
                        imageTexture.update(); completed++;
                    }
                    image.close();
                }).catch(() => {
                    if (token === generation) {
                        if (abort.paused || !active) queue.unshift(item);
                        else {failures++; retry.push(item);}
                    }
                }).finally(() => {
                    clearTimeout(timeout); pending.delete(abort);
                    if (token !== generation) return;
                    busy--;
                    loading.textContent = failures ? t("Certaines images sont indisponibles. Revenez sur Terre pour réessayer.") :
                        `${t("Images de la zone")} : ${completed}/${total}`;
                    loadNext();
                });
            }
        }
        function open(zone, material) {
            if (current === zone) return;
            active = false;
            generation++; pending.forEach(abort => abort.abort()); pending.clear(); busy=0;
            current = zone; failures=0; completed=0;
            scene=externalScene; engine=scene.getEngine(); canvas=engine.getRenderingCanvas();
            camera = new B.FreeCamera("Selected area camera", new B.Vector3(0,0,12000), scene);
            camera.inputs.clear(); camera.minZ=1; camera.maxZ=100000;
            camera.fov=window.ExodusLocalContext.cameraSource.angle;
            const fit=()=> {camera.fovMode=engine.getAspectRatio(camera)>1 ? B.Camera.FOVMODE_HORIZONTAL_FIXED : B.Camera.FOVMODE_VERTICAL_FIXED;};
            fit(); engine.onResizeObservable.add(fit);
            camera.rotationQuaternion=B.Quaternion.Identity();
            camera.updateUpVectorFromRotation=true; camera.upVector=new B.Vector3(0,1,0);
            scene.activeCamera=camera;
            // Determine a bounded tile mosaic, including the date line. Reduce
            // detail only if necessary to stay below 64 images / 2048² pixels.
            const samples=[];
            const columnsCount=Math.min(512,Math.ceil(zone.width/30)), rowsCount=Math.min(512,Math.ceil(zone.height/30));
            for(let row=0;row<=rowsCount;row++) for(let col=0;col<=columnsCount;col++) {
                const x=(col/columnsCount-.5)*zone.width, y=(row/rowsCount-.5)*zone.height;
                const geo=geographic(zone,x,y);
                const lon=zone.longitude+wrap(geo.longitude-zone.longitude);
                samples.push({x,y,lat:geo.latitude,lon});
            }
            let minLon=Infinity,maxLon=-Infinity,minLat=Infinity,maxLat=-Infinity;
            for(const p of samples) {minLon=Math.min(minLon,p.lon);maxLon=Math.max(maxLon,p.lon);minLat=Math.min(minLat,p.lat);maxLat=Math.max(maxLat,p.lat);}
            let level=13, span, x0,x1,y0,y1;
            do {
                span=180/Math.pow(2,level);
                x0=Math.floor((minLon+180)/span); x1=Math.floor((maxLon+180)/span);
                y0=Math.max(0,Math.floor((90-maxLat)/span));
                y1=Math.min(Math.pow(2,level)-1,Math.floor((90-minLat)/span));
                if ((x1-x0+1)*(y1-y0+1)<=64 && x1-x0<8 && y1-y0<8) break;
                level--;
            } while(level>0);
            const cols=x1-x0+1, rows=y1-y0+1, size=256;
            texture = new B.DynamicTexture("Zone image", {width:cols*size,height:rows*size}, scene, false);
            texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;
            const ctx=texture.getContext(); ctx.fillStyle="#263945"; ctx.fillRect(0,0,cols*size,rows*size);
            texture.update();
            const surface=new B.Mesh("terrain",scene), geometry=new B.VertexData();
            geometry.positions=[]; geometry.uvs=[]; geometry.indices=[]; geometry.normals=[];
            samples.forEach(p=> {
                geometry.positions.push(p.x,p.y,0); geometry.normals.push(0,0,1);
                geometry.uvs.push(((p.lon+180)/span-x0)/cols, 1-((90-p.lat)/span-y0)/rows);
            });
            const stride=columnsCount+1;
            for(let r=0;r<rowsCount;r++)for(let c=0;c<columnsCount;c++) {
                const a=r*stride+c; geometry.indices.push(a,a+1,a+stride,a+1,a+stride+1,a+stride);
            }
            geometry.applyToMesh(surface,true);
            surface.material=new B.ShaderMaterial("Local daylight",scene,material.shaderPath,material.options);
            surface.material.backFaceCulling=false;
            surface.material.setTexture("earthImage",texture);
            surface.material.setFloat("brightnessGamma",2.1);
            surface.isPickable=false;
            const collision=surface.clone("terrain_nav_masque");
            collision.isVisible=false; collision.isPickable=true;
            scene.exodusLocalObjects=new Map([["terrain",surface],["terrain_nav_masque",collision]]);
            const edge=B.MeshBuilder.CreateLines("Zone boundary", {points:[
                new B.Vector3(-zone.width/2,-zone.height/2,1), new B.Vector3(zone.width/2,-zone.height/2,1),
                new B.Vector3(zone.width/2,zone.height/2,1),new B.Vector3(-zone.width/2,zone.height/2,1),
                new B.Vector3(-zone.width/2,-zone.height/2,1)]},scene);
            edge.color=new B.Color3(1,.75,.3);
            let settle;
            terrainReadyPromise=new Promise(resolve=>{settle=resolve;});
            heightsLoader=ExodusHeights.create(samples,heights=>{
                heights.forEach((height,i)=>{geometry.positions[i*3+2]=height;});
                B.VertexData.ComputeNormals(geometry.positions,geometry.indices,geometry.normals);
                surface.updateVerticesData(B.VertexBuffer.PositionKind,geometry.positions,true);
                surface.updateVerticesData(B.VertexBuffer.NormalKind,geometry.normals);
                surface.refreshBoundingInfo();collision.refreshBoundingInfo();
                surface.computeWorldMatrix(true);collision.computeWorldMatrix(true);
                const corners=[0,columnsCount,heights.length-1,rowsCount*stride,0];
                const points=corners.map(i=>new B.Vector3(samples[i].x,samples[i].y,heights[i]+1));
                B.MeshBuilder.CreateLines("Zone boundary",{points,instance:edge},scene);
                window.ExodusLocalContext.terrainReady=true;
                window.ExodusLocalContext.routing=ExodusRouting.create(zone,columnsCount,rowsCount,heights);
                window.ExodusLocalContext.elevationRange=heights.reduce((range,h)=>[Math.min(range[0],h),Math.max(range[1],h)],[Infinity,-Infinity]);
                window.dispatchEvent(new Event("exodus-terrain-ready"));
                settle();
            },info=>{
                retryHeights.hidden=info.state!=="error";
                if(info.state==="ready") {
                    const range=window.ExodusLocalContext.elevationRange;
                    note.textContent=`${t("Relief chargé")} · ${range[0].toFixed(0)}–${range[1].toFixed(0)} m · ${t("Détail variable selon la source")}`;
                }else if(info.state==="loading")note.textContent=`${t("Chargement du relief…")} ${info.loaded}/${info.total}`;
                else {
                    note.textContent=t(info.state==="polar" ? "Relief indisponible près des pôles. La vue reste plane." : "Relief temporairement indisponible. La vue reste plane.");
                    settle();
                }
            });
            scene.onDisposeObservable.addOnce(()=>heightsLoader.dispose());
            queue=[]; retry=[];
            const columns=Math.pow(2,level+1);
            for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) queue.push({
                url:`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless/default/WGS84/${level}/${y}/${((x%columns)+columns)%columns}.jpg`,
                x:(x-x0)*size,y:(y-y0)*size,size});
            total=queue.length;
            heading.textContent=zone.name;
            details.textContent=`${(zone.width/1000).toFixed(3)} × ${(zone.height/1000).toFixed(3)} km · ${zone.latitude.toFixed(6)}, ${zone.longitude.toFixed(6)}`;
            loading.textContent=`${t("Images de la zone")} : 0/${total}`;
        }
        window.addEventListener("resize",()=>{if(active)engine.resize();});
        return {
            open,
            waitForTerrain() {return terrainReadyPromise;},
            getResult() {return {objects:scene.exodusLocalObjects,camera,warnings:[],source:{}};},
            setActive(value) {
                active=value; panel.inert=!value;
                heightsLoader?.setActive(value);
                if (!engine) return;
                if(value) {
                    queue.push(...retry); retry=[]; failures=0;
                    engine.resize();loadNext();
                }
                else {pending.forEach(abort=>{abort.paused=true;abort.abort();});}
            }
        };
    }
    function createLocal() {
        let iframe, current, active=false;
        return {
            open(zone,material) {
                // A new validation must always replace the previous local view.
                // The same geographic zone can be validated again after returning
                // to Terre, so object identity is not a reliable reuse check.
                iframe?.contentWindow?.ExodusLocalApp?.dispose();
                iframe?.remove(); current=zone;
                iframe=document.createElement("iframe"); iframe.id="exodus_local_frame";
                iframe.title=t("Vue locale de la zone choisie");
                iframe.exodusZoneContext={zone,shaderPath:material.shaderPath,shaderOptions:material.options,
                    cameraSource:window.HuertaMigration.loaded.source.cameras[0], active:false};
                iframe.src="zone.html?v=huerta-interface-1";
                document.body.appendChild(iframe);
                iframe.addEventListener("load",()=>iframe.contentWindow.ExodusLocalApp?.setActive(active));
            },
            setActive(value) {
                active=value;
                if(iframe) {iframe.exodusZoneContext.active=value;iframe.inert=!value;iframe.contentWindow?.ExodusLocalApp?.setActive(value);}
            }
        };
    }
    return {geographic, coordinates, dimensions, createLocal, createTerrainView};
})();
