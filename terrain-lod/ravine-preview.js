'use strict';
// Development-only reproduction of the river viewpoint reported on 18 October.
// Coordinates derive from the HUD point, not an assumed camera position.
window.ExodusRavinePreview=async function() {
    const state=HuertaMigration,api=HuertaRuntime.require('camera'),nav=HuertaRuntime.require('huerta_webgl_main');
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const ground=(x,y)=>new Promise(resolve=>HuertaRuntime.require('physics').append_ray_test_ext(null,[x,y,10000],[x,y,-10000],HuertaConfig.collisionId,(id,fraction,obj,time,point)=>resolve(point)));
    const target=await ground(588.19,-3249.42);if(!target)throw Error('Ravine reference point outside terrain');
    nav.go_to_world(target[0],target[1],350);await wait(200);
    const under=await ground(target[0],target[1]+35);if(!under)throw Error('Ravine camera outside terrain');
    api.static_setup(state.loaded.camera,{pos:[under[0],under[1],under[2]+18],look_at:[target[0]-12,target[1]-80,target[2]]});
    api.correct_up(state.loaded.camera,[0,0,1],true);
    return {target,position:api.get_translation(state.loaded.camera)};
};
if(new URLSearchParams(location.search).has('ravinePreview')) {
    document.addEventListener('DOMContentLoaded',async()=>{
        for(let n=0;n<300&&!window.HuertaMigration?.ready;n++)await new Promise(resolve=>setTimeout(resolve,100));
        if(window.HuertaMigration?.ready)await ExodusRavinePreview();
    },{once:true});
}
