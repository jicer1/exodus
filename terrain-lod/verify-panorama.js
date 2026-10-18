'use strict';
// Opt-in application checks, using the unchanged public camera/navigation APIs.
window.ExodusVerifyPanorama=async function({state,api,nav,cam,mouse,cx,cy,wait,assert,ray}) {
    const initial=Array.from(api.get_translation(cam)),rotation=Array.from(api.static_get_rotation(cam));
    const ground=await ray([initial[0],initial[1],10000],[initial[0],initial[1],-10000]);
    assert('Panorama test has real ground',!!ground);
    api.set_translation(cam,[ground[0],ground[1],ground[2]+25]);
    const tilt=BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X,Math.PI/2);
    api.static_set_rotation(cam,tilt.asArray());
    await wait(1000);
    for(let n=0;n<200&&!ExodusTerrainLOD.neighborhoodReady;n++)await wait(100);
    assert('Local terrain prepared in every direction',ExodusTerrainLOD.neighborhoodReady,{tiles:ExodusTerrainLOD.tiles,bytes:ExodusTerrainLOD.geometryBytes});
    // Let pending refinement complete before measuring a rotation-only gesture.
    let previous=-1;
    for(let n=0;n<30;n++) {const count=ExodusTerrainLOD.buildRequests;await wait(600);if(count===previous&&count===ExodusTerrainLOD.buildRequests)break;previous=count;}
    const before=ExodusTerrainLOD.buildRequests,switches=ExodusTerrainLOD.zoomOutSwitches;
    const resident=()=>state.scene.meshes.filter(m=>m.metadata?.lodTile).map(m=>m.uniqueId).sort((a,b)=>a-b).join(',');
    const meshes=resident(),modes=[];
    for(let n=0;n<=12;n++) {
        const yaw=BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z,n*Math.PI/6);
        api.static_set_rotation(cam,yaw.multiply(tilt).asArray());await wait(100);
        modes.push(ExodusTerrainLOD.displayMode);
    }
    assert('Horizontal 360 degree panorama keeps detail',modes.every(m=>m==='detail'),modes);
    assert('Horizontal rotation reuses resident geometry without rebuilding',before===ExodusTerrainLOD.buildRequests&&meshes===resident(),{before,after:ExodusTerrainLOD.buildRequests});
    assert('Original base fills sectors outside local detail',state.loaded.objects.get(HuertaConfig.terrain).isVisible);
    // A large horizontal drag with one pixel of vertical hand jitter is a yaw,
    // even though the original navigation still applies its tiny vertical zoom.
    mouse('mousedown',2,cx,cy,2);await wait(100);
    mouse('mousemove',2,cx+90,cy+1,2);await wait(100);
    mouse('mouseup',2,cx+90,cy+1);await wait(100);
    assert('Horizontal right drag tolerates vertical hand jitter',ExodusTerrainLOD.displayMode==='detail'&&ExodusTerrainLOD.zoomOutSwitches===switches,{mode:ExodusTerrainLOD.displayMode,before:switches,after:ExodusTerrainLOD.zoomOutSwitches});
    const rect=state.canvas.getBoundingClientRect();
    const wheel=deltaY=>state.canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY,clientX:rect.left+cx,clientY:rect.top+cy}));
    const lowRequests=ExodusTerrainLOD.buildRequests,lowMeshes=resident();
    wheel(120);await wait(900);
    assert('Small ground-level retreat retains detail without construction',ExodusTerrainLOD.displayMode==='detail'&&ExodusTerrainLOD.buildRequests===lowRequests&&resident()===lowMeshes,{mode:ExodusTerrainLOD.displayMode,height:ExodusTerrainLOD.heightAboveGround,before:lowRequests,after:ExodusTerrainLOD.buildRequests});
    api.static_set_rotation(cam,BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z,.4).multiply(tilt).asArray());await wait(700);
    assert('Rotation after low retreat retains geometry without restarting construction',ExodusTerrainLOD.displayMode==='detail'&&resident()===lowMeshes&&ExodusTerrainLOD.buildRequests===lowRequests);
    const zoomModes=[];
    for(let n=0;n<4;n++) {wheel(-120);await wait(100);zoomModes.push(ExodusTerrainLOD.displayMode);wheel(120);await wait(100);zoomModes.push(ExodusTerrainLOD.displayMode);}
    assert('Alternating zoom in and out near ground never switches globally to SD',zoomModes.every(m=>m==='detail'),zoomModes);
    wheel(-120);await wait(100);
    // A distant pivot at the same altitude must not turn off a ground-level view.
    nav.go_to_world(ground[0]+3000,ground[1],500);await wait(1200);
    api.set_translation(cam,[ground[0],ground[1],ground[2]+25]);api.static_set_rotation(cam,tilt.asArray());
    await wait(1200);
    assert('Ground-level horizontal view tolerates a distant pivot',ExodusTerrainLOD.displayMode==='detail',ExodusTerrainLOD.displayMode);
    nav.go_to_world(ground[0],ground[1],500);await wait(1000);
    // A real, gradual ascent must eventually restore the overview. The retained
    // low-height state uses a separate exit threshold to avoid threshold chatter.
    api.set_translation(cam,[ground[0],ground[1],ground[2]+80]);api.static_set_rotation(cam,[0,0,0,1]);await wait(1500);
    const ascentRequests=ExodusTerrainLOD.buildRequests,ascentModes=[];
    for(let n=0;n<30&&ExodusTerrainLOD.heightAboveGround<=350;n++) {wheel(120);await wait(60);ascentModes.push({mode:ExodusTerrainLOD.displayMode,height:ExodusTerrainLOD.heightAboveGround});}
    await wait(700);
    assert('Ready detail survives gradual retreat until 350 m above terrain',ascentModes.filter(s=>s.height<345).every(s=>s.mode==='detail'),ascentModes);
    assert('Higher retreat restores base without constructing coarser tiles',ExodusTerrainLOD.displayMode==='base-1.0.15'&&ExodusTerrainLOD.heightAboveGround>350&&ExodusTerrainLOD.buildRequests===ascentRequests,{mode:ExodusTerrainLOD.displayMode,height:ExodusTerrainLOD.heightAboveGround,before:ascentRequests,after:ExodusTerrainLOD.buildRequests});
    api.set_translation(cam,initial);api.static_set_rotation(cam,rotation);await wait(1000);
    mouse('mousedown',2,cx,cy,2);await wait(100);
    mouse('mousemove',2,cx,cy+40,2);await wait(100);
    mouse('mouseup',2,cx,cy+40);
    const afterOut=ExodusTerrainLOD.buildRequests;await wait(700);
    assert('Deliberate vertical right drag keeps immediate zoom-out without building',ExodusTerrainLOD.displayMode==='base-1.0.15'&&ExodusTerrainLOD.buildRequests===afterOut,{mode:ExodusTerrainLOD.displayMode,before:afterOut,after:ExodusTerrainLOD.buildRequests});
    nav.go_to_world(ground[0],ground[1],500);await wait(1200);
};
