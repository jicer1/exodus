"use strict";
// Opt-in, repeatable integration checks. Run index.html?verify=1.
if(new URLSearchParams(location.search).has("verify")) {
    document.addEventListener("DOMContentLoaded", () => {
        const output=document.createElement("pre"); output.id="migration_checks";
        output.style.cssText="position:fixed;bottom:64px;right:15px;z-index:30000;background:#17232d;color:white;padding:12px;max-width:520px;max-height:40vh;overflow:auto;font:12px monospace;white-space:pre-wrap";
        document.body.appendChild(output);
        const results=[];
        const wait=ms => new Promise(resolve => setTimeout(resolve,ms));
        const assert=(test,ok,details) => {
            results.push({test,ok:!!ok,details}); output.textContent=JSON.stringify({status:"running",results},null,2);
            if(!ok) throw new Error(test+": "+JSON.stringify(details));
        };
        async function ray(from,to) {
            return new Promise(resolve => HuertaRuntime.require("physics").append_ray_test_ext(null,from,to,HuertaConfig.collisionId,
                (id,fraction,obj,time,point) => resolve(point)));
        }
        async function run() {
            for(let n=0;n<300 && !HuertaMigration.ready;n++) await wait(100);
            assert("Scene ready",HuertaMigration.ready,HuertaMigration.errors);
            const state=HuertaMigration, cam=state.loaded.camera, api=HuertaRuntime.require("camera");
            const nav=HuertaRuntime.require("huerta_webgl_main"), collision=state.loaded.objects.get(HuertaConfig.collision);
            assert("362 original meshes",state.loaded.objects.size===362,state.loaded.objects.size);
            assert("Terrain collision is hidden",!collision.isVisible,collision.isVisible);
            const vertices=[...state.loaded.objects.values()].reduce((sum,m) => sum+m.getTotalVertices(),0);
            assert("Original 1.0.15 base and navigation retained; redundant HD geometry released",vertices===720017 && collision.getTotalVertices()===65536 && state.loaded.objects.get(HuertaConfig.terrain).getTotalVertices()===654481,vertices);
            assert("Navigation buffers no longer retain the complete legacy export",[collision.getVerticesData(BABYLON.VertexBuffer.PositionKind),collision.getIndices()].every(a=>!ArrayBuffer.isView(a)||a.buffer.byteLength===a.byteLength));
            assert("LOD initialized",ExodusTerrainLOD.ready && ExodusTerrainLOD.errors.length===0);
            assert("Original base ready without initial geometry requests",ExodusTerrainLOD.displayMode==="base-1.0.15" && ExodusTerrainLOD.buildRequests===0 && ExodusTerrainLOD.cacheTiles===0);
            assert("Bounded LOD geometry and DEM cache",ExodusTerrainLOD.geometryBytes<=ExodusTerrainLOD.budgetBytes && ExodusTerrainLOD.cacheTiles<=32);
            const center=await ray([0,0,10000],[0,0,-10000]);
            assert("Terrain height ray",center && center[2]>800 && center[2]<1400,center);
            const pos=api.get_translation(cam), rotation=api.static_get_rotation(cam);
            const projected=api.project_point(cam,center,new Float32Array(3));
            assert("Initial camera centers the terrain",Math.abs(projected[0]-state.engine.getRenderWidth()/2)<1 && Math.abs(projected[1]-state.engine.getRenderHeight()/2)<1,Array.from(projected));
            const r=api.calc_ray(cam,projected[0],projected[1]);
            const picked=await ray(Array.from(r.slice(0,3)),Array.from(r.slice(0,3)).map((x,i) => x+r[i+3]*30000));
            assert("Projection/ray round trip",picked && Math.hypot(picked[0]-center[0],picked[1]-center[1])<.1,picked);
            api.set_translation(cam,[pos[0]+125,pos[1]-75,pos[2]]);
            assert("Translation preserves quaternion",Math.max(...Array.from(api.static_get_rotation(cam)).map((x,i)=>Math.abs(x-rotation[i])))<1e-6);
            api.set_translation(cam,pos);
            const east=[100,0,center[2]];
            const eastBefore=api.project_point(cam,east,new Float32Array(3));
            api.static_set_rotation(cam,[0,0,Math.SQRT1_2,Math.SQRT1_2]);
            const eastAfter=api.project_point(cam,east,new Float32Array(3));
            assert("Yaw rotates screen axes with quaternion",eastBefore[0]>projected[0] && Math.abs(eastAfter[0]-projected[0])<.1 && eastAfter[1]>projected[1],{before:Array.from(eastBefore),after:Array.from(eastAfter)});
            api.static_set_rotation(cam,rotation);
            // Exercise the application's mouse listeners, including asynchronous
            // terrain picking, rather than only calling camera setters.
            const cx=projected[0],cy=projected[1];
            const pointerRect=state.canvas.getBoundingClientRect();
            const pointerDown=new PointerEvent("pointerdown",{bubbles:true,cancelable:true,
                pointerId:1,pointerType:"mouse",isPrimary:true,button:0,buttons:1,
                clientX:pointerRect.left+cx,clientY:pointerRect.top+cy});
            state.canvas.dispatchEvent(pointerDown);
            state.canvas.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:1,
                pointerType:"mouse",isPrimary:true,button:0,clientX:pointerRect.left+cx,clientY:pointerRect.top+cy}));
            assert("Pointer press preserves native mouse navigation",!pointerDown.defaultPrevented);
            function mouse(type,button,x,y,buttons=0) {
                const rect=state.canvas.getBoundingClientRect();
                state.canvas.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,
                    button,buttons,clientX:rect.left+x,clientY:rect.top+y}));
            }
            async function drag(button,dx,dy) {
                mouse("mousedown",button,cx,cy,button===1?4:button===2?2:1);
                await wait(100);
                mouse("mousemove",button,cx+dx,cy+dy,button===1?4:button===2?2:1);
                mouse("mouseup",button,cx+dx,cy+dy);
                await wait(50);
            }
            const restore=async()=>{nav.go_to_initial_view();await wait(100);};
            await drag(0,25,15);
            const panPos=api.get_translation(cam);
            assert("Left drag pans without tilt",Math.hypot(panPos[0]-pos[0],panPos[1]-pos[1])>10 && Math.abs(panPos[2]-pos[2])<1 && Array.from(api.static_get_rotation(cam)).every((x,i)=>Math.abs(x-rotation[i])<1e-5),Array.from(panPos));
            await restore(); await drag(1,40,0);
            const middleYaw=api.static_get_rotation(cam);
            assert("Middle drag rotates horizontally",Math.abs(middleYaw[2]-rotation[2])>.01,Array.from(middleYaw));
            await restore(); await drag(1,0,40);
            const tilted=api.get_view_vector(cam);
            assert("Middle drag tilts",Math.hypot(tilted[0],tilted[1])>.05,Array.from(tilted));
            await restore(); await drag(2,40,0);
            const rightYaw=api.static_get_rotation(cam);
            assert("Right drag rotates without tilt",Math.abs(rightYaw[2]-rotation[2])>.01 && Math.hypot(...Array.from(api.get_view_vector(cam)).slice(0,2))<1e-5,Array.from(rightYaw));
            await restore(); await drag(2,0,-40);
            assert("Right vertical drag zooms without tilt",api.get_translation(cam)[2]<pos[2]-100 && Array.from(api.static_get_rotation(cam)).every((x,i)=>Math.abs(x-rotation[i])<1e-5),Array.from(api.get_translation(cam)));
            await restore();
            const rect=state.canvas.getBoundingClientRect();
            state.canvas.dispatchEvent(new WheelEvent("wheel",{bubbles:true,cancelable:true,deltaY:-120,clientX:rect.left+cx,clientY:rect.top+cy}));
            await wait(100);
            assert("Wheel zooms toward terrain",api.get_translation(cam)[2]<pos[2]-100,Array.from(api.get_translation(cam)));
            await restore();
            const gps=HuertaRuntime.require("huerta_hud").world_to_gps(0,0);
            assert("World to GPS",gps.lat>40.8 && gps.lat<40.9 && gps.lon>-2.4 && gps.lon<-2.2,gps);
            // A known, real reference route exercises HTTP, gzip decoding and the original worker.
            const manifest=await (await fetch(HuertaConfig.assets+"marcheur_tiles/manifest.json")).json();
            const guide=Object.assign({},manifest.guide,{elevations:new Float32Array(await (await fetch(HuertaConfig.assets+"marcheur_tiles/"+manifest.guide.file)).arrayBuffer())});
            const ref=await (await fetch(HuertaConfig.routingReference)).json();
            const offset=[559563,4519538];
            const result=await new Promise((resolve,reject) => {
                const worker=new Worker(HuertaConfig.worker);
                const timer=setTimeout(() => {worker.terminate();reject(new Error("Worker timeout"));},35000);
                worker.onmessage=e => {
                    if(e.data.phase==="done") {clearTimeout(timer);worker.terminate();resolve(e.data);}
                    else if(e.data.phase==="error") {clearTimeout(timer);worker.terminate();reject(new Error(e.data.error));}
                };
                worker.onerror=e => {clearTimeout(timer);worker.terminate();reject(new Error(e.message));};
                worker.postMessage({manifest,guide,angles:[12],maximumAngle:40,offset,
                    start:ref.referenceStart.map((x,i)=>i<2?x-offset[i]:x),
                    end:ref.referenceEnd.map((x,i)=>i<2?x-offset[i]:x),timeLimitMs:30000});
            });
            const route=result.results.find(x=>x.ok);
            assert("Original worker calculates reference route",!!route,{length:route?.length,points:route?.coordinates.length,loadedTiles:result.loadedTiles,elapsedMs:result.elapsedMs,errors:result.results.filter(x=>!x.ok).map(x=>x.error)});
            let longCheck;
            if(new URLSearchParams(location.search).has("extended")) {
                longCheck=async()=>{
                const longLimit=Math.min(300000,Math.max(30000,Number(new URLSearchParams(location.search).get("longSeconds") || 120)*1000));
                const longRef=await (await fetch(HuertaConfig.routingLongReference)).json();
                const longResult=await new Promise((resolve,reject)=>{
                    const worker=new Worker(HuertaConfig.worker);
                    const timer=setTimeout(()=>{worker.terminate();reject(new Error("Long route worker timeout"));},longLimit+5000);
                    worker.onmessage=e=>{
                        if(e.data.phase==="done" || e.data.phase==="error") {clearTimeout(timer);worker.terminate();resolve(e.data);}
                    };
                    worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(new Error(e.message));};
                    worker.postMessage({manifest,guide,angles:[12],maximumAngle:40,offset,
                        start:longRef.referenceStart.map((x,i)=>i<2?x-offset[i]:x),
                        end:longRef.referenceEnd.map((x,i)=>i<2?x-offset[i]:x),timeLimitMs:longLimit});
                });
                const longRoute=longResult.results?.find(x=>x.ok);
                assert("Long Taguenza route calculated",longRoute && longRoute.length>3000,{length:longRoute?.length,points:longRoute?.coordinates.length,loadedTiles:longResult.loadedTiles,elapsedMs:longResult.elapsedMs,timeLimitMs:longLimit,error:longResult.error,failures:longResult.results?.filter(x=>!x.ok).map(x=>x.error)});
                };
            }
            const points=route.coordinates.map(p=>[p[0]-offset[0],p[1]-offset[1],p[2]]);
            const smooth=nav.get_smoothed_route_flight_path(points);
            assert("Flight smoothing returns finite path",smooth.length>1 && smooth.every(p=>p.every(Number.isFinite)),smooth.length);
            nav.start_route_flight(points,60,14,0);
            assert("Flight enters prepared state",nav.get_route_flight_status().active,nav.get_route_flight_status());
            nav.resume_route_flight(); await wait(300); nav.pause_route_flight();
            const flight=nav.get_route_flight_status();
            assert("Flight starts, progresses and pauses",flight.active && !flight.playing && flight.distance>0,flight);
            nav.stop_route_flight();
            assert("Flight exits",!nav.get_route_flight_status().active);
            const line=HuertaRuntime.require("objects").create_line("integration_line");
            HuertaRuntime.require("material").set_line_params(line,{color:[.12,.9,.96,1],width:5});
            const positions=new Float32Array(points.flatMap(p=>[p[0],p[1],p[2]+3]));
            HuertaRuntime.require("geometry").draw_line(line,positions);
            assert("Route ribbon has all segments",line.mesh && line.mesh.getTotalIndices()===(points.length-1)*6,line.mesh?.getTotalIndices());
            HuertaRuntime.require("scenes").change_visibility(line,true);
            HuertaRuntime.require("geometry").draw_line(line,positions);
            assert("Redrawing preserves hidden line state",!line.mesh.isVisible);
            HuertaRuntime.require("geometry").draw_line(line,new Float32Array(3));
            assert("Clearing route removes old 3D trace",line.mesh===null);
            nav.go_to_world(points[0][0],points[0][1],500);
            await wait(2500);
            const hd=[...state.loaded.objects.values()].filter(m=>m.name.startsWith("terrain_hd") && m.isVisible);
            assert("HD tiles load near camera",hd.length>0,hd.length);
            for(let n=0;n<120 && ExodusTerrainLOD.displayMode!=="detail";n++) await wait(100);
            assert("Near terrain reaches detailed mode",ExodusTerrainLOD.displayMode==="detail",ExodusTerrainLOD.displayMode);
            assert("Shared HD imagery is bound separately for visible geometry tiles",ExodusTerrainLOD.shaderBoundTiles>1 && ExodusTerrainLOD.tilesUsingHD>0,{bound:ExodusTerrainLOD.shaderBoundTiles,usingHD:ExodusTerrainLOD.tilesUsingHD});
            await ExodusVerifyPanorama({state,api,nav,cam,mouse,cx,cy,wait,assert,ray});
            const beforeWheelOut=ExodusTerrainLOD.buildRequests;
            state.canvas.dispatchEvent(new WheelEvent("wheel",{bubbles:true,cancelable:true,deltaY:120,clientX:state.canvas.getBoundingClientRect().left+cx,clientY:state.canvas.getBoundingClientRect().top+cy}));
            await wait(100);
            assert("Backward wheel immediately restores original base",ExodusTerrainLOD.displayMode==="base-1.0.15" && state.loaded.objects.get(HuertaConfig.terrain).isVisible);
            await wait(900);
            assert("Backward wheel triggers no new tile build",ExodusTerrainLOD.buildRequests===beforeWheelOut && ExodusTerrainLOD.buildRequestsDuringRetreat===0,{before:beforeWheelOut,after:ExodusTerrainLOD.buildRequests});
            const beforeZoomOut=ExodusTerrainLOD.buildRequests;
            nav.go_to_initial_view(); await wait(100);
            assert("Zoom-out immediately uses original terrain",ExodusTerrainLOD.displayMode==="base-1.0.15" && state.loaded.objects.get(HuertaConfig.terrain).isVisible);
            await wait(1200);
            assert("Zoom-out sends no geometry construction request",ExodusTerrainLOD.buildRequests===beforeZoomOut && ExodusTerrainLOD.buildRequestsDuringRetreat===0,{before:beforeZoomOut,after:ExodusTerrainLOD.buildRequests,duringRetreat:ExodusTerrainLOD.buildRequestsDuringRetreat});
            await wait(2200);
            for(let n=0;n<20 && (ExodusTerrainLOD.tiles || ExodusTerrainLOD.cacheTiles);n++) await wait(100);
            assert("Unused detail and DEM cache released after zoom-out",ExodusTerrainLOD.tiles===0 && ExodusTerrainLOD.cacheTiles===0 && ExodusTerrainLOD.geometryBytes===ExodusTerrainLOD.baseGeometryBytes);
            const remaining=[...state.loaded.objects.values()].filter(m=>m.name.startsWith("terrain_hd") && m.isVisible);
            assert("HD tiles hide after zooming out",remaining.length===0,remaining.length);
            const baseTexture=state.loaded.objects.get(HuertaConfig.terrain).material.diffuseTexture;
            assert("HD image textures released after zooming out",state.scene.textures.filter(t=>/\/hd_tiles\//.test(t.url || "")).length===0,{remainingHD:state.scene.textures.filter(t=>/\/hd_tiles\//.test(t.url || "")).length,totalIncludingTemporaryMorph:state.scene.textures.length});
            if(longCheck) await longCheck();
            const imagery=HuertaRuntime.require("huerta_hd_tiles");
            for(const mode of ["historic1956color","topographic","geology","pnoa2021"]) {
                const ok=await new Promise(resolve=>imagery.set_imagery(mode,resolve));
                assert("Imagery switch "+mode,ok && imagery.get_imagery()===mode && state.loaded.objects.get(HuertaConfig.terrain).material.diffuseTexture.isReady());
            }
            assert("No runtime errors",state.errors.length===0,state.errors);
            assert("No LOD errors",ExodusTerrainLOD.errors.length===0,ExodusTerrainLOD.errors);
            assert("LOD statistics",ExodusTerrainLOD.geometryBytes<=ExodusTerrainLOD.budgetBytes,{tiles:ExodusTerrainLOD.tiles,triangles:ExodusTerrainLOD.triangles,geometryBytes:ExodusTerrainLOD.geometryBytes,cacheBytes:ExodusTerrainLOD.cacheBytes,cacheTiles:ExodusTerrainLOD.cacheTiles,maxUploadMs:ExodusTerrainLOD.maxUploadMs,maxFrameMs:ExodusTerrainLOD.maxFrameMs,fps:state.engine.getFps()});
            output.textContent=JSON.stringify({status:"passed",results},null,2);
        }
        run().catch(error => {output.textContent=JSON.stringify({status:"failed",error:error.stack,results},null,2);});
    },{once:true});
}
