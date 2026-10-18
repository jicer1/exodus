'use strict';
// The exact same sampler is used for legacy and LOD; no camera or walker change.
(() => {
    const start=performance.now();let ready=false,initial=0,worst=0,frames=[],phase='overview';
    const panel=document.createElement('pre');panel.id='terrain-benchmark';
    panel.style.cssText='position:fixed;bottom:90px;left:250px;z-index:29000;background:#19232deb;color:white;padding:10px;font:12px monospace;pointer-events:none';
    document.addEventListener('DOMContentLoaded',()=>{
        document.body.appendChild(panel);
        const button=document.createElement('button');button.textContent='Approcher à 300 m';
        button.style.cssText='position:fixed;bottom:90px;left:580px;z-index:29001';
        button.onclick=()=>{
            if(!window.HuertaMigration?.ready)return;
            HuertaRuntime.require('camera').set_translation(HuertaMigration.loaded.camera,[0,0,1363.2366409301776]);
            phase='near';worst=0;frames=[];
        };
        document.body.appendChild(button);
    },{once:true});
    function tick() {
        const state=window.HuertaMigration;
        if(state?.ready&&!ready) {
            ready=true;initial=performance.now()-start;
            state.scene.onAfterRenderObservable.add(()=>{
                if(document.hidden)return;
                const dt=state.engine.getDeltaTime();worst=Math.max(worst,dt);frames.push(dt);if(frames.length>600)frames.shift();
            });
        }
        if(ready) {
            const sorted=frames.slice().sort((a,b)=>a-b),active=state.scene.getActiveMeshes();
            const data={version:window.ExodusTerrainLOD?'2.0.1-development':'1.0.15',phase,initialReadyMs:initial,
                fps:state.engine.getFps(),worstFrameMs:worst,p95FrameMs:sorted[Math.floor(sorted.length*.95)]||0,
                activeTriangles:active.data.slice(0,active.length).reduce((n,m)=>n+m.getTotalIndices()/3,0),
                camera:state.loaded.camera.position.asArray(),errors:state.errors,
                lod:window.ExodusTerrainLOD?{tiles:ExodusTerrainLOD.tiles,geometryBytes:ExodusTerrainLOD.geometryBytes,
                    cacheBytes:ExodusTerrainLOD.cacheBytes,cacheTiles:ExodusTerrainLOD.cacheTiles,maxUploadMs:ExodusTerrainLOD.maxUploadMs,
                    errors:ExodusTerrainLOD.errors}:null};
            panel.textContent=JSON.stringify(data,null,2);
        }
        setTimeout(tick,500);
    }
    tick();
})();
