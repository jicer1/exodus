"use strict";

// Terrarium stores metres in RGB, not a colour photograph. The same geographic
// samples drive imagery and heights, so the two projections cannot drift apart.
window.ExodusHeights = (() => {
    const LIMIT=16, SIZE=256, MAX_LAT=85.05112878;
    const endpoints=["https://elevation-tiles-prod.s3.amazonaws.com/terrarium",
        "https://elevation-tiles-prod-eu.s3.amazonaws.com/terrarium"];
    const wrap=(x,n)=>((x%n)+n)%n;
    const decode=(r,g,b)=>r*256+g+b/256-32768;
    function pixel(latitude,longitude,level) {
        const n=SIZE*Math.pow(2,level), lat=latitude*Math.PI/180;
        return {x:wrap((longitude+180)/360*n-.5,n),
            y:Math.max(0,Math.min(n-1,(1-Math.asinh(Math.tan(lat))/Math.PI)*n/2-.5))};
    }
    function plan(samples) {
        if(samples.some(p=>Math.abs(p.lat)>MAX_LAT)) throw Error("polar");
        const latitude=samples[Math.floor(samples.length/2)].lat;
        let level=Math.max(0,Math.min(13,Math.ceil(Math.log2(40075016.686*Math.cos(latitude*Math.PI/180)/(SIZE*30)))));
        for(;;level--) {
            const tiles=new Set(), pixels=samples.map(p=>pixel(p.lat,p.lon,level)), n=SIZE*Math.pow(2,level);
            pixels.forEach(p=>{
                const x=Math.floor(p.x),y=Math.floor(p.y);
                for(const dx of [0,1])for(const dy of [0,1])
                    tiles.add(`${Math.floor(wrap(x+dx,n)/SIZE)}/${Math.floor(Math.min(n-1,y+dy)/SIZE)}`);
            });
            if(tiles.size<=LIMIT || level===0) return {level,pixels,tiles:[...tiles],n};
        }
    }
    function interpolate(layout,tiles) {
        function value(x,y) {
            x=wrap(x,layout.n);y=Math.max(0,Math.min(layout.n-1,y));
            const data=tiles.get(`${Math.floor(x/SIZE)}/${Math.floor(y/SIZE)}`);
            if(!data)throw Error("missing height");
            return data[(y%SIZE)*SIZE+x%SIZE];
        }
        return Float32Array.from(layout.pixels,p=>{
            const x=Math.floor(p.x),y=Math.floor(p.y),fx=p.x-x,fy=p.y-y;
            return (value(x,y)*(1-fx)+value(x+1,y)*fx)*(1-fy)+
                (value(x,y+1)*(1-fx)+value(x+1,y+1)*fx)*fy;
        });
    }
    function create(samples,onReady,onStatus) {
        let layout, cache=new Map(), active=false,running=false,rerun=false,disposed=false,ready=false;
        const pending=new Set();
        try {layout=plan(samples);}catch(_) {layout=null;}
        async function download(key) {
            for(let source=0;source<endpoints.length;source++) {
                if(!active||disposed)throw Error("paused");
                const abort=new AbortController();pending.add(abort);
                const timeout=setTimeout(()=>abort.abort(),15000);
                let image;
                try {
                    const response=await fetch(`${endpoints[source]}/${layout.level}/${key}.png`,{signal:abort.signal});
                    if(!response.ok)throw Error("height unavailable");
                    image=await createImageBitmap(await response.blob(),{colorSpaceConversion:"none",premultiplyAlpha:"none"});
                    if(image.width!==SIZE||image.height!==SIZE)throw Error("height dimensions");
                    const canvas=document.createElement("canvas");canvas.width=canvas.height=SIZE;
                    const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(image,0,0);
                    const bytes=ctx.getImageData(0,0,SIZE,SIZE).data, heights=new Float32Array(SIZE*SIZE);
                    for(let i=0;i<heights.length;i++) {
                        const value=decode(bytes[i*4],bytes[i*4+1],bytes[i*4+2]);
                        if(bytes[i*4+3]!==255||value < -12000||value > 10000)throw Error("height no data");
                        heights[i]=value;
                    }
                    if(!disposed)cache.set(key,heights);
                    return;
                }catch(error) {
                    if(abort.paused||!active||disposed)throw Error("paused");
                    if(source===endpoints.length-1)throw error;
                }finally {image?.close();clearTimeout(timeout);pending.delete(abort);}
            }
        }
        async function run() {
            if(ready||disposed)return;
            if(!layout) {onStatus({state:"polar"});return;}
            running=true;rerun=false;
            let next=0,failed=false,paused=false;
            const queue=layout.tiles.filter(key=>!cache.has(key));
            const status=()=>onStatus({state:"loading",loaded:cache.size,total:layout.tiles.length});
            status();
            try {
                await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{
                    while(active&&!disposed&&next<queue.length) {
                        const key=queue[next++];
                        try {await download(key);}
                        catch(error) {if(error.message==="paused")paused=true;else failed=true;}
                        if(active&&!disposed)status();
                    }
                }));
                if(disposed||!active)return;
                if(cache.size===layout.tiles.length) {
                    const heights=interpolate(layout,cache);
                    onReady(heights,layout);ready=true;
                    onStatus({state:"ready",loaded:cache.size,total:layout.tiles.length});
                    // Vertex heights now live in the mesh; release the decoded PNG cache.
                    cache.clear();
                }else if(failed)onStatus({state:"error"});
            }catch(_) {if(active&&!disposed)onStatus({state:"error"});}
            finally {
                running=false;
                if(active&&!disposed&&!ready&&(rerun||paused))run();
            }
        }
        return {
            setActive(value) {
                active=value;
                if(value) {if(running)rerun=true;else run();}
                else pending.forEach(abort=>{abort.paused=true;abort.abort();});
            },
            retry() {if(active&&!running&&!ready)run();},
            dispose() {disposed=true;active=false;pending.forEach(abort=>abort.abort());cache.clear();}
        };
    }
    return {decode,pixel,plan,interpolate,create};
})();
