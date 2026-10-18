/* Development entry only. The legacy entry and all walker modules stay unchanged. */
'use strict';
(() => {
    const scriptBase=new URL('.',document.currentScript.src),originalLoader=window.HuertaSceneLoader;
    window.HuertaSceneLoader=async function(scene,url,progress) {
        const loaded=await originalLoader(scene,url,n=>progress?.(Math.min(89,n*.89))),B=BABYLON;
        // Preserve object identity/materials for imagery and all existing modules.
        // Keep the actual 1.0.15 terrain as the immediate overview/zoom-out mesh.
        // Only redundant HD overlay geometries are released; images stay shared.
        const baseMesh=loaded.objects.get(HuertaConfig.terrain);
        for(const [name,obj] of loaded.objects) {
            if(/^terrain_hd_r\d\d_c\d\d$/.test(name)) {
                obj.isVisible=false;obj.geometry?.dispose();
            }
        }
        const collision=loaded.objects.get(HuertaConfig.collision);
        // Exported typed arrays are views into the same 79 MB binary. Keeping
        // just the navigation mesh must not retain the discarded visible data.
        // Repack the identical numbers, then rebuild the same picking acceleration.
        function detach(mesh) {
          for(const kind of mesh.getVerticesDataKinds()) {
            const data=mesh.getVerticesData(kind);
            if(ArrayBuffer.isView(data)&&data.buffer.byteLength>data.byteLength*2)
                mesh.setVerticesData(kind,data.slice(),false,mesh.getVertexBuffer(kind).getStrideSize());
          }
          const indices=mesh.getIndices();
          if(ArrayBuffer.isView(indices)&&indices.buffer.byteLength>indices.byteLength*2)
              mesh.setIndices(indices.slice(),mesh.getTotalVertices(),false);
        }
        detach(collision);detach(baseMesh);
        collision.subdivide(128);collision.createOrUpdateSubmeshesOctree(16,4);collision.useOctreeForPicking=true;
        const base=baseMesh.material,hdSamplers=Math.min(9,Math.max(4,(scene.getEngine().getCaps().maxTexturesImageUnits||8)-1));
        const hdProxies=[...loaded.objects].filter(([name])=>/^terrain_hd_r\d\d_c\d\d$/.test(name)).map(([name,obj])=>{
            const match=name.match(/r(\d+)_c(\d+)/);return {obj,col:Number(match[2])-10,row:Number(match[1])-9};
        });
        // Coverage follows resident geometry, never the current gaze/frustum.
        const maxResident=new URLSearchParams(location.search).get('lodQuality')==='economy'?24:48;
        let detailMix=0,coverageFrame=-1,coverageBoxes=new Float32Array(maxResident*4);
        class SharedHD extends B.MaterialPluginBase {
            constructor() {super(base,'ExodusSharedHD',190,{});this.registerForExtraEvents=true;this._enable(true);}
            getClassName() {return 'ExodusSharedHD';}
            getSamplers(list) {for(let i=0;i<hdSamplers;i++)list.push('lodHD'+i);}
            getUniforms() {return {ubo:[...Array.from({length:hdSamplers},(_,i)=>({name:'lodBox'+i,size:4,type:'vec4'})),{name:'lodDisplay',size:4,type:'vec4'},{name:'lodCoverage'}],
                fragment:'uniform vec4 lodDisplay;\n'+Array.from({length:hdSamplers},(_,i)=>`uniform vec4 lodBox${i};`).join('\n')};}
            hardBindForSubMesh(ubo,scene,engine,sub) {
                const tile=sub.getMesh().metadata?.lodTile;
                if(tile) {tile.hdFrame=scene.getFrameId();tile.hdCount=0;}
                const available=tile?[]:hdProxies.filter(p=>p.obj.isVisible&&p.obj.material.diffuseTexture!==base.diffuseTexture&&p.obj.material.diffuseTexture?.isReady()).sort((a,b)=>
                    Math.hypot((a.col+.5)*512-loaded.camera.position.x,(a.row+.5)*512-loaded.camera.position.y)-Math.hypot((b.col+.5)*512-loaded.camera.position.x,(b.row+.5)*512-loaded.camera.position.y));
                if(coverageFrame!==scene.getFrameId()) {
                    coverageFrame=scene.getFrameId();coverageBoxes.fill(0);
                    tiles.filter(t=>t.mesh).slice(0,maxResident).forEach((t,i)=>coverageBoxes.set([t.x,t.y,detailMix>0?Math.min(1,(performance.now()-t.appeared)/180):0,1],i*4));
                }
                sub.effect.setArray4('lodCoverage',coverageBoxes);
                ubo.updateFloat4('lodDisplay',tile&&detailMix>0?Math.min(1,(performance.now()-tile.appeared)/180):detailMix,tile?1:0,0,0);
                for(let i=0;i<hdSamplers;i++) {
                    const col=tile?Math.floor(tile.x/512)+(i%2):(available[i]?.col||0);
                    const row=tile?Math.floor((tile.y-512)/512)+Math.floor(i/2):(available[i]?.row||0);
                    const name='terrain_hd_r'+String(row+9).padStart(2,'0')+'_c'+String(col+10).padStart(2,'0');
                    const proxy=tile?(i<4?loaded.objects.get(name):null):available[i]?.obj,texture=proxy?.material?.diffuseTexture;
                    const enabled=proxy?.isVisible&&texture&&texture!==base.diffuseTexture&&texture.isReady();
                    if(enabled&&tile)tile.hdCount++;
                    ubo.updateFloat4('lodBox'+i,col*512,row*512,enabled?1:0,0);
                    ubo.setTexture('lodHD'+i,enabled?texture:base.diffuseTexture);
                }
                if(!tile)stats.baseHDImages=Math.min(available.length,hdSamplers);
            }
            getCustomCode(type) {
                if(type!=='fragment')return null;
                return {CUSTOM_FRAGMENT_DEFINITIONS:`uniform vec4 lodCoverage[${maxResident}];\n`+Array.from({length:hdSamplers},(_,i)=>`uniform sampler2D lodHD${i};`).join('\n'),
                    CUSTOM_FRAGMENT_BEFORE_LIGHTS:`float lodNoise=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
if(lodDisplay.y>0.5) {if(lodDisplay.x<1.0 && lodNoise>=lodDisplay.x) discard;}
else if(lodDisplay.x>0.0) {for(int j=0;j<${maxResident};j++) {vec4 box=lodCoverage[j];if(box.w>0.5 && vPositionW.x>=box.x && vPositionW.x<box.x+512.0 && vPositionW.y<=box.y && vPositionW.y>box.y-512.0 && lodNoise<box.z) discard;}}\n`+Array.from({length:hdSamplers},(_,i)=>
                        `if(lodBox${i}.z>0.5 && vPositionW.x>=lodBox${i}.x && vPositionW.x<lodBox${i}.x+512.0 && vPositionW.y>=lodBox${i}.y && vPositionW.y<lodBox${i}.y+512.0) {baseColor.rgb=texture2D(lodHD${i},(vPositionW.xy-lodBox${i}.xy+vec2(16.0))/544.0).rgb;}`).join('\n')};
            }
        }
        new SharedHD();
        const worker=new Worker(new URL('worker.js',scriptBase)),requests=new Map();let sequence=0;
        function request(data) {return new Promise((resolve,reject)=>{
            if(data.type==='build') {stats.buildRequests++;if(retreating)stats.buildRequestsDuringRetreat++;}
            const id=++sequence;requests.set(id,{resolve,reject});worker.postMessage({id,...data});
        });}
        worker.onmessage=e=>{const p=requests.get(e.data.id);if(!p)return;requests.delete(e.data.id);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.result);};
        worker.onerror=e=>{for(const p of requests.values())p.reject(Error(e.message));requests.clear();};
        const response=await fetch(new URL('../assets/marcheur_tiles/manifest.json',scriptBase));
        if(!response.ok)throw Error('Terrain manifest HTTP '+response.status);
        const manifest=await response.json();await request({type:'init',manifest});
        const coverageResponse=await fetch(new URL('dem-coverage.json',scriptBase));
        if(!coverageResponse.ok)throw Error('Terrain coverage HTTP '+coverageResponse.status);
        const coverage=await coverageResponse.json(),empty=new Set(coverage.affected.filter(t=>{
            const source=manifest.tiles.find(s=>s.row===t.row&&s.col===t.col);return t.invalidSamples===source.width*source.height;
        }).map(t=>t.row+','+t.col));
        const tiles=manifest.tiles.filter(t=>!empty.has(t.row+','+t.col)).map(t=>({row:t.row,col:t.col,
            x:manifest.xMin+(t.col*256+.5)*2-559563,y:manifest.yMax-(t.row*256+.5)*2-4519538,step:null,bytes:0,mesh:null}));
        const economy=new URLSearchParams(location.search).get('lodQuality')==='economy';
        const budget=(economy?48:80)*1048576,maxDetail=economy?2:4;
        const baseBytes=baseMesh.getIndices().length*4+baseMesh.getVerticesDataKinds().reduce((n,k)=>n+baseMesh.getVerticesData(k).length*4,0);
        const detailRoot=new B.TransformNode('terrain-detail-root',scene);detailRoot.setEnabled(false);
        const stats=window.ExodusTerrainLOD={version:'2.0.3',ready:false,errors:[],tiles:0,triangles:0,geometryBytes:0,
            budgetBytes:budget,cacheBytes:0,cacheTiles:0,maxUploadMs:0,maxWorkerMs:0,maxFrameMs:0,transitionMs:450,
            baseGeometryBytes:baseBytes,displayMode:'base-1.0.15',buildRequests:0,buildRequestsDuringRetreat:0,zoomOutSwitches:0,discardedBuilds:0,coverageFallbacks:0,retainedZoomOuts:0,
            compatibility:'Original navigation mesh and walker unchanged',scene};
        let busy=false,last=0,animation=null,active=true,retreating=false,retainedRetreat=false,generation=0,fadeStart=0,cleanupAt=0;
        let groundX=Infinity,groundY=Infinity,groundZ=NaN;
        let previousPosition=loaded.camera.position.clone(),previousFocus=[0,0,1063.2366409301776],lastOutInput=-Infinity;
        const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
        const distance=t=>B.Vector3.Distance(loaded.camera.position,new B.Vector3(t.x+256,t.y-256,1080));
        const groundDistance=t=>Math.hypot(Math.max(t.x-loaded.camera.position.x,0,loaded.camera.position.x-t.x-512),Math.max(t.y-512-loaded.camera.position.y,0,loaded.camera.position.y-t.y));
        function focus() {return HuertaRuntime.require('huerta_webgl_main').get_pivot()||[0,0,1063.2366409301776];}
        function viewRange() {const p=focus();return Math.hypot(loaded.camera.position.x-p[0],loaded.camera.position.y-p[1],loaded.camera.position.z-p[2]);}
        function groundClearance() {
            const c=loaded.camera.position;
            // Reuse the unchanged navigation mesh and its picking octree. The
            // vertical sample is cached across zoom and rotation at the same XY.
            if(Math.hypot(c.x-groundX,c.y-groundY)>8) {
                groundX=c.x;groundY=c.y;collision.computeWorldMatrix(true);
                const hit=new B.Ray(new B.Vector3(c.x,c.y,20000),new B.Vector3(0,0,-1),40000).intersectsMesh(collision,false);
                groundZ=hit?.hit?hit.pickedPoint.z:NaN;
            }
            const height=Number.isFinite(groundZ)?Math.max(0,c.z-groundZ):Infinity;
            stats.heightAboveGround=Number.isFinite(height)?height:null;return height;
        }
        // A horizontal view can have a distant orbit pivot while the camera
        // remains near the ground. Use terrain height, not the pivot altitude.
        function detailRange() {return Math.min(viewRange(),groundClearance()*3);}
        function overview(reason) {
            if(reason==='zoomout') {
                retreating=true;generation++;
                // A small retreat in a ravine keeps the ready geometry. Pause
                // construction as before, without replacing it by the SD mesh.
                if(detailMix>0&&tiles.some(t=>t.mesh)&&groundClearance()<(retainedRetreat?350:250)) {
                    retainedRetreat=true;stats.retainedZoomOuts++;return;
                }
                stats.zoomOutSwitches++;
            }
            retainedRetreat=false;
            if(stats.displayMode!=='base-1.0.15'||busy) {generation++;cleanupAt=performance.now()+3000;}
            detailMix=0;fadeStart=0;detailRoot.setEnabled(false);baseMesh.isVisible=true;stats.displayMode='base-1.0.15';
        }
        function showDetail() {
            if(retreating||stats.displayMode==='detail'||fadeStart)return;
            detailRoot.setEnabled(true);baseMesh.isVisible=true;fadeStart=performance.now();stats.displayMode='transition-to-detail';
        }
        const canvas=scene.getEngine().getRenderingCanvas();let gesture=null;
        const outwardInput=()=>{lastOutInput=performance.now();overview('zoomout');};
        canvas.addEventListener('wheel',e=>{if(e.deltaY>0)outwardInput();else if(e.deltaY<0)retreating=false;},{capture:true,passive:true});
        canvas.addEventListener('mousedown',e=>{gesture={button:e.button,x:e.clientX,y:e.clientY,lastY:e.clientY,zoom:false};},true);
        canvas.addEventListener('mousemove',e=>{
            if(!gesture||gesture.button!==2||!(e.buttons&2))return;
            const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
            gesture.zoom=Math.abs(dy)>6&&Math.abs(dy)>Math.abs(dx)*.35;
            if(gesture.zoom&&e.clientY>gesture.lastY)outwardInput();else if(!gesture.zoom||e.clientY<gesture.lastY)retreating=false;
            gesture.lastY=e.clientY;
        },true);
        window.addEventListener('mouseup',()=>{gesture=null;},true);
        window.addEventListener('keydown',e=>{
            if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||e.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||''))return;
            if(e.key==='PageDown'||e.key.toLowerCase()==='r')outwardInput();
            else if(e.key==='PageUp')retreating=false;
        },true);
        function make(tile,g) {
            const mesh=new B.Mesh('terrain_lod_'+tile.row+'_'+tile.col,scene),v=new B.VertexData();
            v.positions=g.positions;v.normals=g.normals;v.uvs=g.uvs;v.indices=g.indices;v.applyToMesh(mesh);
            mesh.material=base;mesh.metadata={lodTile:tile};mesh.isPickable=false;mesh.parent=detailRoot;return mesh;
        }
        function snapshot() {
            const resident=tiles.filter(t=>t.mesh);stats.tiles=resident.length;
            stats.triangles=resident.reduce((n,t)=>n+t.mesh.getTotalIndices()/3,0);stats.detailGeometryBytes=resident.reduce((n,t)=>n+t.bytes,0);
            stats.geometryBytes=baseBytes+stats.detailGeometryBytes;
        }
        async function morph(mesh,positions,refine) {
            const manager=new B.MorphTargetManager(scene),target=new B.MorphTarget('terrain-lod-height',refine?1:0,scene);
            target.setPositions(positions);manager.addTarget(target);mesh.morphTargetManager=manager;
            await new Promise(resolve=>{animation={target,refine,resolve,start:performance.now()};});
            mesh.morphTargetManager=null;manager.dispose();
        }
        async function build(t,step,animate) {
            if(retreating||detailRange()>2600)return false;
            const stamp=generation;
            const result=await request({type:'build',row:t.row,col:t.col,step,previous:animate?t.step:null,skirts:true});
            if(stamp!==generation||retreating) {stats.discardedBuilds++;return false;}
            stats.cacheBytes=result.cacheBytes;stats.cacheTiles=result.cacheTiles;stats.maxWorkerMs=Math.max(stats.maxWorkerMs,result.workerMs);
            const {g}=result,bytes=g.positions.byteLength*2+g.uvs.byteLength+g.indices.byteLength;
            snapshot();if(bytes>t.bytes&&stats.geometryBytes-t.bytes+bytes>budget) {t.retryAfter=performance.now()+2500;return false;}
            if(!g.indices.length) {t.step=step;t.empty=true;return true;}
            // During the preloader the scene is not rendering yet; worker awaits
            // already yield to the UI. Do not add 249 unnecessary screen frames.
            if(stats.ready)await frame();
            if(stamp!==generation||retreating)return false;
            const started=performance.now(),replacement=make(t,g);replacement.setEnabled(false);
            stats.maxUploadMs=Math.max(stats.maxUploadMs,performance.now()-started);
            if(result.morph&&step<t.step&&detailMix>0) {t.mesh.setEnabled(false);replacement.setEnabled(true);await morph(replacement,result.morph,true);}
            if(stamp!==generation||retreating) {replacement.dispose();t.mesh?.setEnabled(true);return false;}
            t.mesh?.dispose();t.mesh=replacement;replacement.setEnabled(true);t.bytes=bytes;t.step=step;t.appeared=t.appeared||performance.now();snapshot();showDetail();return true;
        }
        // No territorial LOD construction at startup: the original terrain is ready.
        baseMesh.isVisible=true;snapshot();
        stats.ready=true;
        async function update() {
            if(busy||!active||retreating||detailRange()>2600)return;busy=true;
            try {
                const startPosition=loaded.camera.position.clone();
                const ordered=tiles.slice().sort((a,b)=>groundDistance(a)-groundDistance(b)||distance(a)-distance(b));
                const neighborhood=new Set(ordered.filter(t=>groundDistance(t)<1500).slice(0,maxResident)),detail=new Set(ordered.slice(0,maxDetail));
                // Free departed neighbors before preparing incoming ones.
                for(const t of tiles)if(t.mesh&&!neighborhood.has(t)) {t.mesh.dispose();t.mesh=null;t.bytes=0;t.step=null;t.appeared=0;}
                for(const t of ordered) {
                    if(!active||retreating||detailRange()>2600)return;
                    if(t.empty)continue;
                    if(!neighborhood.has(t)) {
                        // Looking away never evicts a tile. Only leaving its
                        // geographic neighborhood makes its geometry obsolete.
                        t.mesh?.dispose();t.mesh=null;t.bytes=0;t.step=null;t.appeared=0;
                        continue;
                    }
                    if(!t.mesh&&tiles.filter(t=>t.mesh).length>=maxResident)continue;
                    t.unused=0;const d=distance(t);
                    let step=d<550?1:d<1000?2:d<1800?4:d<3200?8:16;
                    if(economy)step=Math.min(16,step*2);
                    if(t.step) {
                        const thresholds={1:550,2:1000,4:1800,8:3200};
                        if(step>t.step&&d<(thresholds[t.step]||Infinity)*1.15)step=t.step;
                        if(step<t.step&&d>(thresholds[step]||0)*.85)step=t.step;
                    }
                    if(!detail.has(t)||economy)step=Math.max(2,step);
                    // A zoom-out never asks for a coarser mesh. Reuse ready detail
                    // while approaching, or fall back to the original overview.
                    if(t.step&&t.step<=step)continue;
                    if(t.retryAfter>performance.now())continue;
                    if(step===1&&t.step!==1&&tiles.filter(x=>x.mesh&&x.step===1).length>=maxDetail)continue;
                    await build(t,step,!!t.mesh);
                    // Retarget promptly if navigation changed while the worker or morph ran.
                    if(B.Vector3.Distance(startPosition,loaded.camera.position)>64)break;
                }
                snapshot();
                stats.neighborhoodReady=[...neighborhood].every(t=>t.mesh||t.empty);
                if(!retreating&&detailRange()<=2600&&tiles.some(t=>t.mesh))showDetail();
            }catch(e){stats.errors.push(e.message);console.error('EXODUS LOD',e);active=false;}
            finally {busy=false;}
        }
        scene.onBeforeRenderObservable.add(()=>{
            const nav=HuertaRuntime.require('huerta_webgl_main'),p=focus(),now=loaded.camera.position;
            const oldRange=Math.hypot(previousPosition.x-p[0],previousPosition.y-p[1],previousPosition.z-p[2]),range=viewRange();
            const moved=B.Vector3.Distance(previousPosition,now)>.01;
            const newFocus=Math.hypot(p[0]-previousFocus[0],p[1]-previousFocus[1],p[2]-previousFocus[2])>1;
            if(newFocus) {if(performance.now()-lastOutInput>300) {retreating=false;retainedRetreat=false;}}
            else if(moved&&!nav.get_route_flight_status().active) {
                const delta=now.subtract(previousPosition),radial=previousPosition.subtract(B.Vector3.FromArray(p));
                const outward=B.Vector3.Dot(delta,radial)>delta.length()*oldRange*.9;
                if(gesture?.zoom) {if(range<oldRange-.05)retreating=false;}
                else if(outward&&range>oldRange+Math.max(.05,oldRange*.00001)&&!gesture)overview('zoomout');
                else retreating=false;
            }
            previousPosition.copyFrom(now);previousFocus=p;
            if(!retreating)retainedRetreat=false;
            if(detailRange()>2600)overview('far-view');
            else if(retainedRetreat&&groundClearance()>350)overview('height-after-retreat');
            if(stats.displayMode==='base-1.0.15'&&!busy&&cleanupAt&&performance.now()>cleanupAt) {
                cleanupAt=0;
                for(const t of tiles) {t.mesh?.dispose();t.mesh=null;t.bytes=0;t.step=null;t.appeared=0;}
                snapshot();request({type:'clear'}).then(()=>{stats.cacheTiles=0;stats.cacheBytes=0;});
            }
            if(fadeStart) {
                detailMix=Math.min(1,(performance.now()-fadeStart)/180);
                if(detailMix===1) {fadeStart=0;stats.displayMode='detail';}
            }
            if(animation) {
                const t=Math.min(1,(performance.now()-animation.start)/450),s=t*t*(3-2*t);
                animation.target.influence=animation.refine?1-s:s;
                if(t===1) {const resolve=animation.resolve;animation=null;resolve();}
            }
            if(!document.hidden)stats.maxFrameMs=Math.max(stats.maxFrameMs,scene.getEngine().getDeltaTime());
            if(performance.now()-last>500) {last=performance.now();update();}
        });
        scene.onAfterRenderObservable.add(()=>{
            const drawn=tiles.filter(t=>t.mesh&&t.hdFrame===scene.getFrameId());
            stats.shaderBoundTiles=drawn.length;stats.tilesUsingHD=drawn.filter(t=>t.hdCount>0).length;
            const visible=scene.getActiveMeshes();
            stats.visibleTerrainTriangles=visible.data.slice(0,visible.length).filter(m=>m===baseMesh||m.metadata?.lodTile).reduce((n,m)=>n+m.getTotalIndices()/3,0);
        });
        scene.onDisposeObservable.add(()=>{active=false;worker.terminate();});
        window.addEventListener('pagehide',()=>{active=false;worker.terminate();},{once:true});
        if(new URLSearchParams(location.search).has('lodStats')) {
            const panel=document.createElement('pre');panel.id='lod-statistics';
            panel.style.cssText='position:fixed;bottom:90px;left:250px;z-index:29000;background:#19232deb;color:white;padding:10px;font:12px monospace;pointer-events:none';
            document.body.appendChild(panel);
            let measured=performance.now();
            scene.onAfterRenderObservable.add(()=>{
                if(performance.now()-measured<1000)return;measured=performance.now();
                panel.textContent=JSON.stringify({display:stats.displayMode,fps:scene.getEngine().getFps(),cachedDetailTiles:stats.tiles,triangles:stats.visibleTerrainTriangles,
                    geometryMiB:stats.geometryBytes/1048576,cacheTiles:stats.cacheTiles,cacheMiB:stats.cacheBytes/1048576,
                    buildRequests:stats.buildRequests,buildRequestsDuringRetreat:stats.buildRequestsDuringRetreat,
                    heightAboveGround:stats.heightAboveGround,retainedZoomOuts:stats.retainedZoomOuts,
                    maximumUploadMs:stats.maxUploadMs,maximumFrameMs:stats.maxFrameMs,errors:stats.errors},null,2);
            });
        }
        progress?.(100);
        return loaded;
    };
})();
