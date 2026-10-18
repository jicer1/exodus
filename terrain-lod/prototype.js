'use strict';
(async function() {
    const B=BABYLON, started=performance.now(), status=document.getElementById('status');
    const engine=new B.Engine(document.getElementById('view'),true), scene=new B.Scene(engine);
    scene.useRightHandedSystem=true; scene.clearColor=new B.Color4(.5294,.8078,.9216,1);
    const camera=new B.ArcRotateCamera('prototype',-Math.PI/2,Math.PI/3,1500,new B.Vector3(-68,343,1080),scene);
    camera.upVector=new B.Vector3(0,0,1); camera.minZ=.5; camera.maxZ=30000;
    camera.lowerRadiusLimit=10; camera.upperRadiusLimit=12000; camera.wheelPrecision=2;
    camera.attachControl(document.getElementById('view'),true);
    const light=new B.HemisphericLight('sky',new B.Vector3(0,0,1),scene); light.intensity=1;
    const material=new B.StandardMaterial('shared-base-image',scene);
    material.diffuseTexture=new B.Texture('../assets/Huerta_Satellite_MNT_100m_8000.jpg',scene);
    material.specularColor=B.Color3.Black(); material.backFaceCulling=false;
    // One common image; no HD image is regenerated or duplicated.
    const manifest=await get('../assets/marcheur_tiles/manifest.json','json');
    const worker=new Worker('worker.js'),requests=new Map();let requestId=0,workerCache={tiles:0,bytes:0};
    function request(message) {return new Promise((resolve,reject)=>{
        const id=++requestId;requests.set(id,{resolve,reject});worker.postMessage({id,...message});
    });}
    worker.onmessage=e=>{const pending=requests.get(e.data.id);if(!pending)return;
        requests.delete(e.data.id);e.data.error?pending.reject(Error(e.data.error)):pending.resolve(e.data.result);};
    worker.onerror=e=>{for(const p of requests.values())p.reject(Error(e.message));requests.clear();};
    await request({type:'init',manifest});
    let tiles=[{row:7,col:8},{row:7,col:9},{row:8,col:8},{row:8,col:9}],area='patch';
    let maxGeometryBytes=80*1048576,maxDetailed=4,quality='standard';
    function distanceToTile(t) {
        const x=manifest.xMin+(t.col*256+128.5)*2-559563,y=manifest.yMax-(t.row*256+128.5)*2-4519538;
        return B.Vector3.Distance(camera.position,new B.Vector3(x,y,1080));
    }
    function useful(t) {
        if(area==='patch')return true;
        const x=manifest.xMin+(t.col*256+.5)*2-559563,y=manifest.yMax-(t.row*256+.5)*2-4519538;
        const bounds=new B.BoundingInfo(new B.Vector3(x,y-512,750),new B.Vector3(x+512,y,1300));
        return bounds.isInFrustum(B.Frustum.GetPlanes(camera.getTransformationMatrix()));
    }
    async function get(url,type='arrayBuffer') {
        const r=await fetch(url); if(!r.ok) throw Error(r.status+' '+url); return r[type]();
    }
    function mesh(name,g) {
        const m=new B.Mesh(name,scene), v=new B.VertexData();
        v.positions=g.positions;v.indices=g.indices;v.uvs=g.uvs;
        v.normals=g.normals||new Float32Array(g.positions.length);
        if(!g.normals) B.VertexData.ComputeNormals(v.positions,v.indices,v.normals,{useRightHandedSystem:true});
        v.applyToMesh(m); m.material=material; return m;
    }
    // Original export is used only for the limited comparison patch; its large
    // buffers are released after extraction. No navigation or walker code is loaded.
    async function baseline() {
        const source=await get('../assets/huerta_webgl.json','json');
        const object=source.objects.find(o=>o.name==='terrain');
        if(object.scale.some(v=>v!==1)||object.rotation_quaternion.join(',')!=='1,0,0,0') throw Error('Unsupported baseline transform');
        const sub=source.meshes.find(m=>m.uuid===object.data.uuid).submeshes[0], binary=source.binaries[0];
        const buffer=await get('../assets/'+binary.binfile);
        const p=new Float32Array(buffer,12+binary.float+sub.position[0]*4,sub.position[1]);
        const uv=new Float32Array(buffer,12+binary.float+sub.texcoord[0]*4,sub.texcoord[1]);
        const ix=new Uint32Array(buffer,12+binary.int+sub.indices[0]*4,sub.indices[1]);
        const positions=[],uvs=[],indices=[],map=new Map();
        const x0=manifest.xMin+(8*256+.5)*2-559563, x1=x0+1024;
        const y1=manifest.yMax-(7*256+.5)*2-4519538,y0=y1-1024;
        for(let i=0;i<ix.length;i+=3) {
            const ids=[ix[i],ix[i+1],ix[i+2]];
            if(!ids.some(id=>p[id*3]>=x0&&p[id*3]<=x1&&p[id*3+1]>=y0&&p[id*3+1]<=y1)) continue;
            for(const id of ids) {
                if(!map.has(id)) {map.set(id,positions.length/3);positions.push(p[id*3]+object.location[0],p[id*3+1]+object.location[1],p[id*3+2]+object.location[2]);uvs.push(uv[id*2],uv[id*2+1]);}
                indices.push(map.get(id));
            }
        }
        const result=mesh('baseline-1.0.15',{positions,uvs,indices});result.setEnabled(false);return result;
    }
    let original=null, mode='auto', changing=false, last=0, readyMs=0, transitions=[], worstFrame=0,generation=0,switchingArea=false;
    let uploads=[],frameTimes=[],workerTimes=[],animation=null,transitionBytes=0,lastError='';
    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    async function morph(mesh,positions,refining) {
        const manager=new B.MorphTargetManager(scene),target=new B.MorphTarget('lod-height',refining?1:0,scene);
        target.setPositions(positions);manager.addTarget(target);mesh.morphTargetManager=manager;
        transitionBytes=positions.byteLength;
        await new Promise(resolve=>{animation={target,refining,start:performance.now(),resolve};});
        mesh.morphTargetManager=null;manager.dispose();transitionBytes=0;
    }
    async function update() {
        if(changing||switchingArea||lastError) return; changing=true;const stamp=generation;
        try {
            if(mode==='old') {
                if(!original) original=await baseline();
                if(stamp!==generation)return;
                tiles.forEach(t=>{t.mesh?.dispose();t.mesh=null;t.step=null;});
                await request({type:'clear'});workerCache={tiles:0,bytes:0};original.setEnabled(true);return;
            }
            original?.dispose();original=null;
            const ordered=tiles.slice().sort((a,b)=>distanceToTile(a)-distanceToTile(b));
            const detailed=new Set(ordered.filter(useful).slice(0,maxDetailed));
            for(const tile of ordered) {
                if(!useful(tile)) {
                    tile.unusedSince=tile.unusedSince||performance.now();
                    if(performance.now()-tile.unusedSince>1800) {tile.mesh?.dispose();tile.mesh=null;tile.step=null;tile.bytes=0;}
                    continue;
                }
                tile.unusedSince=0;
                const x=manifest.xMin+(tile.col*256+128.5)*2-559563;
                const y=manifest.yMax-(tile.row*256+128.5)*2-4519538;
                const distance=B.Vector3.Distance(camera.position,new B.Vector3(x,y,1080));
                let step=mode==='auto' ? (distance<550?1:distance<1000?2:distance<1800?4:distance<3200?8:16):Number(mode);
                if(area==='territory'&&quality==='economy')step=Math.min(16,step*2);
                // A 15% hysteresis band prevents repeated switching at boundaries.
                if(mode==='auto'&&tile.step) {
                    const thresholds={1:550,2:1000,4:1800,8:3200};
                    if(step>tile.step&&distance<(thresholds[tile.step]||Infinity)*1.15) step=tile.step;
                    if(step<tile.step&&distance>(thresholds[step]||0)*.85) step=tile.step;
                }
                if(area==='territory'&&(!detailed.has(tile)||quality==='economy'))step=Math.max(2,step);
                if(area==='territory'&&step===1&&tile.step!==1&&tiles.filter(t=>t.mesh&&t.step===1).length>=maxDetailed)continue;
                if(step===tile.step) continue;
                const before=performance.now();
                const result=await request({type:'build',row:tile.row,col:tile.col,step,previous:tile.step});
                if(stamp!==generation)return;
                const {g}=result;workerCache={tiles:result.cacheTiles,bytes:result.cacheBytes};
                const bytes=g.positions.byteLength*2+g.uvs.byteLength+g.indices.byteLength;
                const resident=tiles.reduce((n,t)=>n+(t.mesh?t.bytes:0),0);
                if(bytes>(tile.bytes||0)&&resident-(tile.mesh?tile.bytes:0)+bytes>maxGeometryBytes)continue;
                if(!g.indices.length) {tile.mesh?.dispose();tile.mesh=null;tile.step=step;tile.bytes=0;continue;}
                workerTimes.push(result.workerMs);if(workerTimes.length>200)workerTimes.shift();
                // At most one GPU upload and one tile morph are active at a time.
                await nextFrame();
                const upload=performance.now(),replacement=mesh('lod-'+tile.row+'-'+tile.col,g);
                replacement.setEnabled(false);
                if(result.morph&&step<tile.step) {
                    tile.mesh.setEnabled(false);replacement.setEnabled(true);
                    uploads.push(performance.now()-upload);
                    await morph(replacement,result.morph,true);
                }else if(result.morph) {
                    uploads.push(performance.now()-upload);
                    await morph(tile.mesh,result.morph,false);
                }else uploads.push(performance.now()-upload);
                if(uploads.length>200)uploads.shift();
                tile.mesh?.dispose();replacement.setEnabled(true);tile.mesh=replacement;tile.step=step;
                tile.bytes=bytes;
                transitions.push(performance.now()-before);if(transitions.length>200)transitions.shift();
                await nextFrame();if(stamp!==generation)return;
            }
        } finally {changing=false;}
    }
    function measurements() {
        const meshes=tiles.filter(t=>t.mesh);
        return {version:'2.0.1-prototype',mode,area,quality,error:lastError,geometryBudgetBytes:maxGeometryBytes,initialReadyMs:readyMs,fps:engine.getFps(),
            triangles:scene.getActiveMeshes().data.slice(0,scene.getActiveMeshes().length).reduce((n,m)=>n+m.getTotalIndices()/3,0),
            renderedTiles:meshes.length,stepsMeters:meshes.map(t=>t.step*2),decodedDEMTiles:workerCache.tiles,decodedDEMBytes:workerCache.bytes,
            geometryBytes:meshes.reduce((n,t)=>n+t.bytes,0),
            jsHeapBytes:performance.memory?.usedJSHeapSize??null,
            gpuMemoryBytes:null,transitionMs:transitions.slice(),worstFrameMs:worstFrame,
            workerMs:workerTimes.slice(),uploadMs:uploads.slice(),transitionBytes,frameTimesMs:frameTimes.slice(),
            limitations:['GPU memory unavailable','Separate limited patch; not application benchmark','DEM worker cache bounded to 32 tiles']};
    }
    document.getElementById('mode').onchange=e=>{mode=e.target.value;generation++;last=0;};
    document.getElementById('quality').onchange=e=>{
        quality=e.target.value;maxGeometryBytes=(quality==='economy'?40:80)*1048576;
        maxDetailed=quality==='economy'?2:4;generation++;last=0;
    };
    document.getElementById('area').onchange=async e=>{
        generation++;switchingArea=true;area=e.target.value;mode='auto';document.getElementById('mode').value='auto';
        // Wait for the current tile's transition to finish before freeing its mesh.
        while(changing)await nextFrame();
        for(const t of tiles)t.mesh?.dispose();original?.dispose();original=null;
        await request({type:'clear'});workerCache={tiles:0,bytes:0};
        if(area==='territory') {
            const coverage=await get('dem-coverage.json','json');
            const empty=new Set(coverage.affected.filter(t=>{
                const source=manifest.tiles.find(x=>x.row===t.row&&x.col===t.col);
                return t.invalidSamples===source.width*source.height;
            }).map(t=>t.row+','+t.col));
            tiles=manifest.tiles.filter(t=>!empty.has(t.row+','+t.col)).map(t=>({row:t.row,col:t.col}));
            camera.setTarget(new B.Vector3(0,0,1050));camera.radius=11000;
        }else {
            tiles=[{row:7,col:8},{row:7,col:9},{row:8,col:8},{row:8,col:9}];
            camera.setTarget(new B.Vector3(-68,343,1080));camera.radius=1500;
        }
        document.getElementById('mode').disabled=area==='territory';
        worstFrame=0;workerTimes=[];uploads=[];transitions=[];last=0;switchingArea=false;lastError='';
    };
    document.getElementById('reset').onclick=()=>{worstFrame=0;frameTimes=[];workerTimes=[];uploads=[];transitions=[];};
    document.getElementById('wire').onchange=e=>material.wireframe=e.target.checked;
    document.getElementById('export').onclick=()=>{
        const url=URL.createObjectURL(new Blob([JSON.stringify(measurements(),null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='exodus-lod-measures.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    window.ExodusLODPrototype={measurements,scene,camera,tiles};
    engine.runRenderLoop(()=>{
        if(animation) {
            const t=Math.min(1,(performance.now()-animation.start)/450),smooth=t*t*(3-2*t);
            animation.target.influence=animation.refining?1-smooth:smooth;
            if(t===1) {const done=animation.resolve;animation=null;done();}
        }
        scene.render();
        if(!document.hidden&&readyMs) {const dt=engine.getDeltaTime();worstFrame=Math.max(worstFrame,dt);frameTimes.push(dt);if(frameTimes.length>600)frameTimes.shift();}
        if(performance.now()-last>500) {last=performance.now();update().catch(fail);
            const m=measurements(),counts={};m.stepsMeters.forEach(s=>counts[s]=(counts[s]||0)+1);
            const steps=Object.entries(counts).map(([step,n])=>`${n} × ${step} m`).join(' · ');
            status.textContent=lastError?'Erreur : '+lastError:`${m.fps.toFixed(1)} images/s · ${m.triangles} triangles\n${m.renderedTiles} tuiles · ${steps}\nGéométrie LOD : ${(m.geometryBytes/1048576).toFixed(1)} / ${(maxGeometryBytes/1048576)} Mio\nMNT décodé : ${m.decodedDEMTiles}/32 tuiles\nPrêt initial : ${m.initialReadyMs.toFixed(0)} ms\nCalcul en arrière-plan max : ${Math.max(0,...workerTimes).toFixed(0)} ms\nEnvoi géométrie max : ${Math.max(0,...uploads).toFixed(1)} ms\nImage la plus lente : ${worstFrame.toFixed(0)} ms\nTransitions progressives : 450 ms.`;
        }
    });
    await update();readyMs=performance.now()-started;
    window.addEventListener('resize',()=>engine.resize());
    window.addEventListener('pagehide',()=>worker.terminate(),{once:true});
    function fail(e) {lastError=e.message;status.textContent='Erreur : '+e.message;console.error(e);}
})().catch(e=>{document.getElementById('status').textContent='Erreur : '+e.message;console.error(e);});
