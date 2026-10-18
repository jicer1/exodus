'use strict';
importScripts('geometry.js');
const cache=new Map(),LIMIT=32;
let manifest,index,columns;
async function load(row,col) {
    if(row<0||col<0||row>=Math.ceil(manifest.height/256)||col>=columns)return;
    const key=row*columns+col;
    if(cache.has(key)) {const value=cache.get(key);cache.delete(key);cache.set(key,value);return;}
    const tile=index.get(key);if(!tile)return;
    const r=await fetch('../assets/marcheur_tiles/'+tile.elevationFile);
    if(!r.ok)throw Error('DEM HTTP '+r.status);
    const bytes=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if(bytes.byteLength!==tile.width*tile.height*4)throw Error('DEM size mismatch');
    cache.set(key,{tile,values:new Float32Array(bytes)});
    while(cache.size>LIMIT)cache.delete(cache.keys().next().value);
}
function sample(x,y) {
    if(x<0||y<0||x>=manifest.width||y>=manifest.height)return NaN;
    const item=cache.get(Math.floor(y/256)*columns+Math.floor(x/256));
    if(!item)return NaN;
    return item.values[(y%256)*item.tile.width+x%256];
}
async function run(message) {
    if(message.type==='init') {manifest=message.manifest;columns=Math.ceil(manifest.width/256);index=new Map(manifest.tiles.map(t=>[t.row*columns+t.col,t]));return {ready:true};}
    if(message.type==='clear') {cache.clear();return {cleared:true};}
    const {row,col,step,previous}=message,started=performance.now();
    const ring=[];
    for(let r=Math.max(0,row-1);r<=row+1;r++)for(let c=Math.max(0,col-1);c<=col+1;c++)
        if(r!==row-1||c!==col-1)ring.push([r,c]);
    let next=0;
    await Promise.all(Array.from({length:Math.min(4,ring.length)},async()=>{
        while(next<ring.length) {const [r,c]=ring[next++];await load(r,c);}
    }));
    const G=ExodusLODGeometry;let g=G.build(row,col,step,sample,manifest,{mask:true});
    // Normals depend on native DEM derivatives, so lighting agrees across tile edges.
    g.normals=new Float32Array(g.positions.length);
    for(let i=0;i<g.positions.length;i+=3) {
        const x=Math.round((g.positions[i]+559563-manifest.xMin)/2-.5);
        const y=Math.round((manifest.yMax-g.positions[i+1]-4519538)/2-.5),z=g.positions[i+2];
        const h=(dx,dy)=>{const v=sample(x+dx,y+dy);return Number.isFinite(v)?v:z;};
        const nx=-(h(1,0)-h(-1,0))/4,ny=(h(0,1)-h(0,-1))/4,len=Math.hypot(nx,ny,1);
        g.normals.set([nx/len,ny/len,1/len],i);
    }
    let morph=null;
    if(previous&&previous!==step) {
        const old=G.build(row,col,previous,sample,manifest,{mask:true});
        morph=step<previous ? G.project(g,G.surface(old,row,col,manifest),row,col,manifest)
            : G.project(old,G.surface(g,row,col,manifest),row,col,manifest);
    }
    if(message.skirts&&g.indices.length)({g,morph}=G.skirts(g,morph,manifest.xMin+(col*256+.5)*2-559563,manifest.yMax-(row*256+.5)*2-4519538));
    return {g,morph,workerMs:performance.now()-started,cacheTiles:cache.size,
        cacheBytes:[...cache.values()].reduce((n,t)=>n+t.values.byteLength,0)};
}
// Serial requests protect each build's neighbour ring against LRU eviction.
let queue=Promise.resolve();
self.onmessage=event=>{queue=queue.then(async()=>{
    const {id,...message}=event.data;
    try {
        const result=await run(message),transfers=[];
        if(result.g)for(const name of ['positions','normals','uvs','indices'])transfers.push(result.g[name].buffer);
        if(result.morph)transfers.push(result.morph.buffer);
        self.postMessage({id,result},transfers);
    }catch(e){self.postMessage({id,error:e.message});}
});};
